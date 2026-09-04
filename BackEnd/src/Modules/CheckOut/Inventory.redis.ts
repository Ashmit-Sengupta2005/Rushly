import { redis } from "../../config/redis.js";
import { prisma } from "../../config/prisma.js";
import { logger } from "../../utils/logger.js";
import { env } from "../../config/.env.js";
import { pipe } from "zod";

/**
 * Atomically reserve stock for one item.
 *
 * KEYS[1] = inventory:{productId}  — the stock counter
 * KEYS[2] = hold:{holdId}          — the hold key we'll create if successful
 * ARGV[1] = qty (integer)          — how many units to reserve
 * ARGV[2] = ttlSeconds             — how long the hold lives before auto-releasing
 *Redis must pass KEYS and ARGV to Lua in string format
 * Returns:
 *   1  = success (stock decremented, hold key created with TTL)
 *   0  = insufficient stock (nothing changed)
 *  -1  = inventory key doesn't exist (product wasn't seeded to Redis)
 * inventory:${productId} (e.g., inventory:999): This immediately identifies the key as belonging to the "inventory" category, specifically for product #999.
 *hold:${holdId} (e.g., hold:abc-123): This clearly separates temporary checkout tickets from permanent inventory counters or user sessions.
 */
const RESERVE_SCRIPT=`
local stockKey=KEYS[1]
local holdKey=KEYS[2]
local qty=tonumber(ARGV[1])
local ttl=tonumber(ARGV[2])

local stock=redis.call('GET',stockKey)
if stock==false then 
    return -1 
end

local current=tonumber(stock)
if current<qty then 
    return 0
end

redis.call('DECRBY',stockKey,qty)
redis.call('SETEX',holdKey,ttl,qty)
return 1
`;
/**
 * Atomically release a hold — return the stock to the pool.
 *
 * KEYS[1] = inventory:{productId}
 * KEYS[2] = hold:{holdId}
 *
 * Returns:
 *   1  = released (stock incremented, hold key deleted)
 *   0  = hold key didn't exist (already released, expired, or never existed)
 *
 * IDEMPOTENCY: calling this on an already-released hold is safe — it's a no-op.
 * This matters because the BullMQ expiry worker and the manual cancel path
 * might both try to release the same hold in a race.
 */
const RELEASE_SCRIPT=`
local stockKey=KEYS[1]
local holdKey=KEYS[2]

local heldQty=redis.call('GET',holdKey)
if(heldQty==false) then 
    return 0
end 
local qty = tonumber(heldQty)
redis.call('DEL', holdKey)
redis.call('INCRBY', stockKey, qty)
return 1
`;
/**
 * Consume a hold — used when a payment succeeds.
 * The stock STAYS decremented (the sale went through), but we delete
 * the hold key so no future release call can put the stock back.
 *
 * KEYS[1] = hold:{holdId}
 *
 * Returns:
 *   1 = consumed (hold key deleted)
 *   0 = hold key didn't exist (double-consume attempt, or already released)
 */
const CONSUME_SCRIPT = `
local holdKey = KEYS[1]
return redis.call('DEL', holdKey)
`;

// Cached SHA1s of each script — populated by initRedisInventory() at boot.
let reserveSha: string;
let releaseSha: string;
let consumeSha: string;

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Call this once at server boot. Loads Lua scripts into Redis and syncs
 * inventory from Postgres into Redis for every product.
 *
 * Safe to call multiple times — SCRIPT LOAD is idempotent, and re-seeding
 * inventory is a no-op if values haven't drifted.
 */
export async function initRedisInventory() {
    // Load scripts into Redis's script cache. Returns SHA1 hashes we'll use
    // with EVALSHA for cheaper subsequent calls.
    [reserveSha,releaseSha,consumeSha]=await Promise.all([
        redis.script('LOAD',RESERVE_SCRIPT) as Promise<string>,
        redis.script('LOAD',RELEASE_SCRIPT) as Promise<string>,
        redis.script('LOAD',CONSUME_SCRIPT) as Promise<string>,
    ]);

    logger.info({reserveSha,releaseSha,consumeSha},'Loaded Reservation Lua Scripts')
    // Seed inventory from Postgres. In a real system with millions of products
    // you'd stream this in batches; at Rushly's scale we do it all at once.
    const inventories=await prisma.inventory.findMany({
        select:{productId:true,availableStock:true},
    });
    // Use a pipeline to batch all SET commands into one round-trip.
    const pipeline=redis.pipeline();
    for(const inv of inventories){
        pipeline.set(stockKey(inv.productId),inv.availableStock);
    }
    /*Why a Pipeline instead of a simple for loop?
    It solves the network round-trip bottleneck. If you use a simple for loop with await redis.set(),
     your Node.js server sends a request to Redis, waits for the "OK" response, and then sends the next one. 
     If you have 1,000 products, that is 1,000 separate network trips.
    A pipeline batches all 1,000 commands together. It sends one single giant network request to Redis,
     Redis processes them all instantly, and sends back one single reply.
      It turns a process that might take 5 seconds into one that takes 50 milliseconds. */
    await pipeline.exec();
    logger.info({count:inventories.length},'Seeded product inventory to Redis');
}

export type reserveResult=
| { ok: true }
  | { ok: false; reason: 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_SEEDED' };
/**
 * Sync one product's stock from Postgres → Redis. Called after admin
 * inventory adjustment to keep Redis in sync with the durable record.
 */
export async function reserveStock(params:
 {productId: string;
  holdId: string;
  qty: number;}):Promise<reserveResult>{
     /* EVALSHA syntax
         */
    const result = (await redis.evalsha(
    reserveSha,
    2,                                    // number of KEYS
    stockKey(params.productId),           // KEYS[1]
    holdKey(params.holdId),               // KEYS[2]
    params.qty.toString(),                // ARGV[1]
    env.RESERVATION_TTL_SEC.toString(),   // ARGV[2]
  )) as number;
    if (result === 1) return { ok: true };
    if (result === 0) return { ok: false, reason: 'INSUFFICIENT_STOCK' };
    if (result === -1) return { ok: false, reason: 'PRODUCT_NOT_SEEDED' };
    // Should never happen unless the Lua script is edited incorrectly.
  throw new Error(`Unexpected reserve result: ${result}`);
}

/**
 * Release a hold — stock returns to the pool. Idempotent: calling on an
 * already-released hold is a safe no-op. Returns true if the release
 * actually happened, false if the hold key was gone.
 */

export async function releaseStock(params: {
  productId: string;
  holdId: string;
}): Promise<boolean> {
  const result = (await redis.evalsha(
    releaseSha,
    2,
    stockKey(params.productId),
    holdKey(params.holdId),
  )) as number;
  return result === 1;
}
/**
 * Consume a hold — payment succeeded, sale is final, stock stays deducted.
 * Deletes the hold key so no future release can inflate the stock back.
 */
export async function consumeHold(holdId: string): Promise<boolean> {
  const result = (await redis.evalsha(
    consumeSha,
    1,
    holdKey(holdId),
  )) as number;
  return result === 1;
}

export async function syncProductStock(productId:string){
    const inv=await prisma.inventory.findUnique({
        where:{productId},
        select:{availableStock:true},
    })
    if (!inv) {
    logger.warn({ productId }, 'syncProductStock: no inventory row');
    return;}
    await redis.set(stockKey(productId), inv.availableStock);
}

/**
 * Read the current Redis-view of stock for a product. Used for admin
 * dashboards and debugging.
 */
export async function getRedisStock(productId: string): Promise<number | null> {
  const val = await redis.get(stockKey(productId));
  return val === null ? null : parseInt(val, 10);
}

// ============================================================
// KEY BUILDERS — one place to change if we ever restructure keys
// ============================================================
function stockKey(productId: string): string {
  return `inventory:${productId}`;
}

function holdKey(holdId: string): string {
  return `hold:${holdId}`;
}
