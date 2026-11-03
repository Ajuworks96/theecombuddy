# The Ecom Buddy — Environment Variables Reference Guide

**Document Version:** 1.0.0 (Master Release)  
**Applicability:** Production, Staging, and Local Development  

---

## 1. Core Hosting & Domain Variables

| Variable Name | Required | Default / Example | Purpose & Description |
| :--- | :---: | :--- | :--- |
| `STORE_DOMAIN` | Yes | `theecombuddy.com` | Primary root domain for customer storefront. |
| `MERCHANT_DOMAIN` | Yes | `admin.theecombuddy.com` | Subdomain or host routing merchant dashboard traffic. |
| `BACKEND_DOMAIN` | Yes | `api.theecombuddy.com` | Subdomain routing Medusa v2 APIs and incoming webhooks. |
| `STORE_URL` | Yes | `https://theecombuddy.com` | Full customer URL with protocol used in return URLs and emails. |
| `MERCHANT_URL` | Yes | `https://admin.theecombuddy.com` | Full merchant URL used in password resets and alerts. |
| `BACKEND_PUBLIC_URL` | Yes | `https://api.theecombuddy.com` | Public API endpoint for frontend client queries. |
| `ACME_EMAIL` | Yes | `ops@theecombuddy.com` | Contact email for Let's Encrypt / ZeroSSL certificate renewals. |

---

## 2. Database & Data Store Variables

| Variable Name | Required | Default / Example | Purpose & Description |
| :--- | :---: | :--- | :--- |
| `POSTGRES_USER` | Yes | `postgres` | Primary PostgreSQL database superuser. |
| `POSTGRES_PASSWORD` | Yes | (32-char hex string) | Master password for PostgreSQL database. |
| `POSTGRES_DB` | Yes | `medusa_ecom_buddy` | Name of the primary relational database. |
| `DATABASE_URL` | Yes | `postgres://user:pass@host:5432/db` | Connection string for Medusa core, merchant, and storefront. |
| `REDIS_PASSWORD` | Optional | (24-char hex string) | Password for Redis cache and queue daemon. |
| `REDIS_URL` | Yes | `redis://:pass@host:6379` | Connection string for distributed locks, denylist, and rate limits. |

---

## 3. Cryptographic Security Secrets

> [!CAUTION]
> These secrets must be generated with high entropy (`openssl rand -base64 32`) and NEVER checked into version control.

| Variable Name | Min Length | Purpose |
| :--- | :---: | :--- |
| `JWT_SECRET` | 32 chars | Signs Medusa admin and customer authentication tokens. |
| `COOKIE_SECRET` | 32 chars | Encrypts session cookies issued by Next.js apps. |
| `GUEST_ORDER_SECRET` | 32 chars | Generates HMAC-SHA256 guest order access tokens. |
| `SESSION_REVOCATION_SECRET` | 32 chars | Key used for salt in Redis token revocation hashes. |

---

## 4. Offline White-Label Licensing

| Variable Name | Required | Default | Purpose |
| :--- | :---: | :--- | :--- |
| `LICENSE_FILE_PATH` | No | `/app/deploy/license.json` | Path to the signed `license.json` manifest verified offline via RSA-SHA256. |

---

## 5. Transactional Email (SMTP)

| Variable Name | Required | Example | Purpose |
| :--- | :---: | :--- | :--- |
| `SMTP_HOST` | In Prod | `smtp.sendgrid.net` | Outgoing RFC-compliant SMTP server. |
| `SMTP_PORT` | In Prod | `587` | Port (587 for STARTTLS, 465 for SSL). |
| `SMTP_SECURE` | In Prod | `false` | Set `true` if port 465 SSL is used. |
| `SMTP_USER` | In Prod | `apikey` | SMTP account username. |
| `SMTP_PASSWORD` | In Prod | (API Key / Password) | SMTP account password. |
| `SMTP_FROM_EMAIL` | In Prod | `orders@theecombuddy.com` | Authenticated sender email address. |
| `SMTP_FROM_NAME` | In Prod | `The Ecom Buddy Official Store`| Friendly display name in customer email inbox. |

---

## 6. Payment Gateways & Guardrails

| Variable Name | Required | Default | Purpose |
| :--- | :---: | :--- | :--- |
| `PAYMENT_ENVIRONMENT` | Yes | `sandbox` | Set to `live` for production financial captures. |
| `RAZORPAY_KEY_ID` | When Live | `rzp_live_...` | Razorpay API public key. |
| `RAZORPAY_KEY_SECRET` | When Live | `...` | Razorpay private secret. |
| `RAZORPAY_WEBHOOK_SECRET`| When Live | `...` | Webhook verification secret. |
| `CASHFREE_APP_ID` | When Live | `...` | Cashfree merchant client ID. |
| `CASHFREE_SECRET_KEY` | When Live | `...` | Cashfree merchant client secret. |
| `CASHFREE_WEBHOOK_SECRET`| When Live | `...` | Cashfree webhook signature secret. |
| `CASHFREE_API_VERSION` | No | `2023-08-01` | Supported Cashfree API release version. |
| `COD_MAX_LIMIT_INR` | No | `10000` | Maximum cart value in INR permitted for Cash on Delivery. |

---

## 7. Currency & Localization

| Variable Name | Default | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | `INR` | Storefront base currency. |
| `NEXT_PUBLIC_SUPPORTED_CURRENCIES`| `INR,USD,EUR,GBP,AED` | Enabled multi-market customer currencies. |
| `DEFAULT_THEME_PRESET` | `crescendo` | Default appearance preset initialized on fresh installation. |
