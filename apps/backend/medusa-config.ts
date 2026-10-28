import { loadEnv, defineConfig } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

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
});
