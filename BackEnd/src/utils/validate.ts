import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { z } from 'zod';
import { errors } from './Errors.js';
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
            req.query=result.data as Request['query'];
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