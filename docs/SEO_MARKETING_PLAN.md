# SEO & Marketing Integration Architecture

**Project**: The Ecom Buddy  
**Document**: SEO & Marketing Integration Plan  
**Status**: Revised Architecture Specification (Final Step 01 Technical Corrections)  
**Milestone**: 01 (Foundation & Technical Specification)  
**Author**: Principal Software Architect & Senior E-commerce Product Engineer  

---

## 1. Executive Summary

Organic search discoverability and reliable marketing attribution are essential for independent e-commerce merchants. This document specifies:

1. **Current Technical SEO (Google Search Documentation Standards)**: Dynamic metadata, self-referential canonicals, XML sitemaps (using only supported `<loc>` and `<lastmod>` tags), robots.txt, 301 redirect management, schema.org JSON-LD structured data (`Product`, `Offer`, `BreadcrumbList`, `Organization`, `WebSite`), Image SEO, and automated Google Merchant Center (GMC) product feed generation.
2. **Dual-Layer Meta Tracking (Pixel + CAPI)**: Deterministic event deduplication via stable, entity-derived `event_id` keys, consent-gated PII hashing, and realistic attribution performance targets (Event Match Quality score $\ge 8.0/10$).
3. **Google Analytics 4 & Measurement Protocol**: Supported GA4 client tagging with Measurement Protocol backend validation, proper session parameter binding, and duplicate transaction prevention.
4. **Privacy-First Consent Architecture**: Strict integration with **Google Consent Mode v2**, where telemetry is gated by individual shopper consent rather than merchant admin toggles alone.

```mermaid
flowchart TD
    subgraph Shopper_Interaction ["Shopper Interaction & Consent Gating"]
        UserAction["Shopper Action\n(e.g., Completes Purchase)"]
        ConsentCheck{"Shopper Consent State\n(ad_storage & analytics_storage)"}
    end

    subgraph Stable_Deduplication ["Stable Identifier Generation"]
        EventID["Unique Stable event_id\n'pur_ord_01J8K9X7'\n(Shared across Browser & Server)"]
    end

    subgraph Client_Layer ["Client-Side Browser Execution"]
        MetaPixel["Meta Browser Pixel Tag\n(Dispatches with event_id)"]
        GA4Tag["GA4 Client gtag.js / GTM\n(Captures session_id & client_id)"]
    end

    subgraph Server_Layer ["Medusa v2 Backend Execution"]
        CAPIDispatcher["Meta CAPI Dispatcher\n(Background Medusa Workflow)"]
        MPDispatcher["GA4 Measurement Protocol\n(Backend Reconciliation)"]
    end

    subgraph External_Attribution ["Ad Platform Engines"]
        MetaDedupe["Meta Conversions API Deduplication\n(Matches event_id & Kept Valid Payload)"]
        GoogleEngine["GA4 Processing Pipeline\n(Session-Stitched via client_id & session_id)"]
    end

    UserAction --> ConsentCheck
    ConsentCheck -->|Consent Granted| EventID
    ConsentCheck -->|Consent Denied| SuppressTracking["Suppress PII & Tracking Dispatches"]

    EventID --> Client_Layer
    EventID --> Server_Layer

    MetaPixel -->|1. Client Hit| MetaDedupe
    CAPIDispatcher -->|2. Server Hit (Hashed PII)| MetaDedupe

    GA4Tag -->|1. Client DataLayer Event| GoogleEngine
    MPDispatcher -->|2. Server Validation Hit| GoogleEngine
```

---

## 2. Technical SEO Architecture (Google Search Standards)

### 2.1 Metadata Management Across Page Types
The storefront utilizes Next.js 15's Metadata API to generate dynamic, validated metadata:
* **Product Pages**:
  * Title: `[Product Name] — [Variant Descriptor] | [Store Name]` (Enforced $\le 60$ characters).
  * Description: Extracted from product summary or custom SEO override (Enforced $120–155$ characters).
* **Category & Collection Pages**:
  * Title: `[Collection Name] — Curated Collection | [Store Name]`
  * Description: Editorial collection blurb with targeted category keywords.
* **CMS & Content Pages** (About, Policies, Journal/Blog):
  * Dynamic OpenGraph and Twitter cards formatted with published/modified timestamps and author details.
* **Search Console Verification**:
  * Clean admin inputs to insert Google Search Console verification meta tag, HTML file upload, or DNS TXT token.

### 2.2 Canonical URL Enforcement & Faceted Navigation Handling
* **Self-Referential Canonicals**: Every product and collection declares a strict canonical URL pointing to its clean, root path:
  ```html
  <link rel="canonical" href="https://example.com/products/relaxed-linen-shirt" />
  ```
* **Filter & Sort Query Parameters**: Faceted filter parameters (e.g., `?color=navy&size=m&sort=price_asc`) default their canonical tag to the base collection URL, preventing index bloat and duplicate content penalties.
* **Paginated Sets**: Paginated pages (e.g., `/collections/all?page=2`) include self-referential canonical tags with proper `robots` indexing directives.

### 2.3 Indexation Directives (`robots`)
Granular meta robots tags applied across routing tiers:

| Route Pattern | `robots` Directive | Rationale |
| :--- | :--- | :--- |
| `/`, `/products/*`, `/collections/*`, `/pages/*` | `index, follow, max-image-preview:large` | Maximum organic discoverability |
| `/cart`, `/checkout`, `/account/*`, `/admin/*` | `noindex, nofollow` | Private checkout and customer session paths |
| `/search?*` | `noindex, follow` | Prevents crawl budget waste on internal search results |

### 2.4 XML Sitemaps (Compliant with Google Search Documentation)
In accordance with current Google Search documentation, **Google ignores `<priority>` and `<changefreq>` tags**. Therefore, sitemaps are generated focusing strictly on accurate `<loc>` and `<lastmod>` values:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/products/linen-shirt</loc>
    <lastmod>2026-10-28T08:00:00Z</lastmod>
  </url>
</urlset>
```

The sitemap index at `/sitemap.xml` partitions URLs into:
* `/sitemap-products.xml`: Updated dynamically upon product publication or modification.
* `/sitemap-categories.xml`: All active categories and collections.
* `/sitemap-pages.xml`: Static policy and content pages.

### 2.5 Dynamic `robots.txt`
```txt
User-agent: *
Allow: /
Allow: /products/
Allow: /collections/
Allow: /pages/
Disallow: /cart/
Disallow: /checkout/
Disallow: /account/
Disallow: /admin/
Disallow: /api/
Disallow: /search

Sitemap: https://example.com/sitemap.xml
```

### 2.6 Automated 301 Redirect Management
* When a merchant edits a product title or category handle, the system automatically writes an entry to a redirect lookup table in PostgreSQL.
* Next.js middleware intercepts incoming requests to historical paths and issues a permanent **HTTP 301 Moved Permanently** response to the new canonical slug, preserving accumulated PageRank and eliminating 404 crawl errors.

### 2.7 Supported Structured Data (JSON-LD)
Rich Schema.org structured data embedded in the `<head>` of relevant pages:
* **`Product` & `Offer` Schema**: Conforms to Google Search Merchant listings requirements:
  * `name`, `image`, `description`, `sku`, `brand`.
  * `offers`: `price` (in INR or ISO currency), `priceCurrency`, `availability` (`InStock`/`OutOfStock`), `priceValidUntil`, `itemCondition`.
  * `hasMerchantReturnPolicy`: 30-day return window, return shipping fee rules.
  * `shippingDetails`: Delivery time and regional shipping rates.
* **`BreadcrumbList`**: Structured breadcrumb progression for rich Google SERP snippets.
* **`Organization` & `WebSite`**: Identity schema declaring organizational credentials and official brand URL. (Note: Google officially deprecated and retired the Sitelinks Search Box in November 2024; therefore, `SearchAction` markup is omitted in accordance with current Google Search Central guidance).

### 2.8 Google Merchant Center (GMC) Product Feed
* The backend generates an automated, compliant XML/TSV product feed at `/feeds/google-merchant-center.xml`.
* Contains all required Google Product Data Specification attributes: `id` (SKU), `title`, `description`, `link`, `image_link`, `availability`, `price`, `brand`, `condition`, `google_product_category`, and `shipping`.

### 2.9 Image SEO
* Automated generation of descriptive, contextual `alt` tags based on product title and variant attributes.
* Modern image formats (**WebP** and **AVIF**) served via Next.js Image Component with responsive `srcset` and `sizes` attributes.
* Clean, human-readable file naming conventions (e.g., `mens-linen-shirt-navy-front.webp`).

---

## 3. Dual-Layer Meta Tracking (Pixel + Conversions API)

### 3.1 Stable `event_id` Generation & Deduplication Lifecycle
1. **Browsing Events (`ViewContent`, `AddToCart`)**:
   * A client-side UUID (`crypto.randomUUID()`) is generated at the moment of interaction.
   * Format: `atc_[variant_id]_[uuid]`
   * Passed simultaneously to `fbq('track', 'AddToCart', ..., { eventID: event_id })` and sent in the server mutation payload.
2. **Transaction Events (`InitiateCheckout`, `Purchase`)**:
   * The identifier is derived stably from the underlying commerce entity:
     * `InitiateCheckout`: `ic_[cart_id]`
     * `Purchase`: `pur_[order_id]`
   * **Retry Stability**: If a shopper reloads the order confirmation page or a webhook retries transmission, the identical `pur_[order_id]` is reused.
3. **Attribution Targets**:
   * **Target**: Achieve an **Event Match Quality (EMQ) score $\ge 8.0 / 10$** on Purchase events by providing complete hashed customer parameters.

### 3.2 Customer Information Parameters & Secure Token Storage
* Customer parameters are hashed with `SHA-256` before CAPI transmission (`em`, `ph`, `fn`, `ln`, `ct`, `zp`, `country`).
* **Token Security**: The Meta System User Access Token is stored encrypted at rest (AES-256) inside the `marketing_config` table (managed by `src/modules/marketing-telemetry`) and is never exposed to client-side code.

---

## 4. Google Analytics 4 & Measurement Protocol

### 4.1 Supported Tagging Patterns
* **Primary Client DataLayer**: The primary attribution engine remains the client-side GA4 tag (`gtag.js` or GTM) loaded in the storefront. This ensures session stitching, UTM parameter capture, and Google Ads click identifier (`gclid`) attribution.
* Standard e-commerce events: `view_item_list`, `view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`.

### 4.2 Server-Side Measurement Protocol Integration
* Used strictly as a **backend validation and reconciliation event** for completed orders.
* **Requirements for Valid Attribution**:
  * Captures and transmits `client_id` (extracted from the `_ga` cookie) and `session_id` (extracted from `_ga_<container-id>`).
  * Transmits unique `transaction_id` (`order.display_id`).
* **Duplicate Prevention**: GA4 deduplicates subsequent Measurement Protocol hits sharing the identical `transaction_id`.

---

## 5. Privacy, Regional Consent & Google Consent Mode v2

### 5.1 Privacy-First Consent State
* Default tracking consent in the database (`marketing_config.default_consent_mode`) and frontend application is strictly **`denied`**.

### 5.2 Consent Mode v2 Implementation
The storefront initializes Google Consent Mode v2 prior to any marketing scripts loading:
```javascript
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

gtag('consent', 'default', {
  'ad_storage': 'denied',
  'analytics_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'wait_for_update': 500
});
```

### 5.3 Decoupling Merchant Toggles from Shopper Consent
* A merchant enabling Meta or Google tracking in the admin dashboard merely configures the integration credentials.
* **Shopper Gating Rule**: Telemetry scripts and server-side CAPI PII dispatches are executed **only** after the individual shopper explicitly provides consent via the storefront banner.
