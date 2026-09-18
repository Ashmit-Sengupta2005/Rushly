import { z } from 'zod';

export const orderIdParamsSchema = z.object({
  id: z.cuid2(),
});

export const listOrdersQuerySchema = z.object({
  cursor: z.cuid2().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;