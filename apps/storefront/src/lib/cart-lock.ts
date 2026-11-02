/**
 * Concurrency & Atomic Lock Manager for Cart Operations
 * Guarantees that concurrent requests for the same cart cannot execute simultaneously.
 */

interface LockEntry {
  lockedAt: number;
  expiresAt: number;
}

const inMemoryLocks = new Map<string, LockEntry>();
const completedCarts = new Map<string, { orderId: string; completedAt: number }>();

/**
 * Attempts to acquire an exclusive lock for a given cart ID.
 * Returns true if lock was acquired, false if already locked.
 */
export async function acquireCartLock(cartId: string, ttlMs = 20000): Promise<boolean> {
  const now = Date.now();
  const existing = inMemoryLocks.get(cartId);

  if (existing) {
    if (existing.expiresAt > now) {
      // Lock is still actively held by another concurrent request
      return false;
    }
    // Lock expired, can re-acquire
    inMemoryLocks.delete(cartId);
  }

  inMemoryLocks.set(cartId, {
    lockedAt: now,
    expiresAt: now + ttlMs,
  });

  return true;
}

/**
 * Releases the lock for a given cart ID.
 */
export async function releaseCartLock(cartId: string): Promise<void> {
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
}

/**
 * Checks if a cart was previously completed.
 */
export function getCompletedCartOrder(cartId: string): string | null {
  const record = completedCarts.get(cartId);
  if (record) {
    return record.orderId;
  }
  return null;
}

