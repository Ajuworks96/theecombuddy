# The Ecom Buddy — White-Label Perpetual Licensing Architecture

**Document Version:** 1.0.0 (Master Release)  
**Licensing Paradigm:** Offline Asymmetric Cryptographic License  
**DRM Dependency:** ZERO (100% Offline Autonomy)  

---

## 1. Business Model & Freedom Principles

The Ecom Buddy is engineered as an **independently self-hosted, perpetual-license commercial software product**:

1. **Zero Phone-Home DRM:** The software never contacts a central activation server. There are no periodic license check HTTP calls, heartbeat pings, or telemetry beacons.
2. **Fail-Open Availability:** If a license is missing, expired, or operating on a test domain, customer-facing checkout **never shuts down**. The store operates in evaluation mode with a visible notice inside the merchant administration console only.
3. **Sovereign Infrastructure:** The merchant owns their database, customer records, and product assets permanently.

---

## 2. Cryptographic Architecture

Licensing is enforced via asymmetric public-key cryptography (RSA 2048 with SHA-256):

```
                        VENDOR SIDE (Private)
                 ┌─────────────────────────────────┐
                 │ Vendor Private Key (RSA 2048)   │
                 └────────────────┬────────────────┘
                                  │
                                  ▼
                    deploy/scripts/issue-license.js
                                  │
                                  ▼
                       Signed deploy/license.json
                                  │
                                  │ (Distributed to Merchant)
                                  ▼
                       MERCHANT SERVER (Public)
                 ┌─────────────────────────────────┐
                 │ Embedded Vendor Public Key      │
                 │ (apps/merchant/src/lib/license) │
                 └────────────────┬────────────────┘
                                  │
                                  ▼
                       verifyLicenseManifest()
                      (Verified Offline at Startup)
```

---

## 3. License Manifest Structure

A valid license manifest file (`deploy/license.json`) contains the following canonical structure:

```json
{
  "license_id": "lic_e132af35-3c56-40a3-b4d7-dfe32365ea10",
  "licensee_name": "The Ecom Buddy Official Merchant",
  "licensee_email": "merchant@theecombuddy.com",
  "permitted_domains": [
    "localhost",
    "127.0.0.1",
    "*.theecombuddy.com",
    "theecombuddy.com",
    "theecombuddy.local"
  ],
  "permitted_storefronts": 1,
  "issue_date": "2026-11-03",
  "license_type": "perpetual",
  "features": [
    "storefront",
    "merchant_dashboard",
    "medusa_backend",
    "razorpay_gateway",
    "cashfree_gateway",
    "cash_on_delivery",
    "international_multi_currency",
    "published_theme_engine",
    "durable_reconciliation_inbox",
    "role_based_access_control"
  ],
  "metadata": {
    "edition": "Single-Merchant Perpetual License",
    "telemetry": "disabled",
    "offline_verification": true,
    "issued_by": "The Ecom Buddy Core Vendor"
  },
  "signature": "MrkKyc8wQTk0xVHcdvFTQzY3dbqXU28u4cYWXWCu6d8cq945KrE6AnkIOP3UV8c8..."
}
```

---

## 4. Canonicalization & Signature Generation

To ensure bit-for-bit signature reproducibility regardless of property order:
1. The manifest object is cloned with `signature` omitted.
2. Keys are sorted alphabetically.
3. The resulting canonical JSON string is hashed using SHA-256 and signed with the vendor private key:
   $$\text{Signature} = \text{Sign}_{\text{PrivKey}}(\text{SHA256}(\text{CanonicalJSON}))$$
4. The signature is encoded as Base64.

---

## 5. Domain Matching & Verification Logic

When verifying an incoming host (e.g. `theecombuddy.com`):
1. Signature is verified against the embedded vendor public key. If invalid or tampered with, status is immediately `invalid_signature`.
2. Permitted domains are evaluated:
   - Wildcards like `*.theecombuddy.com` match subdomains (`shop.theecombuddy.com`, `admin.theecombuddy.com`) as well as the root domain.
   - If a host mismatch occurs (e.g. deployed on `unauthorized-domain.com`), the status is `domain_mismatch`. The storefront remains active, but the merchant console displays an admin notice.
3. If all checks pass, status is `valid` with `Licensed to: [Merchant Name] (Perpetual)`.

---

## 6. Vendor Tooling for Issuing Licenses

Vendor administrators generate signed licenses via `deploy/scripts/issue-license.js`:

```bash
# Syntax: node deploy/scripts/issue-license.js "<Licensee Name>" "<Licensee Email>"
node deploy/scripts/issue-license.js "Acme DTC Brands Ltd" "owner@acme.com"
```
The script writes the signed manifest to `deploy/license.json` and outputs the manifest for delivery to the client.

---

## 7. Merchant License Management UI

The merchant dashboard includes a dedicated **Offline Perpetual License** card under **Installation Settings**:
- Displays active licensee name, permitted domains, issue date, and validity.
- Provides a textarea to paste or upload an updated `license.json` file.
- Changes are verified instantly in-memory before writing to disk, requiring zero server restarts.
