import app from "./app.js";
import { env } from "./config/.env.js";
import { connectDb,disconnectDb } from "./config/db.js";
import { logger } from "./utils/logger.js";
import { initRedisInventory } from "./Modules/CheckOut/Inventory.redis.js";
import { startReservationExpiryWorker,stopReservationExpiryWorker, } from "./Workers/ReservationExpiry.worker.js";
import { startOutboxWorker,stopOutboxWorker } from "./Workers/Outbox.workers.js";

const PORT=env.PORT;

async function main(){
    await connectDb();
    await initRedisInventory();
    const expiryWorker =await startReservationExpiryWorker();// load lua scripts + seed inventory
    await startOutboxWorker();
    const server=app.listen(PORT,()=>{
        logger.info(`🚀 Server listening on http://localhost:${env.PORT}`);
    });

    const shutdown=async(signal:string)=>{
        logger.info(`Received ${signal}, shutting down`);
        server.close(async()=>{
            await stopOutboxWorker();
            await stopReservationExpiryWorker(expiryWorker);
            await disconnectDb();
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}


main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});