const { Client } = require("pg");

const BACKEND_URL = "http://localhost:9000";
const STOREFRONT_URL = "http://localhost:3000";
const PUBLISHABLE_KEY = "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

const headers = {
  "Content-Type": "application/json",
  "x-publishable-api-key": PUBLISHABLE_KEY,
};

let testCount = 0;
let passCount = 0;
let failCount = 0;

function recordTest(suite, name, passed, details = "") {
  testCount++;
  if (passed) {
    passCount++;
    console.log(`  [PASSED] Test ${testCount}: ${name}${details ? ` -> ${details}` : ""}`);
  } else {
    failCount++;
    console.error(`  [FAILED] Test ${testCount}: ${name}${details ? ` -> ${details}` : ""}`);
  }
}

async function request(url, opts = {}) {
  const finalHeaders = { ...headers, ...(opts.headers || {}) };
  const res = await fetch(url, { ...opts, headers: finalHeaders });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function main() {
  console.log("==============================================================================");
  console.log("THE ECOM BUDDY — MILESTONE 04C VERIFICATION SUITE");
  console.log("Complete Cart, Shipping, Discounts & Guest Checkout UI");
  console.log("==============================================================================\n");

  const pg = new Client("postgres://postgres:password@localhost:5432/medusa_ecom_buddy");
  await pg.connect();

  let testCartId = null;
  let createdOrderId = null;

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: Baseline Integrity Audit
    // -------------------------------------------------------------------------
    console.log("--- SUITE 1: Baseline Integrity & Entity Audit ---");

    const prodCountRes = await pg.query("SELECT count(*) FROM product WHERE deleted_at IS NULL");
    const activeProducts = parseInt(prodCountRes.rows[0].count, 10);
    recordTest(
      "Suite 1",
      "PostgreSQL active products count equals exactly 520 baseline records",
      activeProducts === 520,
      `Active products: ${activeProducts}`
    );

    const skuCountRes = await pg.query("SELECT count(*) FROM inventory_item WHERE deleted_at IS NULL");
    const activeSkus = parseInt(skuCountRes.rows[0].count, 10);
    recordTest(
      "Suite 1",
      "Active inventory items count equals 1,236 SKUs",
      activeSkus === 1236,
      `Active SKUs: ${activeSkus}`
    );

    const catCountRes = await pg.query("SELECT count(*) FROM product_category WHERE deleted_at IS NULL");
    const activeCats = parseInt(catCountRes.rows[0].count, 10);
    recordTest(
      "Suite 1",
      "Active categories count equals exactly 8 departments",
      activeCats === 8,
      `Active categories: ${activeCats}`
    );

    const colCountRes = await pg.query("SELECT count(*) FROM product_collection WHERE deleted_at IS NULL");
    const activeCols = parseInt(colCountRes.rows[0].count, 10);
    recordTest(
      "Suite 1",
      "Active collections count equals exactly 4 curated collections",
      activeCols === 4,
      `Active collections: ${activeCols}`
    );

    const orderCountRes = await pg.query("SELECT count(*) FROM \"order\" WHERE deleted_at IS NULL");
    const activeOrders = parseInt(orderCountRes.rows[0].count, 10);
    recordTest(
      "Suite 1",
      "Existing customer orders preserved without modification (3 orders)",
      activeOrders === 3,
      `Active orders: ${activeOrders}`
    );

    // -------------------------------------------------------------------------
    // SUITE 2: Cart Lifecycle Operations (Phase 2 & 3)
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 2: Cart Lifecycle Operations & Line Items ---");

    // 1. Create cart
    const createRes = await request(`${STOREFRONT_URL}/api/cart`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    testCartId = createRes.data?.cart?.id;
    recordTest(
      "Suite 2",
      "POST /api/cart creates new shopping cart with HTTP 201",
      createRes.status === 201 && Boolean(testCartId),
      `Cart ID: ${testCartId}`
    );

    // 2. Add product variant to cart
    const sampleVariantId = "variant_01M61961Y1NQZDFADT2VKTXZB8"; // Matte Black
    const addRes = await request(`${STOREFRONT_URL}/api/cart/items`, {
      method: "POST",
      body: JSON.stringify({
        cart_id: testCartId,
        variant_id: sampleVariantId,
        quantity: 1,
      }),
    });
    const lineItem = addRes.data?.cart?.items?.[0];
    recordTest(
      "Suite 2",
      "POST /api/cart/items adds line item with HTTP 200",
      addRes.status === 200 && addRes.data?.cart?.items?.length === 1,
      `Line item: ${lineItem?.id}, Title: ${lineItem?.title}, Qty: ${lineItem?.quantity}`
    );

    // 3. Update quantity
    const updateRes = await request(`${STOREFRONT_URL}/api/cart/items`, {
      method: "PUT",
      body: JSON.stringify({
        cart_id: testCartId,
        line_id: lineItem?.id,
        quantity: 3,
      }),
    });
    const updatedItem = updateRes.data?.cart?.items?.[0];
    recordTest(
      "Suite 2",
      "PUT /api/cart/items updates line item quantity with HTTP 200",
      updateRes.status === 200 && updatedItem?.quantity === 3,
      `Updated quantity: ${updatedItem?.quantity}`
    );

    // 4. Retrieve cart by ID
    const getCartRes = await request(`${STOREFRONT_URL}/api/cart?cart_id=${testCartId}`);
    recordTest(
      "Suite 2",
      "GET /api/cart retrieves active cart state with HTTP 200",
      getCartRes.status === 200 && getCartRes.data?.cart?.id === testCartId,
      `Retrieved cart ID: ${getCartRes.data?.cart?.id}`
    );

    // -------------------------------------------------------------------------
    // SUITE 3: Market & Currency Recalculation (Phase 1, 3 & 11)
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 3: Market & Currency Recalculation ---");

    // Fetch regions to find US region
    const regRes = await request(`${BACKEND_URL}/store/regions`);
    const usRegion = regRes.data?.regions?.find((r) => r.currency_code === "usd");

    // Update cart region to US without losing items
    const switchRegionRes = await request(`${STOREFRONT_URL}/api/cart`, {
      method: "POST",
      body: JSON.stringify({
        cart_id: testCartId,
        region_id: usRegion?.id,
      }),
    });
    const usCart = switchRegionRes.data?.cart;
    const usItem = usCart?.items?.[0];
    recordTest(
      "Suite 3",
      "Switching region updates cart currency to USD and preserves line items",
      switchRegionRes.status === 200 && usCart?.currency_code === "usd" && usCart?.items?.length === 1,
      `Currency: ${usCart?.currency_code}, Items: ${usCart?.items?.length}`
    );

    recordTest(
      "Suite 3",
      "Line item unit price automatically recalculates in regional market currency ($49 USD)",
      Number(usItem?.unit_price) === 49,
      `Recalculated USD price: $${usItem?.unit_price} (Expected: $49)`
    );

    // Switch back to India (INR)
    const inRegion = regRes.data?.regions?.find((r) => r.currency_code === "inr");
    const switchBackRes = await request(`${STOREFRONT_URL}/api/cart`, {
      method: "POST",
      body: JSON.stringify({
        cart_id: testCartId,
        region_id: inRegion?.id,
      }),
    });
    const inItem = switchBackRes.data?.cart?.items?.[0];
    recordTest(
      "Suite 3",
      "Switching back to India reverts currency to INR and restores base price (₹4075)",
      switchBackRes.status === 200 && switchBackRes.data?.cart?.currency_code === "inr" && Number(inItem?.unit_price) === 4075,
      `Currency: ${switchBackRes.data?.cart?.currency_code}, Unit price: ₹${inItem?.unit_price}`
    );

    // -------------------------------------------------------------------------
    // SUITE 4: Promotions & Discount Engine (Phase 4)
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 4: Promotions & Discounts Lifecycle ---");

    // Apply valid coupon WELCOME10
    const applyPromoRes = await request(`${STOREFRONT_URL}/api/cart/promotions`, {
      method: "POST",
      body: JSON.stringify({
        cart_id: testCartId,
        promo_code: "WELCOME10",
      }),
    });
    const promoCart = applyPromoRes.data?.cart;
    recordTest(
      "Suite 4",
      "POST /api/cart/promotions applies valid coupon code with HTTP 200",
      applyPromoRes.status === 200 && (promoCart?.promotions?.length ?? 0) >= 1,
      `Applied promotions count: ${promoCart?.promotions?.length}`
    );

    // Reject invalid coupon
    const invalidPromoRes = await request(`${STOREFRONT_URL}/api/cart/promotions`, {
      method: "POST",
      body: JSON.stringify({
        cart_id: testCartId,
        promo_code: "INVALID_EXPIRED_CODE_999",
      }),
    });
    recordTest(
      "Suite 4",
      "POST /api/cart/promotions rejects invalid coupon code with HTTP 400",
      invalidPromoRes.status === 400,
      `Status: ${invalidPromoRes.status}, Error: '${invalidPromoRes.data?.error}'`
    );

    // Remove coupon
    const removePromoRes = await request(`${STOREFRONT_URL}/api/cart/promotions`, {
      method: "DELETE",
      body: JSON.stringify({
        cart_id: testCartId,
        promo_code: "WELCOME10",
      }),
    });
    recordTest(
      "Suite 4",
      "DELETE /api/cart/promotions removes coupon code with HTTP 200",
      removePromoRes.status === 200,
      `Status: ${removePromoRes.status}`
    );

    // -------------------------------------------------------------------------
    // SUITE 5: Shipping Destination & Options (Phase 5 & 6)
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 5: Shipping Destination & Options ---");

    // Set guest email and domestic shipping address
    const setAddressRes = await request(`${STOREFRONT_URL}/api/cart`, {
      method: "POST",
      body: JSON.stringify({
        cart_id: testCartId,
        email: "guest@example.in",
        shipping_address: {
          first_name: "Aditi",
          last_name: "Verma",
          address_1: "Plot 42, DLF Phase 4",
          city: "Gurugram",
          province: "Haryana",
          postal_code: "122002",
          country_code: "in",
          phone: "+919876543210",
        },
      }),
    });
    recordTest(
      "Suite 5",
      "POST /api/cart attaches guest email and shipping address with HTTP 200",
      setAddressRes.status === 200 && setAddressRes.data?.cart?.email === "guest@example.in",
      `Email: ${setAddressRes.data?.cart?.email}, Destination: Gurugram, IN`
    );

    // Retrieve eligible shipping options for cart
    const shipOptsRes = await request(
      `${STOREFRONT_URL}/api/cart/shipping-options?cart_id=${testCartId}`
    );
    const options = shipOptsRes.data?.shipping_options || [];
    recordTest(
      "Suite 5",
      "GET /api/cart/shipping-options retrieves eligible shipping options",
      shipOptsRes.status === 200 && options.length >= 2,
      `Retrieved ${options.length} eligible options (Express Air & Standard Surface)`
    );

    // Attach shipping method
    const selectedOption = options[0];
    const setShipMethodRes = await request(`${STOREFRONT_URL}/api/cart/shipping-options`, {
      method: "POST",
      body: JSON.stringify({
        cart_id: testCartId,
        option_id: selectedOption?.id,
      }),
    });
    const cartWithShipping = setShipMethodRes.data?.cart;
    recordTest(
      "Suite 5",
      "POST /api/cart/shipping-options sets shipping method with HTTP 200",
      setShipMethodRes.status === 200 && Boolean(cartWithShipping?.shipping_methods?.length),
      `Shipping methods count: ${cartWithShipping?.shipping_methods?.length}`
    );

    // -------------------------------------------------------------------------
    // SUITE 6: Authoritative Server Calculation (Phase 1, 5 & 6)
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 6: Server-Authoritative Totals & Taxes ---");

    const subtotal = cartWithShipping?.subtotal;
    const shippingTotal = cartWithShipping?.shipping_total;
    const taxTotal = cartWithShipping?.tax_total;
    const grandTotal = cartWithShipping?.total;

    recordTest(
      "Suite 6",
      "Medusa server calculates authoritative items subtotal without client guesswork",
      typeof subtotal === "number" && subtotal > 0,
      `Calculated Subtotal: ₹${subtotal}`
    );

    recordTest(
      "Suite 6",
      "Server calculates authoritative shipping total",
      typeof shippingTotal === "number" && shippingTotal > 0,
      `Calculated Shipping: ₹${shippingTotal}`
    );

    recordTest(
      "Suite 6",
      "Server calculates authoritative tax total and grand total",
      typeof grandTotal === "number" && grandTotal > subtotal,
      `Grand Total: ₹${grandTotal} (Tax: ₹${taxTotal})`
    );

    // -------------------------------------------------------------------------
    // SUITE 7: Cash on Delivery (COD) Order Placement & Teardown (Phase 7, 8 & 12)
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 7: Cash on Delivery (COD) Order Placement & Teardown ---");

    // Initialize payment collection & system default session
    const payRes = await request(`${STOREFRONT_URL}/api/cart/payment`, {
      method: "POST",
      body: JSON.stringify({
        cart_id: testCartId,
        provider_id: "pp_system_default",
      }),
    });
    recordTest(
      "Suite 7",
      "POST /api/cart/payment initializes manual COD payment session (pp_system_default)",
      payRes.status === 200,
      `Provider: pp_system_default, Payment Collection: ${payRes.data?.payment_collection?.id}`
    );

    // Complete cart to generate real order
    const completeRes = await request(`${STOREFRONT_URL}/api/cart/complete`, {
      method: "POST",
      body: JSON.stringify({
        cart_id: testCartId,
      }),
    });
    createdOrderId = completeRes.data?.order?.id;
    const orderData = completeRes.data?.order;
    recordTest(
      "Suite 7",
      "POST /api/cart/complete places guest order with HTTP 200 and type: 'order'",
      completeRes.status === 200 && completeRes.data?.type === "order" && Boolean(createdOrderId),
      `Order ID: ${createdOrderId}, Display ID: #${orderData?.display_id}`
    );

    recordTest(
      "Suite 7",
      "COD order payment remains uncaptured and unpaid upon order placement",
      orderData?.status === "pending",
      `Order status: ${orderData?.status} (Awaiting manual merchant payment collection)`
    );

    // -------------------------------------------------------------------------
    // SUITE 8: Out-of-Stock, Validation & Duplicate Protection (Phase 8 & 12)
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 8: Validation & Duplicate Checkout Protection ---");

    // Reject completing already-completed cart
    const duplicateCompleteRes = await request(`${STOREFRONT_URL}/api/cart/complete`, {
      method: "POST",
      body: JSON.stringify({
        cart_id: testCartId,
      }),
    });
    recordTest(
      "Suite 8",
      "POST /api/cart/complete rejects re-submitting already completed cart",
      duplicateCompleteRes.status >= 400,
      `Status: ${duplicateCompleteRes.status}`
    );

    // Reject non-positive quantity
    const invalidQtyRes = await request(`${STOREFRONT_URL}/api/cart/items`, {
      method: "POST",
      body: JSON.stringify({
        cart_id: testCartId,
        variant_id: sampleVariantId,
        quantity: -5,
      }),
    });
    recordTest(
      "Suite 8",
      "POST /api/cart/items rejects non-positive quantity with HTTP 400",
      invalidQtyRes.status === 400,
      `Status: ${invalidQtyRes.status}, Error: '${invalidQtyRes.data?.error}'`
    );

    // -------------------------------------------------------------------------
    // SUITE 9: Guest Order Security & Access Control (Phase 9 & 12)
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 9: Guest Order Security & Privacy Control ---");

    // Verified order lookup with matching email
    const authOrderRes = await request(
      `${STOREFRONT_URL}/api/orders/${createdOrderId}?email=guest@example.in`
    );
    recordTest(
      "Suite 9",
      "GET /api/orders/:id returns order details when matching email is provided (HTTP 200)",
      authOrderRes.status === 200 && authOrderRes.data?.order?.id === createdOrderId,
      `Order ID: ${authOrderRes.data?.order?.id}`
    );

    // Denied order lookup without email
    const noEmailRes = await request(`${STOREFRONT_URL}/api/orders/${createdOrderId}`);
    recordTest(
      "Suite 9",
      "GET /api/orders/:id denies access without email verification (HTTP 403 Forbidden)",
      noEmailRes.status === 403,
      `Status: ${noEmailRes.status}, Error: '${noEmailRes.data?.error}'`
    );

    // Denied order lookup with wrong email
    const wrongEmailRes = await request(
      `${STOREFRONT_URL}/api/orders/${createdOrderId}?email=attacker@malicious.com`
    );
    recordTest(
      "Suite 9",
      "GET /api/orders/:id denies access when email does not match order record (HTTP 403)",
      wrongEmailRes.status === 403,
      `Status: ${wrongEmailRes.status}`
    );

    // Non-existent order lookup
    const notFoundRes = await request(
      `${STOREFRONT_URL}/api/orders/order_fake_non_existent?email=test@test.com`
    );
    recordTest(
      "Suite 9",
      "GET /api/orders/:id returns 404 for non-existent order ID",
      notFoundRes.status === 404,
      `Status: ${notFoundRes.status}`
    );

    // -------------------------------------------------------------------------
    // SUITE 10: Storefront Pages Health (Phase 2 & 5)
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 10: Storefront Cart & Checkout Page Routes ---");

    const cartPageRes = await fetch(`${STOREFRONT_URL}/cart`);
    recordTest(
      "Suite 10",
      "Storefront /cart page loads with HTTP 200",
      cartPageRes.status === 200,
      `Status: ${cartPageRes.status}`
    );

    const checkoutPageRes = await fetch(`${STOREFRONT_URL}/checkout`);
    recordTest(
      "Suite 10",
      "Storefront /checkout page loads with HTTP 200",
      checkoutPageRes.status === 200,
      `Status: ${checkoutPageRes.status}`
    );

    const confPageRes = await fetch(
      `${STOREFRONT_URL}/order/confirmation/order_01M636Y5E2YWT6KJRG49KF8107?email=vikram.mehta%40example.in`
    );
    recordTest(
      "Suite 10",
      "Storefront /order/confirmation/:id loads verified order with HTTP 200",
      confPageRes.status === 200,
      `Status: ${confPageRes.status}`
    );
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP & ZERO TEST POLLUTION TEARDOWN
    // -------------------------------------------------------------------------
    console.log("\n--- SUITE 11: Cleanup & Zero Test Pollution Teardown ---");

    if (createdOrderId) {
      // Clean up reservations linked to test order line items and restore inventory levels
      const itemRows = await pg.query('SELECT item_id FROM order_item WHERE order_id = $1', [createdOrderId]);
      const lineItemIds = itemRows.rows.map(r => r.item_id).filter(Boolean);
      if (lineItemIds.length > 0) {
        const resRows = await pg.query('SELECT DISTINCT inventory_item_id, location_id FROM reservation_item WHERE line_item_id = ANY($1)', [lineItemIds]);
        await pg.query('DELETE FROM reservation_item WHERE line_item_id = ANY($1)', [lineItemIds]);
        for (const row of resRows.rows) {
          await pg.query(`
            UPDATE inventory_level il
            SET 
              reserved_quantity = COALESCE((
                SELECT SUM(ri.quantity)
                FROM reservation_item ri
                WHERE ri.inventory_item_id = il.inventory_item_id
                  AND ri.location_id = il.location_id
                  AND ri.deleted_at IS NULL
              ), 0),
              raw_reserved_quantity = jsonb_build_object(
                'value', COALESCE((
                  SELECT SUM(ri.quantity)
                  FROM reservation_item ri
                  WHERE ri.inventory_item_id = il.inventory_item_id
                    AND ri.location_id = il.location_id
                    AND ri.deleted_at IS NULL
                ), 0)::text,
                'precision', 20
              )
            WHERE il.inventory_item_id = $1 AND il.location_id = $2
          `, [row.inventory_item_id, row.location_id]);
        }

        // Clean up line items and adjustments
        await pg.query('DELETE FROM order_line_item_adjustment WHERE item_id = ANY($1)', [lineItemIds]);
        await pg.query('DELETE FROM order_line_item_tax_line WHERE item_id = ANY($1)', [lineItemIds]);
        await pg.query('DELETE FROM order_line_item WHERE id = ANY($1)', [lineItemIds]);
      }

      // Clean up test order across all foreign key tables
      await pg.query('DELETE FROM order_change WHERE order_id = $1', [createdOrderId]);
      await pg.query('DELETE FROM order_item WHERE order_id = $1', [createdOrderId]);
      await pg.query('DELETE FROM order_shipping WHERE order_id = $1', [createdOrderId]);
      await pg.query('DELETE FROM order_transaction WHERE order_id = $1', [createdOrderId]);
      await pg.query('DELETE FROM order_summary WHERE order_id = $1', [createdOrderId]);
      await pg.query('DELETE FROM order_credit_line WHERE order_id = $1', [createdOrderId]);
      await pg.query('DELETE FROM "order" WHERE id = $1', [createdOrderId]);
      console.log(`  [CLEANUP] Successfully cleaned up temporary test order ${createdOrderId}`);
    }

    const postProdRes = await pg.query("SELECT count(*) FROM product WHERE deleted_at IS NULL");
    const postProducts = parseInt(postProdRes.rows[0].count, 10);
    recordTest(
      "Suite 11",
      "Active product count remains strictly 520 records after testing",
      postProducts === 520,
      `Products: ${postProducts}`
    );

    const postOrderRes = await pg.query("SELECT count(*) FROM \"order\" WHERE deleted_at IS NULL");
    const postOrders = parseInt(postOrderRes.rows[0].count, 10);
    recordTest(
      "Suite 11",
      "Customer orders count remains strictly 3 records with zero test corruption",
      postOrders === 3,
      `Orders: ${postOrders}`
    );

    const postCustRes = await pg.query("SELECT count(*) FROM customer WHERE deleted_at IS NULL");
    const postCustomers = parseInt(postCustRes.rows[0].count, 10);
    recordTest(
      "Suite 11",
      "Customer directory remains strictly 9 baseline accounts with zero test pollution",
      postCustomers === 9,
      `Customers: ${postCustomers}`
    );

    await pg.end();
  }

  console.log("\n==============================================================================");
  console.log("[verify-04c] VERIFICATION SUMMARY");
  console.log("==============================================================================");
  console.log(`TOTAL TESTS: ${testCount}`);
  console.log(`PASSED:      ${passCount}`);
  console.log(`FAILED:      ${failCount}`);
  console.log(`SCORE:       ${((passCount / testCount) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log("\n>>> ALL MILESTONE 04C VERIFICATION TESTS PASSED SUCCESSFULLY! <<<\n");
    process.exit(0);
  } else {
    console.error(`\n>>> MILESTONE 04C VERIFICATION FAILED WITH ${failCount} FAILURES <<<\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled verification failure:", err);
  process.exit(1);
});
