import {z} from "zod";
// POST /checkout/pay takes only the reservationId. The amount is derived
// server-side from the reservation itself — NEVER trust the client to tell
// us the amount. If we did, someone could send { reservationId: X, amount: 1 }
// and get a ₹0.01 charge for a ₹5000 item.
export const createPaymentIntentSchema = z.object({
  reservationId: z.cuid2(),
});

export type createPaymentIntentInput=z.infer<typeof createPaymentIntentSchema>;