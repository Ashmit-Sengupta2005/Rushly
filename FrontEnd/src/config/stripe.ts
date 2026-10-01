import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { env } from './env';

// loadStripe caches internally, so calling it multiple times returns
// the same instance. We still wrap in a module-level singleton for clarity
// and to make it obvious this is the one and only Stripe handle.
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(env.STRIPE_PK);
  }
  return stripePromise;
}