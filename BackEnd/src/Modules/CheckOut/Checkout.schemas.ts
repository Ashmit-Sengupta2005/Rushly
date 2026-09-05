import {z} from "zod";
// Reserve endpoint takes no body — we use the user's server-side cart.
// This is deliberate: you never trust the client to tell you what to reserve.
// The cart is the source of truth.
export const reservationIdParamsSchema = z.object({
  id: z.uuid(),
})