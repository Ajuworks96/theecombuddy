import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Pool } from "pg";
import Redis from "ioredis";
import { sendNotification } from "@/lib/notifications";

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
        const rateKey = `rate:contact:${clientIp}`;
        const attempts = await redis.incr(rateKey);
        if (attempts === 1) {
          await redis.expire(rateKey, 900); // 15 minutes window
        }
        if (attempts > 5) {
          return NextResponse.json(
            { error: "Too many contact inquiries submitted. Please try again later." },
            { status: 429 }
          );
        }
      } catch {
        // Non-blocking fallback
      }
    }

    // 2. Validate input
    const body = await req.json().catch(() => ({}));
    const { name, email, phone, subject, message } = body || {};

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Please enter your full name (at least 2 characters)." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json(
        { error: "Please enter a message with at least 10 characters." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = typeof phone === "string" ? phone.trim().slice(0, 50) : null;
    const cleanSubject = typeof subject === "string" ? subject.trim().slice(0, 255) : "Customer Inquiry";
    const cleanMessage = message.trim();

    // 3. Persist inquiry into PostgreSQL
    const pool = getPool();
    const id = `cnt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    await pool.query(
      `INSERT INTO contact_submissions (id, name, email, phone, subject, message, status, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'new', $7, NOW())`,
      [id, cleanName, cleanEmail, cleanPhone, cleanSubject, cleanMessage, clientIp]
    );

    // 4. Optionally dispatch notification to merchant admin
    const adminEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "admin@theecombuddy.local";
    sendNotification({
      to: adminEmail,
      type: "CONTACT_FORM",
      data: {
        name: cleanName,
        email: cleanEmail,
        message: cleanMessage,
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for contacting us! Our team has received your message and will respond shortly.",
        inquiryId: id,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[contact-api] Submission error:", err);
    return NextResponse.json(
      { error: "Failed to submit your message. Please try again." },
      { status: 500 }
    );
  }
}
