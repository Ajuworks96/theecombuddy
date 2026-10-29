import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const isRedisConfigured = Boolean(process.env.REDIS_URL);

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/medusa_ecom_buddy",
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3000,http://127.0.0.1:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000,http://127.0.0.1:9000,http://localhost:5173",
      authCors: process.env.AUTH_CORS || "http://localhost:9000,http://127.0.0.1:9000,http://localhost:3000,http://127.0.0.1:3000",
      jwtSecret: process.env.JWT_SECRET || "supersecret_ecom_buddy_jwt_token_development_only",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret_ecom_buddy_cookie_token_development_only",
    },
  },
  modules: {
    [Modules.PAYMENT]: {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/payment-razorpay",
            id: "razorpay",
            options: {
              key_id: process.env.RAZORPAY_KEY_ID,
              key_secret: process.env.RAZORPAY_KEY_SECRET,
              webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET,
              mode: process.env.RAZORPAY_MODE || "test",
              auto_capture: true,
              supported_currencies: (
                process.env.RAZORPAY_SUPPORTED_CURRENCIES || "inr,usd,aed,gbp,eur"
              )
                .split(",")
                .map((c) => c.trim().toLowerCase()),
            },
          },
        ],
      },
    },
    ...(isRedisConfigured
      ? {
          [Modules.EVENT_BUS]: {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: {
              redisUrl: process.env.REDIS_URL,
            },
          },
          [Modules.WORKFLOW_ENGINE]: {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            options: {
              redis: {
                redisUrl: process.env.REDIS_URL,
              },
            },
          },
          [Modules.CACHING]: {
            resolve: "@medusajs/medusa/caching",
            options: {
              providers: [
                {
                  id: "caching-redis",
                  resolve: "@medusajs/medusa/caching-redis",
                  is_default: true,
                  options: {
                    redisUrl: process.env.REDIS_URL,
                  },
                },
              ],
            },
          },
        }
      : {}),
  },
});
