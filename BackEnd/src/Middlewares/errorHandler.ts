
/*This function catches any application crashes and 
formats them into a clean JSON response instead of a raw HTML error page.*/

import { Request,Response,NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../utils/Errors.js";
// Known application errors — return their shape directly.
export const errorHandler=
 (err:unknown,req:Request,res:Response,_next:NextFunction) :Response=>{ // 4 params required: Express identifies error handlers by arity
    if(err instanceof AppError){
        logger.warn({err,path:req.path},`AppError:${err.code}`);
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });}
  // Prisma known errors — map to sensible HTTP codes.
    if(err instanceof Prisma.PrismaClientKnownRequestError){
        // Unique Constraint Violation
        if(err.code==='P2002'){
            return res.status(409).json({
        error: {
          code: 'UNIQUE_CONSTRAINT',
          message: 'Resource already exists',
          details: { fields: err.meta?.target },},});}
        // record not found during update or delete
        if(err.code==='P2025'){
            return res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Resource not found' },});}}
    // Unknown — log the full error but leak nothing to the client.
  logger.error({ err, path: req.path }, 'Unhandled error');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });}