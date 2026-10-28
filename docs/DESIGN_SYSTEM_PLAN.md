# Design System & UI Specification Plan

**Project**: The Ecom Buddy  
**Document**: Design System & UI Specification Plan  
**Status**: Revised Architecture Specification (Post-Review Revision)  
**Milestone**: 01 (Foundation & Technical Specification)  
**Author**: Principal Software Architect & Senior E-commerce Product Engineer  

---

## 1. Design Direction & Authoritative Reference Mapping

### 1.1 The Seven Visual Reference Screenshots
Frontend implementation across **The Ecom Buddy** is strictly governed by the seven visual reference designs located in `/design-references`. 

These references establish the benchmark for **authentic, editorial, tactile e-commerce design** and must be adhered to without improvisation:

| Slot | Reference Name | Domain / Scope | Authority & Key Visual Deliverables |
| :---: | :--- | :--- | :--- |
| **01** | **Merchant onboarding reference** | Admin Onboarding | Turnkey setup wizard: domain connection, brand logo/colors, currency (INR default), and initial payment setup. Clean, friendly, non-technical UX. |
| **02** | **Crescendo homepage** | Storefront Hero & Home | Editorial hero presentation, layered typography hierarchy, curated product discovery rows, and high-contrast navigation bar. |
| **03** | **Velora product details** | Storefront PDP | High-end Product Detail Page: dual-column sticky layout, tactile variant selector swatches, sticky mobile action bar, and accordion details. |
| **04** | **Aero Step editorial storefront** | Storefront Collections | Editorial collection grids with asymmetric rhythms, category pills, subtle elevation on hover, and storytelling brand sections. |
| **05** | **Philox promotional layout** | Storefront Promotions | High-impact promotional features, curated seasonal showcases, split-banner layouts, and announcement bars. |
| **06** | **ColorPixel merchant dashboard** | Admin Console | High-density administrative workspace: inventory matrix, low-stock warnings, order progression, and real-time revenue analytics. |
| **07** | **SalesSync product creation interface** | Admin Product Editor | Streamlined product and variant matrix creator: multi-option generator (Size, Color), image-to-variant mapping, HSN tax input, and inventory allocation. |

### 1.2 Strict Prohibitions
* **No Generic AI Styling**: Strictly avoid purple-to-teal neon gradients, ungrounded geometric glowing blobs, and fake futuristic card borders.
* **No AI Doodles or Generic Clip Art**: All iconography must use standardized, crisp SVG icons (Lucide / Radix Icons); all photography must represent authentic editorial product presentation.
* **No Monotonous Template Layouts**: Avoid repetitive, rigid 4-column card grids without editorial visual hierarchy.

---

## 2. Design Tokens Architecture (Tailwind CSS v4 & CSS Variables)

Design tokens are declared via semantic CSS variables mapped to Tailwind CSS utilities, allowing merchant theme customization without CSS recompilation.

### 2.1 Color Tokens
```css
:root {
  /* Surfaces */
  --surface-base: #FFFFFF;
  --surface-subtle: #F9FAFB;
  --surface-muted: #F3F4F6;
  --surface-inverted: #111827;

  /* Typography & Foreground */
  --text-primary: #111827;
  --text-secondary: #4B5563;
  --text-muted: #9CA3AF;
  --text-inverted: #FFFFFF;

  /* Brand Tokens (Merchant Customizable) */
  --brand-primary: #18181B;       /* Deep architectural zinc */
  --brand-primary-hover: #27272A;
  --brand-accent: #C28E5C;        /* Warm amber / tan accent */
  --brand-accent-hover: #A67545;

  /* Borders & Dividers */
  --border-subtle: #E5E7EB;
  --border-strong: #D1D5DB;

  /* Semantic Feedback */
  --feedback-success: #15803D;
  --feedback-warning: #B45309;
  --feedback-destructive: #B91C1C;
  --feedback-info: #1D4ED8;
}
```

### 2.2 Typography Hierarchy
* **Display / Editorial**: *Instrument Serif* / *Playfair Display* (Used for Crescendo hero headlines, collection titles, and editorial showcases).
* **Body / Interface**: *Plus Jakarta Sans* / *Inter* (Used for navigation, product card details, forms, and admin UI).
* **Tabular / Monospace**: *JetBrains Mono* / *Geist Mono* (Used for INR pricing displays `₹1,49,999.00`, SKU codes, and order IDs).

---

## 3. Core Storefront Component Specifications

### 3.1 Dynamic Hero Carousel Component (Crescendo Reference)
* **Six Default Pre-Configured Slides**: Ships with 6 production-grade default slides.
* **Unconstrained Slide Count**: Merchants can dynamically add, edit, disable, reorder, or remove slides in the admin customizer.
* **Responsive Picture Delivery**:
  * Desktop Banner (`image_desktop_url`): Optimized 16:9 or 21:9 ratio.
  * Mobile Banner (`image_mobile_url`): Optimized 4:5 or 1:1 ratio.
* **LCP Performance**: Slide 1 is preloaded with `fetchpriority="high"`; subsequent slides utilize lazy loading.
* **Touch & Keyboard UX**: Supports touch swipe gestures with momentum scrolling and full WCAG keyboard navigation (`Tab`, arrow keys, `Escape`).

### 3.2 Product Detail Page (Velora Reference)
* **Dual-Column Sticky Layout**: Desktop viewport keeps the right-hand buy-box sticky while the user scrolls through high-res multi-angle photography on the left.
* **Tactile Variant Selectors**:
  * Color: Circular swatches with visual selection rings and tooltip labels.
  * Size: Rectangular tactile pills; out-of-stock sizes rendered with a subtle strikethrough and disabled state.
* **Sticky Mobile Buy-Box**: Slides up smoothly from the bottom on mobile devices when the primary buy button scrolls out of view.

### 3.3 Curated Collections Grid (Aero Step Reference)
* **Asymmetrical Rhythm**: Editorial layout combining 2-column feature tiles with 3-column product listings.
* **Hover Flip**: Smooth cross-fade to secondary lifestyle photo on desktop hover.
* **Instant Quick-View**: Slide-up drawer allowing variant selection and cart addition without leaving the browsing grid.

### 3.4 India-First Form Components
* **Address Autocomplete**: 6-digit Indian PIN code input triggers automated background lookup for City and State.
* **State / UT Selectors**: Pre-populated dropdown covering all 28 states and 8 union territories.
* **Pricing Formatting**: Currency values formatted using the Indian numbering system (`₹12,499.00`).

---

## 4. Merchant Admin Component Specifications

### 4.1 Onboarding Wizard (Merchant Onboarding Reference)
* Step-by-step guided setup: Store Identity $\rightarrow$ Currency & Tax Region (India GST preset) $\rightarrow$ Payment Credentials (Razorpay) $\rightarrow$ Seed Catalog Import.

### 4.2 High-Density Catalog Table (ColorPixel Reference)
* High-density table handling **500+ distinct products** and thousands of SKUs with virtualized scrolling, instant search filter, and inline inventory edits.

### 4.3 Product & Variant Matrix Creator (SalesSync Reference)
* Visual option generator allowing merchants to input sizes and colors, automatically generating SKUs with individual pricing, HSN codes, and inventory stock levels.

---

## 5. Accessibility & Quality Standards (WCAG 2.1 AA)

1. **Color Contrast**: All text elements achieve a minimum contrast ratio of `4.5:1` against their background (`3:1` for large display headings).
2. **Keyboard Focus**: Prominent focus rings (`focus-visible:ring-2`) on all interactive controls.
3. **Screen Readers**: Semantic ARIA live regions for cart drawer count updates and dynamic price adjustments.
4. **Motion Safety**: Respects `prefers-reduced-motion: reduce` by replacing slide transitions with instant cuts.
