 /* One error class, one shape, one place to change.
 Anywhere in the app: throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product does not exist')
 The error middleware serializes it to JSON. No more scattered res.status(400).json({...})
 with inconsistent shapes across controllers.*/

 export class AppError extends Error{
    constructor
    ( public readonly status:number,
      public readonly code:string,
      message:string,
      public readonly details?:unknown
    ){
        super(message);
        this.name="App Error";
    }
 }

 // Common ones as factories — saves typing and keeps codes consistent.
export const errors = {
  badRequest: (code: string, message: string, details?: unknown) =>
    new AppError(400, code, message, details),
  unauthorized: (code = 'UNAUTHORIZED', message = 'Authentication required') =>
    new AppError(401, code, message),
  forbidden: (code = 'FORBIDDEN', message = 'Insufficient permissions') =>
    new AppError(403, code, message),
  notFound: (code: string, message?: string) =>
    new AppError(404, code, message?message:""),
  conflict: (code: string, message?: string, details?: unknown) =>
    new AppError(409, code, message?message:"", details),
  tooMany: (code = 'RATE_LIMITED', message = 'Too many requests') =>
    new AppError(429, code, message),
  internal: (code = 'INTERNAL_ERROR', message = 'Internal server error') =>
    new AppError(500, code, message),
};