import { z } from 'zod';

// Query params for product listing. Cursor-based pagination.
// Why cursor and not offset: skip is O(n) at high page numbers.
// Cursor pagination is O(log n) via an index on the sort column.

export const listProductsQuerySchema=z.object({
    cursor: z.cuid2().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    categorySlug: z.string().optional(),
    search: z.string().trim().min(1).max(100).optional(),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export const productSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

// Admin: create product
export const createProductSchema=z.object({
    slug:z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, digits, or hyphens'),
    name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  price: z.number().int().positive(),
  categoryId: z.cuid2().optional(),
  images: z
    .array(z.object({ url: z.string().url(), alt: z.string().optional() }))
    .min(1, 'At least one image is required')
    .max(10),
  initialStock: z.number().int().nonnegative(),
})
export type CreateProductInput = z.infer<typeof createProductSchema>;


export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  price: z.number().int().positive().optional(),
  categoryId: z.string().cuid().nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// Admin: adjust inventory. Explicit delta, not "set to X" — makes concurrent
// admin actions safe (two admins each adding 10 → +20, not last-write-wins).
export const adjustInventorySchema = z.object({
  delta: z.number().int(),
  reason: z.string().trim().min(1).max(500),
});
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;

export const productIdParamsSchema = z.object({
  id: z.cuid2(),
});