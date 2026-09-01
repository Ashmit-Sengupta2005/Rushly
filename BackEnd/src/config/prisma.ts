import type { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "../prisma/prisma.config.js";
import { env } from "./.env.js";
//? Trivial development phase optimization
/* Singleton pattern: in dev, nodemon restarts create a new module scope
   on every save, which would spawn a new PrismaClient (and a new pool)
   each time — the DB caps out at ~100 connections and you'd hit it fast.
   Hanging the client off globalThis dedups across restarts.*/
const globalForPrisma=globalThis as unknown as {prisma?:PrismaClient};
export const prisma= globalForPrisma.prisma??
                     createPrismaClient();
if(env.NODE_ENV!=='production'){
    globalForPrisma.prisma=prisma;
}