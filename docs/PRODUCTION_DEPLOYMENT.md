# The Ecom Buddy — Production Deployment Manual

**Document Version:** 1.0.0 (Master Release)  
**Target Environment:** Single-Merchant Self-Hosted Cloud Server / VPS  
**Supported OS:** Ubuntu 22.04/24.04 LTS, Debian 12, RHEL 9, Alpine 3.19+, macOS, Windows Server  

---

## 1. System Requirements

| Resource | Minimum Specification | Recommended Production |
| :--- | :--- | :--- |
| **CPU** | 2 vCPU cores | 4 vCPU cores |
| **RAM** | 4 GB | 8 GB |
| **Disk Space** | 25 GB SSD | 50+ GB NVMe SSD |
| **Network** | Static public IPv4, Ports 80 & 443 open | 1 Gbps port, DDOS protection |
| **Software** | Docker Engine >= 24.0, Docker Compose v2 | Docker Engine with automatic restart |

---

## 2. Production Service Topology

The complete production system runs as 7 coordinated container services orchestrated via `deploy/docker-compose.yml`:

```
                       Internet (Ports 80 & 443)
                                  │
                                  ▼
                   ┌─────────────────────────────┐
                   │   Caddy Edge Proxy (TLS)    │
                   └──────────────┬──────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
    mystore.com            admin.mystore.com     api.mystore.com
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ Storefront       │  │ Merchant Console │  │ Medusa Backend   │
  │ (Next.js 15:3000)│  │ (Next.js 15:7001)│  │ (Node 22:9000)   │
  └─────────┬────────┘  └─────────┬────────┘  └────────┬─────────┘
            │                     │                    │
            └─────────────────────┴────────────────────┤
                                                       │
                                   ┌───────────────────┴───────────────────┐
                                   ▼                                       ▼
                         ┌──────────────────┐                    ┌──────────────────┐
                         │ PostgreSQL 16    │                    │ Redis 7          │
                         │ (Port 5432)      │                    │ (Port 6379, AOF) │
                         └──────────────────┘                    └──────────────────┘
```

---

## 3. Step-by-Step Deployment Guide

### Step 1: Clone Repository on Host
```bash
git clone https://github.com/Ajuworks96/theecombuddy.git /opt/theecombuddy
cd /opt/theecombuddy
```

### Step 2: Run Production Setup Wizard
```bash
npm run setup:production
```
The wizard validates Node.js, generates cryptographically strong secrets (JWT, cookie, guest order secrets), and creates `deploy/.env.production`.

### Step 3: Configure Domain & Credentials
Edit `deploy/.env.production`:
```bash
nano deploy/.env.production
```
Ensure the following variables match your production domain:
- `STORE_DOMAIN=theecombuddy.com`
- `MERCHANT_DOMAIN=admin.theecombuddy.com`
- `BACKEND_DOMAIN=api.theecombuddy.com`
- `ACME_EMAIL=ops@theecombuddy.com`

### Step 4: Run Pre-Flight Deployment Check
```bash
npm run deploy:check
```
Verifies:
- Node.js runtime >= 20.0.0
- System memory >= 4GB
- Cryptographic offline perpetual license validity
- Environment template completeness
- SQL migrations accessibility
- Docker Compose & Reverse Proxy configs

### Step 5: Launch Containers
```bash
cd deploy
docker compose up -d --build
```

### Step 6: Verify Deployment Health
```bash
npm run deploy:health
```
Probes all 5 critical health checkpoints:
- PostgreSQL connection and product count
- Redis ping response
- Medusa Backend API `/health` (HTTP 200)
- Storefront `/` (HTTP 200)
- Merchant Console `/login` (HTTP 200)

---

## 4. Reverse Proxy Options

### Default: Caddy (Recommended)
`deploy/reverse-proxy/Caddyfile` handles automatic Let's Encrypt certificates, HTTP/2, and security headers out of the box with zero external configuration.

### Alternative: Nginx
If your organization already runs an enterprise Nginx reverse proxy, use the template in `deploy/reverse-proxy/nginx.conf`, configuring SSL certificates via Certbot.

---

## 5. Maintenance & Logs

- **View Live Logs:**
  ```bash
  docker compose logs -f backend
  docker compose logs -f merchant
  docker compose logs -f storefront
  ```
- **Restart Services:**
  ```bash
  docker compose restart backend
  ```
- **Execute Automated Backup:**
  ```bash
  npm run deploy:backup
  ```
