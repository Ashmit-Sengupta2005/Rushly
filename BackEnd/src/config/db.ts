import { createPrismaClient } from "../prisma/prisma.config.js";
import { logger } from "../utils/logger.js";
export const prisma = createPrismaClient();
export const connectDB=async()=>{
    try{
        await prisma.$connect();
        logger.info('✅ PostgreSQL connected via Prisma');
    }
    catch(error){
        logger.error({ err: error }, '❌ PostgreSQL connection failed');
        process.exit(1);}
    }