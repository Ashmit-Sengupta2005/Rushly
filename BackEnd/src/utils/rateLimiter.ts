import { RateLimiterRedis } from 'rate-limiter-flexible';
import type { Request, Response, NextFunction } from 'express';
import { redis } from "../config/redis.js";
import { errors } from "./Errors.js";
// ============================================================
// Rate limiter configurations
// ============================================================
// Different endpoints get different limits based on threat model:
// - Auth: strict (brute force protection)
// - Checkout: moderate (per-user, allows real usage)
// - General: loose (catches truly abusive clients)
//
// rate-limiter-flexible handles the sliding window math and Redis storage.
// We just define policies and wrap them as Express middleware.

// Strict limiter for auth endpoints — 5 attempts per minute per IP.
// Prevents credential stuffing and brute-force password attacks.

const authLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:auth',
  points: 5,               // 5 requests
  duration: 60,            // per 60 seconds
  blockDuration: 300,      // if exceeded, block for 5 min (punish, don't just delay)
});
// Moderate limiter for checkout — 30 reservations/payments per minute per user.
// Allows normal use, blocks scraping/abuse. Uses userId not IP so users on
// shared networks (college WiFi) don't lock each other out.
const checkoutLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:checkout',
  points: 30,
  duration: 60,
});
// General API limiter — 200 requests per minute per IP.
// A safety net against truly abusive clients hitting any endpoint.
const generalLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:general',
  points: 200,
  duration: 60,
}); 

// ============================================================
// Middleware factories — turn a limiter into Express middleware
// ============================================================

/**
 * Rate limit by IP address. Use for endpoints where users aren't authenticated
 * yet (login, register) or for general per-network limits.
 */

function limitByIP(limiter:RateLimiterRedis){
    return async (req:Request,_res:Response,next:NextFunction)=>{
        /* The Proxy Problem: In a real production environment, your Node.js server usually doesn't face the public internet directly.
        It sits behind a "proxy" or load balancer (like AWS, Nginx, or Cloudflare). A customer connects to the proxy,
        and the proxy forwards their request to your server.
        remoteAddress: This is the IP address of whatever is directly connecting to your server. 
        If you are behind a proxy, remoteAddress will always just be the proxy's IP. 
        If your rate limiter uses this, it will think every single customer is the exact same person, and it will block everyone on your site 
        the moment 5 people try to log in!
        X-Forwarded-For: To solve this, proxies add a special label to the request called X-Forwarded-For. 
        This header acts like a caller ID, passing along the customer's actual original IP address.
        Trust Proxy: Hackers can easily fake this "caller ID" header to bypass your rate limits. 
        By enabling the trust proxy setting in Express, you are explicitly telling your backend: 
        "I know my server is hidden behind a secure proxy. It is safe to trust the X-Forwarded-For header, 
        so please use that as the real IP address instead of remoteAddress.
 */
        const ip=req.ip??req.socket.remoteAddress??'unknown';
        // If trust proxy is on req.ip works else req.socket.remoteAddress checks raw low level network connection
        try{
            await limiter.consume(ip);
            next();
        }
        catch(err:any){
            // rate-limiter-flexible throws with metadata about remaining time
            const retryAfterSec = Math.ceil(err.msBeforeNext / 1000) || 60;
            _res.setHeader('Retry-After', retryAfterSec);
            next(errors.tooMany('RATE_LIMITED', `Too many requests. Try again in ${retryAfterSec}s.`));
        }
    }
}
    /**
    * Rate limit by userId. Use for authenticated endpoints so shared IPs
    * (college networks, offices) don't cause users to interfere with each other.
    * Falls back to IP if no user (though these endpoints should be behind requireAuth).
    */
    function limitByUser(limiter:RateLimiterRedis){
        return async (req:Request,_res:Response,next:NextFunction)=>{
            const key = req.user?.id ?? req.ip ?? 'unknown';
            try {
                await limiter.consume(key);
                next();}
            catch (rateLimitInfo: any) {
                const retryAfterSec = Math.ceil(rateLimitInfo.msBeforeNext / 1000) || 60;
                _res.setHeader('Retry-After', retryAfterSec);
                next(errors.tooMany('RATE_LIMITED', `Too many requests. Try again in ${retryAfterSec}s.`));}
        };
      }
    // ============================================================
    // Exported middleware — ready to use in route files
    // 
    export const rateLimit={
        auth:limitByIP(generalLimiter),
        checkout:limitByUser(checkoutLimiter),
        general:limitByIP(generalLimiter),
    };
