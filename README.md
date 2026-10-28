# The Ecom Buddy

> A premium, production-oriented white-label e-commerce and growth platform designed for independent client deployments with a one-time software license and zero mandatory monthly platform fees.

---

## 1. Project Philosophy & Architecture

**The Ecom Buddy** is engineered for small and medium businesses (SMBs) requiring an enterprise-grade direct-to-consumer store without the perpetual monthly platform fees of Shopify/BigCommerce or the fragility and database bloat of legacy WordPress/WooCommerce installations.

* **Business Model**: One-time software license, self-contained client deployments, complete merchant data sovereignty.
* **Core Commerce Engine**: Built on **Medusa v2**'s official modular engine (`@medusajs/medusa/product`, `/inventory`, `/cart`, `/order`, `/payment`, `/tax`) with declarative Data Modeling Layer (DML) custom modules for store personalization.
* **Storefront**: High-performance **Next.js 15 (App Router)** with React Server Components, on-demand ISR, and sub-second page performance.
* **Catalog Capacity**: Engineered for a minimum of **500 distinct products** per merchant with multi-attribute variants yielding **1,500 to 4,000+ distinct sellable SKUs**.
* **India-First Baseline**: Native Indian Rupee (`INR` / `₹`) formatting, **Razorpay** (UPI, Netbanking, Cards), **Cash on Delivery (COD)** with PIN-code checks, Indian address structures, and **GST calculation engine** (CGST/SGST vs. IGST with HSN codes).
* **Growth & Telemetry**: Native dual-layer **Meta Pixel + Conversions API (CAPI)** with stable entity-derived `event_id` deduplication, **Google Analytics 4** with Measurement Protocol validation, and Google Consent Mode v2 privacy compliance.
* **Visual Authority**: Strictly guided by seven design reference screens (Merchant Onboarding, Crescendo, Velora, Aero Step, Philox, ColorPixel, and SalesSync) with a complete prohibition of generic AI aesthetics.

---

## 2. Repository Structure

```
the-ecom-buddy/
├── docs/                                # Core Architectural & Engineering Specifications
│   ├── ARCHITECTURE_REVIEW_CHANGES.md   # Comprehensive audit of review corrections
│   ├── PRODUCT_REQUIREMENTS.md          # Business model, India-first, 500+ products, NFRs
│   ├── SYSTEM_ARCHITECTURE.md           # Medusa v2 module ownership, DML extensions, deployment
│   ├── COMMERCE_WORKFLOWS.md            # Medusa native checkout, reservation & compensation workflows
│   ├── DATABASE_DESIGN.md               # PostgreSQL schemas, Medusa modules, DML custom models
│   ├── SEO_MARKETING_PLAN.md            # Dual-layer CAPI, GA4, GMC feed, dynamic SEO & privacy
│   ├── DESIGN_SYSTEM_PLAN.md            # 7 design references, Tailwind tokens, carousel specs
│   └── DEVELOPMENT_ROADMAP.md           # 7-phase roadmap, early vertical-slice test, quality gates
├── design-references/                   # Authoritative visual reference mapping (01 through 07)
├── apps/
│   ├── backend/                         # [Milestone 02] Medusa v2 Engine, Custom Modules & Admin
│   └── storefront/                      # [Milestone 04] Next.js 15 App Router Storefront
├── packages/
│   ├── types/                           # Shared TypeScript interfaces & validation schemas
│   ├── ui/                              # Shared presentation primitives & Tailwind presets
│   └── config/                          # Base TypeScript, ESLint & toolchain configs
└── deploy/                              # [Milestone 03/07] Docker Compose, Caddy auto-TLS & backups
```

---

## 3. Engineering Documentation Map

For complete specifications, consult the comprehensive architectural blueprints in `/docs`:

1. [Architecture Review Changes](file:///docs/ARCHITECTURE_REVIEW_CHANGES.md)
2. [Product Requirements Document](file:///docs/PRODUCT_REQUIREMENTS.md)
3. [System Architecture Specification](file:///docs/SYSTEM_ARCHITECTURE.md)
4. [Commerce Workflows & State Machines](file:///docs/COMMERCE_WORKFLOWS.md)
5. [Database Design & Schema Specification](file:///docs/DATABASE_DESIGN.md)
6. [SEO & Marketing Integration Architecture](file:///docs/SEO_MARKETING_PLAN.md)
7. [Design System & UI Specification Plan](file:///docs/DESIGN_SYSTEM_PLAN.md)
8. [Engineering Roadmap & Quality Gates](file:///docs/DEVELOPMENT_ROADMAP.md)

---

## 4. Current Milestone Status

* **Milestone 01 (Step 01)**: Technical Foundations, Architecture & Documentation (**CORRECTED & PENDING SIGN-OFF**).
* **Milestone 02 (Step 02)**: Monorepo Setup, Medusa v2 Engine Customization, 500+ Product Seed Generator & Early Vertical-Slice Test (**ON HOLD PENDING APPROVAL**).

*Strict Rule: Do not begin Milestone 02 until Milestone 01 revised documentation has been formally approved.*
