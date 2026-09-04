import {Worker,type Job} from 'bullmq';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { RESERVATION_EXPIRY_QUEUE,queueConnection } from '../config/queues.js';
import { releaseStock } from '../Modules/CheckOut/Inventory.redis.js';

interface ExpiryJobData{
    reservationId:string;
}
/**
 * Runs when a delayed job fires (10 minutes after reservation creation).
 * If the reservation is still PENDING, release all its holds back to stock.
 * If it's PAID/EXPIRED/CANCELLED already, no-op (someone else handled it).
 */

async function processExpiryJob(job:Job<ExpiryJobData>){
    const { reservationId } = job.data;
    const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { items: true },
  });
  if (!reservation) {
    logger.warn({ reservationId }, 'Expiry job for missing reservation');
    return;
  }
  // Idempotency: if the reservation is no longer PENDING, someone else
  // already handled it (payment succeeded, user cancelled, etc.). No-op.
  if (reservation.status !== 'PENDING') {
    logger.info(
      { reservationId, status: reservation.status },
      'Expiry job — reservation already resolved',
    );
    return;
  }
  // Release each hold. Log failures but keep going — we want to release
  // as many as possible even if some fail. The Redis TTL is our safety net.
  for (const item of reservation.items){
    try{
        const released = await releaseStock({
        productId: item.productId,
        holdId: item.holdId,
      });
      if (!released) {
        logger.warn(
          { reservationId, holdId: item.holdId },
          'Hold key was already gone (TTL expired or double-release)',
        );
      }
    }
    catch(err){
        logger.error(
        { err, reservationId, holdId: item.holdId },
        'Release failed during expiry',
      );
    }
    // Mark reservation EXPIRED in Postgres.
    await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: 'EXPIRED' },
  });

  logger.info({ reservationId }, 'Reservation expired and released');
  }
}

export async function startReservationExpiryWorker(){
    const worker=new Worker<ExpiryJobData>(
        RESERVATION_EXPIRY_QUEUE,processExpiryJob,
        {...queueConnection,concurrency:5},);
    
     worker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Expiry job failed');});

    worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'Expiry job completed');});

    logger.info('✅ Reservation expiry worker started');
    return worker;
}

export async function stopReservationExpiryWorker(worker: Worker) {
  await worker.close();
  logger.info('Reservation expiry worker stopped');
}