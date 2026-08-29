
/*This function catches any application crashes and 
formats them into a clean JSON response instead of a raw HTML error page.*/

import { Request,Response,NextFunction } from "express";
import { logger } from "../utils/logger.js";
export const errorHandler=
(err:Error,req:Request,res:Response,next:NextFunction) :Response=>{
    logger.error({err,url:req.url,method:req.method},'Unhandled Error');
    const statusCode=(res.statusCode!==200?res.statusCode:500);
    return res.status(statusCode).json({
        message:err.message||"Internal Server Error",
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    })
}