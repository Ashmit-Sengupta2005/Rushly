import { redis } from "../config/redis.js";
import { logger } from "./logger.js";
// ============================================================
// Cache abstraction — write-through pattern
// ============================================================
// Kept as its own service so future changes (add compression, add tags,
// swap to Memcached) touch one file. All modules import from here.
//
// Design decisions:
// - JSON serialize/deserialize — simple, debuggable via redis-cli
// - Explicit TTL as safety net (default 5 min) — even if we forget to
//   invalidate, cache staleness is bounded
// - Silent fallback on Redis error — a cache failure should never break
//   the app; we just serve from DB instead

const DEFAULT_TTL_SEC = 300; // 5 minutes

export const cacheService={
     /**
   * Get a value from cache. Returns null on miss OR on any Redis error.
   * Never throws — a broken cache should never break the app.
   */
    async get<T>(key:string):Promise<T|null>{
        try{
            const raw = await redis.get(key);
            if (!raw) return null;
            return JSON.parse(raw) as T;//(return type of JSON.parse is any)
        }
        catch(err){
            logger.warn({ err, key }, 'Cache read failed, falling back to DB');
            return null;}
    },
      /**
   * Set a value in cache with a TTL. Fire-and-forget: doesn't throw on failure.
   * Use after a successful DB write to keep cache in sync (write-through pattern).
   */
    async set<T>(key: string, value: T, ttlSec = DEFAULT_TTL_SEC): Promise<void> {
    try {
      await redis.setex(key, ttlSec, JSON.stringify(value));
    } catch (err) {
      logger.warn({ err, key }, 'Cache write failed');}
    },
    /**
   * Delete one or more keys from cache. Used for explicit invalidation.
   * Accepts a single key or an array — invalidating related keys in bulk
   * is a common pattern (e.g. delete both product detail and product list caches).
   */
    async del(keys: string | string[]): Promise<void> {
    try {
      const arr = Array.isArray(keys) ? keys : [keys];
      if (arr.length === 0) return;
      await redis.del(...arr);
    } catch (err) {
      logger.warn({ err, keys }, 'Cache delete failed');
    }
  },
    /**
   * Invalidate all keys matching a pattern (e.g. "products:list:*").
   * Uses SCAN not KEYS — KEYS blocks Redis on large stores; SCAN is iterative.
   *
   * Use sparingly: pattern-based invalidation is more expensive than direct
   * key invalidation. Prefer direct keys when possible.
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const keysToDelete: string[] = [];

      for await (const keys of stream) {
        keysToDelete.push(...(keys as string[]));
      }

      if (keysToDelete.length > 0) {
        await redis.del(...keysToDelete);
        logger.debug({ pattern, count: keysToDelete.length }, 'Cache pattern invalidation');
      }
    } catch (err) {
      logger.warn({ err, pattern }, 'Cache pattern delete failed');
    }
  },
};
// ============================================================
// Key builders — one place to change the naming scheme
// ============================================================
// Centralizing key construction prevents typos and makes it easy to
// audit what's cached. If you ever change the naming scheme, one file changes.

export const cacheKeys = {
  productBySlug: (slug: string) => `products:slug:${slug}`,
  productList: (queryHash: string) => `products:list:${queryHash}`,
  productListPattern: () => `products:list:*`,       // for bulk invalidation
  activeEvents: () => `events:active`,
  recentSales: () => `activity:recent-sales`,
};