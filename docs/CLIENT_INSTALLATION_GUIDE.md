# The Ecom Buddy — Client Self-Hosted Installation Guide

**Edition:** Single-Merchant Perpetual License  
**Product:** The Ecom Buddy  
**Architecture:** 100% Autonomous White-Label Deployment  

---

## 1. Product & Licensing Philosophy

The Ecom Buddy is **NOT a multi-tenant SaaS platform**.

When you acquire The Ecom Buddy, you receive a perpetual license to run your own dedicated, sovereign e-commerce store on your own server.
- **Your Data:** 100% stored in your own PostgreSQL database.
- **Your Customers:** No external company sees your customer directory or order history.
- **Your Payments:** Directly wired to your Razorpay, Cashfree, or Cash on Delivery accounts.
- **Zero Ongoing SaaS Fees:** No 2% platform transaction fees or recurring monthly subscription lockouts.
- **Offline DRM:** Asymmetric cryptographic signature validation running locally on your server. Zero phone-home network calls.

---

## 2. Server Provisioning

Recommended cloud providers:
- Hetzner Cloud (CPX31 — 4 vCPU, 8 GB RAM, ~€13/mo)
- DigitalOcean (Basic Droplet — 4 GB RAM, 2 vCPU, ~$24/mo)
- AWS EC2 (t4g.medium or c7g.medium)
- Linode / Akamai (4 GB Dedicated or Shared)

Operating System: **Ubuntu 24.04 LTS (x86_64 or ARM64)**

### Initial Server Preparation
```bash
# 1. Update packages
sudo apt update && sudo apt upgrade -y

# 2. Install Docker & Git
sudo apt install -y git curl ufw
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Configure Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 3. Installation Walkthrough

### Step 1: Clone Repository
```bash
git clone https://github.com/Ajuworks96/theecombuddy.git /var/www/theecombuddy
cd /var/www/theecombuddy
```

### Step 2: Install Dependencies & Run Setup
```bash
npm install
npm run setup:production
```
The wizard will generate strong 256-bit entropy keys for `JWT_SECRET`, `COOKIE_SECRET`, and `GUEST_ORDER_SECRET`.

### Step 3: Install Your Perpetual License
Your software delivery package contains a `license.json` manifest signed by the vendor.
Copy this file into `deploy/license.json`:
```bash
cp /path/to/your/downloaded/license.json deploy/license.json
```
Verify the signature offline:
```bash
npm run license:verify
```

### Step 4: Configure DNS Records
At your domain registrar (Cloudflare, GoDaddy, Namecheap), create 3 DNS `A` records pointing to your server's static IP:
- `theecombuddy.com` -> `YOUR_SERVER_IP`
- `admin.theecombuddy.com` -> `YOUR_SERVER_IP`
- `api.theecombuddy.com` -> `YOUR_SERVER_IP`

### Step 5: Start Production Containers
```bash
cd deploy
docker compose up -d
```
Caddy will automatically provision SSL certificates from Let's Encrypt for all 3 domains.

### Step 6: Rotate Admin Password
Log in to your merchant dashboard at `https://admin.yourdomain.com/login`.
Default credentials on initial seed:
- **Email:** `admin@theecombuddy.local`
- **Initial Password:** Provided in deployment handover.

Run the password rotation script to set your own password:
```bash
node deploy/scripts/rotate-admin-password.js "your_new_secure_password"
```

---

## 4. Post-Installation Verification

1. Run the health check:
   ```bash
   npm run deploy:health
   ```
2. Open your customer storefront: `https://yourdomain.com`
3. Verify that all 520 products and theme styling render cleanly.
4. Go to **Settings -> Payment Gateways** in the merchant console to input your Razorpay or Cashfree live API credentials.
