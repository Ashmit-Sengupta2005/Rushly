import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { prisma } from "../../config/prisma.js";
import { syncProductStock } from '../CheckOut/Inventory.redis.js';
import { errors } from '../../utils/Errors.js';
import { logger } from '../../utils/logger.js';
import type { ListProductsQuery,CreateProductInput,UpdateProductInput,AdjustInventoryInput } from './Catalog.schemas.js';

// include is used for strictly reading results on the basis of joins 

export const catalogService={
    async listProducts(query:ListProductsQuery){
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
            inventory: { select: { availableStock: true } },
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
    return { items, nextCursor, hasMore };
},
    async getProductBySlug(slug:string){
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
    return product;
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
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
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