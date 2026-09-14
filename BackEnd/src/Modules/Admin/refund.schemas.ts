import {z} from 'zod';
// Refund can be full or partial. If amount is omitted, it's a full refund.
// If amount is specified, must be less than or equal to remaining refundable amount.
export const initiateRefundSchema=z.object({
    amount:z.number().int().positive().optional(), // in paise; omit for full refund
    reason:z.enum(['requested_by_customer', 'duplicate', 'fraudulent', 'other']),
    notes:z.string().trim().min(1).max(500).optional(),
});

export type initiateRefundInput=z.infer<typeof initiateRefundSchema>;

export const orderIdParamsSchema = z.object({
  id: z.cuid2(),
});