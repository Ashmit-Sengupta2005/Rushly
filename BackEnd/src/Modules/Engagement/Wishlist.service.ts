import { prisma } from "../../config/prisma.js";
import { errors } from "../../utils/Errors.js";
import { withLiveStock } from "../Catalog/Catalog.service.js";

export const wishlistService = {
  /** Saved products, newest first, in the same shape as the catalog list. */
  async list(userId: string) {
    const rows = await prisma.wishlistItem.findMany({
      where: { userId, product: { isActive: true } },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        product: {
          include: {
            images: { orderBy: { position: 'asc' }, take: 1 },
            category: { select: { slug: true, name: true } },
            inventory: { select: { availableStock: true, totalStock: true } },
          },
        },
      },
    });
    return withLiveStock(rows.map((r) => r.product));
  },

  // PUT semantics: adding an already-saved product is a no-op
  async add(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { isActive: true },
    });
    if (!product?.isActive) throw errors.notFound('PRODUCT_NOT_FOUND', 'Product not found');
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  },

  async remove(userId: string, productId: string) {
    await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  },
};
