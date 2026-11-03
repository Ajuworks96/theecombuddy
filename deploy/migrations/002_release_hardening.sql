-- ==============================================================================
-- The Ecom Buddy — Release Hardening & Production Operations Schema
-- ==============================================================================

-- 1. Newsletter Subscribers (PostgreSQL Persistence with Consent & Unsubscribe)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  consent BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(20) NOT NULL DEFAULT 'subscribed', -- 'subscribed', 'unsubscribed'
  source VARCHAR(50) DEFAULT 'storefront',
  unsubscribe_token VARCHAR(64) UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers (status);
CREATE INDEX IF NOT EXISTS idx_newsletter_unsub ON newsletter_subscribers (unsubscribe_token);

-- 2. Customer Inquiries / Contact Submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new', -- 'new', 'in_progress', 'resolved', 'spam'
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_submissions (status);
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_submissions (created_at DESC);

-- 3. Durable Payment Event Inbox (Webhook Idempotency & Reconciliation)
CREATE TABLE IF NOT EXISTS payment_event_inbox (
  id VARCHAR(64) PRIMARY KEY,
  provider_id VARCHAR(50) NOT NULL, -- 'razorpay', 'cashfree'
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255),
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'received', -- 'received', 'processing', 'completed', 'failed'
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  last_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_provider_event UNIQUE (provider_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_pei_status ON payment_event_inbox (status);
CREATE INDEX IF NOT EXISTS idx_pei_provider ON payment_event_inbox (provider_id);
CREATE INDEX IF NOT EXISTS idx_pei_received ON payment_event_inbox (received_at DESC);

-- 4. Store Policies & Commercial Information Pages
CREATE TABLE IF NOT EXISTS store_policies (
  id VARCHAR(64) PRIMARY KEY,
  handle VARCHAR(64) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  updated_by VARCHAR(255) DEFAULT 'admin@theecombuddy.local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policies_handle ON store_policies (handle);

-- 5. Payment Gateway Configuration & Status Guardrails
CREATE TABLE IF NOT EXISTS payment_gateway_configs (
  id VARCHAR(64) PRIMARY KEY, -- 'razorpay', 'cashfree'
  provider_id VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'not_configured',
  environment VARCHAR(20) NOT NULL DEFAULT 'sandbox', -- 'sandbox', 'live'
  key_id_masked VARCHAR(50),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  supported_currencies VARCHAR(100) DEFAULT 'inr',
  last_verified_at TIMESTAMPTZ,
  verification_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Merchant Staff Authorization & RBAC
CREATE TABLE IF NOT EXISTS staff_roles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL, -- user email or Medusa user id
  role VARCHAR(50) NOT NULL DEFAULT 'store_manager', -- 'store_owner', 'store_manager', 'operations_staff'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial store policies with professional commercial templates
INSERT INTO store_policies (id, handle, title, content, is_published)
VALUES
  (
    'pol_about',
    'about',
    'About Our Store',
    'Welcome to our independent online store. We curate high-quality products designed for durability, performance, and everyday elegance. As an independent merchant, every order is personally handled with pride, care, and attention to detail.',
    true
  ),
  (
    'pol_faq',
    'faq',
    'Frequently Asked Questions',
    '### How do I track my order?
Once your order ships, you will receive a tracking link via email. You can also view live fulfillment progress in your account portal.

### Which payment methods are accepted?
We accept Cash on Delivery (COD) for all domestic deliveries within India. For online orders, we accept UPI, debit/credit cards, and net banking via verified payment gateways.

### What is your return window?
We offer a 7-day hassle-free return and exchange policy on eligible unworn and sealed items in their original packaging.',
    true
  ),
  (
    'pol_privacy',
    'privacy-policy',
    'Privacy Policy',
    'We respect your personal privacy. All personal data collected during registration, checkout, and newsletter opt-in is encrypted and stored exclusively on our self-hosted infrastructure. We do not sell or share customer data with third-party advertisers.',
    true
  ),
  (
    'pol_terms',
    'terms-and-conditions',
    'Terms and Conditions',
    'By accessing and placing an order with our store, you agree to our standard terms of service. Prices and promotions are subject to change without prior notice. Orders placed with Cash on Delivery require verification upon dispatch.',
    true
  ),
  (
    'pol_shipping',
    'shipping-policy',
    'Shipping Policy',
    'Standard domestic delivery takes 3 to 5 business days across India. Express dispatch is processed within 24 hours of order confirmation. International shipments are fulfilled via express international air freight with duties calculated at customs.',
    true
  ),
  (
    'pol_returns',
    'returns-and-refunds',
    'Returns & Refund Policy',
    'Customers may initiate a return within 7 calendar days of delivery. Upon receipt and inspection at our fulfillment facility, refunds are processed within 5 business days to the original payment method or bank account for COD orders.',
    true
  ),
  (
    'pol_cancellation',
    'cancellation-policy',
    'Cancellation Policy',
    'Orders can be cancelled free of charge prior to warehouse dispatch via your customer account dashboard or by contacting customer support. Once an order is dispatched with a courier tracking number, cancellation is not possible and the return workflow applies.',
    true
  )
ON CONFLICT (handle) DO NOTHING;

-- Seed default gateway statuses (Guarded and blocked until merchant provides verified keys)
INSERT INTO payment_gateway_configs (id, provider_id, status, environment, key_id_masked, is_enabled, supported_currencies)
VALUES
  ('razorpay', 'razorpay', 'not_configured', 'sandbox', NULL, false, 'inr,usd,aed,gbp,eur'),
  ('cashfree', 'cashfree', 'not_configured', 'sandbox', NULL, false, 'inr')
ON CONFLICT (id) DO NOTHING;

-- Seed default staff role for initial admin
INSERT INTO staff_roles (id, user_id, role, is_active)
VALUES
  ('role_admin', 'admin@theecombuddy.local', 'store_owner', true)
ON CONFLICT (user_id) DO NOTHING;
