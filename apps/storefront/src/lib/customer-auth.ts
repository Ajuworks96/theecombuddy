import { NextRequest } from "next/server";
import crypto from "crypto";
import Redis from "ioredis";

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

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getCustomerToken(req: NextRequest): string | null {
  const cookieToken = req.cookies.get("teb_customer_token")?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const key = `revoked:token:${hashToken(token)}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch {
    return false;
  }
}

export async function revokeCustomerToken(token: string, ttlSeconds = 604800): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const key = `revoked:token:${hashToken(token)}`;
    await redis.set(key, "1", "EX", ttlSeconds);
  } catch (err: any) {
    console.warn("[customer-auth] Warning: Failed to record revoked token in Redis:", err?.message);
  }
}

export async function validateCustomerSession(
  req: NextRequest
): Promise<{ isAuthenticated: boolean; token?: string; error?: string }> {
  const token = getCustomerToken(req);
  if (!token) {
    return { isAuthenticated: false, error: "No customer authentication token provided" };
  }

  const revoked = await isTokenRevoked(token);
  if (revoked) {
    return {
      isAuthenticated: false,
      error: "Session has been revoked. Please log in again.",
    };
  }

  return { isAuthenticated: true, token };
}
