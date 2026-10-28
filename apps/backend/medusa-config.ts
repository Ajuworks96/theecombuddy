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
  modules: isRedisConfigured
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
    : {},
});
