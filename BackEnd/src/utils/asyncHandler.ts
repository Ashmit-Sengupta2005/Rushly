import type { Request, Response, NextFunction, RequestHandler } from 'express';
/*
Express doesn't natively catch rejected promises from async handlers —
they become "unhandled promise rejection" warnings and the client hangs.
Wrapping with this ensures thrown errors always reach errorHandler middleware.
Usage: router.get('/foo', asyncHandler(async (req, res) => { ... }))
*/
export const asyncHandler=
/* the following line basically means T follows properties of RequestHandler
   It expects a function of type T and returns a request handler*/
<T extends RequestHandler>(fn:T):RequestHandler=>
(req:Request,res:Response,next:NextFunction)=>{
    Promise.resolve(fn(req,res,next)).catch(next);
};
