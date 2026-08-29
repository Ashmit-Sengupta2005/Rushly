import app from "./app.js";
import { env } from "./config/.env.js";
import { connectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";
const PORT=env.PORT;
connectDB().then(()=>{
    app.listen(PORT,()=>{
        logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`🩺 Health check: http://localhost:${PORT}/api/health`);
    })
})