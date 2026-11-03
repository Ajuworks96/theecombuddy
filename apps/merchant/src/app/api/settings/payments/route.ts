import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5432/medusa_ecom_buddy";

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 5,
    });
  }
  return pool;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getPool();
    const configRes = await db.query(
      "SELECT id, provider_id, status, environment, key_id_masked, is_enabled, supported_currencies, last_verified_at, verification_error FROM payment_gateway_configs ORDER BY provider_id"
    );

    const inboxRes = await db.query(`
      SELECT 
        status, 
        COUNT(*)::int as count 
      FROM payment_event_inbox 
      GROUP BY status
    `);

    const inboxCounts: Record<string, number> = {
      received: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    inboxRes.rows.forEach((r: any) => {
      inboxCounts[r.status] = r.count;
    });

    // Compute dynamic status based on active environment variables
    const rzpKeyId = process.env.RAZORPAY_KEY_ID;
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
    const cfAppId = process.env.CASHFREE_APP_ID;
    const cfSecret = process.env.CASHFREE_SECRET_KEY;
    const payEnv = process.env.PAYMENT_ENVIRONMENT || "sandbox";

    const gateways = [
      {
        id: "razorpay",
        name: "Razorpay Payments",
        provider_id: "pp_razorpay_razorpay",
        environment: payEnv === "live" ? "live" : "sandbox",
        status: !rzpKeyId || rzpKeyId.includes("placeholder")
          ? "not_configured"
          : payEnv === "live"
          ? "live_configured"
          : "sandbox_verified",
        key_id_masked: rzpKeyId && !rzpKeyId.includes("placeholder")
          ? `${rzpKeyId.slice(0, 8)}******`
          : null,
        is_enabled: Boolean(rzpKeyId && !rzpKeyId.includes("placeholder")),
        supported_currencies: ["INR", "USD", "AED", "GBP", "EUR"],
        notes: "UPI, Cards, NetBanking. Domestic INR verified; international enabled upon merchant approval.",
      },
      {
        id: "cashfree",
        name: "Cashfree Payments",
        provider_id: "pp_cashfree_cashfree",
        environment: payEnv === "live" ? "live" : "sandbox",
        status: !cfAppId || cfAppId.includes("placeholder")
          ? "not_configured"
          : payEnv === "live"
          ? "live_configured"
          : "sandbox_configured",
        key_id_masked: cfAppId && !cfAppId.includes("placeholder")
          ? `${cfAppId.slice(0, 6)}******`
          : null,
        is_enabled: Boolean(cfAppId && !cfAppId.includes("placeholder")),
        supported_currencies: ["INR"],
        notes: "UPI AutoPay, Cards, 50+ NetBanking Banks. Domestic INR checkout only.",
      },
      {
        id: "cod",
        name: "Cash on Delivery (COD)",
        provider_id: "pp_system_default",
        environment: "production",
        status: "live_verified",
        key_id_masked: "N/A (Built-in Post-Purchase Flow)",
        is_enabled: true,
        supported_currencies: ["INR"],
        notes: "Restricted strictly to deliveries within India. Managed and confirmed manually upon delivery.",
      },
    ];

    return NextResponse.json({
      gateways,
      reconciliation: {
        total_inbox: Object.values(inboxCounts).reduce((a, b) => a + b, 0),
        pending: (inboxCounts.received || 0) + (inboxCounts.processing || 0),
        completed: inboxCounts.completed || 0,
        failed: inboxCounts.failed || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load payment gateway settings" },
      { status: 500 }
    );
  }
}
