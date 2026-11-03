import { defineMiddlewares } from "@medusajs/framework/http";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import crypto from "crypto";
import { Pool } from "pg";

const GUEST_ORDER_SECRET =
  process.env.GUEST_ORDER_SECRET ||
  process.env.JWT_SECRET ||
  "supersecret_ecom_buddy_jwt_token_development_only";

let dbPool: Pool | null = null;
function getDbPool() {
  if (!dbPool) {
    dbPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgres://postgres:password@localhost:5432/medusa_ecom_buddy",
      max: 5,
    });
  }
  return dbPool;
}

/**
 * Cryptographically verify an HMAC-SHA256 guest order access token
 */
export function verifyGuestOrderToken(
  token: string,
  orderId: string
): { valid: boolean; error?: string; payload?: any } {
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

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (!payload || payload.order_id !== orderId) {
      return { valid: false, error: "Token not authorized for this order" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === "number" && payload.exp < now) {
      return { valid: false, error: "Guest token has expired" };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: "Guest token verification exception" };
  }
}

/**
 * Generate a cryptographically signed guest order token
 */
export function createGuestOrderToken(orderId: string, email: string, ttlSeconds = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
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
 * Middleware protecting GET /store/orders/:id against unauthorized guest enumeration
 * and enforcing strict cross-customer order ownership isolation.
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/*",
      middlewares: [
        async (req: MedusaRequest, res: MedusaResponse, next: any) => {
          const authContext = (req as any).auth_context;
          if (!authContext || authContext.actor_type !== "user") {
            return next();
          }

          const userId = authContext.actor_id;
          if (!userId) return next();

          try {
            const pool = getDbPool();
            const roleRes = await pool.query(
              "SELECT role, permissions FROM staff_roles WHERE user_id = $1",
              [userId]
            );

            const staffRole = roleRes.rows.length > 0 ? roleRes.rows[0].role : "store_owner";
            (req as any).staff_role = staffRole;

            if (staffRole === "store_owner") {
              return next();
            }

            const path = req.path || (req as any).originalUrl || "";
            const method = req.method.toUpperCase();

            // store_manager restrictions
            if (staffRole === "store_manager") {
              if (
                path.startsWith("/admin/api-keys") ||
                path.startsWith("/admin/users") ||
                path.includes("/payments/credentials")
              ) {
                return res.status(403).json({
                  message: "Forbidden: Store managers are not permitted to manage API keys or staff roles.",
                  type: "forbidden",
                });
              }
              return next();
            }

            // operations_staff restrictions
            if (staffRole === "operations_staff") {
              if (
                path.startsWith("/admin/api-keys") ||
                path.startsWith("/admin/users") ||
                path.startsWith("/admin/settings")
              ) {
                return res.status(403).json({
                  message: "Forbidden: Operations staff cannot access system settings or credentials.",
                  type: "forbidden",
                });
              }

              if (
                (path.startsWith("/admin/products") ||
                  path.startsWith("/admin/collections") ||
                  path.startsWith("/admin/categories")) &&
                method !== "GET"
              ) {
                return res.status(403).json({
                  message: "Forbidden: Operations staff have read-only access to catalog products and inventory.",
                  type: "forbidden",
                });
              }

              return next();
            }

            return next();
          } catch {
            return next();
          }
        },
      ],
    },
    {
      matcher: "/store/orders/:id",
      method: ["GET"],
      middlewares: [
        async (req: MedusaRequest, res: MedusaResponse, next: any) => {
          const orderId = req.params.id;

          // 1. Inspect authenticated session context
          const authContext = (req as any).auth_context;
          if (authContext) {
            const actorType = authContext.actor_type;
            const actorId = authContext.actor_id;

            // Admin user sessions have merchant-wide order management authorization
            if (actorType === "user" || (actorId && String(actorId).startsWith("usr_"))) {
              return next();
            }

            // Customer sessions: strictly enforce customer ownership
            if (actorType === "customer" || (actorId && String(actorId).startsWith("cus_"))) {
              try {
                const pool = getDbPool();
                const orderCheck = await pool.query(
                  'SELECT customer_id, email FROM public.order WHERE id = $1 AND deleted_at IS NULL',
                  [orderId]
                );

                if (orderCheck.rows.length === 0) {
                  return res.status(404).json({
                    message: "Order record not found",
                    type: "not_found",
                  });
                }

                const orderOwnerId = orderCheck.rows[0].customer_id;
                if (!orderOwnerId || orderOwnerId !== actorId) {
                  return res.status(403).json({
                    message: "Access denied: you do not have permission to access another customer's order",
                    type: "forbidden",
                  });
                }

                // Authenticated customer owns this order
                return next();
              } catch (dbErr: any) {
                return res.status(500).json({
                  message: "Failed to verify order ownership",
                  type: "internal_error",
                });
              }
            }
          }

          // 2. Guest access: Extract token from header or cookie
          const headerToken = req.headers["x-guest-order-token"] as string | undefined;
          let cookieToken: string | undefined;

          const cookieHeader = req.headers["cookie"];
          if (cookieHeader) {
            const match = cookieHeader.match(
              new RegExp(`(?:^|;\\s*)teb_guest_order_${orderId}=([^;]+)`)
            );
            if (match) {
              cookieToken = decodeURIComponent(match[1]);
            }
          }

          const token = headerToken || cookieToken;

          if (!token) {
            return res.status(401).json({
              message:
                "Access denied: guest order access requires a valid guest order token or customer authentication",
              type: "unauthorized",
            });
          }

          const verification = verifyGuestOrderToken(token, orderId);
          if (!verification.valid) {
            return res.status(401).json({
              message: `Unauthorized guest order access: ${verification.error}`,
              type: "unauthorized",
            });
          }

          // 3. Mask sensitive customer information on response
          const originalJson = res.json.bind(res);
          res.json = (body: any) => {
            if (body && body.order) {
              // Mask recipient phone in shipping address
              if (body.order.shipping_address?.phone) {
                const phone = String(body.order.shipping_address.phone);
                if (phone.length > 5) {
                  body.order.shipping_address.phone =
                    phone.slice(0, 3) + "******" + phone.slice(-3);
                }
              }

              // Strip raw payment internal data
              if (Array.isArray(body.order.payment_collections)) {
                body.order.payment_collections.forEach((pc: any) => {
                  delete pc.raw_amount;
                  if (Array.isArray(pc.payments)) {
                    pc.payments.forEach((p: any) => {
                      delete p.raw_amount;
                      delete p.data;
                    });
                  }
                });
              }
            }
            return originalJson(body);
          };

          return next();
        },
      ],
    },
  ],
});
