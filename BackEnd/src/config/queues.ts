import { Queue, QueueEvents } from 'bullmq';
import { env } from './.env.js';

// BullMQ needs its own Redis connection config. Reuse the same URL as ioredis.
// Note: BullMQ uses `maxRetriesPerRequest: null` internally — matches our
// existing redis client config.
export const queueConnection = {
  connection: {
    // BullMQ accepts a connection URL directly since v5
    url: env.REDIS_URL,
  },
} as const;

// One queue for reservation expiries. Each job carries a reservationId
// and fires at the reservation's expiresAt timestamp.
export const RESERVATION_EXPIRY_QUEUE = `${env.BULLMQ_QUEUE_PREFIX}:reservation-expiry`;

export const reservationExpiryQueue = new Queue(RESERVATION_EXPIRY_QUEUE, queueConnection);

// QueueEvents lets us listen for job completion/failure — useful for logging.
export const reservationExpiryEvents = new QueueEvents(RESERVATION_EXPIRY_QUEUE, queueConnection);