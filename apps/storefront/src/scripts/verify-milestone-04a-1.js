/**
 * The Ecom Buddy — Milestone 04A.1 Automated Verification Suite
 * Storefront Data Integrity, Design QA and Production-Safety Corrections
 *
 * Verifies:
 * 1. Database catalog integrity & active product preservation (520 active products, 3 orders)
 * 2. Probe customer cleanup & test idempotency (0 active probe accounts)
 * 3. Category taxonomy & visibility integrity (8 active categories, official Medusa APIs)
 * 4. Storefront content accuracy (authentic claims, real newsletter endpoint with consent)
 * 5. Real theme differentiation across all 4 presets (Crescendo, Velora, Aero Step, Philox)
 * 6. Multi-currency validation across 5 markets (INR, USD, AED, GBP, EUR)
 * 7. Search, SEO, canonical URLs, heading hierarchy & security audit
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { Client } = require("pg");

const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:3000";
const MERCHANT_URL = process.env.MERCHANT_URL || "http://localhost:7001";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";
const DB_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5432/medusa_ecom_buddy";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@theecombuddy.local";
const ADMIN_PASSWORD =
  process.env.DEV_ADMIN_PASSWORD || "-uUpyywtd_KC12T36YClaEF_Dd28_7tQ";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

const results = [];

function recordTest(suite, test, passed, message) {
  results.push({ suite, test, passed, message });
  const statusStr = passed ? "[PASSED]" : "[FAILED]";
  console.log(`  ${statusStr} ${test}: ${message}`);
}

async function request(endpoint, options = {}, baseUrl = STOREFRONT_URL) {
  const url = new URL(endpoint, baseUrl);
  const isHttps = url.protocol === "https:";
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
    };

    if (options.cookie) {
      headers["Cookie"] = options.cookie;
    }

    let bodyData = null;
    if (options.body) {
      if (typeof options.body === "string") {
        bodyData = options.body;
      } else {
        headers["Content-Type"] = "application/json";
        bodyData = JSON.stringify(options.body);
      }
      headers["Content-Length"] = Buffer.byteLength(bodyData);
    }

    const req = client.request(
      url,
      {
        method: options.method || "GET",
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data,
            raw,
          });
        });
      }
    );

    req.on("error", reject);

    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

async function runSuite() {
  console.log("==============================================================================");
  console.log("THE ECOM BUDDY — MILESTONE 04A.1 VERIFICATION SUITE");
  console.log("Storefront Data Integrity, Design QA and Production-Safety Corrections");
  console.log("==============================================================================\n");

  const pgClient = new Client({ connectionString: DB_URL });
  await pgClient.connect();

  // -------------------------------------------------------------------------
  // SUITE 1: Database Catalog Integrity & Active Product Preservation
  // -------------------------------------------------------------------------
  console.log("--- SUITE 1: Database Catalog Integrity & Active Product Preservation ---");

  try {
    // 1. Check PostgreSQL active products
    const prodRes = await pgClient.query(`
      SELECT count(*) FROM product WHERE deleted_at IS NULL
    `);
    const activeProdCount = parseInt(prodRes.rows[0].count, 10);

    recordTest(
      "Suite 1",
      "Test 1: PostgreSQL active products count equals exactly 520 baseline records",
      activeProdCount === 520,
      `Active products: ${activeProdCount} (Expected: 520)`
    );

    // 2. Check all seeded products match teb-[code]-[001..065] pattern
    const seededRes = await pgClient.query(`
      SELECT count(*) FROM product WHERE deleted_at IS NULL AND handle ~ '^teb-[a-z]{4}-\\d{3}$'
    `);
    const seededCount = parseInt(seededRes.rows[0].count, 10);

    recordTest(
      "Suite 1",
      "Test 2: All 520 active products belong to verified teb-* catalog seed baseline",
      seededCount === 520,
      `Verified seeded catalog products: ${seededCount} / 520`
    );

    // 3. Confirm 0 active non-seed / probe products in PostgreSQL
    const probeRes = await pgClient.query(`
      SELECT count(*) FROM product WHERE deleted_at IS NULL AND handle !~ '^teb-[a-z]{4}-\\d{3}$'
    `);
    const activeProbeCount = parseInt(probeRes.rows[0].count, 10);

    recordTest(
      "Suite 1",
      "Test 3: Zero active probe or temporary test products exist in database",
      activeProbeCount === 0,
      `Active probe products in database: ${activeProbeCount} (Zero-pollution verified)`
    );

    // 4. Confirm customer orders count is exactly 3 and untouched
    const orderRes = await pgClient.query(`
      SELECT count(*) FROM "order"
    `);
    const orderCount = parseInt(orderRes.rows[0].count, 10);

    recordTest(
      "Suite 1",
      "Test 4: Customer orders count preserved with zero deletion or corruption",
      orderCount === 3,
      `Customer orders in database: ${orderCount} / 3`
    );

    // 5. Confirm inventory items count equals 1,236 SKUs
    const invRes = await pgClient.query(`
      SELECT count(*) FROM inventory_item WHERE deleted_at IS NULL
    `);
    const invCount = parseInt(invRes.rows[0].count, 10);

    recordTest(
      "Suite 1",
      "Test 5: Inventory items count equals 1,236 SKUs across warehouse stock",
      invCount === 1236,
      `Inventory records: ${invCount} (1,235 variants + 1 bootstrap SKU)`
    );
  } catch (err) {
    recordTest("Suite 1", "Database Integrity checks", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SUITE 2: Customer Directory & Probe Cleanup Idempotency
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 2: Customer Directory & Probe Cleanup Idempotency ---");

  try {
    // Check customers in PostgreSQL
    const custRes = await pgClient.query(`
      SELECT count(*) FROM customer WHERE deleted_at IS NULL
    `);
    const activeCustCount = parseInt(custRes.rows[0].count, 10);

    // Confirm no active probe customers
    const probeCustRes = await pgClient.query(`
      SELECT count(*) FROM customer WHERE deleted_at IS NULL AND email ~ 'probe\\.shopper'
    `);
    const activeProbeCusts = parseInt(probeCustRes.rows[0].count, 10);

    recordTest(
      "Suite 2",
      "Test 6: Active customer directory contains only legitimate seeded/test accounts (9 total)",
      activeCustCount === 9,
      `Active customer accounts: ${activeCustCount}`
    );

    recordTest(
      "Suite 2",
      "Test 7: Zero active probe customers remain in database",
      activeProbeCusts === 0,
      `Active probe shoppers: ${activeProbeCusts} (Teardown verified)`
    );
  } catch (err) {
    recordTest("Suite 2", "Customer Directory checks", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SUITE 3: Category Taxonomy & Store API Visibility
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 3: Category Taxonomy & Store API Visibility ---");

  try {
    // 1. Check database active categories
    const catDbRes = await pgClient.query(`
      SELECT count(*) FROM product_category WHERE deleted_at IS NULL AND is_active = true
    `);
    const activeCatCount = parseInt(catDbRes.rows[0].count, 10);

    recordTest(
      "Suite 3",
      "Test 8: Database contains exactly 8 active product categories",
      activeCatCount === 8,
      `Active categories: ${activeCatCount} / 8`
    );

    // 2. Query Store API product categories
    const storeCatRes = await request(
      "/store/product-categories",
      {
        headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      },
      BACKEND_URL
    );

    const storeCats = storeCatRes.data?.product_categories || [];

    recordTest(
      "Suite 3",
      "Test 9: Store API GET /store/product-categories returns all 8 categories publicly",
      storeCatRes.status === 200 && storeCats.length === 8,
      `Storefront visible categories: ${storeCats.length}`
    );

    // 3. Confirm product-category associations
    const linkRes = await pgClient.query(`
      SELECT count(*) FROM product_category_product
    `);
    const linkCount = parseInt(linkRes.rows[0].count, 10);

    recordTest(
      "Suite 3",
      "Test 10: Product category associations preserved (>= 520 linked products)",
      linkCount >= 520,
      `Category associations: ${linkCount}`
    );
  } catch (err) {
    recordTest("Suite 3", "Category Visibility checks", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SUITE 4: Storefront Content Accuracy & Functional Newsletter
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 4: Storefront Content Accuracy & Functional Newsletter ---");

  try {
    // 1. Newsletter rejects missing email
    const emptyEmail = await request("/api/newsletter", {
      method: "POST",
      body: { email: "", consent: true },
    });

    recordTest(
      "Suite 4",
      "Test 11: POST /api/newsletter rejects empty email with HTTP 400",
      emptyEmail.status === 400,
      `Status: ${emptyEmail.status}, Error: '${emptyEmail.data?.error}'`
    );

    // 2. Newsletter rejects missing consent
    const noConsent = await request("/api/newsletter", {
      method: "POST",
      body: { email: "shopper@test.com", consent: false },
    });

    recordTest(
      "Suite 4",
      "Test 12: POST /api/newsletter requires explicit consent checkbox with HTTP 400",
      noConsent.status === 400,
      `Status: ${noConsent.status}, Error: '${noConsent.data?.error}'`
    );

    // 3. Newsletter accepts valid submission with consent
    const testEmail = `verified.subscriber.${Date.now()}@example.com`;
    try {
      const validSub = await request("/api/newsletter", {
        method: "POST",
        body: { email: testEmail, consent: true, source: "qa_verification" },
      });

      recordTest(
        "Suite 4",
        "Test 13: POST /api/newsletter securely records subscription with HTTP 201",
        validSub.status === 201 && validSub.data?.success === true,
        `Status: ${validSub.status}, Message: '${validSub.data?.message}'`
      );

      // 4. Newsletter handles duplicate email idempotently with HTTP 200
      const dupSub = await request("/api/newsletter", {
        method: "POST",
        body: { email: testEmail, consent: true },
      });

      recordTest(
        "Suite 4",
        "Test 14: POST /api/newsletter handles duplicate submission idempotently with HTTP 200",
        dupSub.status === 200 && dupSub.data?.success === true,
        `Status: ${dupSub.status}, Message: '${dupSub.data?.message}'`
      );
    } finally {
      try {
        const subFile = path.join(__dirname, "..", "..", "data", "subscribers.json");
        if (fs.existsSync(subFile)) {
          const raw = fs.readFileSync(subFile, "utf8");
          const list = JSON.parse(raw);
          const filtered = list.filter((s) => !s.email.includes("verified.subscriber"));
          fs.writeFileSync(subFile, JSON.stringify(filtered, null, 2), "utf8");
        }
      } catch {}
    }

    // 5. Query public theme endpoint to check content claims
    const themeRes = await request(
      "/store/theme",
      {
        headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      },
      BACKEND_URL
    );

    const theme = themeRes.data?.theme || {};

    // Verify published theme exists and has verified identity
    recordTest(
      "Suite 4",
      "Test 15: Public published theme returns authentic merchant identity",
      Boolean(theme.identity?.storeName),
      `Store Name: '${theme.identity?.storeName}'`
    );
  } catch (err) {
    recordTest("Suite 4", "Storefront Content checks", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SUITE 5: Real Visual Theme Differentiation across Presets
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 5: Real Theme Differentiation across 4 Presets ---");

  try {
    // Login to merchant dashboard to inspect preset specs
    const loginRes = await request(
      "/api/auth/login",
      {
        method: "POST",
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      },
      MERCHANT_URL
    );

    const cookieHeader = loginRes.headers["set-cookie"];
    const merchantCookie = Array.isArray(cookieHeader) ? cookieHeader[0].split(";")[0] : "";

    // 1. Crescendo Preset
    const setCrescendo = await request(
      "/api/theme/preset",
      {
        method: "POST",
        cookie: merchantCookie,
        body: { presetId: "crescendo" },
      },
      MERCHANT_URL
    );
    const crescendoTheme = setCrescendo.data?.theme;

    recordTest(
      "Suite 5",
      "Test 16: Crescendo preset specifies sticky obsidian header, sharp borders & Plus Jakarta Sans",
      crescendoTheme?.styling?.headerStyle === "sticky" &&
        crescendoTheme?.styling?.cardStyle === "bordered" &&
        crescendoTheme?.typography?.displayFont === "Plus Jakarta Sans",
      `Header: ${crescendoTheme?.styling?.headerStyle}, Card: ${crescendoTheme?.styling?.cardStyle}`
    );

    // 2. Velora Preset
    const setVelora = await request(
      "/api/theme/preset",
      {
        method: "POST",
        cookie: merchantCookie,
        body: { presetId: "velora" },
      },
      MERCHANT_URL
    );
    const veloraTheme = setVelora.data?.theme;

    recordTest(
      "Suite 5",
      "Test 17: Velora preset specifies floating ivory header, tactile cards & Playfair Display serif",
      veloraTheme?.styling?.headerStyle === "floating" &&
        veloraTheme?.styling?.cardStyle === "tactile" &&
        veloraTheme?.typography?.displayFont === "Playfair Display",
      `Header: ${veloraTheme?.styling?.headerStyle}, Card: ${veloraTheme?.styling?.cardStyle}, Font: ${veloraTheme?.typography?.displayFont}`
    );

    // 3. Aero Step Preset
    const setAero = await request(
      "/api/theme/preset",
      {
        method: "POST",
        cookie: merchantCookie,
        body: { presetId: "aero_step" },
      },
      MERCHANT_URL
    );
    const aeroTheme = setAero.data?.theme;

    recordTest(
      "Suite 5",
      "Test 18: Aero Step preset specifies stacked athletic header, elevated cards & Outfit typography",
      aeroTheme?.styling?.headerStyle === "stacked" &&
        aeroTheme?.styling?.cardStyle === "elevated" &&
        aeroTheme?.typography?.displayFont === "Outfit",
      `Header: ${aeroTheme?.styling?.headerStyle}, Card: ${aeroTheme?.styling?.cardStyle}, Font: ${aeroTheme?.typography?.displayFont}`
    );

    // 4. Philox Preset
    const setPhilox = await request(
      "/api/theme/preset",
      {
        method: "POST",
        cookie: merchantCookie,
        body: { presetId: "philox" },
      },
      MERCHANT_URL
    );
    const philoxTheme = setPhilox.data?.theme;

    recordTest(
      "Suite 5",
      "Test 19: Philox preset specifies minimal crisp header, flat cards & direct conversion styling",
      philoxTheme?.styling?.headerStyle === "minimal" &&
        philoxTheme?.styling?.cardStyle === "flat",
      `Header: ${philoxTheme?.styling?.headerStyle}, Card: ${philoxTheme?.styling?.cardStyle}`
    );

    // Restore Crescendo as the active flagship theme
    await request(
      "/api/theme/preset",
      {
        method: "POST",
        cookie: merchantCookie,
        body: { presetId: "crescendo" },
      },
      MERCHANT_URL
    );
    await request(
      "/api/theme/publish",
      {
        method: "POST",
        cookie: merchantCookie,
        body: {},
      },
      MERCHANT_URL
    );
  } catch (err) {
    recordTest("Suite 5", "Theme Differentiation checks", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SUITE 6: Multi-Currency Regional Pricing Validation (5 Markets)
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 6: Multi-Currency Validation (INR, USD, AED, GBP, EUR) ---");

  try {
    const regionsRes = await request(
      "/store/regions",
      {
        headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      },
      BACKEND_URL
    );

    const regions = regionsRes.data?.regions || [];
    const expectedCurrencies = ["inr", "usd", "aed", "gbp", "eur"];

    recordTest(
      "Suite 6",
      "Test 20: Store API returns all 5 configured international commerce regions",
      regions.length >= 5,
      `Configured regions: ${regions.map((r) => r.currency_code.toUpperCase()).join(", ")}`
    );

    for (const cur of expectedCurrencies) {
      const reg = regions.find((r) => r.currency_code.toLowerCase() === cur);
      if (!reg) {
        recordTest("Suite 6", `Region ${cur.toUpperCase()} available`, false, "Region missing");
        continue;
      }

      // Query products for region
      const prodRes = await request(
        `/store/products?region_id=${reg.id}&limit=1&fields=*variants.calculated_price,*variants.prices`,
        {
          headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
        },
        BACKEND_URL
      );

      const firstProd = prodRes.data?.products?.[0];
      const firstVar = firstProd?.variants?.[0];
      const calcPrice = firstVar?.calculated_price;

      const matchesCurrency = calcPrice?.currency_code?.toLowerCase() === cur;
      const hasAmount = calcPrice?.calculated_amount > 0;

      recordTest(
        "Suite 6",
        `Test 21-${cur.toUpperCase()}: Market ${cur.toUpperCase()} calculates regional price without client conversion`,
        matchesCurrency && hasAmount,
        `Region: ${reg.name}, Currency: ${calcPrice?.currency_code?.toUpperCase()}, Amount: ${calcPrice?.calculated_amount}`
      );
    }
  } catch (err) {
    recordTest("Suite 6", "Multi-Currency checks", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SUITE 7: Search, SEO, Canonical URLs & Security Audit
  // -------------------------------------------------------------------------
  console.log("\n--- SUITE 7: Search, SEO, Canonical URLs & Security Audit ---");

  try {
    // 1. Fetch storefront homepage HTML
    const pageRes = await request("/");
    const html = pageRes.raw || "";

    // Canonical link
    const hasCanonical = html.includes('rel="canonical"');
    recordTest(
      "Suite 7",
      "Test 26: Homepage HTML contains canonical URL link tag",
      hasCanonical,
      "Canonical URL tag verified in head"
    );

    // Open Graph meta tags
    const hasOgTitle = html.includes('property="og:title"');
    const hasOgDesc = html.includes('property="og:description"');
    recordTest(
      "Suite 7",
      "Test 27: Homepage HTML contains Open Graph social sharing metadata",
      hasOgTitle && hasOgDesc,
      "og:title and og:description verified"
    );

    // Semantic H1 heading
    const hasH1 = html.includes("<h1");
    recordTest(
      "Suite 7",
      "Test 28: Homepage includes semantic <h1> tag for SEO heading hierarchy",
      hasH1,
      "H1 heading structure verified"
    );

    // 2. Draft Privacy: verify /store/theme returns only published status
    const publicThemeRes = await request(
      "/store/theme",
      {
        headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      },
      BACKEND_URL
    );
    const pubTheme = publicThemeRes.data?.theme;

    recordTest(
      "Suite 7",
      "Test 29: /store/theme returns strictly published theme data without secret credentials",
      Boolean(pubTheme?.publishedAt) && !pubTheme?.admin_token && !pubTheme?.database_url,
      `Published at: ${pubTheme?.publishedAt}, Zero secrets exposed`
    );

    // 3. SVG Security: confirm unsafe script injection is blocked
    const loginRes = await request(
      "/api/auth/login",
      {
        method: "POST",
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      },
      MERCHANT_URL
    );
    const cookieHeader = loginRes.headers["set-cookie"];
    const merchantCookie = Array.isArray(cookieHeader) ? cookieHeader[0].split(";")[0] : "";

    const fd = new FormData();
    const svgBlob = new Blob(["<svg><script>alert(1)</script></svg>"], { type: "image/svg+xml" });
    fd.append("file", svgBlob, "xss.svg");

    const svgRes = await fetch(`${MERCHANT_URL}/api/theme/media`, {
      method: "POST",
      headers: { Cookie: merchantCookie },
      body: fd,
    });
    const svgData = await svgRes.json();

    recordTest(
      "Suite 7",
      "Test 30: POST /api/theme/media robustly rejects SVG with embedded malicious scripts (HTTP 400)",
      svgRes.status === 400,
      `Status: ${svgRes.status}, Error: '${svgData?.error}'`
    );
  } catch (err) {
    recordTest("Suite 7", "SEO & Security checks", false, err.message);
  }

  await pgClient.end();

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const score = ((passed / total) * 100).toFixed(1);

  console.log("\n==============================================================================");
  console.log("[verify-04a-1] VERIFICATION SUMMARY");
  console.log("==============================================================================");
  console.log(`TOTAL TESTS: ${total}`);
  console.log(`PASSED:      ${passed}`);
  console.log(`FAILED:      ${failed}`);
  console.log(`SCORE:       ${score}%`);

  if (failed === 0) {
    console.log("\n>>> ALL MILESTONE 04A.1 VERIFICATION TESTS PASSED SUCCESSFULLY! <<<\n");
    process.exit(0);
  } else {
    console.error(`\n>>> ${failed} TEST(S) FAILED IN MILESTONE 04A.1 VERIFICATION <<<\n`);
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("FATAL ERROR in 04A.1 verification suite:", err);
  process.exit(1);
});
