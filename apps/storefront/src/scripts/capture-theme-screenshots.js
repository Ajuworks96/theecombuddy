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
const BASE_URL = "http://localhost:7001";
const STOREFRONT_URL = "http://localhost:3000";

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
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
  const presetRes = await fetch(`${BASE_URL}/api/theme/preset`, {
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
  const pubRes = await fetch(`${BASE_URL}/api/theme/publish`, {
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
      { timeout: 30000 }
    );
    const stat = fs.statSync(outputPath);
    console.log(`  -> Saved ${path.basename(outputPath)} (${stat.size} bytes)`);
  } catch (err) {
    console.error(`  -> Failed to capture ${outputPath}:`, err.message);
  }
}

async function main() {
  console.log("Starting automated theme screenshot suite...\n");
  const cookie = await login();

  // 1. Crescendo Electronics (Desktop & Mobile)
  console.log("--- 1. Preset: Crescendo Electronics ---");
  await setPresetAndPublish(cookie, "crescendo");
  takeScreenshot(`${STOREFRONT_URL}/`, path.join(SCREENSHOTS_DIR, "01-crescendo-desktop.png"), 1440, 900);
  takeScreenshot(`${STOREFRONT_URL}/`, path.join(SCREENSHOTS_DIR, "02-crescendo-mobile.png"), 390, 844);

  // 2. Velora Minimal Luxury (Desktop & Mobile)
  console.log("\n--- 2. Preset: Velora Minimal Luxury ---");
  await setPresetAndPublish(cookie, "velora");
  takeScreenshot(`${STOREFRONT_URL}/`, path.join(SCREENSHOTS_DIR, "03-velora-desktop.png"), 1440, 900);
  takeScreenshot(`${STOREFRONT_URL}/`, path.join(SCREENSHOTS_DIR, "04-velora-mobile.png"), 390, 844);

  // 3. Aero Step High Energy (Desktop)
  console.log("\n--- 3. Preset: Aero Step High Energy ---");
  await setPresetAndPublish(cookie, "aero_step");
  takeScreenshot(`${STOREFRONT_URL}/`, path.join(SCREENSHOTS_DIR, "05-aero-step-desktop.png"), 1440, 900);

  // 4. Philox DTC (Desktop)
  console.log("\n--- 4. Preset: Philox Direct-to-Consumer ---");
  await setPresetAndPublish(cookie, "philox");
  takeScreenshot(`${STOREFRONT_URL}/`, path.join(SCREENSHOTS_DIR, "06-philox-desktop.png"), 1440, 900);

  // 5. Merchant Preview vs Storefront comparison (Philox published)
  console.log("\n--- 5. Merchant Preview vs Storefront Parity ---");
  takeScreenshot(`${STOREFRONT_URL}/`, path.join(SCREENSHOTS_DIR, "07-storefront-published.png"), 1440, 900);

  // Revert back to Crescendo as the flagship store theme
  console.log("\n--- Restoring Default Flagship Theme (Crescendo) ---");
  await setPresetAndPublish(cookie, "crescendo");
  console.log("Restored Crescendo Electronics successfully.\n");

  const files = fs.readdirSync(SCREENSHOTS_DIR);
  console.log("Screenshots captured:");
  files.forEach((f) => {
    const size = fs.statSync(path.join(SCREENSHOTS_DIR, f)).size;
    console.log(`  ${f} (${(size / 1024).toFixed(1)} KB)`);
  });
}

main().catch(console.error);

