#!/usr/bin/env node
/**
 * THE ECOM BUDDY — Fresh Installation & Production Setup Wizard
 * Interactively or programmatically generates secure secrets, validates prerequisites,
 * and preconfigures .env.production for single-merchant deployment.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "../..");
const DEPLOY_DIR = path.resolve(__dirname, "..");
const ENV_PROD_PATH = path.join(DEPLOY_DIR, ".env.production");
const ENV_EXAMPLE_PATH = path.join(DEPLOY_DIR, ".env.production.example");

function generateSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64");
}

function generateHex(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

function checkPrerequisites() {
  console.log("\n=======================================================");
  console.log(" THE ECOM BUDDY — PRODUCTION SETUP WIZARD");
  console.log("=======================================================\n");

  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.replace("v", "").split(".")[0], 10);
  console.log(`[setup] Node.js Version: ${nodeVersion} ${major >= 20 ? "✓ (Passed)" : "✗ (Requires Node >= 20)"}`);

  let dockerAvailable = false;
  try {
    const dockerVer = execSync("docker --version", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    console.log(`[setup] Docker: ${dockerVer} ✓ (Passed)`);
    dockerAvailable = true;
  } catch {
    console.log("[setup] Docker: Not detected in current shell (standard standalone node mode available)");
  }

  return { nodeOk: major >= 20, dockerAvailable };
}

function setupProductionEnv(options = {}) {
  const storeDomain = options.storeDomain || process.env.STORE_DOMAIN || "localhost";
  const merchantDomain = options.merchantDomain || process.env.MERCHANT_DOMAIN || "admin.localhost";
  const backendDomain = options.backendDomain || process.env.BACKEND_DOMAIN || "api.localhost";
  const storeName = options.storeName || "The Ecom Buddy Official Store";
  const adminEmail = options.adminEmail || "admin@theecombuddy.com";

  if (fs.existsSync(ENV_PROD_PATH) && !options.force) {
    console.log(`[setup] Existing .env.production detected at ${ENV_PROD_PATH}. Preserving existing secrets.`);
    return true;
  }

  console.log("[setup] Generating cryptographically secure secrets...");
  const postgresPassword = generateHex(24);
  const redisPassword = generateHex(24);
  const jwtSecret = generateSecret(32);
  const cookieSecret = generateSecret(32);
  const guestOrderSecret = generateSecret(32);
  const sessionRevocationSecret = generateSecret(32);

  const envContent = `# ==============================================================================
# THE ECOM BUDDY — PRODUCTION ENVIRONMENT CONFIGURATION
# Generated on: ${new Date().toISOString()}
# Single-Merchant Autonomous Self-Hosted Setup
# ==============================================================================

# Core Domains
STORE_DOMAIN=${storeDomain}
MERCHANT_DOMAIN=${merchantDomain}
BACKEND_DOMAIN=${backendDomain}
STORE_URL=http://${storeDomain}
MERCHANT_URL=http://${merchantDomain}
BACKEND_PUBLIC_URL=http://${backendDomain}
ACME_EMAIL=${adminEmail}

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${postgresPassword}
POSTGRES_DB=medusa_ecom_buddy
POSTGRES_PORT=5432
DATABASE_URL=postgres://postgres:${postgresPassword}@postgres:5432/medusa_ecom_buddy

# Redis Store
REDIS_PASSWORD=${redisPassword}
REDIS_URL=redis://:${redisPassword}@redis:6379

# Cryptographic Keys (Auto-generated 256-bit entropy)
JWT_SECRET=${jwtSecret}
COOKIE_SECRET=${cookieSecret}
GUEST_ORDER_SECRET=${guestOrderSecret}
SESSION_REVOCATION_SECRET=${sessionRevocationSecret}

# White-Label License
LICENSE_FILE_PATH=/app/deploy/license.json

# Transactional Email (Fail-closed by default until configured)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=orders@${storeDomain}
SMTP_FROM_NAME="${storeName}"

# Payment Gateways (Fail-closed until verified)
PAYMENT_ENVIRONMENT=sandbox
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CASHFREE_APP_ID=
CASHFREE_SECRET_KEY=
CASHFREE_WEBHOOK_SECRET=
CASHFREE_API_VERSION=2023-08-01
COD_MAX_LIMIT_INR=10000

# Theme & Currencies
DEFAULT_THEME_PRESET=crescendo
NEXT_PUBLIC_DEFAULT_CURRENCY=INR
NEXT_PUBLIC_SUPPORTED_CURRENCIES=INR,USD,EUR,GBP,AED
`;

  fs.writeFileSync(ENV_PROD_PATH, envContent, "utf8");
  console.log(`[setup] Generated new .env.production at ${ENV_PROD_PATH} ✓`);
  return true;
}

if (require.main === module) {
  checkPrerequisites();
  setupProductionEnv();
  console.log("\nSetup completed successfully! Run 'npm run deploy:check' to verify readiness.\n");
}

module.exports = { setupProductionEnv, checkPrerequisites };
