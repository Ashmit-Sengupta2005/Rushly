import { prisma } from "../../config/prisma.js";
import { errors } from "../../utils/Errors.js";
import type { ListOrdersQuery } from "./Orders.schemas.js";

export const ordersService = {
  async listMyOrders(userId: string, query: ListOrdersQuery) {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    });

    const hasMore = orders.length > query.limit;
    const items = hasMore ? orders.slice(0, query.limit) : orders;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  },

  async getOrder(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });

    if (!order || order.userId !== userId) {
      throw errors.notFound('ORDER_NOT_FOUND');
    }
    return order;
  },
};