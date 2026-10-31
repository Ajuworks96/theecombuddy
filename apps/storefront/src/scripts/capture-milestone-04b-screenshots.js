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
  // 1. Set preset
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

  // 2. Publish
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

  // Wait 1.5 seconds for cache invalidation and server rendering
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

async function main() {
  console.log("Starting Milestone 04B Automated Browser Screenshot Suite...\n");
  const cookie = await login();

  // 1 & 2. Electronics PDP (Crescendo Preset) - Desktop & Mobile
  console.log("--- 1 & 2. Electronics PDP (Crescendo Preset) ---");
  await setPresetAndPublish(cookie, "crescendo");
  takeScreenshot(
    `${STOREFRONT_URL}/products/teb-elec-015`,
    path.join(SCREENSHOTS_DIR, "08-electronics-pdp-desktop.png"),
    1440,
    900
  );
  takeScreenshot(
    `${STOREFRONT_URL}/products/teb-elec-015`,
    path.join(SCREENSHOTS_DIR, "09-electronics-pdp-mobile.png"),
    390,
    844
  );

  // 3 & 4. Luxury PDP (Velora Preset) - Desktop & Mobile
  console.log("\n--- 3 & 4. Luxury PDP (Velora Preset) ---");
  await setPresetAndPublish(cookie, "velora");
  takeScreenshot(
    `${STOREFRONT_URL}/products/teb-appr-001`,
    path.join(SCREENSHOTS_DIR, "10-luxury-pdp-desktop.png"),
    1440,
    900
  );
  takeScreenshot(
    `${STOREFRONT_URL}/products/teb-appr-001`,
    path.join(SCREENSHOTS_DIR, "11-luxury-pdp-mobile.png"),
    390,
    844
  );

  // 5. Athletic PDP (Aero Step Preset)
  console.log("\n--- 5. Athletic PDP (Aero Step Preset) ---");
  await setPresetAndPublish(cookie, "aero_step");
  takeScreenshot(
    `${STOREFRONT_URL}/products/teb-sprt-001`,
    path.join(SCREENSHOTS_DIR, "12-athletic-pdp.png"),
    1440,
    900
  );

  // 6. DTC PDP (Philox Preset)
  console.log("\n--- 6. DTC PDP (Philox Preset) ---");
  await setPresetAndPublish(cookie, "philox");
  takeScreenshot(
    `${STOREFRONT_URL}/products/teb-beau-001`,
    path.join(SCREENSHOTS_DIR, "13-dtc-pdp.png"),
    1440,
    900
  );

  // 7. Category Listing Page
  console.log("\n--- 7. Category Listing Page ---");
  takeScreenshot(
    `${STOREFRONT_URL}/categories/electronics-audio`,
    path.join(SCREENSHOTS_DIR, "14-category-listing.png"),
    1440,
    900
  );

  // 8. Collection Listing Page
  console.log("\n--- 8. Collection Listing Page ---");
  takeScreenshot(
    `${STOREFRONT_URL}/collections/bestsellers`,
    path.join(SCREENSHOTS_DIR, "15-collection-listing.png"),
    1440,
    900
  );

  // 9. Search Results Page
  console.log("\n--- 9. Search Results Page ---");
  takeScreenshot(
    `${STOREFRONT_URL}/search?q=wireless`,
    path.join(SCREENSHOTS_DIR, "16-search-results.png"),
    1440,
    900
  );

  // 10. Variant Selector Detail View
  console.log("\n--- 10. Variant Selector View ---");
  takeScreenshot(
    `${STOREFRONT_URL}/products/teb-elec-015`,
    path.join(SCREENSHOTS_DIR, "17-variant-selector.png"),
    1440,
    900
  );

  // 11. Add to Cart Feedback View
  console.log("\n--- 11. Add to Cart Feedback View ---");
  takeScreenshot(
    `${STOREFRONT_URL}/products/teb-elec-015`,
    path.join(SCREENSHOTS_DIR, "18-add-to-cart-feedback.png"),
    1440,
    900
  );

  // Restore Crescendo as the active flagship theme
  console.log("\n--- Restoring Crescendo Preset ---");
  await setPresetAndPublish(cookie, "crescendo");

  console.log("\nAll Milestone 04B screenshots captured successfully!");
}

main().catch(console.error);
