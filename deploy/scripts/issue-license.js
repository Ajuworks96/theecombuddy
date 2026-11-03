#!/usr/bin/env node
/**
 * THE ECOM BUDDY — Vendor License Generation Utility
 * Generates and cryptographically signs offline perpetual license manifests.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const KEYS_DIR = path.resolve(__dirname, "../keys");
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, "vendor_private_key.pem");
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, "vendor_public_key.pem");

function ensureKeypair() {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  if (!fs.existsSync(PRIVATE_KEY_PATH) || !fs.existsSync(PUBLIC_KEY_PATH)) {
    console.log("[issue-license] Generating RSA 2048 vendor license keypair...");
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey, { mode: 0o644 });
    console.log("[issue-license] Keypair generated and saved to deploy/keys/");
  }

  return {
    privateKey: fs.readFileSync(PRIVATE_KEY_PATH, "utf8"),
    publicKey: fs.readFileSync(PUBLIC_KEY_PATH, "utf8"),
  };
}

function canonicalizePayload(payload) {
  const clone = { ...payload };
  delete clone.signature;
  const sortedKeys = Object.keys(clone).sort();
  const sortedObj = {};
  for (const key of sortedKeys) {
    sortedObj[key] = clone[key];
  }
  return JSON.stringify(sortedObj);
}

function signPayload(payload, privateKeyPem) {
  const canonicalData = canonicalizePayload(payload);
  const signer = crypto.createSign("SHA256");
  signer.update(canonicalData);
  signer.end();
  return signer.sign(privateKeyPem, "base64");
}

function issueLicense(options = {}) {
  const { privateKey, publicKey } = ensureKeypair();

  const manifest = {
    license_id: options.licenseId || `lic_${crypto.randomUUID()}`,
    licensee_name: options.licenseeName || "The Ecom Buddy Official Merchant",
    licensee_email: options.licenseeEmail || "owner@theecombuddy.local",
    permitted_domains: options.domains || [
      "localhost",
      "127.0.0.1",
      "*.theecombuddy.com",
      "theecombuddy.com",
      "theecombuddy.local",
    ],
    permitted_storefronts: options.storefronts || 1,
    issue_date: options.issueDate || new Date().toISOString().split("T")[0],
    license_type: options.licenseType || "perpetual",
    features: [
      "storefront",
      "merchant_dashboard",
      "medusa_backend",
      "razorpay_gateway",
      "cashfree_gateway",
      "cash_on_delivery",
      "international_multi_currency",
      "published_theme_engine",
      "durable_reconciliation_inbox",
      "role_based_access_control",
    ],
    metadata: {
      edition: "Single-Merchant Perpetual License",
      telemetry: "disabled",
      offline_verification: true,
      issued_by: "The Ecom Buddy Core Vendor",
      ...options.metadata,
    },
    signature: "",
  };

  manifest.signature = signPayload(manifest, privateKey);

  const outputPath = options.outputPath || path.resolve(__dirname, "../license.json");
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`[issue-license] Successfully issued and signed license -> ${outputPath}`);
  return { manifest, publicKey };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const licenseeName = args[0] || "The Ecom Buddy Official Merchant";
  const licenseeEmail = args[1] || "owner@theecombuddy.local";
  const result = issueLicense({ licenseeName, licenseeEmail });
  console.log("\nGenerated License Manifest:");
  console.log(JSON.stringify(result.manifest, null, 2));
}

module.exports = { issueLicense, ensureKeypair, canonicalizePayload, signPayload };
