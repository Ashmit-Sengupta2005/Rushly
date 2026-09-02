import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { errors } from '../../utils/Errors.js';
import { verifyAccessToken } from './Auth.tokens.js';

declare global{
    namespace Express{
        interface Request{
            user?:{id:string,role:Role};
        }
    }
}

export function requireAuth(req:Request,_res:Response,next:NextFunction){
    const header=req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
    return next(errors.unauthorized('NO_TOKEN', 'Missing Authorization header'));}
    const token = header.slice('Bearer '.length);
    try{
        const payload=verifyAccessToken(token);
        req.user={id:payload.sub,role:payload.role};
        next();}
    catch(err){
        next(err);}
};
export function requireRole(...allowed:Role[]){
    return (req: Request, _res: Response, next: NextFunction)=>{
        if (!req.user) return next(errors.unauthorized('NO_AUTH'));
        if (!allowed.includes(req.user.role)) return next(errors.forbidden());
        next();
    }
};