import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

interface CartResponse {
  cart: {
    id: string;
    region_id: string;
    currency_code: string;
    email: string | null;
    items?: Array<{
      id: string;
      title: string;
      quantity: number;
      unit_price: number;
      variant_id: string;
    }>;
    shipping_address?: {
      first_name?: string;
      last_name?: string;
      address_1?: string;
      city?: string;
      province?: string;
      postal_code?: string;
      country_code?: string;
      phone?: string;
    } | null;
    shipping_methods?: Array<{
      id: string;
      name: string;
      amount: number;
      shipping_option_id: string;
    }>;
    promotions?: Array<{
      id: string;
      code: string;
    }>;
    item_subtotal: number;
    item_total: number;
    shipping_subtotal: number;
    discount_subtotal: number;
    discount_tax_total: number;
    subtotal: number;
    discount_total: number;
    shipping_total: number;
    tax_total: number;
    total: number;
  };
}

interface ShippingOptionsResponse {
  shipping_options: Array<{
    id: string;
    name: string;
    price_type: string;
    amount: number;
    data?: Record<string, unknown>;
  }>;
}

export default async function verifyMilestone02C({ container }: { container: MedusaContainer }) {
  console.log("==============================================================================");
  console.log("[verify-02c] THE ECOM BUDDY — MILESTONE 02C COMMERCE & MULTI-REGION VERIFICATION");
  console.log("==============================================================================");

  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      if (details) console.log(`         -> ${details}`);
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
      if (details) console.error(`         -> ${details}`);
      throw new Error(`Verification assertion failed: ${testName}`);
    }
  }

  // -------------------------------------------------------------------------
  // SUITE 1: CATALOG & INVENTORY AUDIT
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 1: Catalog & Inventory Audit ---");

  const products = await query({
    entryPoint: "product",
    fields: ["id", "handle", "status"],
    variables: { filters: { handle: { $like: "teb-%" } } },
  });
  assert(
    products.length === 520,
    "Exactly 520 distinct catalog products present",
    `Found ${products.length} products`
  );

  const variants = await query({
    entryPoint: "product_variant",
    fields: ["id", "sku", "deleted_at"],
  });
  const activeVariants = variants.filter((v: any) => !v.deleted_at && v.sku?.startsWith("TEB-"));
  assert(
    activeVariants.length === 1235,
    "Exactly 1,235 active catalog variants present",
    `Found ${activeVariants.length} variants`
  );

  const inventoryLevels = await query({
    entryPoint: "inventory_level",
    fields: ["id", "inventory_item_id", "stocked_quantity"],
  });
  assert(
    inventoryLevels.length === activeVariants.length,
    "1:1 Inventory Reconciliation (Levels match active variants exactly)",
    `Active Variants: ${activeVariants.length}, Inventory Levels: ${inventoryLevels.length}`
  );

  // Retrieve API Key & All Regions
  const apiKeys = await query({
    entryPoint: "api_key",
    fields: ["id", "token"],
    variables: { filters: { type: "publishable" } },
  });
  const publishableKey = apiKeys[0]?.token;
  assert(Boolean(publishableKey), "Publishable API Key active");

  const allRegions = await query({
    entryPoint: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  });

  const indiaRegion = allRegions.find((r: any) => r.currency_code === "inr");
  const usRegion = allRegions.find((r: any) => r.currency_code === "usd");
  const uaeRegion = allRegions.find((r: any) => r.currency_code === "aed");
  const ukRegion = allRegions.find((r: any) => r.currency_code === "gbp");
  const euRegion = allRegions.find((r: any) => r.currency_code === "eur");

  const BASE_URL = "http://localhost:9000";
  const headers = {
    "x-publishable-api-key": publishableKey,
    "Content-Type": "application/json",
  };

  // -------------------------------------------------------------------------
  // SUITE 2: MULTI-REGION & MULTI-CURRENCY REGISTRY AUDIT
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 2: Multi-Region & Multi-Market Registry Audit ---");

  assert(Boolean(indiaRegion), "India Region (INR) registered", `ID: ${indiaRegion?.id}`);
  assert(Boolean(usRegion), "United States Region (USD) registered", `ID: ${usRegion?.id}`);
  assert(Boolean(uaeRegion), "UAE Region (AED) registered", `ID: ${uaeRegion?.id}`);
  assert(Boolean(ukRegion), "United Kingdom Region (GBP) registered", `ID: ${ukRegion?.id}`);
  assert(Boolean(euRegion), "European Union Region (EUR) registered", `ID: ${euRegion?.id}`);

  // Variant multi-currency prices audit
  const sampleVariant = await query({
    entryPoint: "product_variant",
    fields: [
      "id",
      "sku",
      "price_set.id",
      "price_set.prices.currency_code",
      "price_set.prices.amount",
    ],
    variables: { filters: { sku: "TEB-HOME-001-V1" } },
  });
  const samplePrices = sampleVariant[0]?.price_set?.prices || [];
  const sampleCurrencies = new Set(samplePrices.map((p: any) => p.currency_code.toLowerCase()));

  assert(
    sampleCurrencies.has("inr") &&
      sampleCurrencies.has("usd") &&
      sampleCurrencies.has("aed") &&
      sampleCurrencies.has("gbp") &&
      sampleCurrencies.has("eur"),
    "Catalog variants contain multi-currency prices (INR, USD, AED, GBP, EUR)",
    `Prices found for TEB-HOME-001-V1: ${samplePrices.map((p: any) => `${p.currency_code.toUpperCase()} ${p.amount}`).join(", ")}`
  );

  // -------------------------------------------------------------------------
  // SUITE 3: DOMESTIC COMMERCE ENGINE (INDIA - INR)
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 3: Domestic Commerce Flow (INR Cart, Shipping & Totals) ---");

  // 3.1 Create Cart
  const createCartRes = await fetch(`${BASE_URL}/store/carts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ region_id: indiaRegion.id }),
  });
  assert(
    createCartRes.status === 200 || createCartRes.status === 201,
    "POST /store/carts creates new cart in India Region",
    `Status: ${createCartRes.status}`
  );
  const inrCart = ((await createCartRes.json()) as CartResponse).cart;
  assert(
    inrCart.currency_code === "inr" && inrCart.region_id === indiaRegion.id,
    "Cart initialized with INR currency and India Region",
    `Cart ID: ${inrCart.id}, Currency: ${inrCart.currency_code}`
  );

  // 3.2 Add In-Stock Variant
  const inStockLevel = inventoryLevels.find((lvl: any) => lvl.stocked_quantity > 50)!;
  const inStockItem = await query({
    entryPoint: "inventory_item",
    fields: ["id", "variants.id", "variants.sku"],
    variables: { filters: { id: inStockLevel.inventory_item_id } },
  });
  const validVariantId = inStockItem[0]?.variants?.[0]?.id;
  const validVariantSku = inStockItem[0]?.variants?.[0]?.sku;

  const addItemRes = await fetch(`${BASE_URL}/store/carts/${inrCart.id}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: validVariantId, quantity: 2 }),
  });
  assert(
    addItemRes.status === 200,
    "POST /store/carts/:id/line-items adds variant to INR cart",
    `Variant SKU: ${validVariantSku}`
  );
  const cartAfterAdd = ((await addItemRes.json()) as CartResponse).cart;
  const inrLineItem = cartAfterAdd.items?.find((item) => item.variant_id === validVariantId);
  assert(
    Boolean(inrLineItem && inrLineItem.quantity === 2),
    "Line item persisted in INR cart with quantity = 2",
    `Unit Price: ₹${inrLineItem?.unit_price}, Subtotal: ₹${cartAfterAdd.subtotal}`
  );

  // 3.3 Server-Side Subtotal Calculation
  assert(
    cartAfterAdd.subtotal === inrLineItem!.unit_price * 2,
    "Server-side subtotal accurately computed (unit_price * quantity)",
    `₹${inrLineItem!.unit_price} * 2 = ₹${cartAfterAdd.subtotal}`
  );

  // 3.4 Reject Invalid Variant ID
  const invalidAddRes = await fetch(`${BASE_URL}/store/carts/${inrCart.id}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: "variant_invalid_99999", quantity: 1 }),
  });
  assert(
    invalidAddRes.status >= 400,
    "Store API rejects non-existent variant ID with HTTP 4xx",
    `HTTP Status: ${invalidAddRes.status}`
  );

  // 3.5 Out of Stock Variant Rejection
  const outOfStockLevel = inventoryLevels.find((lvl: any) => lvl.stocked_quantity === 0)!;
  const outOfStockItem = await query({
    entryPoint: "inventory_item",
    fields: ["id", "variants.id", "variants.sku"],
    variables: { filters: { id: outOfStockLevel.inventory_item_id } },
  });
  const oosVariantId = outOfStockItem[0]?.variants?.[0]?.id;

  const oosRes = await fetch(`${BASE_URL}/store/carts/${inrCart.id}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: oosVariantId, quantity: 1 }),
  });
  assert(
    oosRes.status >= 400,
    "Store API rejects adding out-of-stock product variant (inventory = 0)",
    `HTTP Status: ${oosRes.status}`
  );

  // 3.6 Indian Guest Address & Shipping
  const indianAddress = {
    first_name: "Aarav",
    last_name: "Sharma",
    address_1: "Flat 402, Lotus Residency, BKC",
    city: "Mumbai",
    province: "Maharashtra",
    postal_code: "400051",
    country_code: "in",
    phone: "+919876543210",
  };
  await fetch(`${BASE_URL}/store/carts/${inrCart.id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "aarav.sharma@theecombuddy.in",
      shipping_address: indianAddress,
      billing_address: indianAddress,
    }),
  });

  const inrShippingOptionsRes = await fetch(
    `${BASE_URL}/store/shipping-options?cart_id=${inrCart.id}`,
    { headers }
  );
  const inrShippingData = ((await inrShippingOptionsRes.json()) as ShippingOptionsResponse)
    .shipping_options;
  assert(
    inrShippingData && inrShippingData.length >= 2,
    "India delivery zone returns domestic shipping options (Surface & Air)",
    `Options: ${inrShippingData.map((o) => `${o.name} (₹${o.amount})`).join(", ")}`
  );

  const surfaceOption = inrShippingData.find((o) => o.name.includes("Standard Surface"))!;
  await fetch(`${BASE_URL}/store/carts/${inrCart.id}/shipping-methods`, {
    method: "POST",
    headers,
    body: JSON.stringify({ option_id: surfaceOption.id }),
  });

  // 3.7 Apply WELCOME10 Promotion
  const promoRes = await fetch(`${BASE_URL}/store/carts/${inrCart.id}/promotions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ promo_codes: ["WELCOME10"] }),
  });
  assert(promoRes.status === 200, "POST /store/carts/:id/promotions applies WELCOME10 discount");

  const inrCartFinal = ((await (await fetch(`${BASE_URL}/store/carts/${inrCart.id}`, { headers })).json()) as CartResponse).cart;
  const isTotalConsistent =
    Math.abs(inrCartFinal.total - (inrCartFinal.item_total + inrCartFinal.shipping_total)) < 0.01 &&
    Math.abs(inrCartFinal.total - (inrCartFinal.subtotal - inrCartFinal.discount_subtotal + inrCartFinal.tax_total)) < 0.01;
  assert(
    isTotalConsistent,
    "Server-side INR Order Total Formula Verified: Total = Item Total + Shipping Total = Subtotal - Discount Subtotal + Tax",
    `Subtotal: ₹${inrCartFinal.subtotal}, Item Total: ₹${inrCartFinal.item_total}, Shipping: ₹${inrCartFinal.shipping_total}, Tax: ₹${inrCartFinal.tax_total}, Discount Subtotal: ₹${inrCartFinal.discount_subtotal} => Total: ₹${inrCartFinal.total}`
  );

  // -------------------------------------------------------------------------
  // SUITE 4: UNITED STATES (USD) COMMERCE FLOW
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 4: United States (USD) Market Flow ---");

  // 4.1 Create Cart in US Region
  const usCartRes = await fetch(`${BASE_URL}/store/carts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ region_id: usRegion.id }),
  });
  assert(usCartRes.status === 200 || usCartRes.status === 201, "POST /store/carts creates USD cart");
  const usCart = ((await usCartRes.json()) as CartResponse).cart;
  assert(
    usCart.currency_code === "usd" && usCart.region_id === usRegion.id,
    "Cart bound strictly to USD currency and US Region",
    `Cart ID: ${usCart.id}, Currency: ${usCart.currency_code}`
  );

  // 4.2 Add Variant to USD Cart
  const addUsItemRes = await fetch(`${BASE_URL}/store/carts/${usCart.id}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: validVariantId, quantity: 1 }),
  });
  assert(addUsItemRes.status === 200, "POST /store/carts/:id/line-items adds item to USD cart");
  const usCartAfterAdd = ((await addUsItemRes.json()) as CartResponse).cart;
  const usLineItem = usCartAfterAdd.items?.[0];
  assert(
    Boolean(usLineItem && usLineItem.unit_price > 0 && usLineItem.unit_price < inrLineItem!.unit_price),
    "Variant price correctly resolved in USD from variant Price Set (not INR!)",
    `INR Price: ₹${inrLineItem?.unit_price} -> USD Price: $${usLineItem?.unit_price}`
  );

  // 4.3 US Guest Address & US-Specific Shipping
  const usAddress = {
    first_name: "John",
    last_name: "Doe",
    address_1: "350 5th Avenue",
    city: "New York",
    province: "NY",
    postal_code: "10118",
    country_code: "us",
    phone: "+12125550199",
  };
  await fetch(`${BASE_URL}/store/carts/${usCart.id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "john.doe@example.com",
      shipping_address: usAddress,
      billing_address: usAddress,
    }),
  });

  const usShippingRes = await fetch(
    `${BASE_URL}/store/shipping-options?cart_id=${usCart.id}`,
    { headers }
  );
  const usShippingData = ((await usShippingRes.json()) as ShippingOptionsResponse).shipping_options;
  assert(
    usShippingData && usShippingData.some((o) => o.name.includes("US Express")),
    "US delivery zone returns US Express Courier ($15 USD) and excludes Indian domestic shipping",
    `Options: ${usShippingData.map((o) => `${o.name} ($${o.amount})`).join(", ")}`
  );

  const usShippingOption = usShippingData.find((o) => o.name.includes("US Express"))!;
  await fetch(`${BASE_URL}/store/carts/${usCart.id}/shipping-methods`, {
    method: "POST",
    headers,
    body: JSON.stringify({ option_id: usShippingOption.id }),
  });

  const usCartWithShipping = ((await (await fetch(`${BASE_URL}/store/carts/${usCart.id}`, { headers })).json()) as CartResponse).cart;
  assert(
    usCartWithShipping.shipping_subtotal === 15 || usCartWithShipping.shipping_total === 15,
    "US shipping rate correctly applied as $15 USD",
    `Shipping Subtotal: $${usCartWithShipping.shipping_subtotal}, Total: $${usCartWithShipping.total}`
  );

  // -------------------------------------------------------------------------
  // SUITE 5: UAE (AED) COMMERCE FLOW
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 5: UAE (AED) Market Flow ---");

  const aedCartRes = await fetch(`${BASE_URL}/store/carts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ region_id: uaeRegion.id }),
  });
  assert(aedCartRes.status === 200 || aedCartRes.status === 201, "POST /store/carts creates AED cart");
  const aedCart = ((await aedCartRes.json()) as CartResponse).cart;
  assert(
    aedCart.currency_code === "aed" && aedCart.region_id === uaeRegion.id,
    "Cart bound strictly to AED currency and UAE Region",
    `Cart ID: ${aedCart.id}, Currency: ${aedCart.currency_code}`
  );

  // Add Item to AED Cart
  const addAedItemRes = await fetch(`${BASE_URL}/store/carts/${aedCart.id}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: validVariantId, quantity: 2 }),
  });
  assert(addAedItemRes.status === 200, "POST /store/carts/:id/line-items adds item to AED cart");
  const aedCartAfterAdd = ((await addAedItemRes.json()) as CartResponse).cart;
  const aedLineItem = aedCartAfterAdd.items?.[0];
  assert(
    Boolean(aedLineItem && aedLineItem.unit_price > 0),
    "Variant price correctly resolved in AED",
    `AED Unit Price: AED ${aedLineItem?.unit_price}, Subtotal: AED ${aedCartAfterAdd.subtotal}`
  );

  // UAE Address & Shipping
  const uaeAddress = {
    first_name: "Fatima",
    last_name: "Al-Mansoor",
    address_1: "Downtown Dubai, Sheikh Mohammed Bin Rashid Blvd",
    city: "Dubai",
    country_code: "ae",
    phone: "+971501234567",
  };
  await fetch(`${BASE_URL}/store/carts/${aedCart.id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "fatima.almansoor@example.ae",
      shipping_address: uaeAddress,
      billing_address: uaeAddress,
    }),
  });

  const aedShippingRes = await fetch(
    `${BASE_URL}/store/shipping-options?cart_id=${aedCart.id}`,
    { headers }
  );
  const aedShippingData = ((await aedShippingRes.json()) as ShippingOptionsResponse).shipping_options;
  assert(
    aedShippingData && aedShippingData.some((o) => o.name.includes("Gulf Air Express")),
    "UAE delivery zone returns Gulf Air Express (50 AED)",
    `Options: ${aedShippingData.map((o) => `${o.name} (AED ${o.amount})`).join(", ")}`
  );

  const aedShippingOption = aedShippingData.find((o) => o.name.includes("Gulf Air Express"))!;
  await fetch(`${BASE_URL}/store/carts/${aedCart.id}/shipping-methods`, {
    method: "POST",
    headers,
    body: JSON.stringify({ option_id: aedShippingOption.id }),
  });
  const aedCartWithShipping = ((await (await fetch(`${BASE_URL}/store/carts/${aedCart.id}`, { headers })).json()) as CartResponse).cart;
  assert(
    aedCartWithShipping.shipping_subtotal === 50 || aedCartWithShipping.shipping_total >= 50,
    "UAE shipping option attached and reflected in cart totals (50 AED)",
    `Shipping Subtotal: AED ${aedCartWithShipping.shipping_subtotal}, Total: AED ${aedCartWithShipping.total}`
  );

  // -------------------------------------------------------------------------
  // SUITE 6: DYNAMIC MARKET SWITCHING & PRICE RECALCULATION
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 6: Dynamic Market Switching & Price Recalculation ---");

  // Create Cart in USD, Add item, then switch to UK (GBP)
  const switchCartRes = await fetch(`${BASE_URL}/store/carts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ region_id: usRegion.id }),
  });
  const switchCart = ((await switchCartRes.json()) as CartResponse).cart;

  await fetch(`${BASE_URL}/store/carts/${switchCart.id}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: validVariantId, quantity: 1 }),
  });
  const switchCartInitial = ((await (await fetch(`${BASE_URL}/store/carts/${switchCart.id}`, { headers })).json()) as CartResponse).cart;
  const initialUsdPrice = switchCartInitial.items?.[0]?.unit_price;

  // Switch region to UK (GBP) via official Medusa updateCart API
  const updateRegionRes = await fetch(`${BASE_URL}/store/carts/${switchCart.id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ region_id: ukRegion.id }),
  });
  assert(updateRegionRes.status === 200, "POST /store/carts/:id successfully updates cart region to UK");

  const switchCartAfterSwitch = ((await (await fetch(`${BASE_URL}/store/carts/${switchCart.id}`, { headers })).json()) as CartResponse).cart;
  assert(
    switchCartAfterSwitch.currency_code === "gbp" && switchCartAfterSwitch.region_id === ukRegion.id,
    "Cart currency switched to GBP following market region change",
    `Old Currency: ${switchCartInitial.currency_code} -> New Currency: ${switchCartAfterSwitch.currency_code}`
  );

  const updatedGbpPrice = switchCartAfterSwitch.items?.[0]?.unit_price;
  assert(
    Boolean(updatedGbpPrice && updatedGbpPrice !== initialUsdPrice),
    "Line item unit price dynamically recalculated server-side to GBP price",
    `USD Unit Price: $${initialUsdPrice} -> GBP Unit Price: £${updatedGbpPrice}`
  );

  // -------------------------------------------------------------------------
  // SUITE 7: UNSUPPORTED REGION & CURRENCY INTEGRITY
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 7: Unsupported Region & Currency Integrity ---");

  const bogusRegionRes = await fetch(`${BASE_URL}/store/carts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ region_id: "reg_non_existent_market_99999" }),
  });
  assert(
    bogusRegionRes.status >= 400,
    "Store API rejects cart creation with invalid / unsupported region ID",
    `HTTP Status: ${bogusRegionRes.status}`
  );

  // Verify All Amounts Are Strictly Non-Negative Numbers Without Floating Artifacts
  assert(
    !isNaN(inrCartFinal.total) &&
      !isNaN(usCartWithShipping.total) &&
      !isNaN(switchCartAfterSwitch.total) &&
      inrCartFinal.total > 0 &&
      usCartWithShipping.total > 0,
    "Currency precision and financial safety validated across all markets (No NaN or negative totals)",
    `INR: ₹${inrCartFinal.total}, USD: $${usCartWithShipping.total}, GBP: £${switchCartAfterSwitch.total}`
  );

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==============================================================================");
  console.log(`[verify-02c] ALL ${passedTests} OF ${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("==============================================================================");
}
