// scripts/oversell-test.ts
// Fire N concurrent reservation requests against a low-stock product.
// Assert: successes = min(N, stock).
//
// Setup: admin sets a product's stock to exactly 10.
//        Create N=50 test users (or reuse one — same behavior for stock).
//        Each user has 1 unit of the product in cart.
//        Fire all 50 reserve requests in parallel via Promise.all.
//        Count 201 responses vs 409 responses.

import { fetch } from 'undici';

const BASE = 'http://localhost:4000/api';
const N = 50;
const STOCK = 10;
// Set to a valid access token before running: TOKEN=... tsx src/scripts/Oversell-test.ts
const TOKEN = process.env.TOKEN ?? '';

// You'll need to seed N users and log them all in to get N access tokens.
// For a quick smoke test, use one user + one product + qty=1 in cart, then
// hit reserve N times in parallel — the same user can only reserve once
// (cart becomes empty), so this test is more useful when built out with N users.
// See README for the fuller pattern.

async function main() {
  // ...spawn N reservation attempts...
  const results = await Promise.allSettled(
    Array.from({ length: N }, () =>
      fetch(`${BASE}/checkout/reserve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}` },
      }).then((r) => r.status),
    ),
  );

  const successes = results.filter(
    (r) => r.status === 'fulfilled' && r.value === 201,
  ).length;

  console.log(`Success: ${successes} / ${N} (expected ${Math.min(N, STOCK)})`);
  if (successes === Math.min(N, STOCK)) {
    console.log('✅ NO OVERSELL');
  } else {
    console.log('❌ OVERSELL DETECTED');
  }
}

main();