# Milestone 04D Verification Report: Customer Accounts, Order History, Address Book and Order Tracking

**Project:** The Ecom Buddy  
**Milestone:** 04D (Customer Accounts, Order History, Address Book and Order Tracking)  
**Status:** COMPLETED & APPROVED  
**Date:** 2026-11-02  
**License Model:** Single-Merchant Perpetual License (100% Self-Hosted, Zero Multi-Tenant SaaS Dependencies)  
**Baseline Git Commit:** `7f5af1b` (Milestone 04C.1)  
**Verification Score:** 30/30 Milestone Tests Passed (100%) | 370/370 Total Multi-Milestone Regression Tests Passed (100%)  

---

## 1. Executive Summary

Milestone 04D builds a production-grade, secure customer account portal and post-purchase management platform on top of the existing Medusa v2 commerce engine and the published white-label theme system (`apps/storefront`). Every component, API endpoint, and UI view directly integrates with Medusa v2 Customer and Auth modules, PostgreSQL database tables, and self-hosted Redis caching without artificial bypasses, mock data, or external multi-tenant SaaS telemetry.

All core database entities remain 100% intact: **520 active products**, **1,236 inventory SKUs**, **8 categories**, **4 collections**, **3 historical customer orders**, and **9 baseline customer accounts**.

### Key Deliverables Completed:
1. **Phase 0 Security Preflight & Remediation:**
   - **OTP Protection:** Removed plaintext OTP `console.log` logging and `x-test-otp` HTTP headers. OTP challenges are stored as SHA-256 hashes in Redis (`otp:challenge:${orderId}`) with a 10-minute TTL, rate-limited to 5 requests per 15 minutes, and deleted immediately upon single use.
   - **Order Ownership Isolation:** Enhanced backend middleware (`apps/backend/src/api/middlewares.ts`) to intercept `GET /store/orders/:id`. For authenticated customer requests, Medusa enforces customer matching (`order.customer_id === authContext.actor_id`), rejecting cross-customer order probing with `HTTP 403 Forbidden`.
   - **Distributed Cart Concurrency Locking:** Updated `apps/storefront/src/lib/cart-lock.ts` to utilize atomic Redis `SET lock:cart:${cartId} ownerToken PX ttl NX` with owner-safe Lua script release. Rapid double-clicks return `HTTP 409 Conflict`, and already completed carts return `HTTP 400 Bad Request`.
   - **Zero Test Reservation Discrepancies:** Resolved test order teardown logic in `verify-milestone-04c-1.js` by recalculating `inventory_level.reserved_quantity` to ensure 0 reservation discrepancies across all 1,236 catalog SKUs.
2. **Customer Authentication & Session Lifecycle:**
   - Full authentication flows via `apps/storefront/src/app/api/auth/customer/`: `register`, `login`, `logout`, `me`, `password`, and `forgot-password`.
   - Secure session tokens stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies (`teb_customer_token`) with a 7-day expiration.
   - Branded responsive UI pages for Customer Login (`/login`) and Customer Registration (`/register`) with automatic redirection to return URLs (`?redirect=...`).
3. **Customer Account Dashboard (`/account`):**
   - Theme-aware overview page featuring personalized greetings, account summary statistics (Total Orders, Active Shipments, Saved Addresses), quick links to primary sections, most recent order preview, and an interactive Guest Order Claim card.
4. **Order History & Real-Time Shipment Tracking (`/account/orders` & `/account/orders/[id]`):**
   - Chronological list of customer orders with Medusa line items, thumbnails, order dates, payment status (including COD pending collection), and localized currency totals (INR, USD, AED, GBP, EUR).
   - Detailed Order View featuring a visual fulfillment timeline (Order Placed, Processing, Dispatched, Delivered), verified shipping address, itemized breakdown, and payment summary.
   - **Zero Fake Tracking Milestones:** Unfulfilled or unassigned shipments accurately show "Pending Dispatch" without fabricated carrier tracking milestones or mock timestamps.
5. **Customer Address Book (`/account/addresses`):**
   - Interactive address management supporting multiple shipping and billing destinations.
   - Create, edit, and delete addresses directly synced to Medusa `customer_address` records.
   - Primary address designation with visual "Default" badges.
6. **Profile & Password Management (`/account/profile`):**
   - Customer profile editor allowing instant updates to first name, last name, and contact phone number.
   - Secure password update form requiring validation of current credentials before applying new passwords.
7. **Guest Order Recovery & Account Association (`/api/account/orders/claim`):**
   - Allows registered customers to link past guest checkout orders to their account.
   - Strictly enforces cryptographic proof of ownership (valid signed guest order token or verified email OTP) and verifies that the order's email matches the authenticated customer's email. Rejects mismatched accounts with `HTTP 403 Forbidden`.
8. **Per-Installation Notification Abstraction (`apps/storefront/src/lib/notifications.ts`):**
   - Abstracted email notification delivery supporting self-hosted SMTP configurations.
   - **Fail-Closed Resilience:** If mail server credentials (`SMTP_HOST`, etc.) are unconfigured or down, the system logs an audit trace to Redis and fails closed with `HTTP 503 NOTIFICATION_SERVICE_UNAVAILABLE` rather than faking external delivery.
9. **White-Label Theme Engine Integration:**
   - All customer account views dynamically adapt typography, surface colors, card geometry, and button shapes across all 4 merchant theme presets: **Crescendo Electronics**, **Velora Minimal Luxury**, **Aero Step High Energy**, and **Philox Direct-to-Consumer**.
10. **Automated Visual QA Screenshots:**
    - Captured 10 high-fidelity desktop (1440x900) and mobile (390x844) browser screenshots using real headless Google Chrome across all account and authentication workflows.

---

## 2. Threat Model & Security Preflight Remediation

### A. Check 1: OTP Email Delivery & Privacy Elimination
* **Vulnerability:** Previously, temporary development OTPs were printed to `console.log` and returned in the HTTP response header `x-test-otp`, violating production privacy standards.
* **Remediation:**
  - Removed all plaintext OTP logging and deleted `x-test-otp` headers.
  - OTPs are hashed using `crypto.createHash('sha256')` before being stored in Redis under `otp:challenge:${orderId}` with a strict 10-minute TTL.
  - Rate limiting is enforced in Redis (`rate:otp:${key}`) allowing at most 5 attempts per 15 minutes per IP/Order.
  - Once validated, the challenge key is immediately purged from Redis to prevent replay attacks.
  - Added support for `simulate_outage` testing, responding with `HTTP 503 NOTIFICATION_SERVICE_UNAVAILABLE`.

### B. Check 2: Customer Order Isolation & Authorization
* **Vulnerability:** Probing `GET /store/orders/:id` directly using a public publishable API key or customer token could allow unauthorized viewing of orders belonging to other customers.
* **Remediation:**
  - In `apps/backend/src/api/middlewares.ts`, registered Medusa v2 route middleware intercepting `GET /store/orders/:id`.
  - For unauthenticated sessions, requires a valid HMAC-SHA256 signed `x-guest-order-token` matching the order ID.
  - For authenticated customer sessions, Medusa validates that `order.customer_id === authContext.actor_id`. Cross-customer order queries return `HTTP 403 Forbidden` ("Access denied: you do not have permission to access another customer's order").
  - Response sanitization scrubs sensitive payment session secrets and masks customer phone numbers (`+91******345`).

### C. Check 3: Concurrency Locking in Distributed Redis
* **Vulnerability:** In-memory maps in single Node processes fail in multi-process or clustered environments, allowing race conditions during cart completion.
* **Remediation:**
  - Refactored `apps/storefront/src/lib/cart-lock.ts` to use Redis distributed locking:
    ```typescript
    await redis.set(`lock:cart:${cartId}`, ownerToken, "PX", ttlMs, "NX");
    ```
  - Lock release executes an atomic Lua script ensuring only the lock owner can release it:
    ```lua
    if redis.call('get', KEYS[1]) == ARGV[1] then
      return redis.call('del', KEYS[1])
    else
      return 0
    end
    ```
  - Completed carts are indexed in Redis (`completed:cart:${cartId}`) with the generated `order_id` for 24 hours. Duplicate submissions immediately receive `HTTP 400 Bad Request`.

### D. Check 4: Inventory Invariant Recalculation & Teardown Safety
* **Vulnerability:** Verification scripts previously soft-deleted `reservation_item` records without recalculating `inventory_level.reserved_quantity`, leaving a residual reservation discrepancy on test SKUs.
* **Remediation:**
  - Updated `apps/storefront/src/scripts/verify-milestone-04c-1.js` and `verify-milestone-04d.js` to execute an inventory level recalculation query on test teardown:
    ```sql
    UPDATE inventory_level il
    SET reserved_quantity = COALESCE(
      (SELECT SUM(quantity) FROM reservation_item ri 
       WHERE ri.inventory_item_id = il.inventory_item_id 
       AND ri.location_id = il.location_id 
       AND ri.deleted_at IS NULL), 0
    )
    ```
  - Verified 0 discrepancies across all 1,236 SKUs in the catalog.

---

## 3. Database Integrity & Baseline Invariants Audit

All PostgreSQL tables were audited to guarantee zero test pollution and absolute catalog preservation.

| Database Invariant / Entity | Baseline Count | Milestone 04D Verified Count | Status | Verification Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Catalog Products (`product`)** | `520` | `520` | **PASSED** | 520 active catalog items; soft-deleted probes excluded |
| **Inventory Items (`inventory_item`)** | `1,236` | `1,236` | **PASSED** | 1,235 variant SKUs + 1 bootstrap SKU |
| **Product Categories (`product_category`)** | `8` | `8` | **PASSED** | Electronics, Apparel, Footwear, Home & Kitchen, etc. |
| **Product Collections (`product_collection`)**| `4` | `4` | **PASSED** | Eco-Conscious, Festive, New Arrivals, Bestsellers |
| **Customer Orders (`order`)** | `3` | `3` | **PASSED** | Historical orders intact (`order_01M636...`, `order_01M637...`) |
| **Customer Directory (`customer`)** | `9` | `9` | **PASSED** | Baseline customer records preserved; test customers purged |
| **Active Reservations (`reservation_item`)** | `0` | `0` | **PASSED** | Zero orphaned reservations; 100% SKU stock consistency |

---

## 4. Multi-Milestone Test Scorecard (11 Suites / 370 Tests)

All 11 automated verification test suites across all completed project milestones were executed sequentially against the live backend, merchant, and storefront servers.

| Suite Script | Milestone Title | Tests Run | Passed | Failed | Score |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `verify:03a` | Custom Merchant Dashboard Foundation | 25 | 25 | 0 | 100.0% |
| `verify:03b` | Product Management, Variants & Inventory UI | 37 | 37 | 0 | 100.0% |
| `verify:03c` | Orders, Customers & Discount Management | 42 | 42 | 0 | 100.0% |
| `verify:03d` | Global Selling & Multi-Currency Settings | 36 | 36 | 0 | 100.0% |
| `verify:03e` | Store Appearance & White-Label Theme System | 40 | 40 | 0 | 100.0% |
| `verify:04a` | Dynamic Customer Storefront Homepage | 40 | 40 | 0 | 100.0% |
| `verify:04a-1` | Storefront Data Integrity & Design QA | 30 | 30 | 0 | 100.0% |
| `verify:04b` | Product Detail Pages, Discovery & Search | 32 | 32 | 0 | 100.0% |
| `verify:04c` | Shopping Cart, Shipping & Checkout UI | 36 | 36 | 0 | 100.0% |
| `verify:04c-1` | Guest Checkout Security & Order Reliability | 22 | 22 | 0 | 100.0% |
| `verify:04d` | Customer Accounts, Orders & Order Tracking | 30 | 30 | 0 | 100.0% |
| **TOTAL** | **Milestones 03A through 04D Cumulative** | **370** | **370** | **0** | **100.0%** |

---

## 5. Milestone 04D Detailed Test Results (30/30)

```
==============================================================================
THE ECOM BUDDY — MILESTONE 04D VERIFICATION SUITE
Customer Accounts, Order History, Address Book and Order Tracking
==============================================================================

--- SUITE 1: Customer Registration, Authentication & Session Lifecycle ---
  [PASSED] Test 1: Customer registration creates new customer record bound to Medusa auth identity (HTTP 201)
  [PASSED] Test 2: Customer login authenticates valid credentials, returns JWT session and sets secure httpOnly cookie (HTTP 200)
  [PASSED] Test 3: Customer logout clears session cookie (HTTP 200)
  [PASSED] Test 4: Invalid login credentials safely rejected with HTTP 401 Unauthorized
  [PASSED] Test 5: Password reset flow dispatches notification abstraction without leaking user existence (HTTP 200)
  [PASSED] Test 6: Protected customer session routes reject invalid or expired tokens (HTTP 401)

--- SUITE 2: Customer Profile & Address Book Management ---
  [PASSED] Test 7: Profile update modifies customer name and phone via Medusa Store API (HTTP 200)
  [PASSED] Test 8: Add delivery address saves shipping destination to customer address book (HTTP 201)
  [PASSED] Test 9: Edit delivery address updates address fields in Medusa customer directory (HTTP 200)
  [PASSED] Test 10: Delete delivery address removes specified destination from address book (HTTP 200)
  [PASSED] Test 11: Default address selection sets is_default_shipping and is_default_billing flags (HTTP 201)

--- SUITE 3: Customer Order History & Strict Ownership Isolation ---
  [PASSED] Test 12: Customer order listing returns orders strictly scoped to authenticated customer (HTTP 200)
  [PASSED] Test 13: Order ownership isolation: Direct Medusa Store API rejects cross-customer order probing with HTTP 403 Forbidden
  [PASSED] Test 14: Order details route returns order record with items, totals, and shipping details (HTTP 200)
  [PASSED] Test 15: COD payment status display accurately reflects pending collection on cash on delivery orders
  [PASSED] Test 16: Shipment tracking display provides real fulfillment status without mock fabrication
  [PASSED] Test 17: Zero fake tracking data: Pending orders clearly report 'Pending Dispatch' without fabricated carrier milestones

--- SUITE 4: Guest Order Association & Security ---
  [PASSED] Test 18: Guest order recovery generates verified challenge code without exposing plaintext OTP (HTTP 200)
  [PASSED] Test 19: Cross-user order claim rejection: Customer cannot claim an order belonging to a different email address (HTTP 403)
  [PASSED] Test 20: Guest-to-account order association strictly enforces cryptographic proof of ownership (HTTP 401)
  [PASSED] Test 21: Concurrent checkout safety: Redis SET NX atomic locking prevents simultaneous double-click submissions (HTTP 409)
  [PASSED] Test 22: OTP expiration and reuse rejection: Invalid, expired, or non-matching OTP is rejected

--- SUITE 5: System Resilience, Multi-Currency & Invariant Audit ---
  [PASSED] Test 23: Correct handling of mail provider outage: Fails closed and reports NOTIFICATION_SERVICE_UNAVAILABLE (HTTP 503)
  [PASSED] Test 24: Accurate customer financial totals: Order totals compute accurately across all active database orders
  [PASSED] Test 25: Multi-currency support: Regional catalog supports INR, USD, AED, GBP, and EUR
  [PASSED] Test 26: PostgreSQL catalog preservation: Exactly 520 active catalog products preserved
  [PASSED] Test 27: PostgreSQL order preservation: Exactly 3 historical customer orders preserved without corruption
  [PASSED] Test 28: Zero unsafe test cleanup: 100% inventory reservation invariant consistency across all 1,236 SKUs
  [PASSED] Test 29: Mobile responsive UI: All customer account page routes load successfully with HTTP 200
  [PASSED] Test 30: Milestone regression baseline: Guest checkout, atomic cart locking, and theme presets fully verified

==============================================================================
[verify-04d] VERIFICATION SUMMARY
==============================================================================
TOTAL TESTS: 30 | PASSED: 30 | FAILED: 0 | SCORE: 100.0%
>>> ALL 30 MILESTONE 04D VERIFICATION TESTS PASSED SUCCESSFULLY! <<<
```

---

## 6. Headless Browser Visual QA Screenshots

Ten full-fidelity browser screenshots were captured using headless Google Chrome (`capture-milestone-04d-screenshots.js`) across desktop (1440x900) and mobile (390x844) viewports:

| File Name | Viewport | Target Route | Description |
| :--- | :---: | :--- | :--- |
| `screenshots/29-customer-login-desktop.png` | 1440x900 | `/login` | Desktop Customer Login page with email/password inputs, remember me, forgot password modal, and theme styling. |
| `screenshots/30-customer-login-mobile.png` | 390x844 | `/login` | Mobile responsive Customer Login view with stacked inputs, touch-friendly CTA, and mobile navigation header. |
| `screenshots/31-customer-register-desktop.png` | 1440x900 | `/register` | Desktop Customer Registration page with first/last name, email, phone, password confirmation, and sign-in redirect. |
| `screenshots/32-customer-register-mobile.png` | 390x844 | `/register` | Mobile responsive Customer Registration layout optimized for touch keyboards with live field validation. |
| `screenshots/33-account-dashboard-desktop.png` | 1440x900 | `/account` | Authenticated Customer Dashboard with welcome header, KPI cards (Orders, Shipments, Addresses), recent order, and order claim card. |
| `screenshots/34-account-orders-history-desktop.png` | 1440x900 | `/account/orders` | Customer Order History page showing chronological orders, item thumbnails, order statuses, totals, and Track Order CTA. |
| `screenshots/35-account-order-tracking-desktop.png` | 1440x900 | `/account/orders/[id]` | Desktop Order Detail & Tracking view with fulfillment progress stepper, delivery address, COD payment status, and item summary. |
| `screenshots/36-account-order-tracking-mobile.png` | 390x844 | `/account/orders/[id]` | Mobile responsive Order Tracking view with vertical status stepper, collapsible item list, and full receipt breakdown. |
| `screenshots/37-account-addresses-desktop.png` | 1440x900 | `/account/addresses` | Customer Address Book showing saved delivery destinations, default badges, edit/delete actions, and Add New Address form. |
| `screenshots/38-account-profile-desktop.png` | 1440x900 | `/account/profile` | Customer Profile page with personal details editor (first/last name, phone) and secure password change card. |

---

## 7. Monorepo Build Status & Verification Checklist

- [x] **TypeScript Strict Compliance:** `npm run typecheck --workspaces` passed across all workspaces (`@the-ecom-buddy/backend`, `@the-ecom-buddy/merchant`, `@the-ecom-buddy/storefront`, `@the-ecom-buddy/types`, `@the-ecom-buddy/ui`) with 0 errors.
- [x] **Backend Production Build:** Medusa 2.22.1 core engine and admin bundle compiled successfully.
- [x] **Merchant Production Build:** Next.js 15 merchant dashboard compiled successfully (41 routes compiled).
- [x] **Storefront Production Build:** Next.js 15 customer storefront compiled successfully (21 dynamic/static pages and API routes compiled).
- [x] **PostgreSQL & Redis Health:** Embedded PostgreSQL (port 5432) and Redis (port 6379) running stably with 0 crashes.
- [x] **Perpetual License Guarantee:** Zero external SaaS tracking, zero third-party telemetry, 100% self-hosted on client infrastructure.
- [x] **Scope Boundary Compliance:** Cashfree integration, production Razorpay activation, and client server deployment have NOT been started and remain deferred to future milestones.
