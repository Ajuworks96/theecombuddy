import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:password@localhost:5432/medusa_ecom_buddy";

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 5,
    });
  }
  return pool;
}

export interface StorePolicy {
  handle: string;
  title: string;
  content: string;
  updated_at: string;
}

const DEFAULT_POLICIES: Record<string, { title: string; content: string }> = {
  about: {
    title: "About Our Store",
    content:
      "Welcome to our independent online store. We curate high-quality products designed for durability, performance, and everyday elegance. As an independent merchant, every order is personally handled with pride, care, and attention to detail.",
  },
  faq: {
    title: "Frequently Asked Questions",
    content:
      "### How do I track my order?\nOnce your order ships, you will receive a tracking link via email. You can also view live fulfillment progress in your account portal.\n\n### Which payment methods are accepted?\nWe accept Cash on Delivery (COD) for all domestic deliveries within India. For online orders, we accept UPI, debit/credit cards, and net banking via verified payment gateways.\n\n### What is your return window?\nWe offer a 7-day hassle-free return and exchange policy on eligible unworn and sealed items in their original packaging.",
  },
  "privacy-policy": {
    title: "Privacy Policy",
    content:
      "We respect your personal privacy. All personal data collected during registration, checkout, and newsletter opt-in is encrypted and stored exclusively on our self-hosted infrastructure. We do not sell or share customer data with third-party advertisers.",
  },
  "terms-and-conditions": {
    title: "Terms and Conditions",
    content:
      "By accessing and placing an order with our store, you agree to our standard terms of service. Prices and promotions are subject to change without prior notice. Orders placed with Cash on Delivery require verification upon dispatch.",
  },
  "shipping-policy": {
    title: "Shipping Policy",
    content:
      "Standard domestic delivery takes 3 to 5 business days across India. Express dispatch is processed within 24 hours of order confirmation. International shipments are fulfilled via express international air freight with duties calculated at customs.",
  },
  "returns-and-refunds": {
    title: "Returns & Refund Policy",
    content:
      "Customers may initiate a return within 7 calendar days of delivery. Upon receipt and inspection at our fulfillment facility, refunds are processed within 5 business days to the original payment method or bank account for COD orders.",
  },
  "cancellation-policy": {
    title: "Cancellation Policy",
    content:
      "Orders can be cancelled free of charge prior to warehouse dispatch via your customer account dashboard or by contacting customer support. Once an order is dispatched with a courier tracking number, cancellation is not possible and the return workflow applies.",
  },
};

export async function getStorePolicy(handle: string): Promise<StorePolicy> {
  try {
    const db = getPool();
    const res = await db.query(
      "SELECT handle, title, content, updated_at FROM store_policies WHERE handle = $1 AND is_published = true",
      [handle]
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        handle: row.handle,
        title: row.title,
        content: row.content,
        updated_at: new Date(row.updated_at).toISOString(),
      };
    }
  } catch (err: any) {
    console.warn(`[policies] Database query failed for ${handle}:`, err?.message);
  }

  const fallback = DEFAULT_POLICIES[handle] || {
    title: "Store Policy",
    content: "Policy details will be available shortly.",
  };

  return {
    handle,
    title: fallback.title,
    content: fallback.content,
    updated_at: new Date().toISOString(),
  };
}
