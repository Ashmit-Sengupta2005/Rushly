import 'dotenv/config';
import { z } from 'zod';
// Zod basically checks if all environment variables are configured or not and a good schema is followed or not
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  CORS_ORIGIN: z.string().url(),
  // OAuth client ID from Google Cloud Console (same value as FrontEnd's VITE_GOOGLE_CLIENT_ID).
  // ID tokens are verified against it as the audience.
  GOOGLE_CLIENT_ID: z.string().endsWith('.apps.googleusercontent.com'),
  // Proxies in front of the app (see app.ts 'trust proxy'). 1 = Render only;
  // 2 = Vercel /api rewrite → Render.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  RESERVATION_TTL_SEC: z.coerce.number().default(600),
  BULLMQ_QUEUE_PREFIX: z.string().default('rushly'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_API_VERSION: z.string().default('2026-08-26.dahlia'),
  BREVO_API_KEY: z.string().startsWith('xkeysib-'),
  EMAIL_FROM: z.string().email(),
  EMAIL_FROM_NAME: z.string().default('Rushly'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
