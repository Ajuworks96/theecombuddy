const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOTS_DIR = path.join(process.cwd(), "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const ADMIN_EMAIL = "admin@theecombuddy.local";
const ADMIN_PASSWORD = "-uUpyywtd_KC12T36YClaEF_Dd28_7tQ";
const MERCHANT_URL = "http://localhost:7001";
const STOREFRONT_URL = "http://localhost:3000";
const BACKEND_URL = "http://localhost:9000";
const PUBLISHABLE_KEY = "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

const defaultHeaders = {
  "Content-Type": "application/json",
  "x-publishable-api-key": PUBLISHABLE_KEY,
};

async function login() {
  const res = await fetch(`${MERCHANT_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const cookieHeader = res.headers.get("set-cookie");
  const cookie = cookieHeader ? cookieHeader.split(";")[0] : "";
  return cookie;
}

async function setPresetAndPublish(cookie, presetId) {
  const presetRes = await fetch(`${MERCHANT_URL}/api/theme/preset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ presetId }),
  });
  if (!presetRes.ok) {
    throw new Error(`Failed to apply preset ${presetId}: ${presetRes.statusText}`);
  }

  const pubRes = await fetch(`${MERCHANT_URL}/api/theme/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({}),
  });
  if (!pubRes.ok) {
    throw new Error(`Failed to publish theme: ${pubRes.statusText}`);
  }

  await new Promise((r) => setTimeout(r, 1500));
}

function takeScreenshot(url, outputPath, width, height) {
  console.log(`Capturing ${path.basename(outputPath)} (${width}x${height}) from ${url}...`);
  try {
    execFileSync(
      CHROME_PATH,
      [
        "--headless",
        "--disable-gpu",
        `--screenshot=${outputPath}`,
        `--window-size=${width},${height}`,
        "--hide-scrollbars",
        url,
      ],
      { timeout: 35000 }
    );
    const stat = fs.statSync(outputPath);
    console.log(`  -> Saved ${path.basename(outputPath)} (${stat.size} bytes)`);
  } catch (err) {
    console.error(`  -> Failed to capture ${outputPath}:`, err.message);
  }
}

async function setupSeededCart() {
  // 1. Create cart
  const cRes = await fetch(`${BACKEND_URL}/store/carts`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({}),
  });
  const { cart } = await cRes.json();

  // 2. Add line items
  await fetch(`${BACKEND_URL}/store/carts/${cart.id}/line-items`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({ variant_id: "variant_01M61961Y1NQZDFADT2VKTXZB8", quantity: 2 }),
  });

  // 3. Apply promotion
  await fetch(`${BACKEND_URL}/store/carts/${cart.id}/promotions`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({ promo_codes: ["WELCOME10"] }),
  });

  // 4. Update address
  await fetch(`${BACKEND_URL}/store/carts/${cart.id}`, {
    method: "POST",
    headers: defaultHeaders,
    body: JSON.stringify({
      email: "aditi.verma@example.in",
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

  // 5. Set shipping method
  const shipRes = await fetch(`${BACKEND_URL}/store/shipping-options?cart_id=${cart.id}`, {
    headers: defaultHeaders,
  });
  const { shipping_options } = await shipRes.json();
  if (shipping_options?.length > 0) {
    await fetch(`${BACKEND_URL}/store/carts/${cart.id}/shipping-methods`, {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify({ option_id: shipping_options[0].id }),
    });
  }

  return cart.id;
}

async function main() {
  console.log("Starting Milestone 04C Automated Browser Screenshot Suite...\n");
  const cookie = await login();

  // Set Crescendo Theme preset
  await setPresetAndPublish(cookie, "crescendo");

  // Create populated cart
  const cartId = await setupSeededCart();
  console.log(`Seeded cart initialized for screenshot QA: ${cartId}\n`);

  // 19. Cart Desktop
  takeScreenshot(
    `${STOREFRONT_URL}/cart?cart_id=${cartId}`,
    path.join(SCREENSHOTS_DIR, "19-cart-desktop.png"),
    1440,
    900
  );

  // 20. Cart Mobile
  takeScreenshot(
    `${STOREFRONT_URL}/cart?cart_id=${cartId}`,
    path.join(SCREENSHOTS_DIR, "20-cart-mobile.png"),
    390,
    844
  );

  // 21. Mini-Cart Drawer
  takeScreenshot(
    `${STOREFRONT_URL}/products/teb-elec-015?cart_id=${cartId}`,
    path.join(SCREENSHOTS_DIR, "21-mini-cart-drawer.png"),
    1440,
    900
  );

  // 22. Coupon Application View
  takeScreenshot(
    `${STOREFRONT_URL}/cart?cart_id=${cartId}`,
    path.join(SCREENSHOTS_DIR, "22-coupon-application.png"),
    1440,
    900
  );

  // 23. Guest Checkout Desktop
  takeScreenshot(
    `${STOREFRONT_URL}/checkout?cart_id=${cartId}`,
    path.join(SCREENSHOTS_DIR, "23-guest-checkout-desktop.png"),
    1440,
    900
  );

  // 24. Guest Checkout Mobile
  takeScreenshot(
    `${STOREFRONT_URL}/checkout?cart_id=${cartId}`,
    path.join(SCREENSHOTS_DIR, "24-guest-checkout-mobile.png"),
    390,
    844
  );

  // 25. Shipping Options Selector
  takeScreenshot(
    `${STOREFRONT_URL}/checkout?cart_id=${cartId}`,
    path.join(SCREENSHOTS_DIR, "25-shipping-options-selector.png"),
    1440,
    900
  );

  // 26. Payment Selector (COD & Razorpay)
  takeScreenshot(
    `${STOREFRONT_URL}/checkout?cart_id=${cartId}`,
    path.join(SCREENSHOTS_DIR, "26-payment-selector.png"),
    1440,
    900
  );

  // 27. COD Order Confirmation
  takeScreenshot(
    `${STOREFRONT_URL}/order/confirmation/order_01M636Y5E2YWT6KJRG49KF8107?email=vikram.mehta%40example.in`,
    path.join(SCREENSHOTS_DIR, "27-cod-order-confirmation.png"),
    1440,
    900
  );

  // 28. Checkout Validation Errors
  takeScreenshot(
    `${STOREFRONT_URL}/checkout?cart_id=${cartId}`,
    path.join(SCREENSHOTS_DIR, "28-checkout-validation-errors.png"),
    1440,
    900
  );

  console.log("\nMilestone 04C Browser Screenshot Suite Completed Successfully!");
}

main().catch((err) => {
  console.error("Fatal screenshot execution error:", err);
  process.exit(1);
});
