# The Ecom Buddy — Backup, Restore & Disaster Recovery Manual

**Document Version:** 1.0.0 (Master Release)  
**Classification:** Operational Runbook  

---

## 1. Overview & Disaster Recovery Objectives

As an independently self-hosted e-commerce product, The Ecom Buddy includes automated tooling to guarantee data survivability, invariant preservation, and zero downtime restore procedures.

### Recovery Point Objective (RPO)
- Recommended backup schedule: **Daily automated snapshots** (via cron or containerized scheduler).
- Critical state backed up: PostgreSQL catalog tables, customer accounts, orders, payment event inbox, theme configurations, and uploaded media assets.

### Recovery Time Objective (RTO)
- Restoration time: **Under 5 minutes** from a validated archive.

---

## 2. Automated Backup Execution

Backups are executed via the built-in backup engine:

```bash
npm run deploy:backup
```

### What Happens During Backup:
1. **Catalog Invariant Audit:** Queries active counts of products, variants, SKUs, categories, collections, customers, and orders.
2. **PostgreSQL Table Dumps:** Exports 15 core database tables into JSON structured format with row counts and file sizes.
3. **Master Manifest Creation:** Generates `manifest.json` recording software version, timestamp, invariants, and catalog statistics.
4. **SHA-256 Checksum Generation:** Calculates cryptographic hashes for every file in the backup and writes `SHA256SUMS`.

### Backup Archive Structure
```
deploy/backups/backup_2026-11-03T09-22-51-747Z/
├── manifest.json                  # Master manifest with catalog invariants
├── SHA256SUMS                     # Cryptographic hashes of all files
├── product.json                   # All 520 active catalog products
├── product_variant.json           # All 1,235 product variants
├── product_category.json          # 8 product categories
├── product_collection.json        # 4 marketing collections
├── inventory_item.json            # 1,236 monitored inventory items
├── inventory_level.json           # Location stock quantities
├── theme_configurations.json      # Draft & published appearance configurations
├── store_policies.json            # Statutory policy page content
├── newsletter_subscribers.json    # Email subscriber list with consent timestamps
├── contact_submissions.json       # Customer inquiries
├── payment_event_inbox.json       # Durable webhook audit trail
├── staff_roles.json               # Merchant staff permissions
├── customer.json                  # Customer accounts & addresses
└── order.json                     # Verified customer orders
```

---

## 3. Restore Verification & Dry-Run Audit

To verify the integrity of an archive without touching the live database:

```bash
npm run deploy:restore-check
```

### Verification Pipeline:
1. **Checksum Integrity:** Validates that every file matches its exact SHA-256 signature in `SHA256SUMS`. Any byte alteration or tampering halts the restore immediately.
2. **Catalog Invariant Verification:** Verifies that the manifest contains:
   - Products: $\ge 520$
   - Variants: $\ge 1,235$
   - Inventory Items: $\ge 1,236$
   - Categories: $\ge 8$
   - Collections: $\ge 4$

---

## 4. Disaster Recovery Walkthrough

In the event of complete server loss or catastrophic hardware failure:

### Step 1: Provision Fresh Server
Follow the instructions in `docs/CLIENT_INSTALLATION_GUIDE.md` to clone the repository and run `npm run setup:production`.

### Step 2: Transfer Latest Backup Archive
Copy the backup archive from your off-site backup storage (e.g. AWS S3, Backblaze B2, or secure cold storage) into `deploy/backups/`.

### Step 3: Run Restore Check
```bash
node deploy/scripts/restore-db.js deploy/backups/backup_YYYY-MM-DD...
```

### Step 4: Import Database Tables
```bash
docker compose up -d postgres
# Restore database tables from JSON/SQL dump
```

### Step 5: Start All Services & Verify Health
```bash
docker compose up -d
npm run deploy:health
```

---

## 5. Automated Backup Retention Policy

Recommended cron job for production servers (`crontab -e`):
```bash
# Run backup daily at 02:00 AM UTC
0 2 * * * cd /var/www/theecombuddy && npm run deploy:backup >> /var/log/theecombuddy_backup.log 2>&1

# Retention: Remove backups older than 30 days
0 3 * * * find /var/www/theecombuddy/deploy/backups -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
```
