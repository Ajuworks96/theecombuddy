# The Ecom Buddy — Merchant Administration Manual

**Version:** 1.0.0 (Master Release)  
**Application:** Merchant Administration Dashboard (Port 7001)  
**Target Audience:** Store Owners, Store Managers & Fulfillment Operations Staff  

---

## 1. Store Overview & Performance Pulse

Upon logging in at `https://admin.yourstore.com`, the dashboard presents the **Store Performance Pulse**:
- **Total Catalog Products:** Displays active product counts, published catalog items, and draft records.
- **Order Pipeline:** Tracks pending, processing, fulfilled, and canceled orders.
- **Inventory Health:** Real-time monitoring of all 1,236 SKUs, surfacing low-stock items with alert indicators.
- **Captured Revenue:** Multi-currency revenue ledger segregated cleanly by currency (e.g. ₹1,45,000 INR, $2,400 USD). Never sums different currencies without explicit FX conversions.

---

## 2. Product Catalog Management

Navigate to **Products** from the left navigation bar:
- **Product Listing:** Filter by title, SKU, published status, or category department.
- **Create New Product:**
  - Enter product title, description, and handle.
  - Add product options (e.g. Size, Color, Capacity).
  - Matrix Builder: Automatically calculates variants and assigns deterministic SKUs (e.g. `TEB-ELEC-015-V1`).
  - Multi-Currency Pricing: Set base price in INR; optionally set manual prices in USD, AED, GBP, and EUR.
  - Image Uploads: Drag-and-drop product gallery images and thumbnail.

---

## 3. Order Processing & Fulfillment

Navigate to **Orders**:
- **Order Details:** Click on any order to view customer destination, items, tax lines (GST 18%), and payment status.
- **Cash on Delivery (COD) Collection:**
  - Orders placed via COD display as `pending` with `payment_status: not_paid`.
  - When courier delivers the parcel and collects cash, click **Capture Payment** to mark the order paid.
- **Fulfillment & Tracking:**
  - Create a fulfillment by selecting fulfilled item quantities.
  - Input courier name (e.g. BlueDart, Delhivery, DTDC, FedEx) and tracking number.
  - The customer storefront account view updates automatically to display fulfillment and tracking data.

---

## 4. Inventory Warehouse Control

Navigate to **Inventory**:
- Displays all monitored SKUs across warehouses.
- Shows current stocked quantity, reserved quantities, and available inventory.
- To update stock: Click on any SKU, input the new stocked quantity, and save. Updates propagate immediately to storefront product detail pages.

---

## 5. Store Appearance & Theme Customizer

Navigate to **Appearance**:
- **Theme Presets:** Select from 4 design reference presets:
  1. `Crescendo Electronics`: Obsidian surfaces, emerald accents, sharp buttons.
  2. `Velora Minimal Luxury`: Ivory surfaces, warm bronze accents, serif typography.
  3. `Aero Step High Energy`: Charcoal surfaces, crimson accents, pill geometry.
  4. `Philox Direct-to-Consumer`: Crisp white surfaces, deep green accents, high-conversion layout.
- **Hero Carousel Builder:**
  - Reorder slides via drag-and-drop or order numbers.
  - Configure desktop and mobile image URLs, title, subtitle, CTA button label, and link.
  - Toggle slide visibility without deleting historical creative assets.
- **Homepage Sections:** Reorder and toggle guaranteed benefits, category tiles, featured products, and editorial stories.
- **Publish & Rollback:**
  - Click **Publish Theme** to deploy your draft changes live to customer storefronts.
  - Click **Rollback** to instantly restore any previous published release version.

---

## 6. Global Selling & Multi-Currency

Navigate to **Global Selling**:
- **Markets:** Manage your 5 international markets (India, United States, United Arab Emirates, United Kingdom, European Union).
- **Exchange Rate Engine:** Connect to Open ER API or input manual exchange rates.
- **Psychological Rounding:** Enable automatic price charm rounding (e.g. $49.99 instead of $49.32).
- **COD Restrictions:** Enforce that Cash on Delivery is strictly restricted to domestic India shipments.

---

## 7. Installation Settings & Gateways

Navigate to **Settings**:
- **Payment Gateways:** View live connectivity status for Razorpay, Cashfree, and COD. Enter API keys and webhook secrets.
- **Webhook Reconciliation:** View incoming webhook events and trigger manual retry for stuck transactions.
- **Perpetual License:** View your licensee organization, permitted domains, and install new offline license keys.
