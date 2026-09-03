import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { prisma } from "../../config/prisma.js";
import { errors } from '../../utils/Errors.js';
import type { ListProductsQuery,CreateProductInput,UpdateProductInput,AdjustInventoryInput } from './Catalog.schemas.js';

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

    },
    async adjustInventory(productId:string,input:AdjustInventoryInput,adminId:string){

    },
};