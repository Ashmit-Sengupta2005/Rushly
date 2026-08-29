import { Request,Response } from "express";
import { prisma } from "../config/db.js";
import {redis} from "../config/redis.js";
import { logger } from "../utils/logger.js";
export const checkHealth=async(req:Request,res:Response)=>{
    try{
        await prisma.$queryRaw`SELECT 1`;
        await redis.ping();
        res.status(200).json({
      status: 'OK',
      postgres: 'Connected',
      redis: 'Connected',
      timestamp: new Date().toISOString(),
    });
    }
    catch(error){
        logger.error({err:error},"Health Check failed");
        res.status(503).json({
            status:"Error",
            message:"Database/Redis Connection failed"
        });
    }
}