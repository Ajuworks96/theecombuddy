# Milestone 04C.1 Verification Report: Guest Checkout Security & Order Reliability

**Project:** The Ecom Buddy  
**Milestone:** 04C.1 (Guest Checkout Security, Atomic Order Locking & Order Reliability)  
**Status:** COMPLETED & APPROVED  
**Date:** 2026-11-02  
**License Model:** Single-Merchant Perpetual License (100% Self-Hosted, Zero Multi-Tenant SaaS Dependencies)  
**Baseline Git Commit:** `7f2f080` (Milestone 04C)  
**Verification Score:** 22/22 Milestone Tests Passed (100%) | 340/340 Total Multi-Milestone Regression Tests Passed (100%)  

---

## 1. Executive Summary

Milestone 04C.1 closes critical security, privacy, and concurrency risks identified in the guest checkout flow without rewriting the codebase or compromising existing functionality. The platform adheres strictly to the single-merchant self-hosted business model, operating entirely on the client's private PostgreSQL, Redis, and Medusa v2 infrastructure.

### Key Deliverables:
1. **Cryptographically Signed Guest Order Access (`HMAC-SHA256`):**
   - Eliminated the vulnerable query-string pattern (`/order/confirmation/:id?email=...`), which exposed customer PII and failed to prove inbox ownership.
   - Implemented an HMAC-SHA256 signed guest token (`x-guest-order-token`) and HTTP-only cookie (`teb_guest_order_${orderId}`) issued immediately upon order placement.
   - Protected the underlying Medusa Store API route (`GET /store/orders/:id`) via backend middleware (`apps/backend/src/api/middlewares.ts`). Direct Store API calls using only the public publishable key are strictly blocked (`HTTP 401 Unauthorized`).
   - Automatically masks customer phone numbers (e.g. `+91******345`) and strips internal payment session secrets before returning responses to the client.
2. **Verified-Email OTP Recovery Flow (`POST /api/orders/[id]/verify`):**
   - If a customer returns to an order confirmation page on another browser or device after session expiration, an interactive 6-digit OTP verification challenge verifies real inbox ownership.
   - Rate-limited to 5 attempts per 15 minutes per IP/Order to prevent brute force enumeration.
3. **Atomic Concurrency Locking & Duplicate Prevention (`apps/storefront/src/lib/cart-lock.ts`):**
   - Added in-memory concurrency locking to `POST /api/cart/complete`.
   - Simultaneous double-click completions acquire a short-lived lock; the second request immediately receives `HTTP 409 Conflict`.
   - Completed carts are indexed in cache so subsequent requests return `HTTP 400 Bad Request` ("Cart has already been completed. Duplicate submission rejected").
4. **Domestic India Cash on Delivery (COD) Rules (`POST /api/cart/payment`):**
   - Enforced that manual COD (`pp_system_default`) is restricted exclusively to domestic India orders (`currency_code: inr` and `shipping_address.country_code: in`).
   - Rejects non-India markets or currency/country mismatches with `HTTP 400 Bad Request`.
5. **Non-Destructive Safe Testing & Database Invariant Preservation:**
   - Eliminated all destructive raw SQL `DELETE FROM "order"`, `DELETE FROM customer`, and `DELETE FROM reservation_item` queries from verification scripts.
   - Cleanups are executed via Medusa soft-deletion (`deleted_at = NOW()`), preserving referential integrity, foreign keys, and audit history.
   - All core database invariants verified: 520 products, 1,236 SKUs, 8 categories, 4 collections, 3 baseline customer orders, and 9 customer accounts.

---

## 2. Threat Model & Remediation Architecture

### A. Guest Order PII Leakage Elimination
* **Vulnerability:** Medusa core exposes `GET /store/orders/:id` with only a publishable API key, relying on random UUID order IDs. The previous storefront implementation checked `?email=...` in the query string, which could be intercepted, logged in browser history/proxies, or guessed.
* **Remediation:**
  - In `apps/backend/src/api/middlewares.ts`, registered Medusa v2 route middleware intercepting `GET /store/orders/:id`.
  - The middleware verifies an HMAC-SHA256 signature in the `x-guest-order-token` header or `teb_guest_order_${orderId}` cookie.
  - If a token is missing, expired, signed with an invalid secret, or issued for a different order ID, the backend rejects with `HTTP 401 Unauthorized`.
  - Response sanitization scrubs sensitive payment session tokens and masks the recipient's phone number (`+91******345`).

### B. Verified-Email OTP Challenge
* **Endpoint:** `POST /api/orders/:id/verify`
* **Workflow:**
  1. `action: "request_otp"`: Checks order existence, generates a cryptographically random 6-digit verification code with a 10-minute TTL, and enforces rate limits (max 5 requests per 15 min per IP/Order).
  2. `action: "verify_otp"`: Validates the submitted code against the stored challenge. On success, issues a fresh 1-hour signed guest token and sets the `teb_guest_order_${orderId}` cookie with `HttpOnly`, `SameSite=Lax`, and `Secure` attributes.
  3. Clean URL Navigation: Redirects to `/order/confirmation/${orderId}` without appending query parameters.

### C. Concurrency Locking & Double-Click Mitigation
* **Lock Manager:** `apps/storefront/src/lib/cart-lock.ts`
* **Behavior:**
  - `acquireCartLock(cartId, ttlMs = 25000)`: Uses an atomic check-and-set mechanism.
  - When a customer rapidly double-clicks the Place Order button or concurrent requests fire:
    - Request 1: Acquires lock (`lockAcquired = true`) -> processes order via Medusa workflow.
    - Request 2: Lock acquisition fails (`lockAcquired = false`) -> immediately returns `HTTP 409 Conflict` ("Order completion is already in progress for this cart").
  - On successful completion: `markCartCompleted(cartId, orderId)` caches the completion.
  - Any subsequent request to complete the same cart immediately returns `HTTP 400 Bad Request` ("Cart has already been completed. Duplicate submission rejected").
  - `releaseCartLock(cartId)` is guaranteed in the `finally` block.

### D. Cash on Delivery (COD) Regional Restriction
* **Endpoint:** `POST /api/cart/payment`
* **Rules Enforced:**
  - Domestic Restriction: `provider_id === 'pp_system_default'` requires `currency_code === 'inr'` or `shipping_address.country_code === 'in'`. Non-India markets (e.g. USD, EUR, GBP, AED) reject COD with `HTTP 400 Bad Request`.
  - Country/Currency Alignment: Shipping to India with non-INR currency or international shipping with INR currency is rejected with `HTTP 400 Bad Request`.

---

## 3. Database Integrity & Invariant Audit

All database tables were inspected to verify zero data pollution and zero entity corruption.

| Invariant / Table | Target Count | Actual Verified Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Catalog Products (`product`)** | `520` | `520` | PASSED | Soft-deleted probes excluded; 520 baseline active |
| **Inventory Items (`inventory_item`)**| `1,236` | `1,236` | PASSED | 1,235 variant SKUs + 1 bootstrap SKU |
| **Product Categories (`product_category`)**| `8` | `8` | PASSED | All 8 primary store departments intact |
| **Product Collections (`product_collection`)**| `4` | `4` | PASSED | Eco-Conscious, Festive, New Arrivals, Bestsellers |
| **Customer Orders (`order`)** | `3` | `3` | PASSED | Verified baseline orders intact (`order_01M636...`) |
| **Customer Directory (`customer`)** | `9` | `9` | PASSED | Baseline customer accounts preserved |
| **Active Reservations (`reservation_item`)**| `0` | `0` | PASSED | Zero orphaned or unreleased reservations |

---

## 4. Multi-Milestone Test Scorecard

All automated verification test suites across all completed project milestones were executed sequentially against the live backend and storefront servers.

| Suite Script | Milestone Title | Tests Run | Passed | Failed | Score |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `verify:03a` | Custom Merchant Dashboard Foundation | 25 | 25 | 0 | 100% |
| `verify:03b` | Product Management, Variants & Inventory UI | 37 | 37 | 0 | 100% |
| `verify:03c` | Orders, Customers & Discount Management | 42 | 42 | 0 | 100% |
| `verify:03d` | Global Selling & Multi-Currency Settings | 36 | 36 | 0 | 100% |
| `verify:03e` | Store Appearance, Themes & White-Label Customization | 40 | 40 | 0 | 100% |
| `verify:04a` | Storefront Homepage & Published Theme Parity | 40 | 40 | 0 | 100% |
| `verify:04a-1`| Storefront Data Integrity & Production-Safety QA | 30 | 30 | 0 | 100% |
| `verify:04b` | PDP, Category Listing, Collections & Search | 32 | 32 | 0 | 100% |
| `verify:04c` | Cart, Shipping, Discounts & Guest Checkout UI | 36 | 36 | 0 | 100% |
| `verify:04c-1`| **Guest Checkout Security & Order Reliability** | **22** | **22** | **0** | **100%** |
| **TOTAL** | **Comprehensive Full Regression Suite** | **340** | **340** | **0** | **100.0%** |

---

## 5. Build & Typecheck Audit

| Workspace | Command | Status | Output |
| :--- | :--- | :---: | :--- |
| **Monorepo Workspaces** | `npm run typecheck --workspaces` | PASSED | 0 errors across backend, merchant, storefront, config, types, ui |
| **apps/storefront** | `npm run build:storefront` | PASSED | Static & dynamic route optimization successful |
| **apps/backend** | `npm run build:backend` | PASSED | Backend compile (18.77s) + Admin compile (51.02s) successful |
| **apps/merchant** | `npm run build:merchant` | PASSED | 41 pages compiled, optimized production bundle ready |

---

## 6. Milestone Conclusion & Handover

Milestone 04C.1 is complete and verified. The guest checkout architecture is secured with cryptographic tokenization, atomic concurrency locking, domestic COD enforcement, and non-destructive testing safety.

In strict compliance with instructions:
- Razorpay live transactions remain blocked pending production merchant credentials.
- Cashfree payment provider integration has not been started.
- Storefront customer account login and Milestone 04D development have not been started.
- Work is halted at Milestone 04C.1 completion.
