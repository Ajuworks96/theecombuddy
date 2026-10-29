import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers";
import { ContainerRegistrationKeys, Modules, OrderWorkflowEvents, PaymentEvents } from "@medusajs/framework/utils";
import Redis from "ioredis";

/**
 * Razorpay Webhook Downstream Finalizer Subscriber:
 *
 * Marks webhook events as 'completed' in Redis ONLY AFTER the downstream
 * Medusa workflows have successfully completed:
 * 1. OrderWorkflowEvents.PLACED (order.placed) -> completeCartWorkflow finished.
 * 2. PaymentEvents.CAPTURED (payment.captured) -> capturePaymentWorkflow finished.
 *
 * This guarantees that if downstream processing fails, the event is NOT prematurely
 * marked completed in Redis, allowing subsequent gateway retries to reconcile safely.
 *
 * Strictly ignores non-Razorpay events (e.g. COD orders or unrelated payments).
 */
export default async function razorpayWebhookFinalizer({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const entityId = event?.data?.id;
  if (!entityId) return;

  const eventName = event.name;

  try {
    const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
    const sessionIds: string[] = [];

    if (eventName === OrderWorkflowEvents.PLACED) {
      // Query order's linked payment sessions across payment_collections and cart
      try {
        const orders = await query({
          entryPoint: "order",
          fields: [
            "id",
            "payment_collections.payment_sessions.id",
            "payment_collections.payment_sessions.provider_id",
            "payment_collections.payments.payment_session_id",
            "payment_collections.payments.provider_id",
          ],
          variables: { filters: { id: entityId } },
        });

        const order = orders?.[0];
        const payCols = order?.payment_collections || [];
        for (const col of payCols) {
          for (const ses of col.payment_sessions || []) {
            if (ses.provider_id === "pp_razorpay_razorpay" && ses.id) {
              sessionIds.push(ses.id);
            }
          }
          for (const pay of col.payments || []) {
            if (pay.provider_id === "pp_razorpay_razorpay" && pay.payment_session_id) {
              sessionIds.push(pay.payment_session_id);
            }
          }
        }
      } catch {
        // Fallback: Query order with cart payment_collection link
        const orders = await query({
          entryPoint: "order",
          fields: [
            "id",
            "cart.payment_collection.payment_sessions.id",
            "cart.payment_collection.payment_sessions.provider_id",
          ],
          variables: { filters: { id: entityId } },
        });

        const order = orders?.[0];
        const sessions = order?.cart?.payment_collection?.payment_sessions || [];
        for (const ses of sessions) {
          if (ses.provider_id === "pp_razorpay_razorpay" && ses.id) {
            sessionIds.push(ses.id);
          }
        }
      }
    } else if (eventName === PaymentEvents.CAPTURED) {
      const payments = await query({
        entryPoint: "payment",
        fields: ["id", "payment_session_id", "provider_id"],
        variables: { filters: { id: entityId } },
      });

      const payment = payments?.[0];
      if (payment?.provider_id === "pp_razorpay_razorpay" && payment.payment_session_id) {
        sessionIds.push(payment.payment_session_id);
      }
    }

    // Safety guard: If this order or payment is not Razorpay (e.g. COD / pp_system_default), exit immediately
    if (sessionIds.length === 0) {
      return;
    }

    // Connect to Redis or reuse container connection
    const containerRedis =
      container.resolve("redisConnection", { allowUnregistered: true }) ||
      container.resolve("redisClient", { allowUnregistered: true });

    let redis: any = containerRedis;
    let shouldDisconnect = false;

    if (!redis || typeof redis.set !== "function") {
      redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
      });
      await redis.connect();
      shouldDisconnect = true;
    }

    const releaseScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    for (const sessionId of sessionIds) {
      const keys = await redis.keys(`teb:webhook:session_lock:${sessionId}:*`);
      for (const key of keys) {
        const raw = await redis.get(key);
        if (raw) {
          try {
            const meta = JSON.parse(raw);
            if (meta.completedKey) {
              // Durably mark completed for 72 hours
              await redis.set(meta.completedKey, "completed", "EX", 259200);
            }
            if (meta.lockKey && meta.lockToken) {
              // Safely release lock using worker token via atomic Lua
              await redis.eval(releaseScript, 1, meta.lockKey, meta.lockToken);
            } else if (meta.lockKey) {
              await redis.del(meta.lockKey);
            }
            await redis.del(key);
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    if (shouldDisconnect) {
      await redis.quit();
    }
  } catch (err: any) {
    // Non-blocking subscriber error handling
    console.warn(`[razorpay-webhook-finalizer] Warning: Could not finalize webhook for ${entityId}:`, err?.message);
  }
}

export const config: SubscriberConfig = {
  event: [OrderWorkflowEvents.PLACED, PaymentEvents.CAPTURED],
  context: {
    subscriberId: "razorpay-webhook-finalizer",
  },
};
