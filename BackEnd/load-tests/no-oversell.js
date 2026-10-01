// k6 "no oversell" test: NUM_USERS customers race to reserve one product
// that has exactly TARGET_STOCK units. It passes only if exactly TARGET_STOCK
// reservations succeed and everyone else gets a clean "sold out" (409).
//
// Before each run (local Docker + `pnpm dev` running):
//   pnpm loadtest:seed                          (once — creates loadtest0..499 users)
//   pnpm loadtest:reset <productId> 100         (every run — clean carts + stock = 100)
// Run:
//   k6 run -e PRODUCT_ID=<productId> -e TARGET_STOCK=100 -e NUM_USERS=500 load-tests/no-oversell.js
//
// Two local-testing workarounds, both explained where they're used:
//   - logins happen in setup(), before the race, so login time doesn't blur the result
//   - each user sends its own X-Forwarded-For so the per-IP rate limiters don't block them

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/api';
const PRODUCT_ID = __ENV.PRODUCT_ID;
const TARGET_STOCK = parseInt(__ENV.TARGET_STOCK || '100');
const NUM_USERS = parseInt(__ENV.NUM_USERS || '500');
// Users arrive at random within this window. Without it, Windows refuses many
// connections when 500 open in the same millisecond (its accept queue overflows).
const ARRIVAL_WINDOW_SEC = parseFloat(__ENV.ARRIVAL_WINDOW_SEC || '2');
const PASSWORD = 'loadtest_password';
const SETUP_BATCH = 25;
// /checkout/reserve requires a shipping address (validated server-side)
const RESERVE_BODY = JSON.stringify({
  shippingAddress: {
    fullName: 'Load Test',
    phone: '9999999999',
    line1: '1 Test Street',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700001',
  },
});

const reservationSuccess = new Counter('reservation_success');
const reservationOutOfStock = new Counter('reservation_out_of_stock');
const reservationUnexpected = new Counter('reservation_unexpected');

export const options = {
  setupTimeout: '10m',
  scenarios: {
    stampede: {
      executor: 'per-vu-iterations',
      vus: NUM_USERS,
      iterations: 1,
      maxDuration: '90s',
    },
  },
  thresholds: {
    // The no-oversell proof: never more successes than stock, and no stock left unsold.
    reservation_success: [`count<=${TARGET_STOCK}`, `count==${TARGET_STOCK}`],
    // Every other user must get a clean 409, not a 500 or a timeout.
    reservation_unexpected: ['count==0'],
  },
};

// Unique fake client IP per user, e.g. user 300 -> 10.0.1.44.
// app.ts sets `trust proxy`, so locally the rate limiters key on this header.
// (Behind Render's proxy this would NOT bypass the limits.)
const ipFor = (i) => `10.0.${Math.floor(i / 256)}.${i % 256}`;

const headersFor = (i, token) => ({
  'Content-Type': 'application/json',
  'X-Forwarded-For': ipFor(i),
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// Runs once before the race: log every user in and put 1 unit in their cart.
export function setup() {
  if (!PRODUCT_ID) throw new Error('PRODUCT_ID env var required (-e PRODUCT_ID=...)');
  console.log(`Load test: ${NUM_USERS} users vs ${TARGET_STOCK} stock`);

  const tokens = [];
  for (let start = 0; start < NUM_USERS; start += SETUP_BATCH) {
    const ids = [];
    for (let i = start; i < Math.min(start + SETUP_BATCH, NUM_USERS); i++) ids.push(i);

    const logins = http.batch(ids.map((i) => ({
      method: 'POST',
      url: `${BASE_URL}/auth/login`,
      body: JSON.stringify({ email: `loadtest${i}@rushly.local`, password: PASSWORD }),
      params: { headers: headersFor(i), tags: { name: 'setup_login' } },
    })));
    logins.forEach((res, k) => {
      if (res.status !== 200) throw new Error(`login failed for loadtest${ids[k]}: ${res.status} ${res.body}`);
      tokens[ids[k]] = res.json('tokens'); // login returns the access token as `tokens`
    });

    const carts = http.batch(ids.map((i) => ({
      method: 'POST',
      url: `${BASE_URL}/cart/items`,
      body: JSON.stringify({ productId: PRODUCT_ID, quantity: 1 }),
      params: { headers: headersFor(i, tokens[i]), tags: { name: 'setup_cart' } },
    })));
    carts.forEach((res, k) => {
      if (res.status >= 300) throw new Error(`add-to-cart failed for loadtest${ids[k]}: ${res.status} ${res.body}`);
    });
  }
  return { tokens };
}

// The race: every user hits "reserve" within the first few seconds of the drop.
export default function (data) {
  const i = __VU - 1;
  sleep(Math.random() * ARRIVAL_WINDOW_SEC);

  const reserveRes = http.post(`${BASE_URL}/checkout/reserve`, RESERVE_BODY, {
    headers: headersFor(i, data.tokens[i]),
    tags: { name: 'reserve' },
    responseCallback: http.expectedStatuses(201, 409),
  });

  if (reserveRes.status === 201) reservationSuccess.add(1);
  else if (reserveRes.status === 409) reservationOutOfStock.add(1);
  else {
    reservationUnexpected.add(1);
    console.error(`VU ${__VU} unexpected status: ${reserveRes.status} ${reserveRes.body}`);
  }

  check(reserveRes, {
    'reserve is 201 or 409': (r) => r.status === 201 || r.status === 409,
  });
}
