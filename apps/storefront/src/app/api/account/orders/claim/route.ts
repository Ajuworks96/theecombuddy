import { NextRequest, NextResponse } from "next/server";
import { verifyGuestOrderToken } from "@/lib/guest-order-token";
// @ts-ignore
import { Pool } from "pg";
import Redis from "ioredis";
import crypto from "crypto";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5432/medusa_ecom_buddy";

let dbPool: Pool | null = null;
function getPool(): Pool {
  if (!dbPool) {
    dbPool = new Pool({ connectionString: DATABASE_URL, max: 5 });
  }
  return dbPool;
}

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redisClient: Redis | null = null;
function getRedis(): Redis | null {
  if (!redisClient) {
    try {
      redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
    } catch {
      redisClient = null;
    }
  }
  return redisClient;
}

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  const cookie = req.cookies.get("teb_customer_token");
  if (cookie && cookie.value) {
    return cookie.value.trim();
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthenticated session" }, { status: 401 });
    }

    // 1. Fetch authenticated customer identity
    const meRes = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/me`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      cache: "no-store",
    });

    if (!meRes.ok) {
      return NextResponse.json({ error: "Invalid customer session" }, { status: 401 });
    }

    const meData = await meRes.json();
    const customer = meData.customer;
    if (!customer?.id || !customer?.email) {
      return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { order_id, guest_token, code } = body || {};

    if (!order_id || typeof order_id !== "string") {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // 2. Query target order from database
    const pool = getPool();
    const orderRes = await pool.query(
      'SELECT id, customer_id, email, status FROM public.order WHERE id = $1 AND deleted_at IS NULL',
      [order_id]
    );

    if (orderRes.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderRes.rows[0];

    // Already linked to this customer
    if (order.customer_id === customer.id) {
      return NextResponse.json(
        { success: true, message: "Order is already linked to your account.", order_id },
        { status: 200 }
      );
    }

    // 3. Cryptographic proof verification
    let proofValid = false;

    if (guest_token && typeof guest_token === "string") {
      const v = verifyGuestOrderToken(guest_token, order_id);
      if (v.valid) {
        proofValid = true;
      }
    } else if (code && typeof code === "string") {
      const redis = getRedis();
      if (redis) {
        const stored = await redis.get(`otp:challenge:${order_id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const submittedHash = crypto.createHash("sha256").update(code.trim()).digest("hex");
          if (submittedHash === parsed.hash && Date.now() <= parsed.expiresAt) {
            proofValid = true;
            await redis.del(`otp:challenge:${order_id}`);
          }
        }
      }
    }

    if (!proofValid) {
      return NextResponse.json(
        {
          error: "Access denied: claiming a guest order requires valid cryptographic proof of ownership (guest token or verification code).",
        },
        { status: 401 }
      );
    }

    // 4. Verify email ownership match
    const orderEmail = String(order.email || "").toLowerCase().trim();
    const customerEmail = String(customer.email || "").toLowerCase().trim();

    if (orderEmail !== customerEmail) {
      return NextResponse.json(
        {
          error: "Access denied: the email on this order does not match your authenticated account email.",
        },
        { status: 403 }
      );
    }

    // 5. Update order customer_id
    await pool.query(
      'UPDATE public.order SET customer_id = $1, updated_at = NOW() WHERE id = $2',
      [customer.id, order_id]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Order successfully linked to your customer account.",
        order_id,
        customer_id: customer.id,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to link order to account" },
      { status: 500 }
    );
  }
}
