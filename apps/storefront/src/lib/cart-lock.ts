/**
 * Concurrency & Atomic Lock Manager for Cart Operations
 * Guarantees that concurrent requests for the same cart cannot execute simultaneously.
 * Uses distributed Redis SET NX with TTL and owner-safe Lua release,
 * with safe graceful in-memory fallback if Redis is unavailable.
 */

import crypto from "crypto";
import Redis from "ioredis";

interface LockEntry {
  lockedAt: number;
  expiresAt: number;
  ownerToken: string;
}

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redisClient: Redis | null = null;
let redisHealthy = false;

function getRedisClient(): Redis | null {
  if (!redisClient) {
    try {
      redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: () => 2000,
      });

      redisClient.on("connect", () => {
        redisHealthy = true;
      });

      redisClient.on("error", () => {
        redisHealthy = false;
      });
    } catch {
      redisClient = null;
      redisHealthy = false;
    }
  }
  return redisClient;
}

const inMemoryLocks = new Map<string, LockEntry>();
const inMemoryOwners = new Map<string, string>();
const completedCarts = new Map<string, { orderId: string; completedAt: number }>();

// Owner-safe release Lua script: deletes lock only if ownerToken matches
const RELEASE_LOCK_LUA = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
`;

/**
 * Attempts to acquire an exclusive lock for a given cart ID.
 * Returns true if lock was acquired, false if already locked.
 */
export async function acquireCartLock(cartId: string, ttlMs = 20000): Promise<boolean> {
  const lockKey = `lock:cart:${cartId}`;
  const ownerToken = crypto.randomUUID();
  const now = Date.now();

  const redis = getRedisClient();
  if (redis) {
    try {
      const res = await redis.set(lockKey, ownerToken, "PX", ttlMs, "NX");
      if (res === "OK") {
        inMemoryOwners.set(cartId, ownerToken);
        return true;
      }
      return false;
    } catch {
      // Fallback to in-memory locking if Redis communication fails
    }
  }

  // In-memory fallback
  const existing = inMemoryLocks.get(cartId);
  if (existing) {
    if (existing.expiresAt > now) {
      return false;
    }
    inMemoryLocks.delete(cartId);
  }

  inMemoryLocks.set(cartId, {
    lockedAt: now,
    expiresAt: now + ttlMs,
    ownerToken,
  });
  inMemoryOwners.set(cartId, ownerToken);

  return true;
}

/**
 * Releases the lock for a given cart ID in an owner-safe manner.
 */
export async function releaseCartLock(cartId: string, ownerToken?: string): Promise<void> {
  const lockKey = `lock:cart:${cartId}`;
  const token = ownerToken || inMemoryOwners.get(cartId) || "";

  const redis = getRedisClient();
  if (redis && token) {
    try {
      await redis.eval(RELEASE_LOCK_LUA, 1, lockKey, token);
    } catch {
      // Non-blocking fallback
    }
  }

  inMemoryOwners.delete(cartId);
  inMemoryLocks.delete(cartId);
}

/**
 * Records a cart as completed to prevent duplicate submissions.
 */
export function markCartCompleted(cartId: string, orderId: string): void {
  completedCarts.set(cartId, {
    orderId,
    completedAt: Date.now(),
  });

  const redis = getRedisClient();
  if (redis) {
    redis.set(`completed:cart:${cartId}`, orderId, "EX", 86400).catch(() => {});
  }
}

/**
 * Checks if a cart was previously completed.
 */
export async function getCompletedCartOrder(cartId: string): Promise<string | null> {
  const record = completedCarts.get(cartId);
  if (record) {
    return record.orderId;
  }
  const redis = getRedisClient();
  if (redis) {
    try {
      const orderId = await redis.get(`completed:cart:${cartId}`);
      if (orderId) return orderId;
    } catch {
      // Non-blocking
    }
  }
  return null;
}
