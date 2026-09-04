import app from "./app.js";
import { env } from "./config/.env.js";
import { connectDb,disconnectDb } from "./config/db.js";
import { logger } from "./utils/logger.js";
import { initRedisInventory } from "./Modules/CheckOut/Inventory.redis.js";
const PORT=env.PORT;
connectDb().then(()=>{
    app.listen(PORT,()=>{
        logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`🩺 Health check: http://localhost:${PORT}/api/health`);
    })
})