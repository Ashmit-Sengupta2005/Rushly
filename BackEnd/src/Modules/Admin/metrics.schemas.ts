import {z} from "zod";

export const revenueByDayQuerySchema=z.object({
    // Look back N days. Default 30, max 365.
    days: z.coerce.number().int().min(1).max(365).default(30),
});
export type RevenueByDayQuery = z.infer<typeof revenueByDayQuerySchema>;