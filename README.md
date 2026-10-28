# The Ecom Buddy

> A premium, production-oriented white-label e-commerce and growth platform designed for independent client deployments with a one-time software license and zero mandatory monthly platform fees.

---

## 1. Project Philosophy

**The Ecom Buddy** is built for small and medium businesses that require an enterprise-grade direct-to-consumer store without being trapped by perpetual monthly SaaS tolls (Shopify/BigCommerce) or fragile legacy CMS plugins (WooCommerce).

* **Business Model**: One-time software license, self-contained client deployments, private data ownership.
* **Architecture**: Headless decoupled stack with **Medusa v2** (Commerce Engine & Embedded Admin) + **Next.js 15 App Router** (High-Performance Storefront) + **PostgreSQL 16** + **Redis 7** + **Caddy** (Automated SSL).
* **Target Scale**: 500+ SKUs with multi-attribute variants, real-time inventory reservation, and sub-second page performance.
* **Growth Built-In**: Native dual-layer **Meta Pixel + Conversions API (CAPI)** and **Google Analytics 4** tracking with server-side event deduplication.

---

## 2. Repository Structure

```
the-ecom-buddy/
├── docs/                       # Core Architecture & Engineering Specifications
│   ├── PRODUCT_REQUIREMENTS.md # Business model, personas & functional requirements
│   ├── SYSTEM_ARCHITECTURE.md  # Headless topology, Medusa evaluation & deployments
│   ├── COMMERCE_WORKFLOWS.md   # Inventory locking, cart, checkout & fulfillment state machines
│   ├── DATABASE_DESIGN.md      # PostgreSQL 16 relational schemas & custom extension tables
│   ├── SEO_MARKETING_PLAN.md   # Dual-layer Meta CAPI, GA4 & dynamic SEO architecture
│   ├── DESIGN_SYSTEM_PLAN.md   # Tokens, 6-slide carousel & WCAG 2.1 AA specifications
│   └── DEVELOPMENT_ROADMAP.md  # 7-phase milestone plan & quality gates
├── design-references/          # Visual authority screenshots (7 reference screens)
├── apps/
│   ├── backend/                # Medusa v2 Commerce Engine, Custom Extensions & Admin UI
│   └── storefront/             # Next.js 15 App Router Storefront (SSR/ISR)
├── packages/
│   ├── types/                  # Shared TypeScript interfaces & validation schemas
│   ├── ui/                     # Design tokens & shared presentation components
│   └── config/                 # Shared TypeScript, ESLint & Tailwind configs
└── deploy/                     # Docker Compose & production deployment orchestration
```

---

## 3. Engineering Documentation Map

For complete specifications, consult the comprehensive architectural blueprints in `/docs`:

1. [Product Requirements Document](file:///docs/PRODUCT_REQUIREMENTS.md)
2. [System Architecture Specification](file:///docs/SYSTEM_ARCHITECTURE.md)
3. [Commerce Workflows & State Machines](file:///docs/COMMERCE_WORKFLOWS.md)
4. [Database Design & Schema Specification](file:///docs/DATABASE_DESIGN.md)
5. [SEO & Marketing Integration Architecture](file:///docs/SEO_MARKETING_PLAN.md)
6. [Design System & UI Specification Plan](file:///docs/DESIGN_SYSTEM_PLAN.md)
7. [Engineering Roadmap & Quality Gates](file:///docs/DEVELOPMENT_ROADMAP.md)

---

## 4. Current Milestone Status

* **Milestone 01 (Step 01)**: Technical Foundations, Architecture & Documentation (**COMPLETED**).
* **Milestone 02 (Step 02)**: Monorepo Setup, Engine Customization & 500+ Seed Catalog (**AWAITING REVIEW & SIGN-OFF**).

*Strict Rule: Do not begin Milestone 02 until Milestone 01 documentation has been formally approved.*
