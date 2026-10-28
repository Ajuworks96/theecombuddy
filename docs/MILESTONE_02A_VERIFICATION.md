# Milestone 02A Final Verification & Architectural Handover Report

**Project**: The Ecom Buddy  
**Milestone**: 02A — Monorepo Architecture, Headless Commerce Engine & Storefront Foundation  
**Status**: VERIFIED & COMPLETE  
**Handover Date**: 2026-10-28  

---

## 1. Executive Summary

Milestone 02A establishes the production monorepo architecture, official Medusa v2 headless commerce engine, automated local PostgreSQL cluster with UTF-8 encoding, development Redis infrastructure with official Medusa v2 modules, publishable key scoping for the Next.js storefront, and security boundary isolation.

All verification gaps identified in provisional review have been resolved and functionally validated against live running services.

---

## 2. Task 1: Store API Verification & Publishable Key Association

### Root Cause of Previous 400 Response
In Medusa v2, Store APIs enforce strict sales channel scoping. All `/store/*` requests require a valid publishable API key passed via the `x-publishable-api-key` header. Requests lacking this header are rejected with HTTP 400 (`Publishable API key required in the request header`).

### Publishable Key Configuration
- **Publishable Key ID**: `apk_01M60XB65PNJG6ACG2VGVQJDQ2`
- **Publishable Key Token**: `pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a`
- **Sales Channel Association**: Verified linked to `sc_01M60XB5ZV6YW1GEH67C70CEPC` (`Default Sales Channel`) in table `publishable_api_key_sales_channel` (`pksc_01M60XB66BS7H1TJ4HKRMB4CJD`).
- **Storefront Environment Integration**: Configured in [`apps/storefront/.env.local`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/apps/storefront/.env.local) and documented in [`apps/storefront/.env.example`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/apps/storefront/.env.example) as `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

### Functional API Test Results

```bash
# Test 1: Store Products Endpoint
GET http://localhost:9000/store/products
Headers: { "x-publishable-api-key": "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a" }
Response: HTTP 200 OK
Body: { "products": [], "count": 0, "offset": 0, "limit": 50 }

# Test 2: Store Regions Endpoint
GET http://localhost:9000/store/regions
Headers: { "x-publishable-api-key": "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a" }
Response: HTTP 200 OK
Body: { "regions": [], "count": 0, "offset": 0, "limit": 50 }
```

Both endpoints returned HTTP 200 OK with valid JSON payloads.

---

## 3. Task 2: Redis Infrastructure & Medusa v2 Event/Cache Modules

### Development Setup on Windows
- Development Redis is managed via [`deploy/scripts/local-redis.js`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/deploy/scripts/local-redis.js), running `redis-memory-server` (Memurai Redis on Windows x64) on `127.0.0.1:6379`.
- Controlled via root workspace commands:
  - `npm run redis:start` — Launches daemon on port 6379 and creates PID tracking.
  - `npm run redis:status` — Reports socket listening and PID status.
  - `npm run redis:stop` — Clean shutdown of background Redis process.

### Medusa v2 Module Configuration
Avoided deprecated Medusa v1 plugins. Configured official Medusa v2 modules in [`apps/backend/medusa-config.ts`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/apps/backend/medusa-config.ts):

```typescript
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
      [Modules.CACHE]: {
        resolve: "@medusajs/medusa/cache-redis",
        options: {
          redisUrl: process.env.REDIS_URL,
        },
      },
    }
  : {},
```

### Redis Verification Results
1. **Direct Socket & Client Test**:
   - PING returned `PONG`
   - Key SET/GET verified (`milestone:02a:check` -> `verified`)
   - Redis server version: `8.2.10`
2. **Medusa Backend Connection Logs**:
   ```
   info: Connection to Redis in module 'event-bus-redis' established
   info: Connection to Redis in module 'cache-redis' established
   info: [Workflow-engine-redis] Connection to Redis in module 'workflow-engine-redis' established
   info: [Workflow-engine-redis] Connection to Redis PubSub in module 'workflow-engine-redis' established
   ```

---

## 4. Task 3: Security & Credential Isolation

### Tracked Files Audit (`git ls-files`)
Audited all files tracked by Git to ensure no environment secrets or local database clusters are committed:

```bash
git ls-files | findstr /i ".env deploy/data password"
```
**Output**:
- `apps/backend/.env.example`
- `apps/storefront/.env.example`
- `apps/storefront/next-env.d.ts`

**Verification Points**:
- [x] `.env` and `.env.local` files containing secrets are completely ignored.
- [x] Database credentials (`postgres://postgres:password...`) are NOT committed in tracked files.
- [x] JWT secrets and cookie secrets are NOT committed in tracked files.
- [x] Admin passwords are NOT committed in tracked files.
- [x] Local PostgreSQL data (`deploy/data/local-postgres/`) is NOT committed.

### Admin Password Rotation
- **Previous Credential**: Rotated immediately.
- **Rotation Tool**: Created [`deploy/scripts/rotate-admin-password.js`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/deploy/scripts/rotate-admin-password.js).
- **Hashing**: Uses Medusa v2 `scrypt-kdf` with `{ logN: 15, r: 8, p: 1 }`.
- **Database Entity**: Updated `provider_identity` table for `admin@theecombuddy.local`.
- **Storage**: The new password is saved strictly in the git-ignored local file [`apps/backend/.env`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/apps/backend/.env) under `DEV_ADMIN_PASSWORD`.
- **Confidentiality**: New credentials are NOT logged to stdout, shell outputs, or Git commit history.
- **Authentication Check**: Authenticated against `POST http://localhost:9000/auth/user/emailpass` returning HTTP 200 and generating a valid JWT token.

### History Remediation
Git history was audited with `git log --all --full-history -- "**.env*"`. Only `.env.example` placeholder blueprints have ever been committed. No real secrets exist in Git history; therefore, no commit rewrites (`git filter-repo`) were required.

---

## 5. Task 4: Runtime Compatibility Audit

| Component | Pinned Version | Engine Requirement | Installed Host Version | Compatibility Status |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js** | Host Runtime | `>=20.0.0` (Medusa/Next) | `v22.15.0` | **Fully Compatible** |
| **npm** | Package Manager | `>=10.0.0` | `11.6.2` | **Fully Compatible** |
| **Medusa Engine** | `@medusajs/medusa@2.18.0` | `node: >=20` | `v22.15.0` | **Fully Compatible** |
| **Medusa Framework** | `@medusajs/framework@2.18.0` | `node: >=20` | `v22.15.0` | **Fully Compatible** |
| **Medusa CLI** | `@medusajs/cli@2.18.0` | `node: >=20` | `v22.15.0` | **Fully Compatible** |
| **Next.js** | `next@15.5.28` | `node: >=20.0.0` | `v22.15.0` | **Fully Compatible** |
| **React** | `react@18.3.1` | `>=18.0.0` | `18.3.1` | **Fully Compatible** |

**Compatibility Finding**:
Medusa `2.22.0+` introduces a strict constraint of `node >= 22.22.0`. By intentionally pinning Medusa to `2.18.0`, the system achieves full operational stability and zero engine warnings on Node `v22.15.0`. No blind upgrades should be performed until Node `v22.22.0+` is standard across client target environments.

---

## 6. Task 5: Database Architecture & Production Decoupling

### Separation of Concerns
1. **Local Development**:
   - Managed by [`deploy/scripts/local-db.js`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/deploy/scripts/local-db.js) using `embedded-postgres`.
   - Initialized with UTF-8 encoding (`--encoding=UTF8 --locale=C`) on port 5432.
   - Storage location: `deploy/data/local-postgres/` (git-ignored).
   - Package dependency: `embedded-postgres` is strictly listed in root `devDependencies`.
2. **Production Deployment**:
   - Production deployments do NOT use `embedded-postgres`.
   - [`apps/backend/medusa-config.ts`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/apps/backend/medusa-config.ts) resolves `databaseUrl: process.env.DATABASE_URL`.
   - Any managed PostgreSQL 15/16 database (AWS RDS, Supabase, Neon, Azure PostgreSQL, or self-hosted PostgreSQL) is connected standardly via SSL-enabled connection strings.
   - Database migrations are executed in deployment pipelines via standard CLI:
     ```bash
     npx medusa db:migrate
     ```

---

## 7. Task 6: Final Verification Matrix

| Verification Step | Command Executed | Exit Code | Observed Output / Result |
| :--- | :--- | :--- | :--- |
| **1. Workspace Check** | `npm run --workspaces` | **0** | All 5 workspaces discovered with respective lifecycle scripts |
| **2. TypeScript Checks** | `npm run typecheck --workspaces` | **0** | `tsc --noEmit` passed across backend, storefront, config, types, ui with 0 errors |
| **3. Storefront Build** | `npm run build:storefront` | **0** | Next.js 15 production build compiled in 5.1s; static & dynamic routes generated |
| **4. Backend Build** | `npm run build:backend` | **0** | Types generated, backend compiled (3.06s), admin frontend compiled (24.91s) |
| **5. PostgreSQL Connection** | `node deploy/scripts/local-db.js status` | **0** | PostgreSQL 18.4, Server Encoding `UTF8`, 143 public tables verified |
| **6. Medusa Migrations** | `npm run db:migrate` | **0** | Core modules migrated, workflow tables up to date, migration scripts completed |
| **7. Redis Connection** | `npm run redis:status` | **0** | Redis 8.2.10 listening on `127.0.0.1:6379`; PING/PONG and key lifecycle validated |
| **8. Authenticated Admin** | `node deploy/scripts/rotate-admin-password.js` | **0** | HTTP 200 OK; JWT Bearer token issued; `/admin/stores` and `/admin/sales-channels` queried |
| **9. Store API (Regions)** | `GET http://localhost:9000/store/regions` | **0** | HTTP 200 OK (`x-publishable-api-key` header accepted) |
| **10. Store API (Products)** | `GET http://localhost:9000/store/products` | **0** | HTTP 200 OK (`x-publishable-api-key` header accepted) |
| **11. Storefront Health** | `GET http://localhost:3000/api/health` | **0** | HTTP 200 OK `{ status: "ok", service: "the-ecom-buddy-storefront" }` |
| **12. Storefront Homepage** | `GET http://localhost:3000/` | **0** | HTTP 200 OK HTML payload rendered via Next.js SSR shell |

---

## 8. Files Changed & Added

### Newly Created Files
- [`deploy/scripts/local-redis.js`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/deploy/scripts/local-redis.js) — Redis daemon lifecycle controller.
- [`deploy/scripts/rotate-admin-password.js`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/deploy/scripts/rotate-admin-password.js) — Secure admin credential rotation utility.
- [`docs/MILESTONE_02A_VERIFICATION.md`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/docs/MILESTONE_02A_VERIFICATION.md) — This comprehensive handover and verification report.

### Modified Files
- [`package.json`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/package.json) — Added `redis:start`, `redis:stop`, `redis:status` scripts and `redis-memory-server` devDependency.
- [`package-lock.json`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/package-lock.json) — Monorepo lockfile synchronized.
- [`apps/backend/medusa-config.ts`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/apps/backend/medusa-config.ts) — Configured Medusa v2 Redis modules (`EVENT_BUS`, `WORKFLOW_ENGINE`, `CACHE`).
- [`apps/backend/.env.example`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/apps/backend/.env.example) — Documented `REDIS_URL`.
- [`apps/storefront/.env.example`](file:///c:/Users/Asus/Desktop/Works/the%20ecom%20buddy/apps/storefront/.env.example) — Documented `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

---

## 9. Current Limitations & Next Step

- **Product Catalog**: Empty catalog (`[]`). Seed generator for 500+ Indian e-commerce products is deferred to Milestone 02B.
- **Regions & Currencies**: Base INR region and payment/shipping providers will be seeded during Milestone 02B.
- **Storefront Customization**: Custom homepage carousel, product grids, and checkout flows are scheduled for subsequent milestones.

**STOP**: Milestone 02A verification is complete. System is in a clean, reproducible state awaiting review before Milestone 02B begins.

