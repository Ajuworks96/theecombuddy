import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers";
import { ContainerRegistrationKeys, Modules, OrderWorkflowEvents, PaymentEvents } from "@medusajs/framework/utils";

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

    if (sessionIds.length === 0) {
      return;
    }

    // Connect to Redis to finalize the session locks
    const Redis = require("ioredis");
    const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });
    await redis.connect();

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
              await redis.set(meta.completedKey, "completed", "EX", 259200);
            }
            if (meta.lockKey && meta.lockToken) {
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

    await redis.quit();
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
