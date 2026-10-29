# System Architecture Specification

**Project**: The Ecom Buddy  
**Document**: System Architecture Specification  
**Status**: Revised Architecture Specification (Final Step 01 Technical Corrections)  
**Milestone**: 01 (Foundation & Technical Specification)  
**Author**: Principal Software Architect & Senior E-commerce Product Engineer  

---

## 1. Architectural Philosophy & Principles

The Ecom Buddy architecture is built upon four fundamental principles:

1. **Strict Data & Engine Integrity**: We strictly adhere to **Medusa v2**'s official modular architecture. We do **not** manually create, alter, or replace Medusa's core database tables. All core commerce domain models (products, variants, inventory, carts, orders, pricing, taxes, regions) are owned and migrated solely by Medusa's official modules.
2. **Supported Extension Mechanisms & Migration Workflow**: Custom business requirements (dynamic carousel slides, brand styling tokens, marketing credentials, India-specific GST/HSN attributes, licensing verification, and international exchange-rate snapshots) are encapsulated within **officially registered Medusa v2 custom modules** utilizing Medusa's Data Modeling Layer (DML) and module links (`defineLink`). Database migrations for custom modules are generated via `medusa db:generate` and executed via `medusa db:migrate`.
3. **Global Multi-Region & Multi-Currency Commerce**: Support Indian direct-to-consumer merchants selling domestically in INR and internationally in USD, AED, GBP, and EUR via official Medusa Region and Pricing modules, deterministic price hierarchies, and strict cross-border payment rules (see `docs/GLOBAL_COMMERCE_ARCHITECTURE.md`).
4. **Decoupled Headless Experience**: The merchant-facing storefront is completely separated from the commerce backend, powered by **Next.js 15 (App Router)** utilizing React Server Components (RSC) and on-demand Incremental Static Regeneration (ISR).
5. **Operational Simplicity for Independent Client Deployments**: Each merchant client receives an isolated deployment stack orchestratable via **Docker Compose** with automated SSL termination (Caddy) and persistent PostgreSQL 16 and Redis 7 volumes.

```mermaid
flowchart TB
    subgraph Client_Browser ["Shopper & Merchant Web Clients"]
        ShopperBrowser["Shopper Client\n(Mobile & Desktop Storefront)"]
        AdminBrowser["Merchant Admin User\n(ColorPixel Embedded Dashboard)"]
    end

    subgraph Edge_Network ["Edge & Reverse Proxy Layer"]
        Caddy["Caddy Reverse Proxy\n(Automated TLS 1.3 / Let's Encrypt)"]
    end

    subgraph Application_Tier ["Containerized Application Tier"]
        Storefront["Next.js 15 App Router\n(RSC + ISR + Client Telemetry Dispatcher)"]
        
        subgraph Medusa_v2_Backend ["Medusa v2 Headless Backend Engine"]
            CoreModules["Official Medusa v2 Commerce Modules\n(Product, Inventory, Cart, Order, Payment, Tax)"]
            CustomModules["The Ecom Buddy Standardized Modules\n(store-customizer, marketing-telemetry, india-tax, licensing)"]
            Workflows["Medusa Workflows Engine\n(Durable Execution with Built-in Compensation)"]
            EmbeddedAdmin["Embedded Medusa Admin\n(Vite App served directly on API process)"]
        end
    end

    subgraph Data_Tier ["Persistent Data Tier"]
        Postgres[(PostgreSQL 16\nManaged via Medusa db:migrate)]
        Redis[(Redis 7\nCache, Rate Limits & Event Bus)]
        MediaStorage[(Local Persistent Volume / S3 Compatible\nProduct Photography & Banners)]
    end

    subgraph External_Gateways ["External Integrations & Providers"]
        RazorpayGateway["Razorpay / UPI / COD Engine\n(Primary Indian Payments)"]
        StripeGateway["Stripe Gateway\n(International Cards, Apple/Google Pay)"]
        MetaGraph["Meta Graph API\n(Conversions API / CAPI)"]
        GoogleMP["Google Analytics 4\n(Measurement Protocol API)"]
    end

    ShopperBrowser -->|HTTPS :443| Caddy
    AdminBrowser -->|HTTPS :443| Caddy

    Caddy -->|/ ...| Storefront
    Caddy -->|/store/*, /admin/*| Medusa_v2_Backend

    Storefront -->|Internal REST / Typed SDK| Medusa_v2_Backend
    Medusa_v2_Backend --> CoreModules
    Medusa_v2_Backend --> CustomModules
    Medusa_v2_Backend --> Workflows

    CoreModules --> Postgres
    CustomModules --> Postgres
    Medusa_v2_Backend --> Redis
    Medusa_v2_Backend --> MediaStorage

    Workflows --> RazorpayGateway
    Workflows --> StripeGateway
    Workflows --> MetaGraph
    Workflows --> GoogleMP
```

---

## 2. Medusa v2 Data Ownership & Standardized Custom Modules

### 2.1 Core Commerce Data Ownership
All core commerce tables are owned and managed exclusively by Medusa v2's official modules. Under no circumstances does The Ecom Buddy run manual SQL DDL to create or alter these tables:

* **Product Module (`@medusajs/medusa/product`)**: Owns `product`, `product_variant`, `product_option`, `product_option_value`, `product_category`, `product_collection`, `product_tag`, `product_image`.
* **Inventory Module (`@medusajs/medusa/inventory`)**: Owns `inventory_item`, `inventory_level`, `reservation_item`.
* **Stock Location Module (`@medusajs/medusa/stock-location`)**: Owns `stock_location`.
* **Pricing Module (`@medusajs/medusa/pricing`)**: Owns `price_set`, `price_list`, `price`, `price_rule`.
* **Cart Module (`@medusajs/medusa/cart`)**: Owns `cart`, `line_item`, `address`, `shipping_method`.
* **Order Module (`@medusajs/medusa/order`)**: Owns `order`, `order_change`, `order_item`, `order_summary`, `order_shipping_method`.
* **Payment Module (`@medusajs/medusa/payment`)**: Owns `payment_collection`, `payment_session`, `payment`, `refund`.
* **Fulfillment Module (`@medusajs/medusa/fulfillment`)**: Owns `shipping_option`, `fulfillment`, `tracking_info`.
* **Tax Module (`@medusajs/medusa/tax`)**: Owns `tax_region`, `tax_rate`, `tax_rate_rule`.
* **Region Module (`@medusajs/medusa/region`)**: Owns `region`, `country`.
* **Customer Module (`@medusajs/medusa/customer`)**: Owns `customer`, `customer_address`, `customer_group`.
* **Promotion Module (`@medusajs/medusa/promotion`)**: Owns `promotion`, `campaign`, `promotion_rule`.

### 2.2 Standardized Custom Modules Naming & Data Ownership
To eliminate naming mismatches across documentation and code, all custom modules, models, and database tables are standardized according to the following strict registry:

| Module Identifier | Directory Path | DML Models | Table Names | Functional Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`store-customizer`** | `src/modules/store-customizer` | `CarouselSlide`<br>`ThemeConfig` | `carousel_slide`<br>`theme_config` | Homepage hero carousel slides (dynamic capacity, 6 default slides) and merchant branding tokens (colors, typography, announcement bar). |
| **`marketing-telemetry`** | `src/modules/marketing-telemetry` | `MarketingConfig` | `marketing_config` | Encrypted storage for Meta Pixel ID, Meta CAPI token, GA4 Measurement ID, MP secret, GTM ID, and consent mode default (`denied`). |
| **`india-tax`** | `src/modules/india-tax` | `GstProductDetail` | `gst_product_detail` | Indian HSN codes, GST rates, and tax-inclusive flags linked to products via `defineLink`. |
| **`licensing`** | `src/modules/licensing` | `LicenseRecord` | `license_record` | Cryptographic signature verification for domain-bound one-time software licenses. |

### 2.3 Custom Module Migration Workflow
Custom modules follow Medusa v2's standard development and migration lifecycle:
1. **Module Registration**: Registered in `medusa-config.ts` under the `modules` array:
   ```typescript
   module.exports = defineConfig({
     modules: [
       { resolve: "./src/modules/store-customizer" },
       { resolve: "./src/modules/marketing-telemetry" },
       { resolve: "./src/modules/india-tax" },
       { resolve: "./src/modules/licensing" },
     ],
   });
   ```
2. **DML Modeling**: Entities defined using `model.define(...)` in `src/modules/<module-name>/models/`.
3. **Migration Generation**: Generated via the Medusa CLI:
   ```bash
   npx medusa db:generate store-customizer
   npx medusa db:generate marketing-telemetry
   npx medusa db:generate india-tax
   npx medusa db:generate licensing
   ```
   This generates standard TypeScript migration files inside `src/modules/<module-name>/migrations/`.
4. **Migration Execution**: Executed via the Medusa CLI:
   ```bash
   npx medusa db:migrate
   ```
5. **Rollback & Verification**: Validated in CI/CD environments with rollback checks (`npx medusa db:rollback`) to verify schema idempotency.

---

## 3. Inventory Lifecycle & Checkout Error Handling

### 3.1 Official Medusa v2 Inventory Lifecycle
Medusa v2 manages inventory through distinct reservation and consumption phases:
* **Order Placement (`completeCartWorkflow`)**:
  * Validates available unreserved stock.
  * Creates **inventory reservations (`reservation_item`)** against the designated stock location's `inventory_level`.
  * Physical stock (`stocked_quantity`) is **not** decremented at order placement.
* **Order Fulfillment (`createFulfillmentWorkflow`)**:
  * Consumes physical stock (`stocked_quantity` is decremented).
  * Releases (deletes) the corresponding inventory reservations.
  * Supports **partial fulfillment**: Only fulfilled items consume stock and release their respective reservations; remaining unfulfilled items retain their reservations.
* **Order Cancellation (`cancelOrderWorkflow`)**:
  * When an order or individual line item is canceled prior to fulfillment, Medusa automatically deletes/releases the applicable reservations, instantly restoring available stock.
* **Cart Abandonment**:
  * Adding items to a shopping cart does **not** create inventory reservations. Inactive or abandoned carts do not hold reservations, eliminating stock lockout risks without relying on custom cron cleanup scripts.

### 3.2 Complete Cart API Response Behavior
The storefront communicates with `POST /store/carts/{id}/complete`:
* **Success**: Returns `HTTP 200 OK` with `{ type: "order", order: OrderDTO }`.
* **Action Required**: In 3D-Secure or payment challenge flows, returns `HTTP 200 OK` with `{ type: "cart", cart: CartDTO, error?: { message, code, type } }`. The payment collection enters `requires_action`, prompting the storefront to execute the provider challenge before retrying completion.
* **Errors**: Medusa returns structured errors `{ message: string, type: string, code: string }` with context-specific HTTP status codes:
  * `HTTP 400 Bad Request`: Incomplete cart data or invalid address state.
  * `HTTP 409 Conflict`: Insufficient unreserved inventory at the stock location.
  * `HTTP 500 / Provider Error`: Gateway communication failure.
  * Status codes are handled contextually by the storefront; the architecture does **not** assume all failures are HTTP 402 or 409.

---

## 4. India-First Architecture & GST Place of Supply Rules

### 4.1 Section 10 IGST Act Place of Supply Rules
The GST calculation engine evaluates tax based on the merchant fulfillment warehouse location (supplier location) and delivery address (place of supply) under Section 10 of the Indian IGST Act:
* **Supplier Location**: State of the registered stock location/warehouse from which goods are dispatched.
* **Place of Supply**: State where movement of goods terminates for delivery to the recipient.
* **Tax Determination**:
  $$\text{Tax Applied} = \begin{cases} \text{CGST} + \text{SGST} & \text{if } \text{State}_{\text{Supplier}} = \text{State}_{\text{PlaceOfSupply}} \text{ (Intra-State)} \\ \text{IGST} & \text{if } \text{State}_{\text{Supplier}} \ne \text{State}_{\text{PlaceOfSupply}} \text{ (Inter-State)} \end{cases}$$
* **B2B Invoicing**: Captures customer GSTIN, validates format, and generates GST-compliant invoices displaying HSN codes, taxable values, and applicable tax breakdowns.

---

## 5. Security & Payment Compliance Architecture

### 5.1 Independent Verification of PCI DSS Eligibility
* The platform employs hosted iframe elements (**Stripe Elements** / **Razorpay Checkout**) so that no raw payment card data (PAN, CVV) touches application servers or databases.
* **Independent Verification Required**: In accordance with PCI Security Standards Council guidance, PCI DSS SAQ-A eligibility cannot be claimed automatically. Actual qualification depends on the merchant's end-to-end deployment architecture, Content Security Policy (CSP) headers, payment integration implementation, and hosting environment, and must be independently evaluated and verified by the merchant via the formal PCI DSS SAQ-A Self-Assessment Questionnaire.

---

## 6. Global Commerce, Multi-Currency & Payment Provider Adapter

Refer to `docs/GLOBAL_COMMERCE_ARCHITECTURE.md` for comprehensive details.

### 6.1 Multi-Currency Foundation & Market Registry
* **Base Merchant Currency**: `inr` (Indian Rupee, ₹).
* **International Markets**: United States (`usd`, $), United Arab Emirates (`aed`, AED), United Kingdom (`gbp`, £), European Union (`eur`, €).
* **Price Resolution**: Priority 1 merchant fixed price override; Priority 2 automated FX conversion adapter (`IFXRatesProvider`) with Redis 12h TTL and 48h circuit breaker.
* **Financial Integrity**: Zero floating-point arithmetic. Standard currency precision (2 decimals). Server-side authoritative price resolution.

### 6.2 Payment Gateway Provider Adapters (Milestone 02D)
* **Provider Adapters**: Segregated via Medusa v2 `AbstractPaymentProvider` for **Razorpay** (domestic UPI/Cards, international cards upon export activation) and **Cashfree**.
* **Zero Mocking Policy**: Foreign currency payments are never simulated. Transactions execute only when the connected gateway supports the currency.
* **Customer Transparency**: If the gateway only settles in INR, customer explicitly reviews and confirms the INR equivalent amount prior to payment authorization.
* **Post-Purchase Accounting**: Orders store an immutable `exchange_rate_snapshot`. Refunds and chargebacks execute strictly in the original transaction currency, while merchant reports compute INR equivalents via the historical snapshot.
