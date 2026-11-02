import crypto from "crypto";

const GUEST_ORDER_SECRET =
  process.env.GUEST_ORDER_SECRET ||
  process.env.JWT_SECRET ||
  "supersecret_ecom_buddy_jwt_token_development_only";

export interface GuestOrderTokenPayload {
  order_id: string;
  email: string;
  exp: number;
  iat: number;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 guest order token.
 * Defaults to 1 hour (3600 seconds) expiration.
 */
export function createGuestOrderToken(
  orderId: string,
  email: string,
  ttlSeconds = 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: GuestOrderTokenPayload = {
    order_id: orderId,
    email: email.toLowerCase().trim(),
    exp: now + ttlSeconds,
    iat: now,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", GUEST_ORDER_SECRET)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies a guest order token against a specific order ID.
 */
export function verifyGuestOrderToken(
  token: string,
  orderId: string
): { valid: boolean; error?: string; payload?: GuestOrderTokenPayload } {
  try {
    if (!token || typeof token !== "string") {
      return { valid: false, error: "Missing or invalid token format" };
    }

    const parts = token.split(".");
    if (parts.length !== 2) {
      return { valid: false, error: "Malformed guest token" };
    }

    const [payloadB64, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", GUEST_ORDER_SECRET)
      .update(payloadB64)
      .digest("base64url");

    if (signature !== expectedSig) {
      return { valid: false, error: "Invalid guest token signature" };
    }

    const payload: GuestOrderTokenPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    );

    if (!payload || payload.order_id !== orderId) {
      return { valid: false, error: "Token not authorized for this order" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) {
      return { valid: false, error: "Guest token has expired" };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: "Guest token verification failed" };
  }
}

/**
 * Extracts a guest order token from request cookies or headers.
 */
export function extractGuestOrderToken(
  req: Request,
  orderId: string
): string | null {
  // 1. Check custom header
  const headerToken = req.headers.get("x-guest-order-token");
  if (headerToken) return headerToken.trim();

  // 2. Check Cookie header
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)teb_guest_order_${orderId}=([^;]+)`)
    );
    if (match) {
      return decodeURIComponent(match[1].trim());
    }
  }

  return null;
}

