# The Ecom Buddy — Production Security & Hardening Audit

**Document Version:** 1.0.0 (Master Release)  
**Security Status:** Audited & Hardened  
**Last Audit Date:** 2026-11-03  

---

## 1. Authentication & Session Security

### Merchant Administration Auth
- **Mechanism:** HTTP-only, secure, SameSite cookies backed by signed session tokens.
- **CSRF & Origin Protection:** All state-mutating requests (`POST`, `PUT`, `DELETE`) validate the `Origin` and `Referer` headers against the merchant's configured domain.
- **Credential Storage:** Scrypt / Argon2 password hashing mediated by Medusa v2 Auth Module (`auth_identity` and `user` tables).
- **Default Merchant Credentials:** Rotated via `deploy/scripts/rotate-admin-password.js`.

### Customer Storefront Authentication
- **Mechanism:** Dual token delivery — Secure HTTP-only cookies (`teb_customer_token`) for browser navigation and `Authorization: Bearer <token>` header support for headless integrations.
- **Session Revocation via Redis Denylist:**
  - Token hashing: Tokens are hashed using SHA-256 (`revoked:token:<hash>`).
  - Redis TTL: Exactly 7 days (604,800 seconds), matching the maximum JWT lifetime.
  - Revocation checks: Evaluated on every customer API call (`/api/auth/customer/me`, `/api/account/orders`, `/api/account/addresses`). Revoked tokens are immediately rejected with `HTTP 401 Unauthorized`.

---

## 2. Guest Order Security & PII Protection

### Cryptographic Guest Order HMAC Tokens
- Instead of insecure `?email=` URL query parameters (which do not prove inbox ownership), guest checkout produces a signed HMAC-SHA256 token:
  $$\text{Token} = \text{Base64Url}(\text{Payload}) \,\|\, \text{HMAC-SHA256}(\text{Base64Url}(\text{Payload}), K_{\text{guest}})$$
- **Payload Structure:** `{ order_id, email, exp, iat }` with a 1-hour expiration.
- **Cross-Order Isolation:** Tokens issued for Order A are rejected when probed against Order B with `HTTP 401 Unauthorized`.

### Verified-Email OTP Recovery Flow
- When a guest customer revisits without an active token:
  1. Customer requests verification for their order ID and email.
  2. A 6-digit cryptographically random OTP is generated via `crypto.randomInt(100000, 1000000)`.
  3. The OTP is hashed via SHA-256 and stored in Redis (`otp:order:<orderId>`) with a 10-minute TTL.
  4. Plaintext OTPs are dispatched via RFC-compliant SMTP and never logged to stdout.
  5. Brute-force protection: Max 5 failed attempts per order; exceeding the limit invalidates the OTP immediately.

### Customer PII Masking
- The Medusa backend middleware (`apps/backend/src/api/middlewares.ts`) intercepts `GET /store/orders/:id`:
  - Masks shipping address recipient phone numbers: `+91******345`.
  - Strips internal raw payment keys and payment provider hashes.

---

## 3. Concurrency Safety & Distributed Cart Locking

- **Vulnerability Prevented:** Double-click checkout submissions leading to duplicate order creation or race conditions on stock reservations.
- **Implementation:** Distributed Redis mutex locking in `apps/storefront/src/lib/cart-lock.ts`:
  - Key: `cart:lock:<cartId>`
  - Method: `SET cart:lock:<cartId> <uniqueWorkerId> EX 30 NX`
  - Safe Release: Atomic Lua script ensuring that only the acquiring worker token can delete the lock:
    ```lua
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
    ```
  - Contention Response: If a lock is held, concurrent submissions are immediately rejected with `HTTP 409 Conflict`.

---

## 4. Payment Gateway Security & Fail-Closed Guardrails

- **Zero-Mock Policy:** Neither Razorpay nor Cashfree allow simulated successful transactions in production mode without real, merchant-provided API credentials.
- **Signature Verification:**
  - **Razorpay:** Webhook payloads are verified using `crypto.createHmac("sha256", secret)` against `x-razorpay-signature`.
  - **Cashfree:** Webhook signatures are verified using `crypto.timingSafeEqual` against `x-webhook-signature` and `x-webhook-timestamp`.
- **Durable Webhook Inbox Idempotency:**
  - Incoming webhooks are recorded into PostgreSQL `payment_event_inbox`.
  - Unique constraint on `(provider_id, event_id)` guarantees that duplicate webhooks atomically increment `attempts` without double-processing orders.
- **Currency Enforcement:** Cashfree is restricted to domestic INR transactions. Non-INR transactions fail closed with `HTTP 400 Bad Request`.

---

## 5. Role-Based Access Control (RBAC)

Enforced via backend middleware on `/admin/*` routes based on `staff_roles` in PostgreSQL:

| Role | Catalog & Stock | Order Fulfillment | Financial Settings & Credentials | API Keys & Staff Roles |
| :--- | :--- | :--- | :--- | :--- |
| **Store Owner** | Full Access | Full Access | Full Access | Full Access |
| **Store Manager** | Full Access | Full Access | Read-Only (Masked) | Access Denied (`HTTP 403`) |
| **Operations Staff** | Read-Only | Fulfillment Updates | Access Denied (`HTTP 403`) | Access Denied (`HTTP 403`) |

---

## 6. Input Sanitization & File Upload Defense

- **SVG Sanitization:** SVG uploads are inspected in `apps/merchant/src/app/api/theme/media/route.ts`. Any SVG containing `<script>`, `onload=`, `onerror=`, or `javascript:` is rejected with `HTTP 400 Bad Request`.
- **Theme Copy Sanitization:** All text inputs for brand identity and announcements strip HTML tags and script elements prior to PostgreSQL insertion.
- **Newsletter & Contact Rate Limiting:** Redis sliding window rate limits (max 5 submissions per minute per IP address) prevent spam enumeration.
