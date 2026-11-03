# The Ecom Buddy — Production Release Checklist

**Release Target:** Version 1.0.0 (Master Release)  
**Date:** 2026-11-03  
**Auditor:** Release Engineering Suite  

---

## 1. Infrastructure & Hosting Checklist

- [x] Docker Engine >= 24.0 and Docker Compose v2 installed on target server.
- [x] System meets minimum hardware specifications (>= 4GB RAM, >= 2 vCPUs, >= 25GB SSD).
- [x] Public ports 80 and 443 open with UFW / cloud security group firewall rules.
- [x] DNS A-records configured for Storefront (`theecombuddy.com`), Merchant (`admin.theecombuddy.com`), and Backend API (`api.theecombuddy.com`).
- [x] Caddy edge proxy configured with automatic Let's Encrypt TLS in `deploy/reverse-proxy/Caddyfile`.
- [x] Multi-stage production Dockerfiles verified for Backend, Merchant, and Storefront.
- [x] `npm run deploy:check` scores 7/7 passes.

---

## 2. Security & Credentials Checklist

- [x] `JWT_SECRET` generated with 256-bit entropy (`openssl rand -base64 32`).
- [x] `COOKIE_SECRET` generated with 256-bit entropy.
- [x] `GUEST_ORDER_SECRET` generated with 256-bit entropy.
- [x] Default merchant administration password rotated via `rotate-admin-password.js`.
- [x] Session revocation enabled with Redis denylist TTL.
- [x] Distributed Redis cart locking enabled with atomic Lua script release.
- [x] Customer PII masking enabled on `GET /store/orders/:id`.
- [x] Cross-customer order ownership isolation enforced via backend middleware.
- [x] SVG media uploads inspected and sanitized against XSS attacks.
- [x] Newsletter & contact endpoints protected by IP-based Redis rate limiters.

---

## 3. Database & Catalog Invariant Checklist

- [x] Exactly 520 active catalog products preserved in PostgreSQL `product` table.
- [x] Exactly 1,235 active variants preserved in `product_variant` table.
- [x] Exactly 1,236 active SKUs monitored across warehouse inventory items.
- [x] Exactly 8 root product categories verified with active products.
- [x] Exactly 4 curated marketing collections verified.
- [x] Exactly 3 historical customer orders preserved.
- [x] Exactly 9 customer accounts preserved.
- [x] Migration `001_theme_configurations.sql` applied cleanly.
- [x] Migration `002_release_hardening.sql` applied cleanly.
- [x] Automated backup script (`npm run deploy:backup`) tested and verified with SHA-256 sums.
- [x] Dry-run restore audit (`npm run deploy:restore-check`) verified.

---

## 4. Payment Gateways & Guardrails Checklist

- [x] Razorpay payment provider registered in `medusa-config.ts`.
- [x] Cashfree payment provider registered in `medusa-config.ts`.
- [x] Cash on Delivery (pp_system_default) restricted to domestic INR orders.
- [x] Durable webhook deduplication inbox (`payment_event_inbox`) active with unique constraint on `(provider_id, event_id)`.
- [x] Razorpay webhook signature verification enabled via HMAC-SHA256.
- [x] Cashfree webhook signature verification enabled via HMAC-SHA256.
- [x] Gateways fail closed safely if unconfigured without faking live transactions.

---

## 5. White-Label Offline Licensing Checklist

- [x] Asymmetric cryptographic verification key embedded in `apps/merchant/src/lib/license.ts`.
- [x] `deploy/license.json` manifest signed via vendor private key using RSA-SHA256.
- [x] Signature verification runs 100% offline with zero external network dependencies.
- [x] Wildcard domain matching (`*.theecombuddy.com`) active.
- [x] License management UI active in merchant dashboard settings.
- [x] Tamper detection verified (manifest alteration results in `invalid_signature`).

---

## 6. Automated Test Suites Checklist

- [x] `npm run verify:03a`: 25/25 passed
- [x] `npm run verify:03b`: 37/37 passed
- [x] `npm run verify:03c`: 42/42 passed
- [x] `npm run verify:03d`: 36/36 passed
- [x] `npm run verify:03e`: 40/40 passed
- [x] `npm run verify:04a`: 40/40 passed
- [x] `npm run verify:04a-1`: 30/30 passed
- [x] `npm run verify:04b`: 32/32 passed
- [x] `npm run verify:04c`: 36/36 passed
- [x] `npm run verify:04c-1`: 22/22 passed
- [x] `npm run verify:04d`: 30/30 passed
- [x] `npm run verify:release`: 34/34 passed
- [x] **Grand Total:** 404/404 passed (0 failures)
- [x] `npm run typecheck --workspaces`: 0 errors across all 6 packages
- [x] `npm run build:merchant`: 0 errors
- [x] `npm run build:storefront`: 0 errors
- [x] `npm run build:backend`: 0 errors
