import argon2,{type HashOptions} from 'argon2';
import { Role,type User } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {prisma} from "../../config/prisma.js"
import { errors } from '../../utils/Errors.js';
import { signAccessToken,signRefreshToken,verifyRefreshToken } from './Auth.tokens.js';
import type { RegisterInput, LoginInput } from './Auth.schemas.js';
import { logger } from '../../utils/logger.js';
const argonOptions: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,  // 19 MiB
  timeCost: 2,
  parallelism: 1,
};
interface TokenBundle {
  accessToken: string;
  refreshToken: string;
}
// Precomputed argon2id hash of "placeholder" — used to keep timing constant
// when the user doesn't exist. Any valid argon2id hash works.
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$KVpQ3+cN2p7iSXQIQuKl7uMlWJZk9C3hIULHJqZgQXA';
// Public shape — passwordHash never leaves the service layer.
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export const authService={
  issueTokens(user:User):TokenBundle{
    return {
        accessToken:signAccessToken(user),
        refreshToken:signRefreshToken(user)
    }
  },
  async register(input: RegisterInput): Promise<{ user: PublicUser; tokens: TokenBundle }> {
        const passwordHash = await argon2.hash(input.password, argonOptions);
        let user: User;
        try {
      user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          role: Role.CUSTOMER,
        },});}
        catch(err){
            if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
        throw errors.conflict('EMAIL_TAKEN', 'An account with this email already exists');
      }
      throw err;}
    const tokens = this.issueTokens(user);
    return { user: toPublicUser(user), tokens };
    },
    async login(input:LoginInput):Promise<{user:PublicUser,tokens:TokenBundle}>{
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Timing-attack mitigation: always run argon2.verify even when the user
    // doesn't exist, so response time doesn't leak whether the email is registered.  
    if (!user) {
      await argon2.verify(DUMMY_HASH, input.password).catch(() => false);
      throw errors.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const passwordOk = await argon2.verify(user.passwordHash, input.password);
    if (!passwordOk) {
      throw errors.unauthorized('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const tokens = this.issueTokens(user);
    logger.info(tokens.refreshToken);
    return { user: toPublicUser(user), tokens };      
    },
    async refresh(refreshToken:string):Promise<{ tokens: TokenBundle; user: PublicUser }>{
        const payload = verifyRefreshToken(refreshToken);
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user) throw errors.unauthorized('USER_NOT_FOUND');
        // Version check — if user has logged out (or we invalidated) since the token
        // was issued, tokenVersion has been bumped and this refresh is invalid.
        if (payload.tokenVersion !== user.refreshTokenVersion) {
         throw errors.unauthorized('REFRESH_TOKEN_REVOKED');}
         const tokens = this.issueTokens(user);
    return { tokens, user: toPublicUser(user) };
    },
    async logout(userId:string):Promise<void>{
    // Bump refreshTokenVersion → instantly invalidates ALL outstanding refresh
    // tokens for this user across every device. Access tokens still work until
    // they expire naturally (max 15 min) — that's the deliberate tradeoff.
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenVersion: { increment: 1 } },});
    },
    async getMe(userId:string):Promise<PublicUser>{
        const user=await prisma.user.findUnique({where:{id:userId}});
        if(!user) throw errors.unauthorized('USER_NOT_FOUND');
        return toPublicUser(user);}
}