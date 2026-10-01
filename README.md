# Rushly — Flash-Sale Storefront

A production-grade flash-sale backend modeled on Nike SNKRS drops. Built to prove one specific engineering invariant: **no overselling under concurrent load** — verified by a k6 load test that spawns 500 virtual users racing for 100 units of stock and asserts exactly 100 succeed.

**[Live API](https://rushly-backend.onrender.com/api/health)** · **[Load test results](#load-test-results)** · **[Architecture](#architecture)**

---

## Why Rushly exists

When 500 people click "Buy" for 100 units at the same instant, most e-commerce systems oversell. The naive `read stock → check → decrement → write` pattern races: two requests both see stock=1, both check `>0`, both decrement, and one unit gets sold twice.

Rushly is the system that **doesn't** oversell — and proves it with a load test that would fail the build if a single oversell slipped through. It's not built to compete with Shopify; it's built to demonstrate the specific engineering that makes a scarcity-driven storefront correct under contention.

Real-world analogs: Nike SNKRS drops, Ticketmaster onsales, Xiaomi flash sales.

---

## Architecture

![Architecture]
<img width="900" height="950" alt="preview" src="https://github.com/user-attachments/assets/9025f62e-1c8f-43bd-ae86-68ace7aabd85" />

Three data stores, each doing what it's best at:

- **PostgreSQL (Neon)** — durable source of truth for users, products, orders, reservations, audit logs
- **Redis (Upstash)** — atomic inventory counter, reservation holds with TTL, BullMQ job queue backend
- **Stripe** — payment source of truth; backend never trusts client for payment outcomes

Cross-cutting patterns:
- **Redis Lua scripts** for atomic multi-item stock reservation (single-threaded Redis event loop guarantees no race)
- **BullMQ delayed jobs** for reservation expiry (10-minute TTL) and outbox dispatch
- **Transactional outbox** for reliable email delivery (Brevo) — decouples slow email service from Stripe's 10-second webhook timeout
- **Webhook idempotency** via PostgreSQL unique constraint on Stripe's `event.id` — safe under at-least-once delivery

---

## Load Test Results

500 concurrent virtual users raced for 100 units of stock:

![Load Test Results]

<img width="700" height="700" alt="image" src="https://github.com/user-attachments/assets/dffde119-8f74-4cad-a7d7-23944aa3615d" />
<img width="700" height="700" alt="image" src="https://github.com/user-attachments/assets/7865be5f-c137-4a39-af42-29019ee27138" />

| Metric | Result |
|--------|--------|
| Successful reservations | **100** (matches stock exactly) |
| Overselling | **0** |
| Clean out-of-stock (409) responses | 400 |
| HTTP failures | 0 out of 1,500 total requests |
| p95 checkout latency (under peak load) | 1.86s |
| avg reservation-flow duration | 2.38s |
| Total requests processed | 1,500 |

The k6 script asserts `reservation_oversold == 0` and `reservation_success == 100` as **hard thresholds** — the test process exits non-zero and fails CI if either invariant is violated.

Reproduce it yourself:
```bash
cd backend
k6 run \
  -e BASE_URL=http://localhost:4000/api \
  -e PRODUCT_ID=cmummic4n0005egu45sy18gk6 \
  -e TARGET_STOCK=100 \
  -e NUM_USERS=500 \
  load-tests/no-oversell.js
```

---

## Key Design Decisions

| Decision | Alternative Considered | Why This |
|----------|------------------------|----------|
| **Redis Lua** for atomic stock decrement | PostgreSQL `SELECT FOR UPDATE` | Sub-millisecond atomicity without DB row-lock contention at scale |
| **Reservation and Order as separate entities** | Single Order with mega-status field | Different lifecycles (10-min ephemeral vs permanent), cleaner state machines |
| **Snapshot pricing on OrderItem** | Reference current product price | Historical accuracy — orders always reflect what the customer actually paid |
| **Webhook idempotency via `stripeEventId` unique constraint** | Check-then-insert | Race-free at DB level (Stripe delivers at-least-once) |
| **Transactional outbox for emails** | Inline email send in webhook handler | Slow email service can't cause Stripe to retry the webhook |
| **Write-through cache with 5-min TTL fallback** | No cache / cache-aside | Handles product read scale; TTL self-heals cache invalidation failures |
| **argon2id password hashing** | bcrypt | Memory-hard, GPU/ASIC resistant, current PHC standard |
| **Access + refresh tokens with httpOnly cookie** | Single JWT in localStorage | XSS-safe refresh; version-based revocation via token version bump |
| **Feature-modular structure (`src/modules/*/`)** | Layered (`controllers/`, `services/`) | Scales to ~10 features cleanly; deleting a feature = deleting one folder |

---

## Tech Stack

**Backend:** Node.js 20, TypeScript, Express, Prisma ORM v7, BullMQ

**Data:** PostgreSQL 16 (Neon), Redis 7 (Upstash)

**Payments:** Stripe (test mode, INR)

**Email:** Brevo (transactional)

**Testing:** k6 for load testing, Postman for integration

**Deployment:** Render (backend), Docker multi-stage build

---

## API Overview

| Module | Endpoints | Notes |
|--------|-----------|-------|
| **Auth** | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `GET /auth/me` | Access + refresh with token rotation, httpOnly cookie |
| **Catalog** | `GET /products`, `GET /products/:slug` | Cursor pagination, Redis cached |
| **Admin catalog** | `POST/PATCH/DELETE /admin/products`, `PATCH /admin/products/:id/inventory` | RBAC-guarded, audit-logged |
| **Cart** | `GET/POST/PATCH/DELETE /cart` | Snapshot pricing, duplicate merge |
| **Checkout** | `POST /checkout/reserve`, `/pay`, `GET/DELETE /checkout/reservations/:id` | Redis Lua reservation, Stripe intent creation |
| **Orders** | `GET /orders`, `GET /orders/:id` | User-scoped |
| **Webhooks** | `POST /webhooks/stripe` | Signature-verified, idempotent |
| **Admin** | `POST /admin/orders/:id/refund`, `GET /admin/metrics/revenue` | Refund initiation, revenue analytics |
| **System** | `GET /health` | PostgreSQL + Redis liveness |

---

## Running Locally

**Prerequisites:** Docker, pnpm, Node 20+

1. Clone: `git clone https://github.com/Ashmit-Sengupta2005/Rushly && cd Rushly/backend`
2. Copy env: `cp .env.example .env` — fill in Stripe test keys, Brevo API key. Generate JWT secrets:
```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
3. Start local services: `docker compose up -d`
4. Install: `pnpm install`
5. Migrate: `pnpm exec prisma migrate deploy`
6. Seed: `pnpm exec prisma db seed`
7. Start dev server: `pnpm dev`
8. In another terminal, forward Stripe webhooks:
```bash
   stripe listen --forward-to http://localhost:4000/api/webhooks/stripe
```
9. Sanity check:
```bash
   curl http://localhost:4000/api/health
   # → {"status":"ok","postgres":"up","redis":"up"}
```

**Default credentials** (from `prisma/seed.ts`):
- Admin: `admin@rushly.local` / `admin_dev_password_change_me`
- Customer: `customer@rushly.local` / `customer_dev_password`

---

## Testing

**Integration:**
```bash
# Full end-to-end via Postman collection
# Import docs/rushly.postman_collection.json → run "Rushly E2E" collection
```

**Load / correctness:**
```bash
cd backend
# 1. Seed 500 test users
pnpm exec tsx scripts/seed-load-test-users.ts

# 2. Create a fresh product with stock=100 via admin API

# 3. Run the k6 test — asserts no oversell
k6 run \
  -e BASE_URL=http://localhost:4000/api \
  -e PRODUCT_ID=<PASTE_A_PRODUCT_ID> \
  -e TARGET_STOCK=100 \
  -e NUM_USERS=500 \
  load-tests/no-oversell.js
```

---

## What I'd Do at 100× Scale

- **Virtual waiting room** — Redis sorted set as FIFO queue, admission worker admits N users per batch. Prevents thundering herd on the checkout endpoint. (Planned as v1.1.)
- **Inventory sharding** — split a 10,000-unit product into 10 Redis keys of 1,000 each, randomly assign shoppers. Reduces per-key contention 10×.
- **Kafka or Redis Streams** — move order creation off the webhook hot path so the webhook returns 200 in <10ms regardless of DB write load.
- **Reconciliation job** — periodically sweep PENDING Postgres reservations past their expiry against Redis to catch stranded holds (currently relies on TTL alone).
- **Prometheus + Grafana** — Lua execution time, queue depth, reservation success rate, p95 latency dashboards.  
- **Multi-region deployment** — Redis replication for global drops; hash-tagged keys so co-located items stay on the same node in Redis Cluster.

---

## Roadmap

- **v1.1** — Frontend (React + Vite + Stripe Elements), Virtual Waiting Room
- **v1.2** — Full admin dashboard (funnel metrics, top products, conversion rates)
- **v1.3** — Multi-vendor marketplace mode (separate project scope)

---

## License

MIT

---

_Built by Ashmit Sengupta — [GitHub](https://github.com/Ashmit-Sengupta2005) · [LinkedIn](https://www.linkedin.com/in/ashmit-sengupta-33b826307/)
