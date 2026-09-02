import { asyncHandler } from '../../utils/asyncHandler.js';
import type {Request,Response} from 'express';
import { env } from '../../config/.env.js';
import { authService } from './Auth.service.js';
import { errors } from '../../utils/Errors.js';
const REFRESH_COOKIE_NAME='rushly_rt';
// Cookie settings for the refresh token. Every attribute is load-bearing.
const refreshCookieOptions={
    httpOnly:true, //JS on the page cant read it (Mitigates XSS attacks)
    secure:env.NODE_ENV==="production",
    sameSite:'lax' as const,// sent on top-level navigations; blocks most CSRF
    path:'/api/auth', // narrow scope — cookie only sent to auth endpoints
    maxAge:7*24*60*60*1000,
};

function setRefreshCookie(res:Response,refreshToken:string){
    res.cookie(REFRESH_COOKIE_NAME,refreshToken,refreshCookieOptions);
}
function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
}

export const authController={
    register: asyncHandler(async(req:Request,res:Response)=>{
        const {user,tokens}=await authService.register(req.body);
        setRefreshCookie(res,tokens.refreshToken);
        // User gets the access token and cookie gets set
        res.status(201).json({user,tokens: tokens.accessToken});}),
    
    login:asyncHandler(async(req:Request,res:Response)=>{
        const {user,tokens}=await authService.register(req.body);
        setRefreshCookie(res,tokens.refreshToken);
        // User gets the access token and cookie gets set
        res.status(200).json({user,tokens: tokens.accessToken});}),
    
    refresh:asyncHandler(async(req:Request,res:Response)=>{
        const currentRefreshToken=req.cookies?.[REFRESH_COOKIE_NAME];
        if(!currentRefreshToken){
            throw errors.unauthorized('NO_REFRESH_TOKEN');}
        const {tokens,user}=await authService.refresh(currentRefreshToken);
        setRefreshCookie(res,tokens.refreshToken);
        res.json({ user, accessToken: tokens.accessToken });
    }),

    logout: asyncHandler(async (req: Request, res: Response) => {
        if (req.user) {
          await authService.logout(req.user.id);}
        clearRefreshCookie(res);
        res.status(204).send();}),

    me:asyncHandler(async(req:Request,res:Response)=>{
        const user =await authService.getMe(req.user!.id);
        res.json({user});
    }),
};
