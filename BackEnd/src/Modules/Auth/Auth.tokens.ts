import jwt,{type SignOptions} from 'jsonwebtoken';
import { env } from '../../config/.env.js';
import { errors } from '../../utils/Errors.js';
import type { Role } from '../../generated/prisma/client.js';

export interface AccessTokenPayload{
    sub:string,
    role:Role,
    type:'access'
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
  type: 'refresh';
}

const accessOpts: SignOptions = {
  expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
  issuer: 'rushly',
  audience: 'rushly-web',
};
const refreshOpts: SignOptions = {
  expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'],
  issuer: 'rushly',
  audience: 'rushly-web',
};
// token= AccessTokenPayload + JWT_ACCESS_SECRET + ACCESSOpts (here + means sign)
export function signAccessToken(user:{id:string;role:Role}):string{
  const payload: AccessTokenPayload = { sub: user.id, role: user.role, type: 'access' };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, accessOpts);
};
export function signRefreshToken(user: { id: string; refreshTokenVersion: number }): string {
    const payload: RefreshTokenPayload = {
    sub: user.id,
    tokenVersion: user.refreshTokenVersion,
    type: 'refresh',}
    return jwt.sign(payload,env.JWT_REFRESH_SECRET,refreshOpts);
};
// AccessTokenPayload=token+JWT_ACCESS_SECRET+accessOpts without expires (here + means verify)
export function verifyAccessToken(token:string):AccessTokenPayload{
    try{
        const decoded=jwt.verify(token,env.JWT_ACCESS_SECRET,{
            issuer:'rushly', audience:'rushly-web'}) as AccessTokenPayload;
        if(decoded.type!="access"){
            throw errors.unauthorized('INVALID_TOKEN_TYPE');
        }
        return decoded;
    }
    catch(err){
        if (err instanceof jwt.TokenExpiredError) throw errors.unauthorized('ACCESS_TOKEN_EXPIRED');
        if (err instanceof jwt.JsonWebTokenError) throw errors.unauthorized('INVALID_ACCESS_TOKEN');
        throw err;
    }
};
export function verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: 'rushly',
      audience: 'rushly-web',
    }) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') {
      throw errors.unauthorized('INVALID_TOKEN_TYPE');
    }
    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw errors.unauthorized('REFRESH_TOKEN_EXPIRED');
    if (err instanceof jwt.JsonWebTokenError) throw errors.unauthorized('INVALID_REFRESH_TOKEN');
    throw err;
  }
};