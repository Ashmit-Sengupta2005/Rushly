import { OAuth2Client } from 'google-auth-library';
import { env } from './.env.js';

// Only verifies ID tokens (signature, expiry, audience) against Google's public
// keys — no client secret needed for this flow.
export const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
