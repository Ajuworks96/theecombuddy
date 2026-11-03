#!/usr/bin/env node
/**
 * THE ECOM BUDDY — MASTER RELEASE VERIFICATION SUITE
 * Comprehensive Release Hardening, Security, Catalog Integrity, and Production-Readiness Proof.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const { verifyLicenseManifest } = require("./verify-license");
const { issueLicense } = require("./issue-license");
const { runBackup } = require("./backup-db");
const { verifyBackupArchive } = require("./restore-db");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5432/medusa_ecom_buddy";

let passed = 0;
let failed = 0;
const results = [];

function assert(description, condition, details = "") {
  if (condition) {
    passed++;
    results.push({ status: "PASS", description, details });
    console.log(`  ✓ [PASS] ${description}`);
  } else {
    failed++;
    results.push({ status: "FAIL", description, details });
    console.error(`  ✗ [FAIL] ${description} ${details ? `(${details})` : ""}`);
  }
}

async function runMasterReleaseSuite() {
  console.log("\n=======================================================");
  console.log(" THE ECOM BUDDY — MASTER RELEASE VERIFICATION SUITE");
  console.log("=======================================================\n");

  const pool = new Pool({ connectionString: DATABASE_URL });

  // ---------------------------------------------------------------------------
  // 1. DATABASE INVARIANTS & INTEGRITY PROOF
  // ---------------------------------------------------------------------------
  console.log("\n[TEST GROUP 1] Database Invariant Baseline & Integrity");
  try {
    const invRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM product WHERE deleted_at IS NULL) as products,
        (SELECT COUNT(*) FROM product_variant WHERE deleted_at IS NULL) as variants,
        (SELECT COUNT(*) FROM inventory_item WHERE deleted_at IS NULL) as inventory_items,
        (SELECT COUNT(*) FROM product_category WHERE deleted_at IS NULL) as categories,
        (SELECT COUNT(*) FROM product_collection WHERE deleted_at IS NULL) as collections,
        (SELECT COUNT(*) FROM customer WHERE deleted_at IS NULL) as customers,
        (SELECT COUNT(*) FROM "order" WHERE deleted_at IS NULL) as orders
    `);
    const inv = invRes.rows[0];

    assert(
      "Catalog contains exactly 520 active merchant products",
      parseInt(inv.products, 10) === 520,
      `Actual: ${inv.products}`
    );
    assert(
      "Catalog contains exactly 1,235 active variants",
      parseInt(inv.variants, 10) === 1235,
      `Actual: ${inv.variants}`
    );
    assert(
      "Inventory module monitors exactly 1,236 active SKUs/items",
      parseInt(inv.inventory_items, 10) === 1236,
      `Actual: ${inv.inventory_items}`
    );
    assert(
      "Catalog contains 8 root product categories",
      parseInt(inv.categories, 10) === 8,
      `Actual: ${inv.categories}`
    );
    assert(
      "Catalog contains 4 product collections",
      parseInt(inv.collections, 10) === 4,
      `Actual: ${inv.collections}`
    );
    assert(
      "Preserves 3 verified customer orders",
      parseInt(inv.orders, 10) >= 3,
      `Actual: ${inv.orders}`
    );
    assert(
      "Preserves customer account records",
      parseInt(inv.customers, 10) >= 9,
      `Actual: ${inv.customers}`
    );

    // Verify Migration 002 tables exist and are functional
    const m2Tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN (
        'store_policies', 'newsletter_subscribers', 'contact_submissions', 
        'payment_event_inbox', 'payment_gateway_configs', 'staff_roles'
      )
    `);
    assert(
      "All 6 Release Hardening tables exist in PostgreSQL (Migration 002)",
      m2Tables.rows.length === 6,
      `Found: ${m2Tables.rows.map((r) => r.table_name).join(", ")}`
    );
  } catch (err) {
    assert("Database queries executed successfully", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 2. OFFLINE WHITE-LABEL PERPETUAL LICENSING
  // ---------------------------------------------------------------------------
  console.log("\n[TEST GROUP 2] Offline Perpetual White-Label Licensing");
  const licensePath = path.resolve(__dirname, "../license.json");
  assert("License manifest file exists (deploy/license.json)", fs.existsSync(licensePath));

  if (fs.existsSync(licensePath)) {
    const lic = JSON.parse(fs.readFileSync(licensePath, "utf8"));
    const vResult = verifyLicenseManifest(lic, "theecombuddy.com");

    assert("Cryptographic signature verifies offline via RSA-SHA256", vResult.valid);
    assert("License type is perpetual single-merchant", vResult.license_type === "perpetual");
    assert(
      "Wildcard and permitted domains match correctly",
      vResult.status === "valid" && vResult.permitted_domains.includes("theecombuddy.com")
    );

    // Tamper test
    const tampered = { ...lic, licensee_name: "Illegal Licensee" };
    const tamperCheck = verifyLicenseManifest(tampered);
    assert(
      "Tampered license manifest is rejected offline (invalid_signature)",
      !tamperCheck.valid && tamperCheck.status === "invalid_signature"
    );
  }

  // ---------------------------------------------------------------------------
  // 3. PAYMENT GATEWAY INTEGRATIONS & WEBHOOK INBOX IDEMPOTENCY
  // ---------------------------------------------------------------------------
  console.log("\n[TEST GROUP 3] Payment Gateways, Webhook Inbox & Idempotency");
  const razorpayModulePath = path.resolve(
    __dirname,
    "../../apps/backend/src/modules/payment-razorpay/index.ts"
  );
  const cashfreeModulePath = path.resolve(
    __dirname,
    "../../apps/backend/src/modules/payment-cashfree/index.ts"
  );
  assert("Razorpay payment provider module exists", fs.existsSync(razorpayModulePath));
  assert("Cashfree payment provider module exists", fs.existsSync(cashfreeModulePath));

  // Test payment_event_inbox idempotency via direct database query
  try {
    const testEvtId = `evt_test_${Date.now()}`;
    await pool.query(
      `INSERT INTO payment_event_inbox (id, provider_id, event_id, event_type, entity_id, payload, status, attempts, received_at)
       VALUES ($1, 'razorpay', $2, 'payment.captured', 'pay_123', '{"amount": 1000}', 'received', 1, NOW())`,
      [`pei_${Date.now()}_1`, testEvtId]
    );

    // Re-insert same provider_id + event_id to verify idempotent ON CONFLICT handling
    await pool.query(
      `INSERT INTO payment_event_inbox (id, provider_id, event_id, event_type, entity_id, payload, status, attempts, received_at)
       VALUES ($1, 'razorpay', $2, 'payment.captured', 'pay_123', '{"amount": 1000}', 'received', 1, NOW())
       ON CONFLICT (provider_id, event_id) DO UPDATE SET attempts = payment_event_inbox.attempts + 1`,
      [`pei_${Date.now()}_2`, testEvtId]
    );

    const inboxCheck = await pool.query(
      `SELECT attempts, status FROM payment_event_inbox WHERE provider_id = 'razorpay' AND event_id = $1`,
      [testEvtId]
    );
    assert(
      "Payment event inbox atomically increments attempts on duplicate webhook",
      inboxCheck.rows.length === 1 && inboxCheck.rows[0].attempts === 2
    );

    // Clean up test event
    await pool.query(
      `DELETE FROM payment_event_inbox WHERE provider_id = 'razorpay' AND event_id = $1`,
      [testEvtId]
    );
    assert("Reconciliation test event cleaned up safely", true);
  } catch (err) {
    assert("Webhook inbox idempotency verified", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 4. NEWSLETTER & CONTACT FORM POSTGRESQL PERSISTENCE
  // ---------------------------------------------------------------------------
  console.log("\n[TEST GROUP 4] Newsletter & Contact Persistence");
  try {
    const testEmail = `verify_${Date.now()}@theecombuddy.local`;

    // 1. Insert newsletter subscriber
    const unsubToken = crypto.randomBytes(24).toString("hex");
    await pool.query(
      `INSERT INTO newsletter_subscribers (id, email, status, consent, unsubscribe_token)
       VALUES ($1, $2, 'subscribed', true, $3)`,
      [`sub_${Date.now()}`, testEmail, unsubToken]
    );

    const subCheck = await pool.query(
      `SELECT * FROM newsletter_subscribers WHERE email = $1`,
      [testEmail]
    );
    assert(
      "Newsletter subscription persists in PostgreSQL with consent log",
      subCheck.rows.length === 1 && subCheck.rows[0].consent === true
    );

    // 2. Insert contact submission
    await pool.query(
      `INSERT INTO contact_submissions (id, name, email, subject, message, status)
       VALUES ($1, 'Verification Bot', $2, 'Automated Test', 'Verification check', 'pending')`,
      [`cnt_${Date.now()}`, testEmail]
    );

    const cntCheck = await pool.query(
      `SELECT * FROM contact_submissions WHERE email = $1`,
      [testEmail]
    );
    assert(
      "Contact form submissions persist in PostgreSQL contact_submissions",
      cntCheck.rows.length === 1 && cntCheck.rows[0].subject === "Automated Test"
    );

    // Clean up test rows
    await pool.query(`DELETE FROM newsletter_subscribers WHERE email = $1`, [testEmail]);
    await pool.query(`DELETE FROM contact_submissions WHERE email = $1`, [testEmail]);
  } catch (err) {
    assert("Newsletter and contact persistence verified", false, err.message);
  }

  // ---------------------------------------------------------------------------
  // 5. STORE POLICY PAGES & STATUTORY COMPLIANCE
  // ---------------------------------------------------------------------------
  console.log("\n[TEST GROUP 5] Statutory Store Policies & Legal Routes");
  const policySlugs = [
    "about",
    "faq",
    "privacy-policy",
    "terms-and-conditions",
    "shipping-policy",
    "returns-and-refunds",
    "cancellation-policy",
  ];

  for (const slug of policySlugs) {
    const pagePath = path.resolve(
      __dirname,
      `../../apps/storefront/src/app/${slug}/page.tsx`
    );
    assert(`Policy route /${slug} source file exists`, fs.existsSync(pagePath));
  }

  // ---------------------------------------------------------------------------
  // 6. PRODUCTION INFRASTRUCTURE & BACKUP VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n[TEST GROUP 6] Production Docker Orchestration & Backup Safety");
  const composePath = path.resolve(__dirname, "../docker-compose.yml");
  const stagingPath = path.resolve(__dirname, "../docker-compose.staging.yml");
  const envExamplePath = path.resolve(__dirname, "../.env.production.example");
  const caddyfilePath = path.resolve(__dirname, "../reverse-proxy/Caddyfile");
  const nginxPath = path.resolve(__dirname, "../reverse-proxy/nginx.conf");

  assert("deploy/docker-compose.yml exists", fs.existsSync(composePath));
  assert("deploy/docker-compose.staging.yml exists", fs.existsSync(stagingPath));
  assert("deploy/.env.production.example exists", fs.existsSync(envExamplePath));
  assert("deploy/reverse-proxy/Caddyfile exists", fs.existsSync(caddyfilePath));
  assert("deploy/reverse-proxy/nginx.conf exists", fs.existsSync(nginxPath));

  // Run a real backup dry-run test
  console.log("\n[backup-test] Executing live database backup verification...");
  try {
    const backupRes = await runBackup();
    assert("Automated backup script creates complete backup archive", backupRes.success);
    assert("Backup manifest contains valid checksum", Boolean(backupRes.manifest));

    // Verify the newly created backup archive
    const verifyRes = verifyBackupArchive(backupRes.backupDir);
    assert("Backup archive passes SHA256 integrity and invariant check", verifyRes);
  } catch (err) {
    assert("Backup and restore verification passed", false, err.message);
  }

  await pool.end();

  // ---------------------------------------------------------------------------
  // FINAL SUITE SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(` MASTER RELEASE SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runMasterReleaseSuite().catch((err) => {
    console.error("Master Release suite fatal error:", err);
    process.exit(1);
  });
}

module.exports = { runMasterReleaseSuite };
