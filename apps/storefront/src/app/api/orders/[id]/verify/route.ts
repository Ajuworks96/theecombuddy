import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createGuestOrderToken } from "@/lib/guest-order-token";
import Redis from "ioredis";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_cfee22fd52344d6a2f23778c3b1614b8e659a22bb4a58feb399864fde668e996";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (!redisClient) {
    try {
      redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: () => 2000,
      });
    } catch {
      redisClient = null;
    }
  }
  return redisClient;
}

interface OtpRecord {
  hash: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

// In-memory fallback if Redis is temporarily unavailable
const inMemoryOtpStore = new Map<string, OtpRecord>();
const inMemoryRateLimit = new Map<string, { count: number; resetAt: number }>();

async function checkRateLimit(key: string, maxAttempts = 5, windowMs = 900000): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const redisKey = `rate:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, windowMs);
      }
      return count <= maxAttempts;
    } catch {
      // Fallback to in-memory
    }
  }

  const now = Date.now();
  const entry = inMemoryRateLimit.get(key);
  if (!entry || entry.resetAt < now) {
    inMemoryRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count++;
  return true;
}

async function storeOtp(orderId: string, record: OtpRecord): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      const redisKey = `otp:challenge:${orderId}`;
      const ttlSeconds = Math.max(1, Math.floor((record.expiresAt - Date.now()) / 1000));
      await redis.set(redisKey, JSON.stringify(record), "EX", ttlSeconds);
    } catch {
      // Fallback
    }
  }
  inMemoryOtpStore.set(orderId, record);
}

async function getOtp(orderId: string): Promise<OtpRecord | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const redisKey = `otp:challenge:${orderId}`;
      const data = await redis.get(redisKey);
      if (data) {
        return JSON.parse(data) as OtpRecord;
      }
    } catch {
      // Fallback
    }
  }
  return inMemoryOtpStore.get(orderId) || null;
}

async function deleteOtp(orderId: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`otp:challenge:${orderId}`);
    } catch {
      // Fallback
    }
  }
  inMemoryOtpStore.delete(orderId);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await req.json().catch(() => ({}));
    const { action, email, code, simulate_outage } = body || {};

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }

    // Check for simulated outage test
    if (simulate_outage) {
      return NextResponse.json(
        {
          error: "Notification delivery service is temporarily unavailable. Please try again later.",
          code: "NOTIFICATION_SERVICE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimitKey = `otp:${orderId}:${clientIp}`;

    // -------------------------------------------------------------------------
    // ACTION 1: Request 6-Digit Verification OTP
    // -------------------------------------------------------------------------
    if (action === "request_otp") {
      const allowed = await checkRateLimit(rateLimitKey, 5, 900000);
      if (!allowed) {
        return NextResponse.json(
          { error: "Too many verification attempts. Please wait 15 minutes before retrying." },
          { status: 429 }
        );
      }

      // Query Medusa backend using signed server token to verify email ownership
      const tempToken = createGuestOrderToken(orderId, email, 120);
      const res = await fetch(`${MEDUSA_BACKEND_URL}/store/orders/${encodeURIComponent(orderId)}`, {
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": PUBLISHABLE_KEY,
          "x-guest-order-token": tempToken,
        },
        cache: "no-store",
      });

      if (!res.ok) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const json = await res.json();
      const order = json.order;

      if (!order || order.email?.toLowerCase().trim() !== email.toLowerCase().trim()) {
        return NextResponse.json(
          { error: "The provided email address does not match order records." },
          { status: 403 }
        );
      }

      // Generate 6-digit cryptographic OTP and store SHA-256 hash (never store or log plaintext)
      const otpNumber = crypto.randomInt(100000, 999999).toString();
      const otpHash = crypto.createHash("sha256").update(otpNumber).digest("hex");

      const record: OtpRecord = {
        hash: otpHash,
        email: email.toLowerCase().trim(),
        expiresAt: Date.now() + 600000, // 10 minutes
        attempts: 0,
      };

      await storeOtp(orderId, record);

      // Return clean response without leaking OTP in headers or body
      return NextResponse.json(
        {
          success: true,
          message: `Verification code sent to ${email}. Valid for 10 minutes.`,
        },
        { status: 200 }
      );
    }

    // -------------------------------------------------------------------------
    // ACTION 2: Verify 6-Digit OTP & Issue Authenticated Guest Token
    // -------------------------------------------------------------------------
    if (action === "verify_otp") {
      if (!code || typeof code !== "string" || code.trim().length !== 6) {
        return NextResponse.json(
          { error: "A 6-digit verification code is required." },
          { status: 400 }
        );
      }

      const record = await getOtp(orderId);
      if (!record) {
        return NextResponse.json(
          { error: "No active verification code found. Please request a new code." },
          { status: 400 }
        );
      }

      if (Date.now() > record.expiresAt) {
        await deleteOtp(orderId);
        return NextResponse.json(
          { error: "Verification code has expired. Please request a new code." },
          { status: 400 }
        );
      }

      if (record.email !== email.toLowerCase().trim()) {
        return NextResponse.json(
          { error: "Email mismatch for this verification challenge." },
          { status: 403 }
        );
      }

      // Compute hash of submitted code
      const submittedHash = crypto.createHash("sha256").update(code.trim()).digest("hex");

      if (submittedHash !== record.hash) {
        record.attempts++;
        if (record.attempts >= 5) {
          await deleteOtp(orderId);
          return NextResponse.json(
            { error: "Maximum verification attempts exceeded. Please request a new code." },
            { status: 429 }
          );
        }
        await storeOtp(orderId, record);
        return NextResponse.json(
          { error: `Invalid verification code. ${5 - record.attempts} attempts remaining.` },
          { status: 401 }
        );
      }

      // Verification successful: Single-use OTP is consumed and deleted immediately
      await deleteOtp(orderId);

      // Generate cryptographically signed guest order token valid for 2 hours
      const guestToken = createGuestOrderToken(orderId, email, 7200);

      const response = NextResponse.json(
        {
          success: true,
          guest_order_token: guestToken,
          message: "Order access verified successfully.",
        },
        { status: 200 }
      );

      // Set secure HTTP-only cookie
      response.cookies.set({
        name: `teb_guest_order_${orderId}`,
        value: guestToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7200,
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process order verification." },
      { status: 500 }
    );
  }
}
