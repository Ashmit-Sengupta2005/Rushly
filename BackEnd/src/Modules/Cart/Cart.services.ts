import { prisma } from "../../config/prisma.js";
import { errors } from "../../utils/Errors.js";
import { addItemInput,updateItemInput } from "./Cart.schemas.js";

export const cartService={
    async getOrCreateCart(userId:string){
        return prisma.cart.upsert({
            where:{userId},
            update:{},
            create:{userId},
            include:{
                items:{
                    include:{
                        product:{
                            select:{
                                id: true,
                                slug: true,
                                name: true,
                                price: true,
                                isActive: true,
                                images: { orderBy: { position: 'asc' }, take: 1 },
                                inventory: { select: { availableStock: true } },
                            },
                        },
                    },
                    orderBy:{addedAt:'asc'}
                },
            },
        });
    },
    async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return this.enrichCart(cart);
  },
    async addItem(userId:string,input:addItemInput){

    },
    // Computed fields — never persisted. Recompute on read to avoid stale data.
    enrichCart(cart:Awaited<ReturnType<typeof this.getOrCreateCart>>){
        const items=cart.items.map((item)=>{
            const priceChanged=item.product.price!==item.priceSnapshot;
            const outOfStock=(!item.product.isActive||(item.product.inventory?.availableStock??0)<item.quantity);
        })
    }
}