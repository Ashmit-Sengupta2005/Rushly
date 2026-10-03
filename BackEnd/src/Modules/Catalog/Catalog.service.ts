import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { prisma } from "../../config/prisma.js";
import { syncProductStock, getRedisStocks } from '../CheckOut/Inventory.redis.js';
import { errors } from '../../utils/Errors.js';
import { logger } from '../../utils/logger.js';
import type { ListProductsQuery,CreateProductInput,UpdateProductInput,AdjustInventoryInput } from './Catalog.schemas.js';
import { cacheService, cacheKeys} from '../../utils/cache.service.js';
import crypto from 'node:crypto';
import { queueRestockNotifications } from '../Engagement/RestockAlerts.service.js';

// include is used for strictly reading results on the basis of joins

type WithInventory = { id: string; inventory?: { availableStock: number } | null };

/**
 * Product metadata (name, images, price) is cached for minutes, but stock must
 * be live during a flash sale — otherwise a sold-out product keeps showing
 * "24 in stock" until the cache expires. So the cache stores metadata and we
 * overlay the live Redis stock on every read (one MGET, sub-millisecond).
 * Returns new objects — never mutates what's in the cache.
 */
export async function withLiveStock<T extends WithInventory>(products: T[]): Promise<T[]> {
  const live = await getRedisStocks(products.map((p) => p.id));
  return products.map((p) => {
    const stock = live.get(p.id);
    return stock === undefined || !p.inventory
      ? p
      : { ...p, inventory: { ...p.inventory, availableStock: Math.max(0, stock) } };
  });
}

export const catalogService={
    async listProducts(query:ListProductsQuery){
      // Cache key includes all query params so different filters get different caches.
      // Hash the query to keep keys short and safe (no special chars in keys).
    const queryHash = crypto
    .createHash('md5')
    .update(JSON.stringify(query))
    .digest('hex')
    .slice(0, 12);

    const cacheKey = cacheKeys.productList(queryHash);
    
    // Try cache first
  const cached = await cacheService.get<{
    items: WithInventory[];
    nextCursor: string | null;
    hasMore: boolean;
  }>(cacheKey);

  if (cached) {
    return { ...cached, items: await withLiveStock(cached.items) };
  }
   // Cache miss — hit Postgres (existing code, unchanged)
    // Cursor pagination pattern: fetch limit+1, use the extra to detect
    // whether there's a next page; the last item's id becomes the next cursor.
    const products=await prisma.product.findMany({
        where:{
            isActive:true,
            ...(query.categorySlug?{category:{slug:query.categorySlug}}:{}),
            ...(query.search?{ 
                OR:[
                    {name:{contains:query.search,mode:'insensitive'}},
                    {description:{contains:query.search,mode:'insensitive'}},
                ]
            }:{})},
        include:{
            images: { orderBy: { position: 'asc' }, take: 1 },
            category: { select: { slug: true, name: true } },
            // totalStock powers the "% claimed" bar on product cards
            inventory: { select: { availableStock: true, totalStock: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit + 1,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,}),
    })
    const hasMore = products.length > query.limit;
    const items = hasMore ? products.slice(0, query.limit) : products;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    const result={ items, nextCursor, hasMore };
    // Populate cache for next request (stock in it is overwritten live on read).
    await cacheService.set(cacheKey, result, 60); // 1 min for lists
    return { ...result, items: await withLiveStock(result.items) };
},
    async getProductBySlug(slug:string){
        const cacheKey = cacheKeys.productBySlug(slug);
        const cached = await cacheService.get<WithInventory>(cacheKey);
        if (cached) return (await withLiveStock([cached]))[0];
        const product = await prisma.product.findUnique({
        where: { slug },
        include: {
        images: { orderBy: { position: 'asc' } },
        category: { select: { id: true, slug: true, name: true } },
        inventory: { select: { availableStock: true, totalStock: true } },
      },
    });
    if (!product || !product.isActive) {
      throw errors.notFound('PRODUCT_NOT_FOUND', 'Product does not exist');}
    // Cache for 5 min — metadata rarely changes; stock is overlaid live from Redis on every read
    await cacheService.set(cacheKey, product, 300);
    return (await withLiveStock([product]))[0];
    },
    async createProduct(input:CreateProductInput){
    // Transactional via nested writes: product + images + inventory created
    // atomically. A product without an inventory row would break checkout.
    try{
        const product =await prisma.product.create({
            data:{
                slug:input.slug,
                name:input.name,
                description:input.description,
                price:input.price,
                categoryId:input.categoryId,
                images:{
                    create:input.images.map((img,i)=>({
                        url:img.url,
                        alt:img.alt,
                        position:i,
                    })),
                },
                inventory:{
                    create:{
                        totalStock:input.initialStock,
                        availableStock:input.initialStock,
                    },
                },
            },
            include:{
                images: { orderBy: { position: 'asc' } },
                inventory: true,
            }
            });
        await syncProductStock(product.id);
        // Invalidate list caches — a new product might appear in any listing
    await cacheService.delPattern(cacheKeys.productListPattern());
        return product;}
    catch(err){
        if(err instanceof PrismaClientKnownRequestError && err.code==='P2002'){
            throw errors.conflict('SLUG_TAKEN', 'A product with this slug already exists');
        }
        throw err;}
    },
    async updateProduct(id:string,input:UpdateProductInput){
        try {
      const product = await prisma.product.update({
        where: { id },
        data: input,
        include: {
          images: { orderBy: { position: 'asc' } },
          inventory: true,
        },
      });
      // Invalidate both the direct product cache and any list that might include it
    await cacheService.del(cacheKeys.productBySlug(product.slug));
    await cacheService.delPattern(cacheKeys.productListPattern());
      return product;
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        throw errors.notFound('PRODUCT_NOT_FOUND', 'Product does not exist');
      }
      throw err;
    }

    },
    async deleteProduct(id:string){
        // Soft-delete: mark inactive rather than DELETE. Historical orders
        // reference product; hard-delete would orphan them.
    try {
      const product=await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      // Invalidate caches so the "deleted" product disappears from listings
      await cacheService.del(cacheKeys.productBySlug(product.slug));
      await cacheService.delPattern(cacheKeys.productListPattern());
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
        throw errors.notFound('PRODUCT_NOT_FOUND', 'Product does not exist');
      }
      throw err;
    }
    },
    async adjustInventory(productId:string,input:AdjustInventoryInput,adminId:string){
        // Atomic increment via Prisma's { increment } — compiles to a single
        // UPDATE ... SET x = x + $delta. No read-modify-write, no race.
        // The DB CHECK constraint (available_stock >= 0) rejects negatives.
        try{
            const updated = await prisma.$transaction(async (tx) => {
        const inventory = await tx.inventory.update({
          where: { productId },
          data: {
            availableStock: { increment: input.delta },
            totalStock: { increment: input.delta },
            version: { increment: 1 },
          },
        });

        // Sold out → back in stock: queue "it's back" emails in the SAME
        // transaction (outbox pattern), so alerts fire iff the restock commits.
        const before = inventory.availableStock - input.delta;
        if (before <= 0 && inventory.availableStock > 0) {
          await queueRestockNotifications(tx, productId);
        }

        await tx.auditLog.create({
          data: {
            actorId: adminId,
            action: 'inventory.adjust',
            entityType: 'Inventory',
            entityId: inventory.id,
            metadata: { delta: input.delta, reason: input.reason },
          },
        });

        return inventory;
      });

      // Sync Redis AFTER the Postgres commit. If sync fails, the boot-time
      // reseed will fix it on next restart; log for observability.
      try {
        await syncProductStock(productId);
      } catch (err) {
        logger.error({ err, productId }, 'Redis sync failed after inventory adjust');
      }
      return updated;
        }
        catch(err){
            if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2025') {
          throw errors.notFound('INVENTORY_NOT_FOUND', 'Product inventory does not exist');
        }
        // CHECK constraint fires when delta would make stock negative
        if (err.message.includes('inventory_stock_nonneg')) {
          throw errors.badRequest(
            'INSUFFICIENT_STOCK',
            'Cannot reduce stock below zero',
          );
        }
      }
      throw err;}},};