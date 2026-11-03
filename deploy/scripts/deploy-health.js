#!/usr/bin/env node
/**
 * THE ECOM BUDDY — End-to-End Deployment Health Prober
 * Verifies live connectivity to PostgreSQL, Redis, Backend API, Storefront, and Merchant.
 */

const { Pool } = require("pg");
const net = require("net");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:9000";
const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:3000";
const MERCHANT_URL = process.env.MERCHANT_URL || "http://localhost:7001";
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5432/medusa_ecom_buddy";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_HOST = process.env.REDIS_HOST || "localhost";

async function probeHttp(name, url, expectedStatus = 200) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (res.status === expectedStatus || (res.status >= 200 && res.status < 400)) {
      console.log(`[PASS] ${name}: HTTP ${res.status} at ${url}`);
      return true;
    } else {
      console.log(`[FAIL] ${name}: Unexpected HTTP ${res.status} at ${url}`);
      return false;
    }
  } catch (err) {
    console.log(`[FAIL] ${name}: Connection error at ${url} (${err.message})`);
    return false;
  }
}

async function probeDatabase() {
  const pool = new Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    const res = await pool.query(
      "SELECT (SELECT COUNT(*) FROM product WHERE deleted_at IS NULL) as products, (SELECT COUNT(*) FROM \"order\" WHERE deleted_at IS NULL) as orders"
    );
    const row = res.rows[0];
    console.log(`[PASS] PostgreSQL Database: Connected (${row.products} active products, ${row.orders} orders)`);
    await pool.end();
    return true;
  } catch (err) {
    console.log(`[FAIL] PostgreSQL Database: Connection error (${err.message})`);
    try { await pool.end(); } catch {}
    return false;
  }
}

async function probeRedis() {
  return new Promise((resolve) => {
    const client = net.createConnection({ host: REDIS_HOST, port: REDIS_PORT, timeout: 3000 }, () => {
      client.write("*1\r\n$4\r\nPING\r\n");
    });
    client.on("data", (data) => {
      if (data.toString().includes("PONG") || data.toString().includes("NOAUTH")) {
        console.log(`[PASS] Redis Cache: Responsive on ${REDIS_HOST}:${REDIS_PORT}`);
        client.destroy();
        resolve(true);
      }
    });
    client.on("error", (err) => {
      console.log(`[FAIL] Redis Cache: Connection failed on ${REDIS_HOST}:${REDIS_PORT} (${err.message})`);
      client.destroy();
      resolve(false);
    });
    client.on("timeout", () => {
      console.log(`[FAIL] Redis Cache: Timeout on ${REDIS_HOST}:${REDIS_PORT}`);
      client.destroy();
      resolve(false);
    });
  });
}

async function runHealthAudit() {
  console.log("\n=======================================================");
  console.log(" THE ECOM BUDDY — DEPLOYMENT HEALTH AUDIT");
  console.log("=======================================================\n");

  const [dbOk, redisOk, backendOk, storeOk, merchantOk] = await Promise.all([
    probeDatabase(),
    probeRedis(),
    probeHttp("Medusa Backend API", `${BACKEND_URL}/health`),
    probeHttp("Customer Storefront", `${STOREFRONT_URL}/`),
    probeHttp("Merchant Console", `${MERCHANT_URL}/login`),
  ]);

  const allHealthy = dbOk && redisOk && backendOk && storeOk && merchantOk;

  console.log("\n-------------------------------------------------------");
  console.log(`Overall Health Status: ${allHealthy ? "HEALTHY (ALL PASSED)" : "DEGRADED (ACTION REQUIRED)"}`);
  console.log("-------------------------------------------------------\n");

  if (!allHealthy) {
    process.exit(1);
  }
}

if (require.main === module) {
  runHealthAudit().catch((err) => {
    console.error("Health audit fatal error:", err);
    process.exit(1);
  });
}

module.exports = { runHealthAudit };
