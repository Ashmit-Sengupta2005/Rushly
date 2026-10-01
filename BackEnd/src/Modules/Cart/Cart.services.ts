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
        const cart = await this.getOrCreateCart(userId);
        // Soft stock check for UX. Real enforcement happens in Step 4 at reservation
        // time via the atomic Redis Lua script. This check just prevents obvious errors.
        const product = await prisma.product.findUnique({
          where: { id: input.productId },
          include: { inventory: true },});
        if (!product || !product.isActive) {
        throw errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');}
        // The upsert below ADDS to an existing line, so check the resulting total,
        // not just the amount being added.
        const alreadyInCart = cart.items.find((i) => i.productId === input.productId)?.quantity ?? 0;
        if (!product.inventory || product.inventory.availableStock < alreadyInCart + input.quantity) {
        throw errors.conflict('INSUFFICIENT_STOCK', 'Not enough stock available', {
        available: product.inventory?.availableStock ?? 0,
      });}
      // Upsert on unique(cartId, productId) — adding same product twice
    // merges into one row with summed quantity. Prevents duplicate rows.
        const item=await prisma.cartItem.upsert({
            where:{
                cartId_productId:{ cartId: cart.id, productId: input.productId },},
            create:{
                cartId: cart.id,
                productId: input.productId,
                quantity: input.quantity,
                priceSnapshot: product.price,},
            update: {
            quantity: { increment: input.quantity },
             // Keep ORIGINAL priceSnapshot on merge — user should re-add for new price.
             },
            include:{
                product:{
                    select:{
                        id:true,
                        slug:true,
                        name:true,
                        price:true,
                        images:{orderBy:{position:'asc'},take:1},
                    },
                },
        },});
        return item;
    },
    async updateItemQuantity(userId: string, productId: string, input: updateItemInput) {
        const cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) throw errors.notFound('CART_NOT_FOUND');
        const product = await prisma.product.findUnique({
                        where: { id: productId },
                        include: { inventory: true }, });
        if (!product?.inventory || product.inventory.availableStock < input.quantity) {
            throw errors.conflict('INSUFFICIENT_STOCK', 'Not enough stock available', {
              available: product?.inventory?.availableStock ?? 0,
            });}
        const item = await prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId } },
      data: { quantity: input.quantity },
      include: {
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            price: true,
            images: { orderBy: { position: 'asc' }, take: 1 },
          },
        },
      },
    });
    return item;},
    async removeItem(userId: string, productId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return;
    // deleteMany doesn't throw on empty — makes this idempotent.
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });
  },

  async clearCart(userId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return;
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  },

    // Computed fields — never persisted. Recompute on read to avoid stale data.
    enrichCart(cart:Awaited<ReturnType<typeof this.getOrCreateCart>>){
        const items=cart.items.map((item)=>{
            const priceChanged=item.product.price!==item.priceSnapshot;
            const outOfStock=(!item.product.isActive||(item.product.inventory?.availableStock??0)<item.quantity);
            return {
                ...item,
                lineTotal:item.priceSnapshot*item.quantity,
                currentLineTotal:item.product.price * item.quantity,
                priceChanged,
                outOfStock,
            };     
        });
        const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
        const currentSubtotal = items.reduce((sum, i) => sum + i.currentLineTotal, 0);
        const hasPriceChanges = items.some((i) => i.priceChanged);
        const hasOutOfStock = items.some((i) => i.outOfStock);

        return {
        id: cart.id,
          items,
          subtotal,
          currentSubtotal,
          hasPriceChanges,
          hasOutOfStock,
          updatedAt: cart.updatedAt,};}
}