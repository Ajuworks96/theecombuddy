# The Ecom Buddy — Customer Journey Integration Test Report

**Document Version:** 1.0.0 (Master Release)  
**Scope:** End-to-End Customer Flows on DTC Customer Storefront (Port 3000)  
**Test Automation:** 404/404 Passing Tests  

---

## Journey 1: Discovery & Catalog Browsing
1. **Homepage Experience:** Customer visits `https://theecombuddy.com/`. The server serves published theme metadata, responsive hero carousel, guaranteed benefits bar, and curated category departments.
2. **Category Navigation:** Customer clicks "Electronics & Audio" (`/categories/electronics-audio`). The storefront renders all 59 department products with server-authoritative INR pricing.
3. **Keyword Search:** Customer inputs "charger" in the live search bar. The search engine filters the 520-product catalog and returns 7 matching products within 15ms.

---

## Journey 2: Product Details & Variant Matrix
1. **Page Load:** Customer opens `/products/compact-magnetic-car-phone-mount-charger`.
2. **Dynamic Variant Selection:** Customer interacts with the color option pills (Black, Titanium Gray, Champagne Gold). The UI dynamically maps the option selection to SKU `TEB-ELEC-015-V1`.
3. **Inventory Indicator:** The storefront queries the Medusa inventory module, displaying "In Stock (56 available)". Out-of-stock variants disable the Add to Cart CTA.

---

## Journey 3: Cart & Multi-Market Recalculation
1. **Add to Cart:** Customer clicks "Add to Cart". A Medusa cart session is initialized (`POST /api/cart`), and line item is attached (`POST /api/cart/items`).
2. **Market Switch:** Customer toggles currency selector from INR to USD.
3. **Authoritative Price Recalculation:** The line item unit price recalculates from ₹4,075 INR to $49.00 USD without lost items.
4. **Promotion Coupon:** Customer applies coupon `WELCOME10`. The server applies a 10% discount to eligible line items.

---

## Journey 4: Guest Checkout & Cash on Delivery (COD)
1. **Shipping Information:** Customer enters guest email (`guest@example.in`), recipient name, and delivery address in Gurugram, India.
2. **Delivery Method:** Customer selects "Express Air Courier (1-2 business days)". Authoritative shipping costs (₹234.82) and GST (18%) are calculated server-side.
3. **Payment Choice:** Customer chooses "Cash on Delivery". The system verifies domestic eligibility (`country_code: "in"`).
4. **Order Placement:** Customer clicks "Place Order". The Redis cart lock acquires a mutex, completing the order with status `pending`.

---

## Journey 5: Order Confirmation & Cryptographic Recovery
1. **Immediate Confirmation:** Customer is redirected to `/order/confirmation/order_01M6GB76...`.
2. **Guest Token:** A short-lived HMAC-SHA256 cookie (`teb_guest_order_...`) is set, allowing instant receipt viewing.
3. **Subsequent Recovery (OTP):** If the customer returns after the cookie expires, the storefront prompts for an OTP challenge:
   - An OTP is generated and dispatched to the customer's email.
   - Upon entering the 6-digit code, the server issues a fresh guest order token.

---

## Journey 6: Customer Registration & Session Lifecycle
1. **Registration:** Customer navigates to `/register` and submits email and password. A Medusa customer record is created and linked to the auth identity.
2. **Login:** Customer logs in via `/login`. An HTTP-only JWT cookie is issued.
3. **Session Revocation:** When the customer clicks "Logout", the token SHA-256 hash is written to Redis (`revoked:token:<hash>`) with a 7-day TTL, instantly revoking future requests.

---

## Journey 7: Address Book Management
1. **View Addresses:** Customer visits `/account/addresses`.
2. **Create New Address:** Customer inputs a shipping destination in Bengaluru.
3. **Default Selection:** Customer toggles "Set as default shipping address". The address flags `is_default_shipping: true`.
4. **Delete Address:** Customer deletes an old address; the system purges the address from their Medusa customer record cleanly.

---

## Journey 8: Order History & Shipment Tracking
1. **Order History:** Customer visits `/account/orders`. Only orders belonging to the customer's email or customer ID are displayed.
2. **Cross-Customer Isolation:** Probing another customer's order ID returns `HTTP 403 Forbidden`.
3. **Fulfillment Tracking:** When the merchant fulfills an order with a tracking number, the order status updates from "Pending Dispatch" to "Shipped", displaying courier tracking links.
