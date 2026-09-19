import {setTimeout as sleep} from 'node:timers/promises';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

// ============================================================
// Configuration — knobs you might tune
// ============================================================
const POLL_INTERVAL_MS = 5000;      // check for new events every 5s
const BATCH_SIZE = 10;               // process up to 10 events per poll
const MAX_ATTEMPTS = 5;              // give up after 5 failures per event
const PROCESSING_TIMEOUT_MS = 30000; // consider a "stuck" PROCESSING row as failed after 30s

let running=false
let pollHandle:NodeJS.Timeout|null=null;

// ============================================================
// The dispatcher registry
// ============================================================
// Each event type has a handler. Add new types here as your app grows.
// For Rushly demo, all handlers just log — swap for real service calls in production.

type Dispatcher = (payload: unknown) => Promise<void>;

const dispatchers: Record<string, Dispatcher> = {
  order_confirmation: async (payload) => {
    // In production: sendGrid.send({ to: userEmail, template: 'order_confirmation', vars: payload })
    logger.info({ payload }, '📧 [DISPATCH] Would send order confirmation email');
    // Simulate network latency so testing feels realistic
    await sleep(50);
  },

  refund_confirmation: async (payload) => {
    // In production: sendGrid.send({ to: userEmail, template: 'refund_confirmation', vars: payload })
    logger.info({ payload }, '📧 [DISPATCH] Would send refund confirmation email');
    await sleep(50);
  },
  // Add more as needed: password_reset, order_shipped, etc.
};

/**
 * Atomically claim one event by transitioning PENDING → PROCESSING.
 *
 * The updateMany with where.status='PENDING' is the concurrency safety net:
 * if two worker instances try to claim the same row, only one's update
 * matches (the other sees status='PROCESSING' and its where clause misses).
 * We then check `count` to know if we actually got it.
 *
 * Returns the claimed event, or null if another worker got it first.
 */

async function claimEvent(eventId: string) {
  const result = await prisma.outboxEvent.updateMany({
    where: { id: eventId, status: 'PENDING' },
    data: { status: 'PROCESSING', claimedAt: new Date() },
  });

  if (result.count === 0) {
    // Another worker beat us to it, or it was already processed
    return null;
  }

  return prisma.outboxEvent.findUnique({ where: { id: eventId } });
}

/**
 * Process a single event: claim, dispatch, mark done/failed.
 * Wrapped in try/catch so one bad event doesn't kill the worker.
 */

async function processEvent(eventId:string){
    const event = await claimEvent(eventId);
    if (!event) return; // another worker got it
    const dispatcher = dispatchers[event.type];

    if (!dispatcher) {
    // Unknown event type — mark FAILED with a clear message. Don't retry
    // (retrying won't fix an unknown type; a human must add the handler).
    logger.error({ eventId, type: event.type }, 'No dispatcher for event type');
    await prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: 'FAILED',
        lastError: `No dispatcher registered for type "${event.type}"`,
        processedAt: new Date(),
      },
    });
    return;
  }

   try{
    await dispatcher(event.payload);
    // Success — mark DONE
    await prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: 'DONE',
        processedAt: new Date(),
        attempts: { increment: 1 },},});
   }
   catch(err){
    const errorMessage = (err as Error).message ?? String(err);
    const nextAttempts = event.attempts + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      // Given up — mark FAILED. A human must intervene (fix bug, retry manually).
      logger.error(
        { eventId, type: event.type, attempts: nextAttempts, err: errorMessage },
        'Outbox event failed after max attempts',
      );
      await prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: 'FAILED',
          lastError: errorMessage,
          attempts: nextAttempts,
          processedAt: new Date(),
        },
      });
    }
    else{
        // Transient failure — reset to PENDING so it retries on next poll.
      // In production you'd add exponential backoff via a scheduled_for column.
      logger.warn(
        { eventId, type: event.type, attempts: nextAttempts, err: errorMessage },
        'Outbox event failed, will retry',);
       await prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: 'PENDING',
          lastError: errorMessage,
          attempts: nextAttempts,
          claimedAt: null,},}); }
   }
}
/**
 * Recover events stuck in PROCESSING for too long (worker crash mid-processing).
 * Reset them to PENDING so they can be retried.
 */

async function recoverStuckEvents() {
  const cutoff = new Date(Date.now() - PROCESSING_TIMEOUT_MS);
  const result = await prisma.outboxEvent.updateMany({
    where: {
      status: 'PROCESSING',
      claimedAt: { lt: cutoff },
    },
    data: { status: 'PENDING', claimedAt: null },
  });

  if (result.count > 0) {
    logger.warn({ count: result.count }, 'Recovered stuck PROCESSING events');
  }
}
/**
 * One poll cycle: recover stuck events, fetch a batch, process them in parallel.
 */
async function pollOnce() {
  try {
    await recoverStuckEvents();

    // Fetch a batch of pending events. Order by createdAt to preserve FIFO
    // (mostly — under concurrent workers, exact ordering isn't guaranteed).
    const events = await prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
      select: { id: true }, // just IDs — claimEvent re-fetches inside
    });

    if (events.length === 0) return;

    // Process in parallel — one slow event won't block others.
    // allSettled means one failure doesn't abort the batch.
    await Promise.allSettled(events.map((e) => processEvent(e.id)));
  } catch (err) {
    logger.error({ err }, 'Outbox poll cycle failed');
  }
}

// ============================================================
// Lifecycle: start / stop
// ============================================================

export async function startOutboxWorker() {
  if (running) {
    logger.warn('Outbox worker already running');
    return;
  }

  running = true;
  logger.info(
    { intervalMs: POLL_INTERVAL_MS, batchSize: BATCH_SIZE },
    '✅ Outbox worker started',
  );

  // Run one cycle immediately, then set up interval
  await pollOnce();

  pollHandle = setInterval(() => {
    if (running) pollOnce();
  }, POLL_INTERVAL_MS);
}

export async function stopOutboxWorker() {
  running = false;
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
  logger.info('Outbox worker stopped');
}