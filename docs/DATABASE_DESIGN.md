# Database Design & Schema Specification

**Project**: The Ecom Buddy  
**Document**: Database Design & Schema Specification  
**Status**: Revised Architecture Specification (Final Step 01 Technical Corrections)  
**Milestone**: 01 (Foundation & Technical Specification)  
**Author**: Principal Software Architect & Senior E-commerce Product Engineer  

---

## 1. Database Architecture & Schema Ownership

The data tier is powered by **PostgreSQL 16**. Under our architectural philosophy, **Medusa v2 owns and manages all core commerce tables** through its official modules and CLI migrations (`medusa db:migrate`). 

The Ecom Buddy does **not** create manual DDL tables for core commerce entities (products, variants, inventory, carts, orders, or payments). Custom platform requirements are modeled using Medusa's declarative **Data Modeling Layer (DML)** and **Module Links**, with migrations generated via `medusa db:generate` and executed via `medusa db:migrate`.

```mermaid
erDiagram
    MEDUSA_PRODUCT ||--o{ MEDUSA_PRODUCT_VARIANT : "Medusa Product Module"
    MEDUSA_PRODUCT_VARIANT ||--o{ MEDUSA_INVENTORY_LEVEL : "Medusa Inventory Module"
    MEDUSA_CART ||--o{ MEDUSA_LINE_ITEM : "Medusa Cart Module"
    MEDUSA_ORDER ||--o{ MEDUSA_PAYMENT : "Medusa Order & Payment Modules"
    
    MEDUSA_PRODUCT ||--o| GST_PRODUCT_DETAIL : "Linked via defineLink"
    CAROUSEL_SLIDE }o--|| THEME_CONFIG : "store-customizer module"
    MARKETING_CONFIG ||--|| THEME_CONFIG : "marketing-telemetry module"
    LICENSE_RECORD ||--|| THEME_CONFIG : "licensing module"
```

---

## 2. Core Medusa v2 Modules & Schema Responsibilities

Core commerce schemas are provisioned and upgraded strictly via Medusa v2:

| Medusa Core Module | Governed Entities | Migration Authority |
| :--- | :--- | :--- |
| `@medusajs/medusa/product` | `product`, `product_variant`, `product_option`, `product_option_value`, `product_category`, `product_collection`, `product_tag` | Official Medusa Migrations |
| `@medusajs/medusa/inventory` | `inventory_item`, `inventory_level`, `reservation_item` | Official Medusa Migrations |
| `@medusajs/medusa/pricing` | `price_set`, `price_list`, `price` (Multi-currency support: INR default, USD, EUR) | Official Medusa Migrations |
| `@medusajs/medusa/cart` | `cart`, `line_item`, `address`, `shipping_method` | Official Medusa Migrations |
| `@medusajs/medusa/order` | `order`, `order_item`, `order_change`, `order_summary` | Official Medusa Migrations |
| `@medusajs/medusa/payment` | `payment_collection`, `payment_session`, `payment`, `refund` | Official Medusa Migrations |
| `@medusajs/medusa/tax` | `tax_region`, `tax_rate`, `tax_rate_rule` | Official Medusa Migrations |

---

## 3. Standardized Custom Modules & DML Models

Custom requirements are modeled declaratively using Medusa v2's DML (`model.define`), ensuring complete compatibility with Medusa migrations, service containers, and API endpoints.

### 3.1 Custom Module Migration Lifecycle
1. **Module Registration**: Registered in `medusa-config.ts` under the `modules` array.
2. **DML Definitions**: Authored in `src/modules/<module-name>/models/`.
3. **Migration Generation**: Generated via the CLI:
   ```bash
   npx medusa db:generate store-customizer
   npx medusa db:generate marketing-telemetry
   npx medusa db:generate india-tax
   npx medusa db:generate licensing
   ```
4. **Migration Execution**: Executed via the CLI:
   ```bash
   npx medusa db:migrate
   ```
5. **Rollback Verification**: Tested via `npx medusa db:rollback` in staging environments.

---

### 3.2 Module: `store-customizer` (`src/modules/store-customizer`)

#### Model: `CarouselSlide` (Table: `carousel_slide`)
* **Six Default Configured Slides**: Pre-seeded during store initialization.
* **Unconstrained Slide Capacity**: Dynamic add, edit, disable, reorder, and remove operations without rigid SQL count caps.

```typescript
import { model } from "@medusajs/framework/utils";

export const CarouselSlide = model.define("carousel_slide", {
  id: model.id().primaryKey(),
  is_active: model.boolean().default(true),
  display_order: model.number().default(1),
  title: model.text(),
  subtitle: model.text().nullable(),
  image_desktop_url: model.text(),
  image_mobile_url: model.text(),
  cta_label: model.text().default("Shop Now"),
  cta_link: model.text().default("/collections/all"),
  text_alignment: model.enum(["left", "center", "right"]).default("left"),
  scrim_opacity: model.number().default(0.30),
});
```

#### Model: `ThemeConfig` (Table: `theme_config`)
Allows non-technical merchants to customize their storefront colors, typography, and announcement bar without editing CSS files:

```typescript
export const ThemeConfig = model.define("theme_config", {
  id: model.id().primaryKey(),
  brand_name: model.text(),
  logo_url: model.text().nullable(),
  favicon_url: model.text().nullable(),
  primary_color: model.text().default("#18181B"),
  accent_color: model.text().default("#C28E5C"),
  surface_color: model.text().default("#FAFAFA"),
  typography_preset: model.text().default("editorial-serif-sans"),
  announcement_enabled: model.boolean().default(true),
  announcement_text: model.text().default("Complimentary express shipping on orders over ₹1,499"),
  announcement_link: model.text().default("/collections/all"),
  announcement_bg_color: model.text().default("#18181B"),
  announcement_text_color: model.text().default("#FFFFFF"),
});
```

---

### 3.3 Module: `marketing-telemetry` (`src/modules/marketing-telemetry`)

#### Model: `MarketingConfig` (Table: `marketing_config`)
Stores encrypted credentials for Meta and Google tracking. **Default consent is strictly `'denied'`**:

```typescript
export const MarketingConfig = model.define("marketing_config", {
  id: model.id().primaryKey(),
  meta_pixel_id: model.text().nullable(),
  meta_capi_token: model.text().nullable(), // Encrypted at rest (AES-256)
  meta_test_event_code: model.text().nullable(),
  ga_measurement_id: model.text().nullable(),
  ga_api_secret: model.text().nullable(), // Encrypted at rest (AES-256)
  gtm_container_id: model.text().nullable(),
  is_meta_enabled: model.boolean().default(false),
  is_ga_enabled: model.boolean().default(false),
  is_gtm_enabled: model.boolean().default(false),
  default_consent_mode: model.enum(["denied", "granted"]).default("denied"),
});
```

---

### 3.4 Module: `india-tax` (`src/modules/india-tax`)

#### Model: `GstProductDetail` (Table: `gst_product_detail`)
Links HSN codes and GST rates to Medusa's core `Product` model via official module links:

```typescript
export const GstProductDetail = model.define("gst_product_detail", {
  id: model.id().primaryKey(),
  hsn_code: model.text(),
  gst_rate: model.number().default(12.00),
  tax_inclusive: model.boolean().default(true),
});
```

#### Module Link Definition (`src/links/product-gst.ts`)
```typescript
import { defineLink } from "@medusajs/framework/utils";
import ProductModule from "@medusajs/medusa/product";
import IndiaTaxModule from "../modules/india-tax";

export default defineLink(
  ProductModule.linkable.product,
  IndiaTaxModule.linkable.gstProductDetail
);
```

---

### 3.5 Module: `licensing` (`src/modules/licensing`)

#### Model: `LicenseRecord` (Table: `license_record`)
```typescript
export const LicenseRecord = model.define("license_record", {
  id: model.id().primaryKey(),
  license_key: model.text().unique(),
  client_name: model.text(),
  authorized_domain: model.text(),
  digital_signature: model.text(),
  activated_at: model.dateTime(),
  last_verified_at: model.dateTime(),
  license_status: model.enum(["active", "invalid", "suspended"]).default("active"),
  edition: model.text().default("commercial_lifetime"),
  white_label_enabled: model.boolean().default(true),
});
```

---

## 4. Catalog Scalability & Query Performance (500+ Products)

To ensure sub-100ms response times across 500+ distinct products (and 1,500–4,000+ SKUs):
* **Covering Compound Indexes**: B-tree compound indexes on `(product_id, deleted_at)` and `(sku, deleted_at)`.
* **Full-Text Search Indexing**: PostgreSQL `tsvector` indexes on product title, handle, subtitle, and tags ensure instant search and filtering without external search engine overhead.
* **Pagination & Memory Safeguards**: All catalog queries from Next.js 15 utilize cursor-based or limit/offset pagination (default 24 products per page) to prevent excessive memory consumption during high-traffic browsing.
