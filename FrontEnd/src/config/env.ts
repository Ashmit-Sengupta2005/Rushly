// Vite exposes only VITE_-prefixed vars to the client at build time.
// Access them exclusively through this module — never via import.meta.env
// scattered across the codebase. One place to catch typos and missing values.

interface Env {
  API_URL: string;         // e.g. http://localhost:4000 — or '' for same-origin
  API_BASE: string;        // computed: ${API_URL}/api  (→ '/api' when same-origin)
  STRIPE_PK: string;
  GOOGLE_CLIENT_ID: string; // '' → Google sign-in button is hidden
  IS_PRODUCTION: boolean;
}

function readRequired(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required env variable ${key}. Set it in FrontEnd/.env (see .env.example).`,
    );
  }
  return value;
}

// OPTIONAL. Leave it unset in production: vercel.json proxies /api/* to Render,
// so the API is same-origin and the httpOnly refresh cookie (sameSite: 'lax')
// is first-party. Pointing it straight at onrender.com would make the cookie
// cross-site — browsers drop it and every reload logs the user out.
// Local dev sets it to http://localhost:4000 (same site as localhost:5173).
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? '')
  .trim()
  .replace(/\/$/, ''); // trim trailing slash
// OPTIONAL. Public OAuth client ID (safe in the browser). Unset → no Google button.
const GOOGLE_CLIENT_ID = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '').trim();
const STRIPE_PK = readRequired('VITE_STRIPE_PUBLISHABLE_KEY');

if (!STRIPE_PK.startsWith('pk_')) {
  throw new Error(
    'VITE_STRIPE_PUBLISHABLE_KEY must start with "pk_" — did you paste the secret key by mistake?',
  );
}

export const env: Env = {
  API_URL,
  API_BASE: `${API_URL}/api`,
  STRIPE_PK,
  GOOGLE_CLIENT_ID,
  IS_PRODUCTION: import.meta.env.PROD,
};