import { z } from 'zod';

export const addItemSchema=z.object({
    productId:z.cuid2(),
    quantity:z.number().int().positive().max(100),
});
export type addItemInput=z.infer<typeof addItemSchema>;

export const updateItemSchema=z.object({
    quantity:z.number().int().positive().max(100)
});
export type updateItemInput=z.infer<typeof updateItemSchema>;

export const productIdParamsSchema = z.object({
  productId: z.cuid2(),
});
