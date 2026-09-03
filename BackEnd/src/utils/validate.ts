import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { z } from 'zod';
import { errors } from './Errors.js';

// Express 5 makes req.query a getter with no setter, so it can no longer be
// reassigned (unlike req.body/req.params, which stay plain writable objects).
// The validated/coerced query is stashed here instead and read back via
// req.validatedQuery in the controller.
declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

/* This is a middleware factory which produces middlewares
    which inturn validates HTTP requests*/

    // Factory: validate.body(schema) returns middleware that parses req.body,
// replaces it with the *validated* (and coerced) result, and hands off.
//
// Why replace req.body: downstream handlers(basically next code or next middlewares )
//  get the typed, validated version.
// If schema has .default() or .transform(), those apply. 
// TypeScript stays happy.
export const validate={
    body:
      <T>(schema:ZodType<T>)=>{
        return (req:Request,res:Response,next:NextFunction)=>{
            const result=schema.safeParse(req.body);
            if(!result.success){
                return next(errors.badRequest(
                    'Validation_Error','Request Body Failed Authentication',
                    z.flattenError(result.error).fieldErrors
                ));}
            req.body=result.data;
            next();}
      },
    query:
    <T>(schema:ZodType<T>)=>{
        return (req:Request,res:Response,next:NextFunction)=>{
            const result=schema.safeParse(req.query);
            if(!result.success){
                return next(errors.badRequest(
                    'Validation_Error','Query Params Failed Verification',
                    z.flattenError(result.error).fieldErrors
                ));}
            req.validatedQuery=result.data;
            next();}
      },
    params:
    <T>(schema:ZodType<T>)=>{
        return (req:Request,res:Response,next:NextFunction)=>{
            const result=schema.safeParse(req.params);
            if(!result.success){
                return next(errors.badRequest(
                    'Validation_Error','Path Params Failed Validation',
                    z.flattenError(result.error).fieldErrors
                ));}
            req.params=result.data as Request['params'];
            next();}
      }
}