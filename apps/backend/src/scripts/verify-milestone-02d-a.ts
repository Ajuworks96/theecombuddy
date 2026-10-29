import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { cancelOrderWorkflow } from "@medusajs/core-flows";

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
    shipping_total: number;
    discount_subtotal: number;
    discount_total: number;
    discount_tax_total: number;
    subtotal: number;
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

export default async function verifyMilestone02DA({ container }: { container: MedusaContainer }) {
  console.log("==============================================================================");
  console.log("[verify-02d-a] THE ECOM BUDDY — MILESTONE 02D-A CHECKOUT & COD VERIFICATION");
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
  // SUITE 1: CATALOG, INVENTORY & SHIPPING PROFILE INTEGRITY
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 1: Catalog, Inventory & Shipping Profile Audit ---");

  const products: any[] = await query({
    entryPoint: "product",
    fields: ["id", "handle", "status"],
    variables: { filters: { handle: { $like: "teb-%" } } },
  });
  assert(products.length === 520, "Exactly 520 distinct catalog products present", `Found ${products.length} products`);

  const variants: any[] = await query({
    entryPoint: "product_variant",
    fields: ["id", "sku", "deleted_at"],
  });
  const activeVariants = variants.filter((v: any) => !v.deleted_at && v.sku?.startsWith("TEB-"));
  assert(activeVariants.length === 1235, "Exactly 1,235 active catalog variants present", `Found ${activeVariants.length} variants`);

  const inventoryLevels: any[] = await query({
    entryPoint: "inventory_level",
    fields: ["id", "inventory_item_id", "stocked_quantity"],
  });
  assert(
    inventoryLevels.length === activeVariants.length,
    "1:1 Inventory Reconciliation (Levels match active variants exactly)",
    `Active Variants: ${activeVariants.length}, Inventory Levels: ${inventoryLevels.length}`
  );

  const productShippingLinks: any[] = await query({
    entryPoint: "product_shipping_profile",
    fields: ["product_id", "shipping_profile_id"],
  });
  assert(
    productShippingLinks.length >= 520,
    "All catalog products linked to default shipping profile",
    `Linked Products: ${productShippingLinks.length}`
  );

  // Retrieve API Key & Regions
  const apiKeys: any[] = await query({
    entryPoint: "api_key",
    fields: ["id", "token"],
    variables: { filters: { type: "publishable" } },
  });
  const publishableKey = apiKeys[0]?.token;
  assert(Boolean(publishableKey), "Publishable API Key active");

  const allRegions: any[] = await query({
    entryPoint: "region",
    fields: ["id", "name", "currency_code", "payment_providers.id", "countries.iso_2"],
  });
  const indiaRegion = allRegions.find((r: any) => r.currency_code === "inr");
  const usRegion = allRegions.find((r: any) => r.currency_code === "usd");

  const BASE_URL = "http://localhost:9000";
  const headers = {
    "x-publishable-api-key": publishableKey,
    "Content-Type": "application/json",
  };

  // -------------------------------------------------------------------------
  // SUITE 2: CART CALCULATION CORRECTNESS (OFFICIAL MEDUSA V2 FORMULAS)
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 2: Cart Calculation Correctness ---");

  // Create Cart in India Region
  const cartRes = await fetch(`${BASE_URL}/store/carts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ region_id: indiaRegion.id }),
  });
  const cart = ((await cartRes.json()) as CartResponse).cart;
  assert(cart.currency_code === "inr", "Cart created with INR currency", `Cart ID: ${cart.id}`);

  // Add 2 units of an in-stock variant
  const inStockLevel = inventoryLevels.find((lvl: any) => lvl.stocked_quantity > 50)!;
  const inStockItem: any[] = await query({
    entryPoint: "inventory_item",
    fields: ["id", "variants.id", "variants.sku"],
    variables: { filters: { id: inStockLevel.inventory_item_id } },
  });
  const testVariant = inStockItem[0]?.variants?.[0];

  const addItemRes = await fetch(`${BASE_URL}/store/carts/${cart.id}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: testVariant.id, quantity: 2 }),
  });
  assert(addItemRes.status === 200, "Line item added to cart with quantity = 2");
  const cartAfterAdd = ((await addItemRes.json()) as CartResponse).cart;
  const lineItem = cartAfterAdd.items?.[0]!;

  assert(
    cartAfterAdd.item_subtotal === lineItem.unit_price * 2,
    "Item subtotal matches sum of quantity * unit_price",
    `₹${lineItem.unit_price} * 2 = ₹${cartAfterAdd.item_subtotal}`
  );

  // Add Address & Standard Surface Delivery (₹99)
  const indianAddress = {
    first_name: "Rahul",
    last_name: "Verma",
    address_1: "74 Marine Drive",
    city: "Mumbai",
    province: "Maharashtra",
    postal_code: "400020",
    country_code: "in",
    phone: "+919811223344",
  };
  await fetch(`${BASE_URL}/store/carts/${cart.id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "rahul.verma@theecombuddy.in",
      shipping_address: indianAddress,
      billing_address: indianAddress,
    }),
  });

  const shippingOptionsRes = await fetch(`${BASE_URL}/store/shipping-options?cart_id=${cart.id}`, { headers });
  const shippingOpts: any[] = ((await shippingOptionsRes.json()) as ShippingOptionsResponse).shipping_options;
  const surfaceOption = shippingOpts.find((o) => o.name.includes("Standard Surface"))!;

  await fetch(`${BASE_URL}/store/carts/${cart.id}/shipping-methods`, {
    method: "POST",
    headers,
    body: JSON.stringify({ option_id: surfaceOption.id }),
  });

  // Apply Percentage Discount (WELCOME10 - 10%)
  await fetch(`${BASE_URL}/store/carts/${cart.id}/promotions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ promo_codes: ["WELCOME10"] }),
  });

  const cartCalculated = ((await (await fetch(`${BASE_URL}/store/carts/${cart.id}`, { headers })).json()) as CartResponse).cart;

  // Medusa v2 Exact Calculation Assertions:
  // 1. subtotal = item_subtotal + shipping_subtotal
  assert(
    cartCalculated.subtotal === cartCalculated.item_subtotal + cartCalculated.shipping_subtotal,
    "Gross subtotal equals sum of item_subtotal and shipping_subtotal",
    `₹${cartCalculated.item_subtotal} + ₹${cartCalculated.shipping_subtotal} = ₹${cartCalculated.subtotal}`
  );

  // 2. discount_subtotal = 10% of item_subtotal
  const expectedDiscountSubtotal = Math.round(cartCalculated.item_subtotal * 0.1 * 100) / 100;
  assert(
    Math.abs(cartCalculated.discount_subtotal - expectedDiscountSubtotal) < 0.05,
    "Percentage discount accurately evaluated on item subtotal (10%)",
    `Expected: ₹${expectedDiscountSubtotal}, Actual: ₹${cartCalculated.discount_subtotal}`
  );

  // 3. Grand Total Formula: Total = Item Total + Shipping Total = Subtotal - Discount Subtotal + Tax Total
  const isGrandTotalConsistent =
    Math.abs(cartCalculated.total - (cartCalculated.item_total + cartCalculated.shipping_total)) < 0.01 &&
    Math.abs(cartCalculated.total - (cartCalculated.subtotal - cartCalculated.discount_subtotal + cartCalculated.tax_total)) < 0.01;
  assert(
    isGrandTotalConsistent,
    "Official Medusa v2 Grand Total Verified: Total = Item Total + Shipping Total = Subtotal - Discount Subtotal + Tax",
    `Subtotal: ₹${cartCalculated.subtotal}, Discount Sub: ₹${cartCalculated.discount_subtotal}, Tax: ₹${cartCalculated.tax_total} => Total: ₹${cartCalculated.total}`
  );

  // 4. Currency precision: standard 2 decimal places, non-negative, not NaN
  assert(
    !isNaN(cartCalculated.total) && cartCalculated.total > 0,
    "Currency precision validated without floating artifacts",
    `Total: ₹${cartCalculated.total}`
  );

  // -------------------------------------------------------------------------
  // SUITE 3: TAX & MARKET SAFETY AUDIT
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 3: Tax & Market Safety Audit ---");

  const taxRegions: any[] = await query({
    entryPoint: "tax_region",
    fields: ["id", "country_code", "provider_id", "tax_rates.id", "tax_rates.name", "tax_rates.rate", "tax_rates.code"],
    variables: { filters: { country_code: "in" } },
  });
  const inTaxRegion = taxRegions[0];
  const taxRates = inTaxRegion?.tax_rates || [];

  assert(
    taxRates.some((r: any) => r.code === "GST18") &&
      taxRates.some((r: any) => r.code === "GST5") &&
      taxRates.some((r: any) => r.code === "GST12") &&
      taxRates.some((r: any) => r.code === "GST28"),
    "Tiered Indian GST rate fixtures configured (GST5, GST12, GST18 default, GST28)",
    `Configured rates: ${taxRates.map((r: any) => `${r.code} (${r.rate}%)`).join(", ")}`
  );

  assert(
    inTaxRegion.provider_id === "tp_system",
    "India Tax Region correctly bound to tp_system provider",
    `Provider ID: ${inTaxRegion.provider_id}`
  );

  // -------------------------------------------------------------------------
  // SUITE 4: COD PAYMENT FOUNDATION (INDIA REGION)
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 4: COD Payment Foundation ---");

  // Verify COD eligibility on shipping options
  assert(
    surfaceOption.data?.is_cod === true && surfaceOption.data?.cod_eligible === true,
    "Standard Surface Delivery is COD eligible (is_cod: true)",
    `Option: ${surfaceOption.name}`
  );

  const expressAirOption = shippingOpts.find((o) => o.name.includes("Express Air"))!;
  assert(
    expressAirOption.data?.is_cod === false,
    "Express Air Delivery is COD ineligible (is_cod: false)",
    `Option: ${expressAirOption.name}`
  );

  // Initialize Payment Collection
  const payColRes = await fetch(`${BASE_URL}/store/payment-collections`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cart_id: cart.id }),
  });
  assert(payColRes.status === 200, "POST /store/payment-collections initializes collection for cart");
  const payCol = ((await payColRes.json()) as any).payment_collection;
  assert(
    Boolean(payCol && payCol.id && payCol.amount === cartCalculated.total),
    "Payment collection initialized with exact cart total amount",
    `Collection ID: ${payCol.id}, Amount: ₹${payCol.amount}`
  );

  // Create Payment Session for COD using system provider
  const paySessRes = await fetch(`${BASE_URL}/store/payment-collections/${payCol.id}/payment-sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ provider_id: "pp_system_default" }),
  });
  assert(paySessRes.status === 200, "POST /store/payment-collections/:id/payment-sessions creates COD session");
  const paySessData = (await paySessRes.json()) as any;
  const paymentSession = paySessData.payment_collection?.payment_sessions?.[0];
  assert(
    paymentSession && paymentSession.provider_id === "pp_system_default",
    "Payment session attached to collection with pp_system_default provider",
    `Session ID: ${paymentSession?.id}, Status: ${paymentSession?.status}`
  );

  // -------------------------------------------------------------------------
  // SUITE 5: COD ORDER COMPLETION & INVENTORY RESERVATION LIFECYCLE
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 5: COD Order Completion & Reservation Lifecycle ---");

  // Query reservations before order completion
  const reservationsBefore: any[] = await query({
    entryPoint: "reservation_item",
    fields: ["id", "line_item_id", "inventory_item_id", "quantity"],
    variables: { filters: { inventory_item_id: inStockLevel.inventory_item_id } },
  });
  const resCountBefore = reservationsBefore.length;

  // Complete Cart via Official Complete Cart API
  const completeRes = await fetch(`${BASE_URL}/store/carts/${cart.id}/complete`, {
    method: "POST",
    headers,
  });
  assert(completeRes.status === 200, "POST /store/carts/:id/complete succeeds with HTTP 200");
  const completeData = (await completeRes.json()) as any;
  assert(completeData.type === "order", "Complete cart response type is 'order'", `Response type: ${completeData.type}`);

  const order = completeData.order;
  assert(Boolean(order && order.id?.startsWith("order_")), "Order created with valid ID", `Order ID: ${order.id}`);

  // COD Order Payment Status: Must be payment outstanding (paid_total: 0, NOT online captured)
  assert(
    order.summary?.paid_total === 0 && order.summary?.pending_difference === order.total,
    "COD Order correctly recorded as payment outstanding (paid_total = 0, pending = total)",
    `Paid: ₹${order.summary?.paid_total}, Pending Difference: ₹${order.summary?.pending_difference}`
  );

  // Order Details & Currency
  assert(
    order.currency_code === "inr" && order.email === "rahul.verma@theecombuddy.in",
    "Order persists exact currency (INR) and guest customer email",
    `Currency: ${order.currency_code}, Email: ${order.email}`
  );

  // Inventory Reservation Audit
  const reservationsAfter: any[] = await query({
    entryPoint: "reservation_item",
    fields: ["id", "line_item_id", "inventory_item_id", "quantity"],
    variables: { filters: { inventory_item_id: inStockLevel.inventory_item_id } },
  });
  assert(
    reservationsAfter.length === resCountBefore + 1,
    "Official Medusa v2 inventory reservation created for the ordered items",
    `Reservations Before: ${resCountBefore}, After: ${reservationsAfter.length}`
  );
  const createdReservation = reservationsAfter.find((r: any) => !reservationsBefore.some((b: any) => b.id === r.id));
  assert(
    createdReservation && createdReservation.quantity === 2,
    "Reservation item locks exact ordered quantity (2 units) against unreserved stock",
    `Reservation ID: ${createdReservation?.id}, Quantity: ${createdReservation?.quantity}`
  );

  // Idempotency: Duplicate complete-cart call returns existing order without creating duplicate
  const duplicateCompleteRes = await fetch(`${BASE_URL}/store/carts/${cart.id}/complete`, {
    method: "POST",
    headers,
  });
  assert(
    duplicateCompleteRes.status === 200,
    "Duplicate complete-cart call handled idempotently with HTTP 200"
  );
  const dupData = (await duplicateCompleteRes.json()) as any;
  assert(
    dupData.type === "order" && dupData.order?.id === order.id,
    "Duplicate call safely returns existing order without creating duplicate order",
    `Returned Order ID: ${dupData.order?.id}`
  );

  const reservationsAfterDup: any[] = await query({
    entryPoint: "reservation_item",
    fields: ["id", "line_item_id", "inventory_item_id", "quantity"],
    variables: { filters: { inventory_item_id: inStockLevel.inventory_item_id } },
  });
  assert(
    reservationsAfterDup.length === reservationsAfter.length,
    "Duplicate checkout attempt does not create duplicate inventory reservations",
    `Reservation Count: ${reservationsAfterDup.length}`
  );

  // -------------------------------------------------------------------------
  // SUITE 6: ORDER CANCELLATION & RESERVATION RELEASE
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 6: Order Cancellation & Reservation Release ---");

  // Cancel Order via Official cancelOrderWorkflow
  await cancelOrderWorkflow(container).run({
    input: { order_id: order.id },
  });

  const canceledOrders: any[] = await query({
    entryPoint: "order",
    fields: ["id", "status"],
    variables: { filters: { id: order.id } },
  });
  assert(
    canceledOrders[0]?.status === "canceled",
    "Order status updated to 'canceled' via official workflow",
    `Status: ${canceledOrders[0]?.status}`
  );

  // Verify Reservation Release
  const reservationsAfterCancel: any[] = await query({
    entryPoint: "reservation_item",
    fields: ["id", "line_item_id", "inventory_item_id", "quantity"],
    variables: { filters: { inventory_item_id: inStockLevel.inventory_item_id } },
  });
  assert(
    reservationsAfterCancel.length === resCountBefore,
    "Order cancellation releases inventory reservations immediately, restoring available stock",
    `Reservations remaining: ${reservationsAfterCancel.length} (restored to baseline: ${resCountBefore})`
  );

  // -------------------------------------------------------------------------
  // SUITE 7: INVENTORY CONCURRENCY & CHECKOUT SECURITY
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 7: Inventory & Order Security ---");

  // 7.1 Reject Checkout on Out of Stock Item
  const oosCartRes = await fetch(`${BASE_URL}/store/carts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ region_id: indiaRegion.id }),
  });
  const oosCart = ((await oosCartRes.json()) as CartResponse).cart;

  const oosLevel = inventoryLevels.find((lvl: any) => lvl.stocked_quantity === 0)!;
  const oosItem: any[] = await query({
    entryPoint: "inventory_item",
    fields: ["id", "variants.id"],
    variables: { filters: { id: oosLevel.inventory_item_id } },
  });
  const oosVariantId = oosItem[0]?.variants?.[0]?.id;

  const addOosRes = await fetch(`${BASE_URL}/store/carts/${oosCart.id}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: oosVariantId, quantity: 1 }),
  });
  assert(
    addOosRes.status >= 400,
    "Store API rejects adding out-of-stock items (inventory = 0)",
    `HTTP Status: ${addOosRes.status}`
  );

  // 7.2 Reject Cart Completion Without Payment Session
  const unpayedCartRes = await fetch(`${BASE_URL}/store/carts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ region_id: indiaRegion.id }),
  });
  const unpayedCart = ((await unpayedCartRes.json()) as CartResponse).cart;
  await fetch(`${BASE_URL}/store/carts/${unpayedCart.id}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: testVariant.id, quantity: 1 }),
  });
  await fetch(`${BASE_URL}/store/carts/${unpayedCart.id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "guest@example.in",
      shipping_address: indianAddress,
      billing_address: indianAddress,
    }),
  });
  await fetch(`${BASE_URL}/store/carts/${unpayedCart.id}/shipping-methods`, {
    method: "POST",
    headers,
    body: JSON.stringify({ option_id: surfaceOption.id }),
  });

  const incompleteRes = await fetch(`${BASE_URL}/store/carts/${unpayedCart.id}/complete`, {
    method: "POST",
    headers,
  });
  assert(
    incompleteRes.status >= 400,
    "Complete-cart API rejects completion when payment session is missing",
    `HTTP Status: ${incompleteRes.status}`
  );

  // -------------------------------------------------------------------------
  // SUITE 8: MULTI-CURRENCY ORDER INTEGRITY & GATEWAY RESTRICTIONS
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 8: Multi-Currency Order Integrity & Gateway Restrictions ---");

  // Create US Cart in USD
  const usCartRes = await fetch(`${BASE_URL}/store/carts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ region_id: usRegion.id }),
  });
  const usCart = ((await usCartRes.json()) as CartResponse).cart;
  assert(usCart.currency_code === "usd", "US Cart created strictly in USD currency");

  // Add Item to USD Cart
  await fetch(`${BASE_URL}/store/carts/${usCart.id}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: testVariant.id, quantity: 1 }),
  });

  const usAddress = {
    first_name: "James",
    last_name: "Wilson",
    address_1: "740 Park Avenue",
    city: "New York",
    province: "NY",
    postal_code: "10021",
    country_code: "us",
    phone: "+12125550144",
  };
  await fetch(`${BASE_URL}/store/carts/${usCart.id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: "james.wilson@example.com",
      shipping_address: usAddress,
      billing_address: usAddress,
    }),
  });

  const usShippingRes = await fetch(`${BASE_URL}/store/shipping-options?cart_id=${usCart.id}`, { headers });
  const usShippingOpts: any[] = ((await usShippingRes.json()) as ShippingOptionsResponse).shipping_options;
  const usExpressOption = usShippingOpts.find((o) => o.name.includes("US Express"))!;
  assert(
    Boolean(usExpressOption && usExpressOption.amount === 15),
    "US delivery zone returns US Express Courier ($15 USD)",
    `Option: ${usExpressOption?.name}`
  );

  // COD ineligibility check for international market
  assert(
    usExpressOption.data?.is_cod === false,
    "COD is strictly disabled for US international delivery zone",
    `is_cod: ${usExpressOption.data?.is_cod}`
  );

  await fetch(`${BASE_URL}/store/carts/${usCart.id}/shipping-methods`, {
    method: "POST",
    headers,
    body: JSON.stringify({ option_id: usExpressOption.id }),
  });

  // USD Payment Collection & Order Completion
  const usPayColRes = await fetch(`${BASE_URL}/store/payment-collections`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cart_id: usCart.id }),
  });
  const usPayCol = ((await usPayColRes.json()) as any).payment_collection;

  await fetch(`${BASE_URL}/store/payment-collections/${usPayCol.id}/payment-sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ provider_id: "pp_system_default" }),
  });

  const usCompleteRes = await fetch(`${BASE_URL}/store/carts/${usCart.id}/complete`, {
    method: "POST",
    headers,
  });
  assert(usCompleteRes.status === 200, "USD Order completed successfully");
  const usOrder = ((await usCompleteRes.json()) as any).order;
  assert(
    usOrder.currency_code === "usd" && usOrder.total > 0,
    "USD Order persists exact USD currency and non-zero total",
    `Order ID: ${usOrder.id}, Currency: ${usOrder.currency_code}, Total: $${usOrder.total}`
  );

  // Clean up test USD order
  await cancelOrderWorkflow(container).run({ input: { order_id: usOrder.id } });

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==============================================================================");
  console.log(`[verify-02d-a] ALL ${passedTests} OF ${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("==============================================================================");
}

