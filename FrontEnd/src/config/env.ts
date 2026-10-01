// Vite exposes only VITE_-prefixed vars to the client at build time.
// Access them exclusively through this module — never via import.meta.env
// scattered across the codebase. One place to catch typos and missing values.

interface Env {
  API_URL: string;         // e.g. http://localhost:4000
  API_BASE: string;        // computed: ${API_URL}/api
  STRIPE_PK: string;
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

const API_URL = readRequired('VITE_API_URL').replace(/\/$/, ''); // trim trailing slash
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
  IS_PRODUCTION: import.meta.env.PROD,
};