# The Ecom Buddy — Known External Dependencies & Merchant Prerequisites

**Document Version:** 1.0.0 (Master Release)  
**Classification:** Operational Transparency Disclosure  

---

## 1. Overview & Disclosure Policy

The Ecom Buddy core software is **100% development-complete, tested, hardened, and verified**.

However, because The Ecom Buddy is a self-hosted single-merchant software product and NOT a closed SaaS platform, certain real-world operational capabilities depend on external third-party services that must be provisioned and owned directly by the client merchant.

This document explicitly identifies all external prerequisites, their exact failure mode when unconfigured, and the step-by-step resolution for production launch.

---

## 2. External Operational Dependencies

### 1. Live Payment Gateway Approvals (Razorpay & Cashfree)
- **Dependency:** Real-world money movement requires a legally registered commercial merchant account with Razorpay (India & International) and Cashfree (India Domestic).
- **Why Core Software Cannot Fulfill This:** Financial regulations (RBI KYC, PMLA, Visa/Mastercard network rules) mandate that merchant agreements, bank account verifications, and API credentials be issued directly to the legal business entity operating the store.
- **Fail-Closed Behavior:**
  - In sandbox mode, test credentials function seamlessly.
  - In live mode without valid merchant credentials, the gateways fail closed safely with clear error messaging. Under zero circumstances does the software simulate fake captures.
- **Merchant Action Required:**
  1. Complete KYC on [Razorpay Dashboard](https://dashboard.razorpay.com) and generate Live API Keys.
  2. Complete onboarding on [Cashfree Merchant Portal](https://merchant.cashfree.com) and generate Live Client Keys.
  3. Enter the credentials under **Merchant Console -> Settings -> Payment Gateways**.

### 2. Transactional Email Delivery (RFC 5321/5322 SMTP)
- **Dependency:** Outgoing delivery of customer OTP verification codes, order confirmations, and password reset links requires an authenticated SMTP provider (e.g. SendGrid, Postmark, AWS SES, Brevo, Mailgun).
- **Why Core Software Cannot Fulfill This:** Public cloud IP addresses without configured SPF, DKIM, and DMARC DNS records are rejected or marked as spam by Gmail, Yahoo, and Outlook.
- **Fail-Closed Behavior:**
  - If SMTP is unconfigured, transactional notification requests fail closed safely, returning `NOTIFICATION_SERVICE_UNAVAILABLE` (`HTTP 503`) and logging an audit event into Redis without exposing plaintext OTPs or leaking account existence.
- **Merchant Action Required:**
  1. Provision an account on SendGrid, Postmark, or AWS SES.
  2. Configure DNS SPF and DKIM records for your sender domain.
  3. Input `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM_EMAIL` into `deploy/.env.production`.

### 3. Public Domain & DNS Delegation
- **Dependency:** Automatic SSL/TLS issuance via Let's Encrypt requires that the merchant's domain (e.g. `theecombuddy.com`, `admin.theecombuddy.com`, `api.theecombuddy.com`) resolves to the server's static public IPv4 address.
- **Why Core Software Cannot Fulfill This:** DNS delegation is managed exclusively at the merchant's domain registrar.
- **Merchant Action Required:**
  1. Add DNS `A` records pointing the root domain and subdomains to the server IP.
  2. Ensure ports 80 and 443 are not blocked by the hosting provider's firewall.

---

## 3. Readiness Summary

| Operational Channel | Software Completeness | Merchant Prerequisite Status | Launch Readiness |
| :--- | :--- | :--- | :--- |
| **Commerce Engine & Themes** | 100% Complete | Fully Configured (520 Catalog Seed) | Immediate Production Ready |
| **Merchant Console & RBAC** | 100% Complete | Fully Configured | Immediate Production Ready |
| **Customer Storefront** | 100% Complete | Fully Configured | Immediate Production Ready |
| **Offline Perpetual Licensing** | 100% Complete | Signed Manifest Installed | Immediate Production Ready |
| **Cash on Delivery (COD)** | 100% Complete | Enabled for India (INR) | Immediate Production Ready |
| **Razorpay Gateway** | 100% Complete | Requires Merchant Live Keys | Ready for Credentials |
| **Cashfree Gateway** | 100% Complete | Requires Merchant Live Keys | Ready for Credentials |
| **SMTP Email Dispatch** | 100% Complete | Requires Merchant SMTP Server | Ready for Credentials |
| **Public TLS Certificates** | 100% Complete | Requires DNS Delegation | Ready for Deployment |
