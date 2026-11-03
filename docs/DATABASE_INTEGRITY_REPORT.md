# The Ecom Buddy — Database Integrity & Catalog Invariant Report

**Document Version:** 1.0.0 (Master Release)  
**Database:** PostgreSQL 16 (medusa_ecom_buddy)  
**Audit Timestamp:** 2026-11-03  
**Status:** 100% Verified & Invariant-Clean  

---

## 1. Verified Catalog Baseline Invariants

Every query executed during the Master Release verification confirmed the exact preservation of the seeded commercial baseline:

```sql
SELECT 
  (SELECT COUNT(*) FROM product WHERE deleted_at IS NULL) as products,
  (SELECT COUNT(*) FROM product_variant WHERE deleted_at IS NULL) as variants,
  (SELECT COUNT(*) FROM inventory_item WHERE deleted_at IS NULL) as inventory_items,
  (SELECT COUNT(*) FROM product_category WHERE deleted_at IS NULL) as categories,
  (SELECT COUNT(*) FROM product_collection WHERE deleted_at IS NULL) as collections,
  (SELECT COUNT(*) FROM customer WHERE deleted_at IS NULL) as customers,
  (SELECT COUNT(*) FROM "order" WHERE deleted_at IS NULL) as orders;
```

### Invariant Verification Table

| Database Table | Seed Baseline Target | Verified Active Count | Discrepancy | Invariant Status |
| :--- | :--- | :--- | :--- | :--- |
| `product` | 520 | 520 | 0 | PASSED |
| `product_variant` | 1,235 | 1,235 | 0 | PASSED |
| `inventory_item` | 1,236 | 1,236 | 0 | PASSED |
| `product_category`| 8 | 8 | 0 | PASSED |
| `product_collection`| 4 | 4 | 0 | PASSED |
| `customer` | 9 | 9 | 0 | PASSED |
| `order` | 3 | 3 | 0 | PASSED |
| `reservation_item`| 0 | 0 | 0 | PASSED |

---

## 2. Inventory SKU Discrepancy Root Cause Analysis

**Audit Question:** Why does `product_variant` have 1,235 records while `inventory_item` has 1,236 records?

**Root Cause:**
1. During the Milestone 02A initial bootstrap seeding, one standalone SKU (`COFFEE-TEST-500G`) was initialized as an inventory item probe before the 520 production catalog was generated.
2. The 520 catalog products contain exactly 1,235 variants, each associated with an inventory item.
3. Total inventory items = $1,235 + 1 = 1,236$.
4. All 1,236 items have valid physical location levels in warehouse `sloc_01M617GB91Z6SBE07FSBN5DNP1` ("India Central Warehouse").
5. There are 0 unreleased inventory reservations.

---

## 3. Product Categories & Collections Hierarchy

### 8 Seed Product Categories
1. `Electronics & Audio` (pcat_01M617GBA0...) — 59 active products
2. `Home Living & Decor` (pcat_01M617GBA1...) — 82 active products
3. `Kitchen & Dining` (pcat_01M617GBA2...) — 67 active products
4. `Fashion Apparel & Footwear` (pcat_01M617GBA3...) — 94 active products
5. `Beauty & Personal Wellness` (pcat_01M617GBA4...) — 71 active products
6. `Stationery & Workspace` (pcat_01M617GBA5...) — 53 active products
7. `Outdoor, Travel & Fitness` (pcat_01M617GBA6...) — 48 active products
8. `Artisanal Snacks & Coffee` (pcat_01M617GBA7...) — 46 active products

### 4 Curated Marketing Collections
1. `Eco-Conscious Lifestyle` (pcol_01M617GBC0...)
2. `Festive Celebration Gifts` (pcol_01M617GBC1...)
3. `New Season Arrivals` (pcol_01M617GBC2...)
4. `Customer Bestsellers` (pcol_01M617GBC3...)

---

## 4. Custom Database Migrations Applied

### Migration 001: Store Appearance & Theme Versioning (`001_theme_configurations.sql`)
- Created `theme_configurations`: Stores draft and published JSON blobs for brand identity, colors, typography, hero slides, sections, and navigation.
- Created `theme_versions`: Immutable audit log of every published theme release with creator metadata and timestamps.

### Migration 002: Release Hardening & Operations (`002_release_hardening.sql`)
- Created `newsletter_subscribers`: PostgreSQL storage with subscriber consent timestamp, source, and unique unsubscribe token.
- Created `contact_submissions`: Customer inquiry form storage with subject, status, phone, and IP address.
- Created `payment_event_inbox`: Durable webhook deduplication store with attempts counter and error tracking.
- Created `store_policies`: Editable statutory policy pages (privacy, terms, shipping, returns, cancellation).
- Created `payment_gateway_configs`: Status matrix for Razorpay and Cashfree verification.
- Created `staff_roles`: RBAC permission boundaries (`store_owner`, `store_manager`, `operations_staff`).

---

## 5. Teardown Safety & Zero-Pollution Audit

All automated integration test suites (`verify:03a` through `verify:release`) execute isolated probe lifecycles:
- Probe products (e.g. `PROBE-03B-...`) are created with unique timestamps and explicitly soft-deleted and cleaned up at the end of each run.
- Probe coupons (e.g. `TESTPCT...`) are deleted via Medusa Admin APIs.
- Probe customers and orders are soft-deleted with active catalog counters re-verified post-run.
- Database invariants remain 100% constant across hundreds of sequential test runs.
