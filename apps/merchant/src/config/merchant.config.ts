/**
 * The Ecom Buddy — White-Label Merchant Configuration Abstraction
 *
 * Designed strictly for independently self-hosted, single-merchant deployments.
 * All properties can be customized per installation via environment variables
 * or local overrides without modifying core application code.
 */

export interface MerchantBrandingConfig {
  name: string;
  shortName: string;
  tagline: string;
  logoUrl?: string;
  faviconUrl?: string;
  brandColors: {
    primary: string;
    accent: string;
    gold: string;
    sidebarBg: string;
    sidebarText: string;
  };
  localization: {
    defaultLocale: string;
    defaultCurrency: string;
    currencySymbol: string;
    supportedCurrencies: string[];
    timezone: string;
  };
  supportEmail: string;
  license: {
    tier: string;
    edition: string;
    version: string;
    isSelfHosted: boolean;
  };
}

export function getMerchantConfig(): MerchantBrandingConfig {
  return {
    name: process.env.MERCHANT_NAME || "The Ecom Buddy",
    shortName: process.env.MERCHANT_SHORT_NAME || "TEB",
    tagline: process.env.MERCHANT_TAGLINE || "Self-Hosted Direct-to-Consumer Commerce",
    logoUrl: process.env.MERCHANT_LOGO_URL || "",
    faviconUrl: process.env.MERCHANT_FAVICON_URL || "/favicon.ico",
    brandColors: {
      primary: process.env.MERCHANT_COLOR_PRIMARY || "#0F172A",
      accent: process.env.MERCHANT_COLOR_ACCENT || "#2563EB",
      gold: process.env.MERCHANT_COLOR_GOLD || "#C28E5C",
      sidebarBg: process.env.MERCHANT_SIDEBAR_BG || "#0B0F19",
      sidebarText: process.env.MERCHANT_SIDEBAR_TEXT || "#94A3B8",
    },
    localization: {
      defaultLocale: process.env.MERCHANT_LOCALE || "en-IN",
      defaultCurrency: process.env.MERCHANT_DEFAULT_CURRENCY || "INR",
      currencySymbol: process.env.MERCHANT_CURRENCY_SYMBOL || "₹",
      supportedCurrencies: (
        process.env.MERCHANT_SUPPORTED_CURRENCIES || "INR,USD,AED,GBP,EUR"
      )
        .split(",")
        .map((c) => c.trim().toUpperCase()),
      timezone: process.env.MERCHANT_TIMEZONE || "Asia/Kolkata",
    },
    supportEmail: process.env.MERCHANT_SUPPORT_EMAIL || "admin@theecombuddy.local",
    license: {
      tier: "Single-Merchant Perpetual License",
      edition: "Self-Hosted Enterprise Core",
      version: "1.0.0",
      isSelfHosted: true,
    },
  };
}

export const merchantConfig = getMerchantConfig();
