# The Ecom Buddy — Payment Gateway Verification & Reconciliation Report

**Document Version:** 1.0.0 (Master Release)  
**Date:** 2026-11-03  
**Status:** Audited & Verified  

---

## 1. Supported Payment Gateways & Architecture

The Ecom Buddy implements three distinct payment processing channels natively integrated into Medusa v2:

```
Customer Checkout (apps/storefront)
       │
       ├── Cash on Delivery (COD) ───────────► pp_system_default (Domestic INR Only)
       │
       ├── Razorpay Payment Module ──────────► pp_razorpay_razorpay (INR, USD, AED, GBP, EUR)
       │
       └── Cashfree Payment Module ──────────► pp_cashfree_cashfree (Domestic INR Only)
                                                       │
                                              Incoming Webhook
                                                       ▼
                                        payment_event_inbox (PostgreSQL)
                                                       │
                                            Atomic Redis Mutex Lock
                                                       │
                                      Medusa Payment Session Capture
```

---

## 2. Gateway Capabilities & Validation Matrix

| Gateway Provider | Identifier | Supported Currencies | Checkout Flow | Webhook Verification | Fail-Closed Guardrail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Razorpay** | `pp_razorpay_razorpay` | INR, USD, AED, GBP, EUR | Standard Checkout & Hosted Modal | HMAC-SHA256 (`x-razorpay-signature`) | Fail closed if unconfigured or secret mismatch |
| **Cashfree** | `pp_cashfree_cashfree` | Domestic INR only | Hosted Payment Session | HMAC-SHA256 (`x-webhook-signature`) | Fails closed on foreign currencies or invalid signature |
| **Cash on Delivery (COD)** | `pp_system_default` | Domestic INR only | Direct Order Placement | Manual Merchant Capture in Dashboard | Max limit enforcement (₹10,000 threshold) |

---

## 3. Gateway Configuration & Secret Handling

### Razorpay Configuration
- **Settings Path:** Merchant Dashboard -> Installation Settings -> Payment Gateways -> Razorpay
- **Required Secrets:**
  - `RAZORPAY_KEY_ID`: Client public key (e.g. `rzp_live_...` or `rzp_test_...`)
  - `RAZORPAY_KEY_SECRET`: Private API key secret
  - `RAZORPAY_WEBHOOK_SECRET`: Secret used to generate HMAC-SHA256 signatures
- **Webhook Endpoint:** `POST https://api.theecombuddy.com/hooks/payment/razorpay`
- **Supported Events:**
  - `payment.authorized` -> `PaymentActions.AUTHORIZED`
  - `payment.captured` / `order.paid` -> `PaymentActions.SUCCESSFUL`
  - `payment.failed` -> `PaymentActions.FAILED`

### Cashfree Configuration
- **Settings Path:** Merchant Dashboard -> Installation Settings -> Payment Gateways -> Cashfree
- **Required Secrets:**
  - `CASHFREE_APP_ID`: Client ID from Cashfree Merchant Portal
  - `CASHFREE_SECRET_KEY`: Client Secret key
  - `CASHFREE_WEBHOOK_SECRET`: Webhook verification secret
  - `CASHFREE_API_VERSION`: Default `2023-08-01`
- **Webhook Endpoint:** `POST https://api.theecombuddy.com/hooks/payment/cashfree`
- **Supported Events:**
  - `PAYMENT_SUCCESS_WEBHOOK` / `ORDER_PAID_WEBHOOK` -> `PaymentActions.SUCCESSFUL`
  - `PAYMENT_FAILED_WEBHOOK` / `PAYMENT_USER_DROPPED_WEBHOOK` -> `PaymentActions.FAILED`

### Cash on Delivery (COD) Rules
- Strictly restricted to orders shipped within India (`country_code: "in"`).
- Default order status is `pending` with `payment_status: "not_paid"`.
- Merchant manual confirmation in admin captures payment upon courier cash receipt.

---

## 4. Durable Webhook Inbox & Reconciliation

All asynchronous gateway events are written to the `payment_event_inbox` table in PostgreSQL before any state mutation:

```sql
CREATE TABLE payment_event_inbox (
  id VARCHAR(64) PRIMARY KEY,
  provider_id VARCHAR(50) NOT NULL,
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255),
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'received',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  last_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_provider_event UNIQUE (provider_id, event_id)
);
```

### Reconciliation UI in Merchant Dashboard
The merchant can inspect the durable event inbox under **Installation Settings -> Payment Webhook Reconciliation**:
- Shows incoming event ID, provider, type, associated order/payment entity, attempts, and processing status.
- Includes a manual **Reconcile** button for orphan or stuck webhook events.

---

## 5. Live Production Readiness Assessment

- **Development Status:** COMPLETE
- **Test Mode Status:** VERIFIED (automated suites pass with sandbox keys)
- **Live Readiness:** PENDING MERCHANT CREDENTIALS
  - To activate live transactions, the merchant must input production API keys and webhook secrets in their dashboard or `.env.production`.
  - Until valid credentials are provided, both Razorpay and Cashfree fail closed safely.
