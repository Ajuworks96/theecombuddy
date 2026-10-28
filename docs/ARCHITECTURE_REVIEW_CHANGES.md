# Architecture Review & Corrections Report

**Project**: The Ecom Buddy  
**Document**: Architecture Review & Corrections Report  
**Status**: Step 01 Architecture Revision Handover  
**Milestone**: 01 (Foundation & Technical Specification)  
**Author**: Principal Software Architect & Senior E-commerce Product Engineer  

---

## 1. Executive Summary

Following a formal independent architecture review of the initial Step 01 documentation, twelve critical corrections were mandated across data ownership, inventory and checkout orchestration, catalog capacity, hero carousel flexibility, telemetry attribution realism, privacy compliance, technical SEO, India-first localization, authoritative design reference mapping, engineering roadmap structure, and non-functional requirement measurability.

This document provides a comprehensive audit of each issue identified, the corrected technical approach implemented, the exact files updated, the relevant official documentation referenced, remaining engineering risks, and the acceptance criteria established.

---

## 2. Itemized Architecture Corrections

### Correction 01: Medusa Data Ownership & Module Boundaries
* **Original Issue**: The initial draft proposed manually creating and managing raw PostgreSQL DDL tables for core commerce entities (`products`, `product_variants`, `orders`, `carts`, `inventory_levels`). This violated Medusa's modular architecture and introduced high maintenance fragility.
* **Corrected Approach**:
  * Removed all proposals to manually create, alter, or replace Medusa's core commerce database tables.
  * Formally established that Medusa v2's official commerce modules (`@medusajs/medusa/product`, `/inventory`, `/cart`, `/order`, `/payment`, `/pricing`, `/promotion`, `/tax`, `/customer`) own and manage all core commerce entities via Medusa's CLI migrations (`medusa db:migrate`).
  * Custom requirements are modeled strictly using Medusa v2's declarative **Data Modeling Layer (DML)** (`model.define`) in registered custom modules (`@ecom-buddy/store-customizer`, `@ecom-buddy/marketing-telemetry`, `@ecom-buddy/india-tax`, `@ecom-buddy/licensing`).
  * Custom attributes attached to core entities (such as Indian HSN tax codes on products) are integrated using Medusa v2's official **Module Links** (`defineLink`).
* **Files Updated**:
  * [`docs/SYSTEM_ARCHITECTURE.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/SYSTEM_ARCHITECTURE.md)
  * [`docs/DATABASE_DESIGN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/DATABASE_DESIGN.md)
  * [`docs/PRODUCT_REQUIREMENTS.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/PRODUCT_REQUIREMENTS.md)
* **Relevant Official Documentation**:
  * [Medusa v2 Architecture Overview](https://docs.medusajs.com/v2/learn)
  * [Medusa v2 Data Modeling Layer (DML)](https://docs.medusajs.com/v2/learn/fundamentals/data-models)
  * [Medusa v2 Module Links](https://docs.medusajs.com/v2/learn/fundamentals/module-links)
* **Remaining Risks**: Upstream breaking changes in future minor releases of Medusa v2 could affect module links. (Mitigation: Pin exact Medusa v2 patch versions in monorepo dependencies).
* **Acceptance Criteria**: Automated test confirms `medusa db:migrate` initializes all core and custom tables without manual SQL intervention.

---

### Correction 02: Inventory Reservation & Checkout Workflows
* **Original Issue**: Proposed a custom two-phase inventory locking mechanism with raw SQL `SELECT FOR UPDATE` and a custom cron worker for reservation cleanup, which duplicated and conflicted with Medusa's built-in checkout workflows.
* **Corrected Approach**:
  * Completely removed conflicting custom SQL locks and cron workers.
  * Formally adopted Medusa v2's native **`completeCartWorkflow`** and official **`reserveInventoryStep`**.
  * Documented built-in compensation steps: if payment authorization fails, Medusa's workflow engine automatically deletes created reservation items, returning stock immediately to the available pool.
  * Documented payment retry mechanics, payment provider webhook idempotency (handling duplicate delivery of `payment.captured` webhooks), refund workflows, and automated background reconciliation for orphaned checkout sessions.
* **Files Updated**:
  * [`docs/COMMERCE_WORKFLOWS.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/COMMERCE_WORKFLOWS.md)
  * [`docs/SYSTEM_ARCHITECTURE.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/SYSTEM_ARCHITECTURE.md)
* **Relevant Official Documentation**:
  * [Medusa v2 Workflows Engine & Compensation](https://docs.medusajs.com/v2/learn/fundamentals/workflows/compensation-function)
  * [Medusa v2 Inventory & Reservation Workflows](https://docs.medusajs.com/v2/resources/commerce-modules/inventory)
* **Remaining Risks**: High-concurrency flash sale spikes could hit database pool limits. (Mitigation: Configure connection pooling in PostgreSQL 16 container).
* **Acceptance Criteria**: End-to-end automated test verifies that an aborted payment releases the reserved inventory immediately via workflow compensation.

---

### Correction 03: Product Scale & Catalog Capacity
* **Original Issue**: Previous drafts conflated "500+ products" with "500+ SKUs", confusing distinct parent products with individual variant combinations.
* **Corrected Approach**:
  * Standardized the definition: The platform supports a minimum of **500 distinct parent products** per merchant.
  * Factored in multi-variant combinations (Size, Color, Material), resulting in a baseline capacity of **1,500 to 4,000+ distinct sellable SKUs**.
  * Updated seed generator specifications, database indexing strategies (B-tree compound indexes, PostgreSQL full-text search `tsvector` indexes), pagination defaults, and performance requirements to reflect this scale.
* **Files Updated**:
  * [`docs/PRODUCT_REQUIREMENTS.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/PRODUCT_REQUIREMENTS.md)
  * [`docs/DATABASE_DESIGN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/DATABASE_DESIGN.md)
  * [`docs/DEVELOPMENT_ROADMAP.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/DEVELOPMENT_ROADMAP.md)
* **Relevant Official Documentation**:
  * [PostgreSQL 16 Full-Text Search Documentation](https://www.postgresql.org/docs/16/textsearch.html)
  * [Medusa v2 Product Module Querying](https://docs.medusajs.com/v2/resources/commerce-modules/product)
* **Remaining Risks**: Large catalogs can degrade uncached SSR response times. (Mitigation: Next.js 15 tag-based caching with on-demand ISR revalidation).
* **Acceptance Criteria**: Seed script generates $\ge 500$ distinct products ($\ge 2,500$ SKUs) and paginated catalog queries execute in $\le 100\text{ ms}$.

---

### Correction 04: Dynamic Hero Carousel (6 Default Pre-Configured Slides)
* **Original Issue**: The database schema enforced a rigid SQL check constraint `CHECK (slot_number BETWEEN 1 AND 6)`, artificially capping the carousel at exactly six slides and preventing merchants from adding additional slides.
* **Corrected Approach**:
  * Removed the rigid `CHECK` constraint from the schema.
  * Formally mandated **six default pre-configured slides** upon initial store installation (high-quality editorial copy, responsive desktop/mobile crops).
  * Provided merchants with completely unconstrained dynamic management: merchants can add, edit, disable, reorder, and remove slides dynamically via the admin customizer.
* **Files Updated**:
  * [`docs/DATABASE_DESIGN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/DATABASE_DESIGN.md)
  * [`docs/PRODUCT_REQUIREMENTS.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/PRODUCT_REQUIREMENTS.md)
  * [`docs/DESIGN_SYSTEM_PLAN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/DESIGN_SYSTEM_PLAN.md)
* **Relevant Official Documentation**:
  * [W3C Carousel Accessibility Pattern (WAI-ARIA)](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)
* **Remaining Risks**: Non-technical merchants uploading unoptimized raw multi-megabyte images. (Mitigation: Admin image uploader auto-converts to WebP with responsive breakpoints).
* **Acceptance Criteria**: Admin interface allows adding a 7th slide, disabling slide 2, and dragging to reorder with instant persistence.

---

### Correction 05: Meta Pixel & Conversions API (CAPI) Deduplication
* **Original Issue**: Overpromised "100% purchase attribution or perfect event matching" and utilized simplistic, unstable event ID examples that could trigger duplicate events on page reloads or retries.
* **Corrected Approach**:
  * Removed all claims of "100% attribution".
  * Established an industry-standard engineering target: achieve an **Event Match Quality (EMQ) score $\ge 8.0/10$** on Purchase events.
  * Implemented stable, entity-derived event ID generation:
    * Browsing events: Client-side UUID (`crypto.randomUUID()`) shared synchronously with the server mutation payload.
    * Transaction events: Derived stably from the commerce entity (e.g., `pur_[order.id]`). Page reloads and webhook retries reuse the identical stable ID.
  * Integrated SHA-256 customer data hashing and encrypted token storage for the Meta System User Access Token.
  * Gated telemetry dispatches on individual shopper consent via Google Consent Mode v2.
* **Files Updated**:
  * [`docs/SEO_MARKETING_PLAN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/SEO_MARKETING_PLAN.md)
  * [`docs/DATABASE_DESIGN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/DATABASE_DESIGN.md)
* **Relevant Official Documentation**:
  * [Meta Conversions API Deduplication Guide](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplication)
  * [Meta Conversions API Parameters & Data Processing](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters)
* **Remaining Risks**: Network timeouts between self-hosted backend and Meta Graph API. (Mitigation: Asynchronous background worker with exponential backoff).
* **Acceptance Criteria**: Meta Test Event tool logs matching client and server Purchase events and confirms successful deduplication.

---

### Correction 06: Google Analytics 4 & Measurement Protocol
* **Original Issue**: Claimed that Measurement Protocol guarantees 100% accurate revenue reporting or complete purchase attribution.
* **Corrected Approach**:
  * Removed claims of 100% accurate revenue reporting.
  * Clarified the role of Measurement Protocol: it serves as a **backend validation and reconciliation event**, not an automatic replacement for client session tracking.
  * Documented proper GA4 attribution binding requirements: capturing and transmitting `client_id` (from `_ga` cookie), `session_id`, and `transaction_id`.
  * Documented duplicate transaction prevention between client and server purchase events.
* **Files Updated**:
  * [`docs/SEO_MARKETING_PLAN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/SEO_MARKETING_PLAN.md)
* **Relevant Official Documentation**:
  * [Google Analytics 4 Measurement Protocol Reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
  * [GA4 E-commerce Recommended Events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
* **Remaining Risks**: Browsers running strict privacy extensions may block `_ga` cookie creation. (Mitigation: Fallback to server-generated anonymous client ID).
* **Acceptance Criteria**: GA4 DebugView verifies that client dataLayer events and server Measurement Protocol events reconcile under the same `transaction_id`.

---

### Correction 07: Privacy, Regional Rules & Consent Decoupling
* **Original Issue**: The database schema defaulted consent to `'granted'` while prose claimed privacy by default, and a merchant admin toggle could have enabled tracking without shopper consent.
* **Corrected Approach**:
  * Corrected the database schema default to **`'denied'`**.
  * Fully integrated **Google Consent Mode v2** defaults (`ad_storage: denied`, `analytics_storage: denied`, `ad_user_data: denied`, `ad_personalization: denied`).
  * Decoupled merchant toggles from shopper consent: A merchant enabling Meta/Google tracking merely activates the integration; tags and server PII dispatches remain dormant until the individual shopper explicitly provides consent.
* **Files Updated**:
  * [`docs/SEO_MARKETING_PLAN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/SEO_MARKETING_PLAN.md)
  * [`docs/DATABASE_DESIGN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/DATABASE_DESIGN.md)
  * [`docs/PRODUCT_REQUIREMENTS.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/PRODUCT_REQUIREMENTS.md)
* **Relevant Official Documentation**:
  * [Google Consent Mode v2 Documentation](https://developers.google.com/tag-platform/security/guides/consent)
* **Remaining Risks**: Merchant clients operating in strictly opt-out jurisdictions (e.g., non-EU) desiring implicit analytics. (Mitigation: Configurable regional consent mode presets in admin).
* **Acceptance Criteria**: Network inspection confirms zero tracking hits or external pixel calls before the shopper interacts with the consent banner.

---

### Correction 08: Comprehensive Technical SEO Expansion
* **Original Issue**: The initial SEO plan lacked essential e-commerce specifications such as Google Merchant Center feeds, CMS metadata, 301 redirect management, image SEO, and Google Search Console verification.
* **Corrected Approach**:
  * Expanded metadata specifications across products, categories, CMS content, and static policy pages.
  * Documented strict canonical URL enforcement, specifically addressing faceted navigation and query parameters (`?color=...&sort=...`).
  * Specified dynamic `robots.txt` and XML sitemaps partitioned into products, categories, and static pages.
  * Documented automated **301 redirect management** in PostgreSQL when product handles or category slugs change.
  * Expanded Schema.org JSON-LD to include `Product`, `Offer`, `BreadcrumbList`, `Organization`, `WebSite`, `hasMerchantReturnPolicy`, and `shippingDetails`.
  * Added automated **Google Merchant Center (GMC) Product Feed** generation (`/feeds/google-merchant-center.xml`).
  * Documented Image SEO (contextual `alt` tags, WebP/AVIF formats, human-readable file naming) and Search Console verification.
* **Files Updated**:
  * [`docs/SEO_MARKETING_PLAN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/SEO_MARKETING_PLAN.md)
* **Relevant Official Documentation**:
  * [Google Search Central E-commerce Guidelines](https://developers.google.com/search/docs/specialty/ecommerce)
  * [Google Product Data Specification](https://support.google.com/merchants/answer/7052112)
  * [Schema.org Product Specification](https://schema.org/Product)
* **Remaining Risks**: Merchant entering non-standard GTINs or failing to input brand identifiers for GMC. (Mitigation: Admin validation checks before product publishing).
* **Acceptance Criteria**: Google Rich Results Test passes 100% on product detail pages with zero errors.

---

### Correction 09: India-First Configuration with Global Adaptability
* **Original Issue**: The architecture defaulted to USD, US states/cities, USPS/FedEx, and US-centric commercial assumptions.
* **Corrected Approach**:
  * Established **Indian Rupee (`INR` / `₹`)** as the primary default currency with Indian numbering formatting (`₹1,49,999.00`).
  * Specified **Razorpay** as the primary Indian payment gateway (UPI QR & Intent, Netbanking, Cards, Wallets, EMI).
  * Specified **Cash on Delivery (COD)** as a first-class payment method with PIN-code availability verification and optional convenience fees.
  * Implemented Indian address schemas: mandatory 6-digit **PIN Code** with automated City/State lookup, Flat/Landmark fields, and State/UT dropdown (28 states, 8 UTs).
  * Implemented an Indian **GST Calculation Engine**:
    * Intra-state transactions: Split into **CGST** and **SGST**.
    * Inter-state transactions: Single **IGST** assessment.
    * Product-level **HSN codes** linked via Medusa module links.
    * B2B GSTIN collection and one-click GST tax invoice generation.
* **Files Updated**:
  * [`docs/PRODUCT_REQUIREMENTS.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/PRODUCT_REQUIREMENTS.md)
  * [`docs/SYSTEM_ARCHITECTURE.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/SYSTEM_ARCHITECTURE.md)
  * [`docs/COMMERCE_WORKFLOWS.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/COMMERCE_WORKFLOWS.md)
  * [`docs/DATABASE_DESIGN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/DATABASE_DESIGN.md)
* **Relevant Official Documentation**:
  * [Razorpay Standard Integration Docs](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)
  * [CBIC GST Invoicing Rules](https://cbic-gst.gov.in/)
* **Remaining Risks**: Changes in Indian GST tax slabs or state codes. (Mitigation: Tax slabs managed via Medusa's Tax Module rates rather than hardcoded logic).
* **Acceptance Criteria**: Checkout calculates correct CGST/SGST vs. IGST based on customer PIN code and merchant state, outputting a valid GST PDF invoice.

---

### Correction 10: Authoritative Design Reference Mapping
* **Original Issue**: The initial documentation used guessed placeholder names for the seven design reference screenshots.
* **Corrected Approach**:
  * Mapped and documented the exact authoritative references:
    * **01: Merchant onboarding reference** (Admin setup wizard)
    * **02: Crescendo homepage** (Editorial storefront hero & discovery)
    * **03: Velora product details** (High-end sticky PDP)
    * **04: Aero Step editorial storefront** (Curated collections grid)
    * **05: Philox promotional layout** (Promotional showcases & split banners)
    * **06: ColorPixel merchant dashboard** (High-density admin workspace)
    * **07: SalesSync product creation interface** (Variant matrix & HSN creator)
  * Reaffirmed strict prohibitions against generic AI aesthetics, arbitrary gradients, and cookie-cutter grids.
* **Files Updated**:
  * [`docs/DESIGN_SYSTEM_PLAN.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/DESIGN_SYSTEM_PLAN.md)
  * [`design-references/README.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/design-references/README.md)
  * [`README.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/README.md)
* **Remaining Risks**: Visual drift during frontend development. (Mitigation: Design reference review gate prior to approving Milestone 04).
* **Acceptance Criteria**: Storefront and admin components achieve pixel-level visual fidelity with the seven reference screenshots.

---

### Correction 11: Roadmap Enhancements (Early Vertical Slice & Deployment Check)
* **Original Issue**: The roadmap lacked an early integration test, deferred SEO to later phases, and delayed deployment validation to the final milestone.
* **Corrected Approach**:
  * **Early Vertical-Slice Test** introduced in **Milestone 02**: An automated end-to-end integration test validating:  
    `Product -> Variant -> Inventory -> Cart -> Checkout -> Order`  
    executed directly through Medusa v2 workflows.
  * **Early Deployment Validation** introduced in **Milestone 03**: Building Docker Compose images and verifying persistent PostgreSQL volume mounts and memory footprints early.
  * **Foundational SEO** embedded directly in **Milestone 04**: Next.js 15 metadata, canonical tags, and structured data scaffolding built concurrently with storefront UI components.
* **Files Updated**:
  * [`docs/DEVELOPMENT_ROADMAP.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/DEVELOPMENT_ROADMAP.md)
* **Relevant Official Documentation**:
  * [Medusa v2 Testing Utilities](https://docs.medusajs.com/v2/learn/fundamentals/testing)
* **Remaining Risks**: Docker environment differences across client hosting providers. (Mitigation: Test on clean Debian and Ubuntu standard VPS images).
* **Acceptance Criteria**: Automated test suite executes the complete vertical slice without errors in Milestone 02.

---

### Correction 12: Measurable Non-Functional Targets & Validation
* **Original Issue**: Provided unverified, speculative claims (e.g., "500 concurrent users on standard 4GB VPS", "100% PCI compliance", "99.9% uptime") without measurable targets or validation methodologies.
* **Corrected Approach**:
  * Replaced speculative claims with measurable targets and concrete validation methods:
    * **Server Performance**: Target p95 TTFB $\le 300\text{ ms}$ under simulated load of 50 concurrent active shopper sessions (validated via **k6** / **Artillery** load tests).
    * **Catalog Query Execution**: Sub-100ms database response times across 500+ products (2,500+ SKUs) (validated via PostgreSQL `EXPLAIN ANALYZE`).
    * **Frontend Performance**: Google Lighthouse score $\ge 90$ on mobile viewports (validated via **Lighthouse CI**).
    * **Security / PCI**: PCI-DSS SAQ-A qualification via hosted iframe tokenization (Stripe Elements / Razorpay Checkout), validated via annual SAQ-A questionnaire.
    * **Service Availability**: Container auto-restart policies with health checks monitoring `/health` endpoints.
* **Files Updated**:
  * [`docs/PRODUCT_REQUIREMENTS.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/PRODUCT_REQUIREMENTS.md)
  * [`docs/DEVELOPMENT_ROADMAP.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/DEVELOPMENT_ROADMAP.md)
* **Relevant Official Documentation**:
  * [PCI Security Standards Council SAQ-A Guidelines](https://www.pcisecuritystandards.org/)
  * [Google Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
* **Remaining Risks**: Hosting providers with severely constrained CPU/IOPS under heavy flash traffic. (Mitigation: Redis caching layer for catalog queries and static asset edge caching).
* **Acceptance Criteria**: k6 load testing report confirms p95 latency $\le 300\text{ ms}$ under baseline load.

---

## 3. Cross-Document Consistency & Contradiction Audit

A rigorous cross-document review was performed across all documentation in `/docs` to eliminate inconsistencies:

| Verification Check | Findings & Verification Result |
| :--- | :--- |
| **Catalog Scale Consistency** | Verified across PRD, Architecture, Database Design, and Roadmap: consistently defined as **500+ distinct products** yielding **1,500–4,000+ SKUs**. |
| **Hero Carousel Rules** | Verified across PRD, Database Design, Design System, and Roadmap: consistently specified as **6 default configured slides** with **unconstrained dynamic merchant management** (zero rigid SQL `CHECK` caps). |
| **Data Ownership Consistency** | Verified across Architecture and Database Design: Medusa v2 official modules exclusively own core commerce tables; custom requirements use DML (`model.define`) and Module Links (`defineLink`). Zero raw DDL table replacement. |
| **Telemetry & Privacy Consistency** | Verified across PRD, Architecture, SEO/Marketing, and Database Design: default consent state is strictly **`'denied'`**; telemetry is gated by individual shopper consent via Google Consent Mode v2; zero 100% attribution guarantees. |
| **Currency & Localization Consistency** | Verified across all documents: **INR (`₹`)** established as primary default; Razorpay and COD established as primary Indian payment providers; Indian address format and GST/HSN split logic standardized. |
| **Authoritative Design Reference Names** | Verified across Design System, Roadmap, `design-references/README.md`, and Root `README.md`: exact 01–07 names aligned. |

---

## 4. Summary of Files Updated & Generated

```
the-ecom-buddy/
├── docs/
│   ├── ARCHITECTURE_REVIEW_CHANGES.md   # [NEW] Full itemized audit of all 12 review corrections
│   ├── PRODUCT_REQUIREMENTS.md          # [REVISED] 500+ products, India-first, dynamic carousel, measurable NFRs
│   ├── SYSTEM_ARCHITECTURE.md           # [REVISED] Medusa v2 data ownership, DML custom modules, module links
│   ├── COMMERCE_WORKFLOWS.md            # [REVISED] Medusa completeCartWorkflow, built-in compensation, GST/COD flow
│   ├── DATABASE_DESIGN.md               # [REVISED] Medusa module mapping, DML definitions, dynamic carousel schema
│   ├── SEO_MARKETING_PLAN.md            # [REVISED] CAPI stable event_id, GA4 validation, GMC feed, consent denied
│   ├── DESIGN_SYSTEM_PLAN.md            # [REVISED] Exact 01-07 reference mapping, anti-AI rules, Indian form tokens
│   └── DEVELOPMENT_ROADMAP.md           # [REVISED] Early vertical slice in M02, early deployment test in M03
├── design-references/
│   └── README.md                        # [REVISED] Exact 01-07 reference names and slot descriptions
└── README.md                            # [REVISED] Monorepo overview, India-first baseline, corrected architecture
```

---

## 5. Next Steps

**STEP 01 ARCHITECTURE CORRECTION IS COMPLETE. STOPPING HERE AS DIRECTED.**

Development on **Milestone 02** will remain completely paused until this revised architectural foundation has been reviewed and formally accepted.
