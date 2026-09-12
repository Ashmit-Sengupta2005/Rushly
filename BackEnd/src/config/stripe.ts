import Stripe from "stripe";
import { env } from "./.env.js";
// Just remember during payments stripe is our client not the customer
// Single Stripe client, initialized once at boot. All modules import from here.
// Passing apiVersion pins behavior — Stripe's response shapes are version-locked.
export const stripe=new Stripe(env.STRIPE_SECRET_KEY,{
    apiVersion:env.STRIPE_API_VERSION as Stripe.LatestApiVersion,
    typescript:true,// enables the TypeScript-optimized types
});