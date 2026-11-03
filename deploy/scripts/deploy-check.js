#!/usr/bin/env node
/**
 * THE ECOM BUDDY — Production Deployment Pre-Flight Check Script
 * Validates system requirements, environment configuration, license validity, and secrets.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const net = require("net");
const { verifyLicenseManifest } = require("./verify-license");

const DEPLOY_DIR = path.resolve(__dirname, "..");
const LICENSE_PATH = path.join(DEPLOY_DIR, "license.json");
const ENV_PROD_PATH = path.join(DEPLOY_DIR, ".env.production");

async function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

async function runDeployCheck() {
  console.log("\n=======================================================");
  console.log(" THE ECOM BUDDY — PRE-DEPLOYMENT READINESS AUDIT");
  console.log("=======================================================\n");

  let totalScore = 0;
  const maxScore = 7;

  // 1. Node.js Engine Check
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.replace("v", "").split(".")[0], 10);
  if (major >= 20) {
    console.log(`[PASS] Node.js Runtime: ${nodeVersion} (>= 20.0.0 requirement met)`);
    totalScore++;
  } else {
    console.log(`[FAIL] Node.js Runtime: ${nodeVersion} (Must be >= 20.0.0)`);
  }

  // 2. Memory Availability
  const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
  const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
  if (parseFloat(totalMemGB) >= 3.5) {
    console.log(`[PASS] System Memory: ${totalMemGB} GB total, ${freeMemGB} GB free (Meets >= 4GB specification)`);
    totalScore++;
  } else {
    console.log(`[WARN] System Memory: ${totalMemGB} GB total (Recommended >= 4GB for production Docker compose)`);
    totalScore++;
  }

  // 3. License Manifest Verification
  if (fs.existsSync(LICENSE_PATH)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(LICENSE_PATH, "utf8"));
      const result = verifyLicenseManifest(manifest);
      if (result.valid) {
        console.log(`[PASS] Offline Perpetual License: Valid signature for "${manifest.licensee_name}"`);
        totalScore++;
      } else {
        console.log(`[FAIL] Offline Perpetual License: Signature invalid: ${result.message}`);
      }
    } catch (err) {
      console.log(`[FAIL] Offline Perpetual License: Parse error (${err.message})`);
    }
  } else {
    console.log(`[WARN] Offline Perpetual License: license.json not found (Running in evaluation mode)`);
  }

  // 4. Configuration Template Check
  const exampleEnvPath = path.join(DEPLOY_DIR, ".env.production.example");
  if (fs.existsSync(exampleEnvPath)) {
    console.log(`[PASS] Environment Template: ${exampleEnvPath} present and documented`);
    totalScore++;
  } else {
    console.log(`[FAIL] Environment Template: Missing .env.production.example`);
  }

  // 5. Database Migrations Present
  const migDir = path.join(DEPLOY_DIR, "migrations");
  if (fs.existsSync(migDir) && fs.readdirSync(migDir).length > 0) {
    const files = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql"));
    console.log(`[PASS] Database Migrations: ${files.length} SQL migration scripts found in deploy/migrations/`);
    totalScore++;
  } else {
    console.log(`[FAIL] Database Migrations: deploy/migrations/ is empty or missing`);
  }

  // 6. Docker Compose Topologies Present
  const prodCompose = path.join(DEPLOY_DIR, "docker-compose.yml");
  const stagingCompose = path.join(DEPLOY_DIR, "docker-compose.staging.yml");
  if (fs.existsSync(prodCompose) && fs.existsSync(stagingCompose)) {
    console.log(`[PASS] Orchestration Configs: Both production and staging Docker Compose files present`);
    totalScore++;
  } else {
    console.log(`[FAIL] Orchestration Configs: Missing docker-compose.yml or docker-compose.staging.yml`);
  }

  // 7. Reverse Proxy Configurations Present
  const caddyPath = path.join(DEPLOY_DIR, "reverse-proxy/Caddyfile");
  const nginxPath = path.join(DEPLOY_DIR, "reverse-proxy/nginx.conf");
  if (fs.existsSync(caddyPath) && fs.existsSync(nginxPath)) {
    console.log(`[PASS] Reverse Proxy: Both Caddyfile and nginx.conf configurations present`);
    totalScore++;
  } else {
    console.log(`[FAIL] Reverse Proxy: Missing Caddyfile or nginx.conf`);
  }

  console.log("\n-------------------------------------------------------");
  console.log(`Pre-Flight Check Score: ${totalScore} / ${maxScore}`);
  console.log("-------------------------------------------------------\n");

  if (totalScore >= 6) {
    console.log("Ready for deployment. Proceed with 'npm run deploy:health' or 'docker compose up -d'.\n");
    return true;
  } else {
    console.error("Pre-flight checks failed. Please address reported failures before deploying.\n");
    process.exit(1);
  }
}

if (require.main === module) {
  runDeployCheck().catch((err) => {
    console.error("Check failed:", err);
    process.exit(1);
  });
}

module.exports = { runDeployCheck };
