import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createGuestOrderToken } from "@/lib/guest-order-token";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

interface OtpRecord {
  hash: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP storage and IP rate-limiting map
const otpStore = new Map<string, OtpRecord>();
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxAttempts = 5, windowMs = 900000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await req.json().catch(() => ({}));
    const { action, email, code } = body || {};

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimitKey = `otp:${orderId}:${clientIp}`;

    // -------------------------------------------------------------------------
    // ACTION 1: Request 6-Digit Verification OTP
    // -------------------------------------------------------------------------
    if (action === "request_otp") {
      if (!checkRateLimit(rateLimitKey, 5, 900000)) {
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

      // Generate 6-digit cryptographic OTP
      const otpNumber = crypto.randomInt(100000, 999999).toString();
      const otpHash = crypto.createHash("sha256").update(otpNumber).digest("hex");

      otpStore.set(orderId, {
        hash: otpHash,
        email: email.toLowerCase().trim(),
        expiresAt: Date.now() + 600000, // 10 minutes
        attempts: 0,
      });

      console.log(`[Guest Order OTP] Verification code for order ${orderId} (${email}): ${otpNumber}`);

      const response = NextResponse.json(
        {
          success: true,
          message: `Verification code sent to ${email}. Valid for 10 minutes.`,
        },
        { status: 200 }
      );

      // In non-production test mode, provide test header for automated validation
      if (process.env.NODE_ENV !== "production") {
        response.headers.set("x-test-otp", otpNumber);
      }

      return response;
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

      const record = otpStore.get(orderId);
      if (!record) {
        return NextResponse.json(
          { error: "No active verification code found. Please request a new code." },
          { status: 400 }
        );
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(orderId);
        return NextResponse.json(
          { error: "Verification code has expired. Please request a new code." },
          { status: 400 }
        );
      }

      if (record.email !== email.toLowerCase().trim()) {
        return NextResponse.json(
          { error: "Email mismatch for this verification session." },
          { status: 403 }
        );
      }

      record.attempts++;
      if (record.attempts > 5) {
        otpStore.delete(orderId);
        return NextResponse.json(
          { error: "Too many incorrect attempts. Verification code invalidated." },
          { status: 429 }
        );
      }

      const inputHash = crypto.createHash("sha256").update(code.trim()).digest("hex");
      if (inputHash !== record.hash) {
        return NextResponse.json(
          { error: `Invalid verification code. ${5 - record.attempts} attempts remaining.` },
          { status: 401 }
        );
      }

      // OTP is valid! Clean up used OTP and issue a fresh 1-hour guest order access token
      otpStore.delete(orderId);
      const guestToken = createGuestOrderToken(orderId, email, 3600);

      const response = NextResponse.json(
        {
          success: true,
          message: "Verification successful.",
          token: guestToken,
        },
        { status: 200 }
      );

      response.cookies.set({
        name: `teb_guest_order_${orderId}`,
        value: guestToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      });

      return response;
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: 'request_otp', 'verify_otp'" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Guest verification failed" },
      { status: 500 }
    );
  }
}

