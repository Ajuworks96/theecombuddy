const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { Pool } = require("pg");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOTS_DIR = path.join(process.cwd(), "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const STOREFRONT_URL = "http://localhost:3000";
const BACKEND_URL = "http://localhost:9000";
const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/medusa_ecom_buddy";

const pg = new Pool({ connectionString: DATABASE_URL });

const TEST_EMAIL = "vikram.mehta@example.in";
const TEST_PASSWORD = "Password123!@#";
const ORDER_ID = "order_01M636Y5E2YWT6KJRG49KF8107";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ChromeController {
  constructor(port = 9222) {
    this.port = port;
    this.chromeProcess = null;
    this.tmpDir = null;
  }

  async start() {
    this.tmpDir = path.join(os.tmpdir(), "chrome-04d-" + Date.now());
    this.chromeProcess = spawn(CHROME_PATH, [
      "--headless",
      "--disable-gpu",
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${this.tmpDir}`,
    ]);

    await wait(2000);
    console.log(`Chrome headless started on port ${this.port}`);
  }

  async capturePage(url, outputPath, width, height, isMobile = false, cookie = null) {
    console.log(`Capturing ${path.basename(outputPath)} (${width}x${height}${isMobile ? " mobile" : ""}) -> ${url}...`);

    const newTabRes = await fetch(`http://127.0.0.1:${this.port}/json/new`, { method: "PUT" });
    const tab = await newTabRes.json();

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve) => (ws.onopen = resolve));

    let msgId = 1;
    function send(method, params = {}) {
      const id = msgId++;
      return new Promise((resolve) => {
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === id) {
            ws.removeEventListener("message", handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    if (cookie) {
      await send("Network.enable");
      await send("Network.setCookie", {
        name: "teb_customer_token",
        value: cookie,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      });
    }

    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: isMobile ? 2 : 1,
      mobile: isMobile,
    });

    await send("Page.enable");
    await send("Page.navigate", { url });

    // Wait for page rendering and client-side data fetching
    await wait(3500);

    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    const buf = Buffer.from(screenshot.data, "base64");
    fs.writeFileSync(outputPath, buf);

    console.log(`  -> Saved ${path.basename(outputPath)} (${buf.length} bytes)`);

    ws.close();
    await fetch(`http://127.0.0.1:${this.port}/json/close/${tab.id}`, { method: "PUT" }).catch(() => {});
  }

  async stop() {
    if (this.chromeProcess) {
      this.chromeProcess.kill();
      this.chromeProcess = null;
    }
  }
}

async function main() {
  console.log("==============================================================================");
  console.log("THE ECOM BUDDY — MILESTONE 04D VISUAL SCREENSHOT SUITE");
  console.log("Customer Accounts, Order History, Address Book and Order Tracking");
  console.log("==============================================================================\n");

  let customerToken = null;
  let createdCustomerId = null;
  let authIdentityId = null;
  let addedAddressId = null;

  try {
    // 1. Register or Authenticate test customer vikram.mehta@example.in
    console.log(`Authenticating test customer ${TEST_EMAIL}...`);
    let authRes = await fetch(`${STOREFRONT_URL}/api/auth/customer/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    if (!authRes.ok) {
      console.log(`Customer not registered yet, calling register API...`);
      const regRes = await fetch(`${STOREFRONT_URL}/api/auth/customer/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          first_name: "Vikram",
          last_name: "Mehta",
          phone: "+919876543210",
        }),
      });

      const regData = await regRes.json();
      if (regData.customer && regData.customer.id) {
        createdCustomerId = regData.customer.id;
      }
      const setCookie = regRes.headers.get("set-cookie");
      if (setCookie) {
        const match = setCookie.match(/teb_customer_token=([^;]+)/);
        if (match) customerToken = match[1];
      }
    } else {
      const setCookie = authRes.headers.get("set-cookie");
      if (setCookie) {
        const match = setCookie.match(/teb_customer_token=([^;]+)/);
        if (match) customerToken = match[1];
      }
    }

    if (!customerToken) {
      throw new Error("Failed to obtain customerToken for authenticated QA session.");
    }
    console.log("Customer authenticated successfully. Session cookie acquired.\n");

    // 2. Add an address to ensure address book renders richly
    const addrRes = await fetch(`${STOREFRONT_URL}/api/account/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `teb_customer_token=${customerToken}`,
      },
      body: JSON.stringify({
        first_name: "Vikram",
        last_name: "Mehta",
        company: "Ecom Commerce Labs",
        address_1: "Flat 402, Sea Green Apartments",
        address_2: "Worli Sea Face",
        city: "Mumbai",
        province: "Maharashtra",
        postal_code: "400018",
        country_code: "in",
        phone: "+919876543210",
        is_default_shipping: true,
      }),
    });
    const addrData = await addrRes.json();
    if (addrData.address && addrData.address.id) {
      addedAddressId = addrData.address.id;
      console.log(`Saved primary shipping address: ${addedAddressId}\n`);
    }

    // 3. Start headless Chrome
    const controller = new ChromeController(9222);
    await controller.start();

    try {
      // 29. Customer Login Desktop
      await controller.capturePage(
        `${STOREFRONT_URL}/login`,
        path.join(SCREENSHOTS_DIR, "29-customer-login-desktop.png"),
        1440,
        900,
        false
      );

      // 30. Customer Login Mobile
      await controller.capturePage(
        `${STOREFRONT_URL}/login`,
        path.join(SCREENSHOTS_DIR, "30-customer-login-mobile.png"),
        390,
        844,
        true
      );

      // 31. Customer Register Desktop
      await controller.capturePage(
        `${STOREFRONT_URL}/register`,
        path.join(SCREENSHOTS_DIR, "31-customer-register-desktop.png"),
        1440,
        900,
        false
      );

      // 32. Customer Register Mobile
      await controller.capturePage(
        `${STOREFRONT_URL}/register`,
        path.join(SCREENSHOTS_DIR, "32-customer-register-mobile.png"),
        390,
        844,
        true
      );

      // 33. Account Dashboard Desktop (Authenticated)
      await controller.capturePage(
        `${STOREFRONT_URL}/account`,
        path.join(SCREENSHOTS_DIR, "33-account-dashboard-desktop.png"),
        1440,
        900,
        false,
        customerToken
      );

      // 34. Account Order History Desktop (Authenticated)
      await controller.capturePage(
        `${STOREFRONT_URL}/account/orders`,
        path.join(SCREENSHOTS_DIR, "34-account-orders-history-desktop.png"),
        1440,
        900,
        false,
        customerToken
      );

      // 35. Account Order Tracking Detail Desktop (Authenticated)
      await controller.capturePage(
        `${STOREFRONT_URL}/account/orders/${ORDER_ID}`,
        path.join(SCREENSHOTS_DIR, "35-account-order-tracking-desktop.png"),
        1440,
        900,
        false,
        customerToken
      );

      // 36. Account Order Tracking Detail Mobile (Authenticated)
      await controller.capturePage(
        `${STOREFRONT_URL}/account/orders/${ORDER_ID}`,
        path.join(SCREENSHOTS_DIR, "36-account-order-tracking-mobile.png"),
        390,
        844,
        true,
        customerToken
      );

      // 37. Account Addresses Desktop (Authenticated)
      await controller.capturePage(
        `${STOREFRONT_URL}/account/addresses`,
        path.join(SCREENSHOTS_DIR, "37-account-addresses-desktop.png"),
        1440,
        900,
        false,
        customerToken
      );

      // 38. Account Profile Desktop (Authenticated)
      await controller.capturePage(
        `${STOREFRONT_URL}/account/profile`,
        path.join(SCREENSHOTS_DIR, "38-account-profile-desktop.png"),
        1440,
        900,
        false,
        customerToken
      );

      console.log("\nAll 10 Milestone 04D browser screenshots captured successfully!");
    } finally {
      await controller.stop();
    }
  } finally {
    // Teardown: Clean up added address and provider identity to preserve database invariants
    console.log("\nCleaning up test artifacts...");
    if (addedAddressId) {
      await pg.query("DELETE FROM customer_address WHERE id = $1", [addedAddressId]);
      console.log(`  Purged added test address ${addedAddressId}`);
    }

    if (createdCustomerId) {
      await pg.query("DELETE FROM customer WHERE id = $1", [createdCustomerId]);
      console.log(`  Purged created test customer ${createdCustomerId}`);
    }

    // Remove auth identity for vikram.mehta@example.in so credentials don't linger
    await pg.query(
      "DELETE FROM auth_identity WHERE id IN (SELECT auth_identity_id FROM provider_identity WHERE entity_id = $1)",
      [TEST_EMAIL]
    );
    await pg.query("DELETE FROM provider_identity WHERE entity_id = $1", [TEST_EMAIL]);
    console.log(`  Purged auth identity for ${TEST_EMAIL}`);

    // Verify baseline invariants
    const custCount = await pg.query("SELECT count(*) FROM customer WHERE deleted_at IS NULL");
    const ordCount = await pg.query("SELECT count(*) FROM public.order WHERE deleted_at IS NULL");
    console.log(`  Active customer count: ${custCount.rows[0].count} (Baseline: 9)`);
    console.log(`  Active order count:    ${ordCount.rows[0].count} (Baseline: 3)`);

    await pg.end();
  }
}

main().catch((err) => {
  console.error("Fatal error in screenshot capture suite:", err);
  process.exit(1);
});

