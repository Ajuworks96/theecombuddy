# Engineering Roadmap & Milestone Verification Plan

**Project**: The Ecom Buddy  
**Document**: Development Roadmap & Quality Gates  
**Status**: Revised Architecture Specification (Final Step 01 Technical Corrections)  
**Milestone**: 01 (Foundation & Technical Specification)  
**Author**: Principal Software Architect & Senior E-commerce Product Engineer  

---

## 1. Phased Execution Overview

The engineering execution plan is partitioned into **seven sequential milestones**, incorporating:
1. **Early Vertical-Slice Testing** in Milestone 02: Testing `Product -> Variant -> Inventory -> Cart -> Order (Reservation) -> Fulfillment (Stock Deduction) -> Cancellation` directly through Medusa v2 workflows.
2. **Early Deployment Validation** in Milestone 03: Testing Docker Compose builds and database persistence early.
3. **Foundational SEO during Storefront Build** in Milestone 04: Integrating metadata, canonicals, and structured data alongside Next.js 15 UI implementation.

```mermaid
flowchart TD
    M1["Milestone 01: Architecture & Technical Specifications\n(CURRENT — FINAL REVISION PENDING APPROVAL)"]
    M2["Milestone 02: Medusa v2 Setup, 500+ Seed & Early Vertical-Slice Test\n(Order Placement -> Reservations -> Fulfillment -> Stock Deduction)"]
    M3["Milestone 03: Merchant Admin, Customizer & Early Deployment Check\n(Onboarding, Carousel Manager, ColorPixel Admin, Docker Validation)"]
    M4["Milestone 04: Next.js 15 Storefront + Foundational SEO\n(Crescendo, Velora, Aero Step, Philox + Metadata, Canonicals, Schema)"]
    M5["Milestone 05: India-First Commerce, Razorpay, COD & GST Engine\n(UPI, Netbanking, COD with Pin Code Check, Section 10 IGST Rules)"]
    M6["Milestone 06: Growth, Telemetry & Feed Automation\n(Meta Pixel+CAPI Deduplication, GA4 MP Reconciliation, GMC Feed)"]
    M7["Milestone 07: Licensing, Turnkey Packaging & Load Validation\n(One-Click Docker Compose, Automated Backups, k6 Load Benchmarks)"]

    M1 -->|Formal Approval| M2
    M2 --> M3
    M3 --> M4
    M4 --> M5
    M5 --> M6
    M6 --> M7

    style M1 fill:#f96,stroke:#333,stroke-width:2px
    style M2 fill:#bbf,stroke:#333,stroke-width:1px
    style M3 fill:#eee,stroke:#999,stroke-width:1px
    style M4 fill:#eee,stroke:#999,stroke-width:1px
    style M5 fill:#eee,stroke:#999,stroke-width:1px
    style M6 fill:#eee,stroke:#999,stroke-width:1px
    style M7 fill:#eee,stroke:#999,stroke-width:1px
```

---

## 2. Detailed Milestone Specifications

### Milestone 01: Architecture Foundations & Technical Specifications (Current)
* **Scope**: Complete revision of all architecture specifications in `/docs` addressing all review criteria (Medusa official inventory lifecycle, Complete Cart API response handling, migration workflow, standardized module names, Google Search Central SEO compliance, Place of Supply GST rules, independent PCI verification).
* **Deliverable**: `docs/ARCHITECTURE_REVIEW_CHANGES.md` and updated specifications.
* **Quality Gate**: Architecture review sign-off. Zero UI code generated.

---

### Milestone 02: Engine Setup, 500+ Seed Generator, Multi-Currency Cart & Early Vertical Slice
* **Prerequisites**: Approval of Milestone 01.
* **Scope**:
  * **02A (Monorepo & Foundation - COMPLETED)**:
    * Initialize monorepo workspace (`apps/backend`, `apps/storefront`, `packages/*`).
    * Medusa v2 core engine with PostgreSQL 18 and Redis 7.
    * Publishable API key and sales channel configuration.
  * **02B (Catalog, Inventory & Seed Data - COMPLETED)**:
    * Automated Seed Generator: **520 distinct products** with multi-attribute variants (**1,235 variants**), realistic INR pricing (`₹`), HSN codes, categories, and inventory levels.
    * 1:1 variant-to-inventory level reconciliation.
  * **02C (Cart, Shipping, Checkout & Multi-Region Foundation - CURRENT)**:
    * Official Medusa v2 cart workflows: create, retrieve, update line items, remove items, cart persistence.
    * Stock availability validation and out-of-stock rejection.
    * Concurrent cart update resilience.
    * Shipping profiles, service zones, and fulfillment options.
    * Guest checkout address validation (shipping & billing).
    * Server-side pricing, tax calculation (18% GST), promotions (`WELCOME10`, `FLAT100`), and order total calculation formula:
      $$\text{Total} = \text{Subtotal} + \text{Shipping} + \text{Tax} - \text{Discount}$$
    * **Global Commerce Addendum**:
      * Multi-region and multi-currency configuration for 5 key markets: India (`inr`), United States (`usd`), UAE (`aed`), United Kingdom (`gbp`), European Union (`eur`).
      * Variant multi-currency pricing sets.
      * Dynamic market switching with real-time recalculation of line-item unit prices and currency-locked totals.
      * Region-specific shipping options and extensible tax regions.
      * Currency-safe monetary arithmetic with standard precision.
  * **02D (Payment Providers, Webhook Reconciliation & Complete Order Flow - UPCOMING)**:
    * Provider-adapter pattern for **Razorpay** and **Cashfree**.
    * Multi-currency capture validation (foreign currency processing enabled only when gateway supports it).
    * Complete cart workflow (`completeCartWorkflow`) creating inventory reservations.
    * Webhook idempotency, payment failure compensation, and exchange-rate snapshots.
* **Quality Gate**: Automated test suites for 02A, 02B, and 02C pass 100%; multi-currency cart creation, variant price resolution, and market switching validated without error.

---

### Milestone 03: Merchant Admin Dashboard & Early Deployment Validation
* **Prerequisites**: Completion of Milestone 02.
* **Scope**:
  * Build Merchant Onboarding Wizard (**Reference 01: Merchant onboarding reference**).
  * Build High-Density Catalog Management (**Reference 06: ColorPixel merchant dashboard**).
  * Build Variant Matrix & HSN Creator (**Reference 07: SalesSync product creation interface**).
  * Build Merchant Global Selling Settings (enable/disable target international markets, configure fixed prices, set FX markup buffer $\mu_{\text{FX}}$).
  * Build Dynamic Carousel Slide Customizer (pre-seeded with 6 default slides, full add/edit/reorder controls).
  * **Early Deployment Validation**: Build Docker images for backend and database; validate container startup, persistent volume mounting, and database migrations on a clean test environment.
* **Quality Gate**: Non-technical merchant can create products, adjust stock, configure international prices, and edit carousel slides via admin UI; Docker container boots and migrates cleanly.

---

### Milestone 04: Next.js 15 Storefront Implementation + Foundational SEO
* **Prerequisites**: Completion of Milestone 03 and visual confirmation of screenshots in `/design-references`.
* **Scope**:
  * Homepage Hero Carousel & Discovery (**Reference 02: Crescendo homepage**).
  * High-Conversion Product Detail Page (**Reference 03: Velora product details**).
  * Curated Collections & Storytelling (**Reference 04: Aero Step editorial storefront**).
  * Promotional Features & Banners (**Reference 05: Philox promotional layout**).
  * Storefront Market/Currency Selector & Geo-IP auto-suggestion.
  * Slide-over Mini-Cart with dynamic Free Shipping progress bar.
  * **Foundational SEO Architecture**:
    * Dynamic metadata generation (`generateMetadata`) across products, categories, and static pages.
    * Strict canonical URL enforcement and filter/sort handling.
    * Schema.org JSON-LD structured data (`Product`, `Offer`, `BreadcrumbList`, `Organization`, `WebSite`).
    * Dynamic `robots.txt` and XML sitemaps (`/sitemap.xml` using `<loc>` and `<lastmod>`).
* **Quality Gate**: Mobile & Desktop Google Lighthouse score $\ge 90$; visual fidelity aligned with reference screenshots; seamless multi-currency cart updates from currency picker.

---

### Milestone 05: India-First Commerce, Razorpay, COD & Tax Engine
* **Prerequisites**: Completion of Milestone 04.
* **Scope**:
  * Frictionless one-page checkout with Indian PIN code auto-fill for city/state.
  * Razorpay payment gateway integration (UPI Intent/QR, Netbanking, Cards).
  * Cash on Delivery (COD) engine with PIN code availability check and optional fee.
  * Indian GST calculation engine based on Section 10 IGST Act Place of Supply rules (dispatch location vs. place of supply).
  * B2B GSTIN collection and one-click GST-compliant tax invoice PDF generation.
  * Webhook idempotency and payment reconciliation workflows.
* **Quality Gate**: Automated test suite executing successful UPI/Card/COD orders, verifying correct GST split and inventory deduction.

---

### Milestone 06: Marketing, Telemetry & Feed Automation
* **Prerequisites**: Completion of Milestone 05.
* **Scope**:
  * Dual-layer Meta tracking: browser pixel + server CAPI with stable entity-derived `event_id` and SHA-256 customer data hashing.
  * Google Analytics 4 dataLayer pushes + Measurement Protocol backend validation.
  * Google Consent Mode v2 implementation (default `denied`, dynamically updated on shopper opt-in).
  * Automated Google Merchant Center product feed (`/feeds/google-merchant-center.xml`).
* **Quality Gate**: Meta Test Event tool verifies receipt of client and server events with Event Match Quality $\ge 8.0/10$; GA4 DebugView confirms accurate event deduplication.

---

### Milestone 07: Licensing, Turnkey Packaging & Load Validation
* **Prerequisites**: Completion of Milestone 06.
* **Scope**:
  * Offline-capable domain-bound cryptographic license validation (Ed25519).
  * Production Docker Compose configuration with Caddy automated TLS 1.3 reverse proxy.
  * Automated daily backup and disaster recovery scripts (`backup.sh`, `restore.sh`).
  * **Performance & Load Testing**: Execute **k6** load testing simulating 50 concurrent active shopper sessions; validate p95 response time $\le 300\text{ ms}$.
  * Author non-technical merchant documentation.
* **Quality Gate**: Turnkey deployment on fresh Ubuntu Linux VPS completes in under 15 minutes with automated SSL; k6 load test passes performance targets.

---

## 3. Strict Milestone Gatekeeper Policy

> [!IMPORTANT]
> **Approval Gate**: Development on Milestone 02 will not commence until the revised architectural blueprints and the review changes document (`docs/ARCHITECTURE_REVIEW_CHANGES.md`) have been approved.
