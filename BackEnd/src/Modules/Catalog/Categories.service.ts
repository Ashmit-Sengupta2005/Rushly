import { prisma } from "../../config/prisma.js";

export const categoriesService = {
  // Small, rarely-changing table — no pagination needed.
  async listAll() {
    return prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  },
};
