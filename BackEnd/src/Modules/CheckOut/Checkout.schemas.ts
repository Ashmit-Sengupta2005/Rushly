import {z} from "zod";
// Reserve never takes items from the client — we use the user's server-side cart.
// This is deliberate: you never trust the client to tell you what to reserve.
// The cart is the source of truth. The body carries only the shipping address.
export const reservationIdParamsSchema = z.object({
  id: z.cuid2(),
})

// Stored as a JSON snapshot (no FK) so later address edits never rewrite
// where a past order was shipped.
export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, 'Phone must be 10–15 digits'),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pincode: z.string().trim().min(4).max(10),
  country: z.string().trim().min(2).max(100).default('India'),
});
export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;

export const createReservationSchema = z.object({
  shippingAddress: shippingAddressSchema,
});
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
