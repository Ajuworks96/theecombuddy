import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Pool } from "pg";
import Redis from "ioredis";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5432/medusa_ecom_buddy";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let pgPool: Pool | null = null;
function getPool(): Pool {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      max: 5,
    });
  }
  return pgPool;
}

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

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting via Redis
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const redis = getRedis();

    if (redis) {
      try {
        const rateKey = `rate:newsletter:${clientIp}`;
        const attempts = await redis.incr(rateKey);
        if (attempts === 1) {
          await redis.expire(rateKey, 60);
        }
        if (attempts > 5) {
          return NextResponse.json(
            { error: "Too many subscription requests. Please try again shortly." },
            { status: 429 }
          );
        }
      } catch {
        // Non-blocking rate limit fallback
      }
    }

    // 2. Validate input
    const body = await req.json().catch(() => ({}));
    const { email, consent, source = "storefront" } = body || {};

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    if (consent !== true) {
      return NextResponse.json(
        { error: "Explicit subscriber consent is required to join store communications" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const pool = getPool();

    // 3. Check existing subscription in PostgreSQL
    const existing = await pool.query(
      "SELECT id, status, unsubscribe_token FROM newsletter_subscribers WHERE email = $1",
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      const sub = existing.rows[0];
      if (sub.status === "subscribed") {
        return NextResponse.json(
          {
            success: true,
            message: "You are already subscribed to store updates.",
            email: cleanEmail,
          },
          { status: 200 }
        );
      } else {
        // Re-subscribe previous unsubscriber
        await pool.query(
          "UPDATE newsletter_subscribers SET status = 'subscribed', consent = true, unsubscribed_at = NULL, updated_at = NOW() WHERE id = $1",
          [sub.id]
        );
        return NextResponse.json(
          {
            success: true,
            message: "Welcome back! Your subscription has been reactivated.",
            email: cleanEmail,
          },
          { status: 200 }
        );
      }
    }

    // 4. Create new subscriber record
    const id = `sub_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const unsubscribeToken = crypto.randomBytes(24).toString("hex");

    await pool.query(
      `INSERT INTO newsletter_subscribers (id, email, consent, status, source, unsubscribe_token, subscribed_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'subscribed', $4, $5, NOW(), NOW(), NOW())`,
      [id, cleanEmail, true, source.slice(0, 50), unsubscribeToken]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for subscribing! Your email has been added to our updates list.",
        email: cleanEmail,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[newsletter-api] Subscription error:", err);
    return NextResponse.json(
      { error: "Failed to process newsletter subscription" },
      { status: 500 }
    );
  }
}

/**
 * Unsubscribe handler: GET /api/newsletter?token=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Unsubscribe token is required" }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      "UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = NOW(), updated_at = NOW() WHERE unsubscribe_token = $1 RETURNING email",
      [token.trim()]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Invalid or expired unsubscribe token" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "You have been successfully unsubscribed from store communications.",
      email: result.rows[0].email,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to process unsubscribe request" },
      { status: 500 }
    );
  }
}
