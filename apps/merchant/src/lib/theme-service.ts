/**
 * The Ecom Buddy — Store Appearance & White-Label Theme Engine
 *
 * Provides:
 * - Versioned theme persistence in PostgreSQL (with local snapshot fallback)
 * - 4 Visual Theme Presets: Crescendo, Velora, Aero Step, Philox
 * - Draft & Published state management with reversible rollback
 * - 6 Default Hero Carousel Slides (supports unlimited dynamic slides)
 * - Reorderable Homepage Section builder
 * - Brand identity, color tokens, typography, and responsive styling customizer
 * - Content sanitization preventing unsafe script injection
 */

import fs from "fs";
import path from "path";
import { Pool } from "pg";
import {
  ThemeConfig,
  ThemePresetId,
  HeroSlide,
  HomepageSection,
  ThemeVersionRecord,
} from "@the-ecom-buddy/types";
import { THEME_PRESET_SPECS } from "@the-ecom-buddy/ui";

const DATA_DIR = path.join(process.cwd(), "data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "theme-config.json");

// PostgreSQL pool
let pgPool: Pool | null = null;

function getPool(): Pool {
  if (!pgPool) {
    const connectionString =
      process.env.DATABASE_URL ||
      "postgres://postgres:password@localhost:5432/medusa_ecom_buddy";
    pgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pgPool;
}

/**
 * 6 Default Production Hero Carousel Slides
 * Adhering strictly to Reference 02 Crescendo and real catalog categories
 */
export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: "slide_01_audio",
    isActive: true,
    displayOrder: 1,
    heading: "Immersive Sound Engineered for Audiophiles",
    subheading: "FLAGSHIP ACOUSTICS",
    description:
      "Studio-grade active noise cancellation with 40mm titanium drivers and 60-hour lossless playback.",
    ctaLabel: "Explore Audio Gear",
    ctaDestination: "/categories/electronics-audio",
    desktopImageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    textAlignment: "left",
    overlayColor: "#0B0F19",
    overlayOpacity: 45,
    textColor: "#F9FAFB",
    buttonBgColor: "#10B981",
    buttonTextColor: "#FFFFFF",
    badge: "New Release",
  },
  {
    id: "slide_02_wearables",
    isActive: true,
    displayOrder: 2,
    heading: "Precision Health & Bio-Metric Intelligence",
    subheading: "SMART HOROLOGY",
    description:
      "Continuous SpO2, HRV tracking, aerospace-grade titanium chassis, and sapphire crystal display.",
    ctaLabel: "Shop Smartwatches",
    ctaDestination: "/categories/sports-fitness",
    desktopImageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    textAlignment: "center",
    overlayColor: "#0B0F19",
    overlayOpacity: 40,
    textColor: "#FFFFFF",
    buttonBgColor: "#3B82F6",
    buttonTextColor: "#FFFFFF",
    badge: "Bestseller",
  },
  {
    id: "slide_03_home",
    isActive: true,
    displayOrder: 3,
    heading: "Artisanal Living & Sustainable Kitchenware",
    subheading: "HEIRLOOM CRAFT",
    description:
      "Hand-hammered pure copper cookware, natural stoneware, and slow-crafted home decor essentials.",
    ctaLabel: "Discover Living",
    ctaDestination: "/categories/home-kitchen-living",
    desktopImageUrl:
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1600&q=80",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
    textAlignment: "left",
    overlayColor: "#060911",
    overlayOpacity: 35,
    textColor: "#F9FAFB",
    buttonBgColor: "#C28E5C",
    buttonTextColor: "#FFFFFF",
    badge: "Eco-Conscious",
  },
  {
    id: "slide_04_wellness",
    isActive: true,
    displayOrder: 4,
    heading: "Pure Ayurvedic Botanics & Clean Radiance",
    subheading: "HOLISTIC BEAUTY",
    description:
      "Cold-pressed herbal elixirs, organic saffron facial serums, and restorative therapeutic botanicals.",
    ctaLabel: "Shop Clean Beauty",
    ctaDestination: "/categories/health-ayurvedic-wellness",
    desktopImageUrl:
      "https://images.unsplash.com/photo-1608248597359-3351d38eb5e1?auto=format&fit=crop&w=1600&q=80",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1608248597359-3351d38eb5e1?auto=format&fit=crop&w=800&q=80",
    textAlignment: "right",
    overlayColor: "#111827",
    overlayOpacity: 50,
    textColor: "#FFFFFF",
    buttonBgColor: "#10B981",
    buttonTextColor: "#FFFFFF",
    badge: "100% Certified Organic",
  },
  {
    id: "slide_05_apparel",
    isActive: true,
    displayOrder: 5,
    heading: "Timeless Handwoven Festive & Ethnic Wear",
    subheading: "HERITAGE TEXTILES",
    description:
      "Breathable organic linen kurtas, raw tussar silk stoles, and contemporary artisanal silhouettes.",
    ctaLabel: "Explore Collection",
    ctaDestination: "/categories/apparel-ethnic-wear",
    desktopImageUrl:
      "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1600&q=80",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80",
    textAlignment: "left",
    overlayColor: "#1C1917",
    overlayOpacity: 40,
    textColor: "#FAFAF9",
    buttonBgColor: "#C28E5C",
    buttonTextColor: "#FFFFFF",
    badge: "Artisanal",
  },
  {
    id: "slide_06_fitness",
    isActive: true,
    displayOrder: 6,
    heading: "Engineered for Peak Athletic Agility",
    subheading: "PERFORMANCE GEAR",
    description:
      "Ergonomic resistance training systems, speed jump ropes, and high-tensile recovery mobility gear.",
    ctaLabel: "Shop Fitness",
    ctaDestination: "/categories/sports-fitness",
    desktopImageUrl:
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1600&q=80",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
    textAlignment: "center",
    overlayColor: "#0B0F19",
    overlayOpacity: 45,
    textColor: "#FFFFFF",
    buttonBgColor: "#EF4444",
    buttonTextColor: "#FFFFFF",
    badge: "High Endurance",
  },
];

/**
 * 9 Standard Homepage Sections
 */
export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  {
    id: "sec_hero",
    type: "hero_slider",
    title: "Flagship Hero Carousel",
    subtitle: "Dynamic editorial hero presentation with 6 curated slides",
    isEnabled: true,
    displayOrder: 1,
    config: {
      showArrows: true,
      showDots: true,
      autoplay: true,
      autoplaySpeed: 5000,
    },
  },
  {
    id: "sec_trust",
    type: "trust_benefits",
    title: "Store Guarantees & Trust Bar",
    subtitle: "Key merchant service commitments",
    isEnabled: true,
    displayOrder: 2,
    config: {
      items: [
        { title: "Pan-India Express Air", desc: "Fast 2-4 day delivery" },
        { title: "Cash on Delivery Available", desc: "Pay safely at doorstep" },
        { title: "7-Day Easy Returns", desc: "No questions asked guarantee" },
        { title: "100% Genuine & Verified", desc: "Direct authentic craft" },
      ],
    },
  },
  {
    id: "sec_categories",
    type: "featured_categories",
    title: "Curated Catalog Categories",
    subtitle: "Browse our 8 authentic consumer categories",
    isEnabled: true,
    displayOrder: 3,
    config: {
      limit: 8,
      layout: "grid_4",
    },
  },
  {
    id: "sec_promo_banner",
    type: "promotional_banner",
    title: "Festive Season Showcase",
    subtitle: "Philox Reference 05 High-Impact Split Promotion",
    isEnabled: true,
    displayOrder: 4,
    config: {
      badge: "LIMITED TIME OFFER",
      headline: "Festive Celebration Savings Up to 30% Off",
      description: "Use coupon code WELCOME10 or FLAT100 during checkout.",
      ctaLabel: "Shop Festive Specials",
      ctaLink: "/collections/festive-specials",
      bgColor: "#0B0F19",
      accentColor: "#10B981",
    },
  },
  {
    id: "sec_featured_products",
    type: "featured_products",
    title: "Editor's Spotlight Picks",
    subtitle: "Hand-selected top performers from our 520 catalog items",
    isEnabled: true,
    displayOrder: 5,
    config: {
      limit: 6,
      showPrice: true,
      showBadges: true,
    },
  },
  {
    id: "sec_new_arrivals",
    type: "new_arrivals",
    title: "Fresh Seasonal Arrivals",
    subtitle: "Recently added catalog items",
    isEnabled: true,
    displayOrder: 6,
    config: {
      limit: 4,
    },
  },
  {
    id: "sec_bestsellers",
    type: "best_sellers",
    title: "Customer Favorites & Bestsellers",
    subtitle: "Most sought-after items across all regions",
    isEnabled: true,
    displayOrder: 7,
    config: {
      limit: 4,
    },
  },
  {
    id: "sec_editorial",
    type: "editorial_story",
    title: "Craftsmanship & White-Label Independence",
    subtitle: "Our Brand Journey",
    isEnabled: true,
    displayOrder: 8,
    config: {
      headline: "Direct-to-Consumer Excellence Without Centralized SaaS Limits",
      paragraph:
        "The Ecom Buddy empowers self-hosted merchants with complete data sovereignty, native multi-currency commerce, and lightning-fast storefronts.",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
    },
  },
  {
    id: "sec_newsletter",
    type: "newsletter",
    title: "Stay Connected With The Ecom Buddy",
    subtitle: "Subscribe for product drops, exclusive seasonal discounts, and member perks.",
    isEnabled: true,
    displayOrder: 9,
    config: {
      placeholder: "Enter your personal email...",
      buttonLabel: "Join Club",
    },
  },
];

/**
 * Baseline Production Theme Config (Crescendo Preset Default)
 */
export function createDefaultThemeConfig(): ThemeConfig {
  const spec = THEME_PRESET_SPECS.crescendo;
  return {
    id: "theme_cfg_default",
    version: 1,
    status: "published",
    presetId: "crescendo",
    presetName: spec.name,
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),

    identity: {
      storeName: "The Ecom Buddy",
      tagline: "Modern Lifestyle & Everyday Essentials",
      logoUrl: "/images/logo.svg",
      faviconUrl: "/favicon.ico",
      contactEmail: "support@theecombuddy.in",
      contactPhone: "+91 98765 43210",
      contactAddress: "Maker Maxity, Bandra Kurla Complex, Mumbai, MH 400051, India",
      businessHours: "Mon – Sat: 9:00 AM – 7:00 PM IST",
      socialLinks: {
        instagram: "https://instagram.com/theecombuddy",
        facebook: "https://facebook.com/theecombuddy",
        twitter: "https://twitter.com/theecombuddy",
        youtube: "https://youtube.com/@theecombuddy",
        linkedin: "https://linkedin.com/company/theecombuddy",
      },
    },

    typography: {
      displayFont: "Plus Jakarta Sans",
      bodyFont: "Inter",
      monoFont: "JetBrains Mono",
      headingWeight: "semibold",
      bodySize: "base",
    },

    colors: { ...spec.defaultColors },

    styling: {
      borderRadius: spec.borderRadius,
      buttonStyle: spec.buttonStyle,
      cardStyle: spec.cardStyle,
      headerStyle: spec.headerStyle,
    },

    announcement: {
      enabled: true,
      text: "⚡ FESTIVE FLASH SALE: Flat ₹100 Off + Free Shipping across India! Use code FLAT100",
      linkUrl: "/collections/festive-specials",
      bgColor: "#10B981",
      textColor: "#FFFFFF",
      closeable: true,
    },

    navigation: {
      menuItems: [
        { id: "nav_1", label: "Shop All", href: "/products" },
        { id: "nav_2", label: "Electronics", href: "/categories/electronics-audio" },
        { id: "nav_3", label: "Home Living", href: "/categories/home-kitchen-living" },
        { id: "nav_4", label: "Wellness", href: "/categories/health-ayurvedic-wellness" },
        { id: "nav_5", label: "Apparel", href: "/categories/apparel-ethnic-wear" },
        { id: "nav_6", label: "Festive Deals", href: "/collections/festive-specials", badge: "HOT" },
      ],
      showSearch: true,
      showAccount: true,
      showCart: true,
      showCurrencyPicker: true,
    },

    heroSlider: {
      autoplay: true,
      autoplaySpeed: 5000,
      showArrows: true,
      showDots: true,
      slides: [...DEFAULT_HERO_SLIDES],
    },

    sections: [...DEFAULT_HOMEPAGE_SECTIONS],

    footer: {
      tagline: "Independently self-hosted direct-to-consumer e-commerce platform.",
      copyrightText: "© 2026 The Ecom Buddy. All rights reserved. Self-Hosted White-Label License.",
      columns: [
        {
          id: "col_shop",
          title: "Shop Categories",
          links: [
            { id: "l1", label: "Electronics & Audio", href: "/categories/electronics-audio" },
            { id: "l2", label: "Home & Kitchen", href: "/categories/home-kitchen-living" },
            { id: "l3", label: "Ayurvedic Care", href: "/categories/health-ayurvedic-wellness" },
            { id: "l4", label: "Ethnic Apparel", href: "/categories/apparel-ethnic-wear" },
          ],
        },
        {
          id: "col_help",
          title: "Customer Support",
          links: [
            { id: "l5", label: "Track My Order", href: "/orders" },
            { id: "l6", label: "Shipping Policy", href: "/shipping" },
            { id: "l7", label: "Returns & Exchanges", href: "/returns" },
            { id: "l8", label: "COD Terms & Conditions", href: "/cod-terms" },
          ],
        },
        {
          id: "col_company",
          title: "The Ecom Buddy",
          links: [
            { id: "l9", label: "About Our Craft", href: "/about" },
            { id: "l10", label: "Global Selling (US, UK, UAE, EU)", href: "/global" },
            { id: "l11", label: "Contact Us", href: "/contact" },
            { id: "l12", label: "Privacy Policy", href: "/privacy" },
          ],
        },
      ],
      showNewsletter: true,
      newsletterTitle: "Join the Exclusive Community",
      newsletterSubtitle: "Get early access to drops and festive coupons.",
      showPaymentIcons: true,
    },

    domain: {
      primaryDomain: "localhost:3000",
      customDomain: "theecombuddy.local",
      sslStatus: "active",
    },
  };
}

/**
 * XSS & Malicious Input Sanitizer
 */
export function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+="[^"]*"/gi, "")
      .replace(/on\w+='[^']*'/gi, "");
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (input !== null && typeof input === "object") {
    const res: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      res[key] = sanitizeInput(input[key]);
    }
    return res;
  }
  return input;
}

/**
 * Theme Customizer Service Implementation
 */
export class ThemeService {
  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * Local snapshot backup reader
   */
  private readLocalSnapshot(): { draft?: ThemeConfig; published?: ThemeConfig } {
    this.ensureDirectory();
    if (fs.existsSync(SNAPSHOT_FILE)) {
      try {
        const raw = fs.readFileSync(SNAPSHOT_FILE, "utf-8");
        return JSON.parse(raw);
      } catch (err) {
        console.warn("[theme-service] Failed to parse local theme snapshot:", err);
      }
    }
    return {};
  }

  /**
   * Local snapshot backup writer
   */
  private writeLocalSnapshot(snapshot: { draft?: ThemeConfig; published?: ThemeConfig }) {
    this.ensureDirectory();
    try {
      fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
    } catch (err) {
      console.warn("[theme-service] Failed to write local theme snapshot:", err);
    }
  }

  /**
   * Initialize or retrieve current theme configuration
   */
  async getTheme(status: "draft" | "published" = "draft"): Promise<ThemeConfig> {
    try {
      const pool = getPool();
      // Try to read requested status from PostgreSQL
      const res = await pool.query(
        "SELECT id, version, status, preset_id, name, theme_data, updated_at, published_at FROM theme_configurations WHERE status = $1 ORDER BY version DESC LIMIT 1",
        [status]
      );

      if (res.rows.length > 0) {
        const row = res.rows[0];
        const config: ThemeConfig = {
          ...row.theme_data,
          id: row.id,
          version: row.version,
          status: row.status,
          presetId: row.preset_id,
          presetName: row.name,
          updatedAt: row.updated_at.toISOString(),
          publishedAt: row.published_at ? row.published_at.toISOString() : null,
        };
        return config;
      }

      // If looking for draft and only published exists, create draft from published
      if (status === "draft") {
        const pubRes = await pool.query(
          "SELECT id, version, status, preset_id, name, theme_data, updated_at, published_at FROM theme_configurations WHERE status = 'published' ORDER BY version DESC LIMIT 1"
        );
        if (pubRes.rows.length > 0) {
          const pubRow = pubRes.rows[0];
          const draftConfig: ThemeConfig = {
            ...pubRow.theme_data,
            id: `theme_cfg_draft_${Date.now()}`,
            version: pubRow.version,
            status: "draft",
            presetId: pubRow.preset_id,
            presetName: pubRow.name,
            updatedAt: new Date().toISOString(),
            publishedAt: null,
          };
          await this.saveDraft(draftConfig);
          return draftConfig;
        }
      }

      // If no theme in DB, bootstrap default theme directly into PostgreSQL
      const defaultConfig = createDefaultThemeConfig();
      await pool.query(
        `INSERT INTO theme_configurations (id, version, status, preset_id, name, theme_data, created_by, created_at, updated_at, published_at)
         VALUES ($1, $2, 'published', $3, $4, $5, 'system', NOW(), NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [defaultConfig.id, 1, defaultConfig.presetId, defaultConfig.presetName, JSON.stringify(defaultConfig)]
      );
      await pool.query(
        `INSERT INTO theme_configurations (id, version, status, preset_id, name, theme_data, created_by, created_at, updated_at)
         VALUES ($1, $2, 'draft', $3, $4, $5, 'system', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [`theme_cfg_draft_init`, 1, defaultConfig.presetId, defaultConfig.presetName, JSON.stringify(defaultConfig)]
      );
      this.writeLocalSnapshot({ draft: defaultConfig, published: defaultConfig });
      return defaultConfig;
    } catch (dbErr: any) {
      console.warn("[theme-service] PostgreSQL read error, falling back to local snapshot:", dbErr.message);

      // Fallback to local snapshot file
      const snapshot = this.readLocalSnapshot();
      if (status === "published" && snapshot.published) {
        return snapshot.published;
      }
      if (snapshot.draft) {
        return snapshot.draft;
      }

      const defaultConfig = createDefaultThemeConfig();
      this.writeLocalSnapshot({ draft: defaultConfig, published: defaultConfig });
      return defaultConfig;
    }
  }

  /**
   * Save or update draft configuration
   */
  async saveDraft(updates: Partial<ThemeConfig>, userId: string = "admin@theecombuddy.local"): Promise<ThemeConfig> {
    let current: ThemeConfig;
    try {
      const pool = getPool();
      const res = await pool.query(
        "SELECT theme_data FROM theme_configurations WHERE status = 'draft' ORDER BY version DESC LIMIT 1"
      );
      if (res.rows.length > 0) {
        current = res.rows[0].theme_data;
      } else {
        current = createDefaultThemeConfig();
      }
    } catch {
      const snap = this.readLocalSnapshot();
      current = snap.draft || createDefaultThemeConfig();
    }
    const sanitized = sanitizeInput(updates);

    const merged: ThemeConfig = {
      ...current,
      ...sanitized,
      id: current.id || `theme_cfg_draft_${Date.now()}`,
      status: "draft",
      updatedAt: new Date().toISOString(),
      identity: { ...(current.identity || {}), ...(sanitized.identity || {}) },
      typography: { ...(current.typography || {}), ...(sanitized.typography || {}) },
      colors: { ...(current.colors || {}), ...(sanitized.colors || {}) },
      styling: { ...(current.styling || {}), ...(sanitized.styling || {}) },
      announcement: { ...(current.announcement || {}), ...(sanitized.announcement || {}) },
      navigation: { ...(current.navigation || {}), ...(sanitized.navigation || {}) },
      heroSlider: { ...(current.heroSlider || {}), ...(sanitized.heroSlider || {}) },
      sections: sanitized.sections || current.sections || DEFAULT_HOMEPAGE_SECTIONS,
      footer: { ...(current.footer || {}), ...(sanitized.footer || {}) },
      domain: { ...(current.domain || {}), ...(sanitized.domain || {}) },
    };

    try {
      const pool = getPool();
      // Check if draft exists in PostgreSQL
      const checkRes = await pool.query(
        "SELECT id FROM theme_configurations WHERE status = 'draft' LIMIT 1"
      );

      if (checkRes.rows.length > 0) {
        await pool.query(
          `UPDATE theme_configurations 
           SET preset_id = $1, name = $2, theme_data = $3, updated_at = NOW(), created_by = $4
           WHERE status = 'draft'`,
          [merged.presetId, merged.presetName, JSON.stringify(merged), userId]
        );
      } else {
        await pool.query(
          `INSERT INTO theme_configurations (id, version, status, preset_id, name, theme_data, created_by, created_at, updated_at)
           VALUES ($1, $2, 'draft', $3, $4, $5, $6, NOW(), NOW())`,
          [merged.id, merged.version, merged.presetId, merged.presetName, JSON.stringify(merged), userId]
        );
      }
    } catch (err: any) {
      console.warn("[theme-service] Database error saving draft, updating local snapshot:", err.message);
    }

    // Persist snapshot
    const snap = this.readLocalSnapshot();
    this.writeLocalSnapshot({ ...snap, draft: merged });

    return merged;
  }

  /**
   * Publish Draft Configuration into a new versioned release
   */
  async publishTheme(userId: string = "admin@theecombuddy.local"): Promise<ThemeConfig> {
    const draft = await this.getTheme("draft");
    const now = new Date().toISOString();

    try {
      const pool = getPool();

      // Find highest published version
      const maxRes = await pool.query(
        "SELECT MAX(version) as max_ver FROM theme_configurations"
      );
      const nextVersion = (maxRes.rows[0]?.max_ver || 0) + 1;

      // Mark previously published themes as archived
      await pool.query(
        "UPDATE theme_configurations SET status = 'archived' WHERE status = 'published'"
      );

      const publishedConfig: ThemeConfig = {
        ...draft,
        id: `theme_cfg_v${nextVersion}_${Date.now()}`,
        version: nextVersion,
        status: "published",
        updatedAt: now,
        publishedAt: now,
      };

      // Insert new published record
      await pool.query(
        `INSERT INTO theme_configurations (id, version, status, preset_id, name, theme_data, created_by, created_at, updated_at, published_at)
         VALUES ($1, $2, 'published', $3, $4, $5, $6, NOW(), NOW(), NOW())`,
        [
          publishedConfig.id,
          nextVersion,
          publishedConfig.presetId,
          publishedConfig.presetName,
          JSON.stringify(publishedConfig),
          userId,
        ]
      );

      // Keep draft in sync with updated version
      await pool.query(
        `UPDATE theme_configurations SET version = $1, theme_data = $2, updated_at = NOW() WHERE status = 'draft'`,
        [nextVersion, JSON.stringify({ ...publishedConfig, status: "draft" })]
      );

      // Update snapshot
      const snap = this.readLocalSnapshot();
      this.writeLocalSnapshot({
        ...snap,
        published: publishedConfig,
        draft: { ...publishedConfig, status: "draft" },
      });

      return publishedConfig;
    } catch (err: any) {
      console.warn("[theme-service] Error publishing theme to DB, updating snapshot fallback:", err.message);

      const snap = this.readLocalSnapshot();
      const currentVer = draft.version || 1;
      const publishedConfig: ThemeConfig = {
        ...draft,
        id: `theme_cfg_v${currentVer + 1}`,
        version: currentVer + 1,
        status: "published",
        updatedAt: now,
        publishedAt: now,
      };
      this.writeLocalSnapshot({
        ...snap,
        published: publishedConfig,
        draft: { ...publishedConfig, status: "draft" },
      });
      return publishedConfig;
    }
  }

  /**
   * Roll back to a previous version
   */
  async rollbackToVersion(version: number, userId: string = "admin@theecombuddy.local"): Promise<ThemeConfig> {
    try {
      const pool = getPool();
      const res = await pool.query(
        "SELECT id, version, status, preset_id, name, theme_data FROM theme_configurations WHERE version = $1 ORDER BY created_at DESC LIMIT 1",
        [version]
      );

      if (res.rows.length === 0) {
        throw new Error(`Theme configuration version ${version} not found`);
      }

      const targetData = res.rows[0].theme_data;

      // Copy target version data as active draft
      const rolledBackDraft: ThemeConfig = {
        ...targetData,
        id: `theme_cfg_draft_${Date.now()}`,
        status: "draft",
        updatedAt: new Date().toISOString(),
      };

      await this.saveDraft(rolledBackDraft, userId);
      return rolledBackDraft;
    } catch (err: any) {
      console.error("[theme-service] Rollback failed:", err.message);
      throw err;
    }
  }

  /**
   * Retrieve version history records
   */
  async getHistory(): Promise<ThemeVersionRecord[]> {
    try {
      const pool = getPool();
      const res = await pool.query(
        `SELECT id, version, status, preset_id, name, created_by, created_at, published_at 
         FROM theme_configurations 
         ORDER BY version DESC, created_at DESC`
      );

      return res.rows.map((row: any) => ({
        id: row.id,
        version: row.version,
        status: row.status,
        presetId: row.preset_id,
        name: row.name,
        createdBy: row.created_by,
        createdAt: row.created_at.toISOString(),
        publishedAt: row.published_at ? row.published_at.toISOString() : null,
      }));
    } catch (err: any) {
      console.warn("[theme-service] Error reading version history from DB:", err.message);
      return [
        {
          id: "theme_cfg_v1_fallback",
          version: 1,
          status: "published",
          presetId: "crescendo",
          name: "Crescendo Electronics v1",
          createdBy: "system@theecombuddy.local",
          createdAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
        },
      ];
    }
  }

  /**
   * Apply Theme Preset (Crescendo, Velora, Aero Step, Philox)
   */
  async applyPreset(presetId: ThemePresetId, userId: string = "admin@theecombuddy.local"): Promise<ThemeConfig> {
    const spec = THEME_PRESET_SPECS[presetId];
    if (!spec) {
      throw new Error(`Unsupported theme preset: ${presetId}`);
    }

    const currentDraft = await this.getTheme("draft");

    const updated: Partial<ThemeConfig> = {
      presetId,
      presetName: spec.name,
      typography: {
        ...currentDraft.typography,
        displayFont: spec.displayFont,
        bodyFont: spec.bodyFont,
      },
      colors: {
        ...currentDraft.colors,
        ...spec.defaultColors,
      },
      styling: {
        ...currentDraft.styling,
        borderRadius: spec.borderRadius,
        buttonStyle: spec.buttonStyle,
        cardStyle: spec.cardStyle,
        headerStyle: spec.headerStyle,
      },
    };

    return await this.saveDraft(updated, userId);
  }

  /**
   * Add a new hero slide (supports unlimited slides)
   */
  async addSlide(slideData: Partial<HeroSlide>, userId?: string): Promise<HeroSlide> {
    const draft = await this.getTheme("draft");
    const slides = draft.heroSlider?.slides || [];

    const newSlide: HeroSlide = {
      id: `slide_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isActive: slideData.isActive !== false,
      displayOrder: slides.length + 1,
      heading: sanitizeInput(slideData.heading || "Special Seasonal Feature"),
      subheading: sanitizeInput(slideData.subheading || "EXCLUSIVE PROMOTION"),
      description: sanitizeInput(
        slideData.description || "Discover hand-curated selections backed by verified quality and fast delivery."
      ),
      ctaLabel: sanitizeInput(slideData.ctaLabel || "Shop Collection"),
      ctaDestination: sanitizeInput(slideData.ctaDestination || "/products"),
      desktopImageUrl:
        slideData.desktopImageUrl ||
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
      mobileImageUrl:
        slideData.mobileImageUrl ||
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
      textAlignment: slideData.textAlignment || "left",
      overlayColor: slideData.overlayColor || "#0B0F19",
      overlayOpacity: Number(slideData.overlayOpacity ?? 40),
      textColor: slideData.textColor || "#F9FAFB",
      buttonBgColor: slideData.buttonBgColor || draft.colors.brandPrimary || "#10B981",
      buttonTextColor: slideData.buttonTextColor || "#FFFFFF",
      badge: sanitizeInput(slideData.badge || "Featured"),
      schedule: slideData.schedule || {},
    };

    const updatedSlides = [...slides, newSlide];
    await this.saveDraft(
      {
        heroSlider: {
          ...draft.heroSlider,
          slides: updatedSlides,
        },
      },
      userId
    );

    return newSlide;
  }

  /**
   * Update an existing hero slide
   */
  async updateSlide(slideId: string, updates: Partial<HeroSlide>, userId?: string): Promise<HeroSlide> {
    const draft = await this.getTheme("draft");
    const slides = draft.heroSlider?.slides || [];
    const index = slides.findIndex((s) => s.id === slideId);

    if (index === -1) {
      throw new Error(`Slide '${slideId}' not found`);
    }

    const sanitized = sanitizeInput(updates);
    const updatedSlide: HeroSlide = {
      ...slides[index],
      ...sanitized,
    };

    slides[index] = updatedSlide;
    await this.saveDraft(
      {
        heroSlider: {
          ...draft.heroSlider,
          slides,
        },
      },
      userId
    );

    return updatedSlide;
  }

  /**
   * Delete a hero slide
   */
  async deleteSlide(slideId: string, userId?: string): Promise<boolean> {
    const draft = await this.getTheme("draft");
    const slides = draft.heroSlider?.slides || [];
    const filtered = slides.filter((s) => s.id !== slideId);

    if (filtered.length === slides.length) {
      throw new Error(`Slide '${slideId}' not found`);
    }

    // Recalculate displayOrder
    const reordered = filtered.map((s, idx) => ({ ...s, displayOrder: idx + 1 }));

    await this.saveDraft(
      {
        heroSlider: {
          ...draft.heroSlider,
          slides: reordered,
        },
      },
      userId
    );

    return true;
  }

  /**
   * Reorder hero slides
   */
  async reorderSlides(slideIds: string[], userId?: string): Promise<HeroSlide[]> {
    const draft = await this.getTheme("draft");
    const slides = draft.heroSlider?.slides || [];
    const slideMap = new Map(slides.map((s) => [s.id, s]));

    const reordered: HeroSlide[] = [];
    slideIds.forEach((id, index) => {
      const slide = slideMap.get(id);
      if (slide) {
        reordered.push({ ...slide, displayOrder: index + 1 });
      }
    });

    // Add any slides not included in slideIds at the end
    slides.forEach((s) => {
      if (!slideIds.includes(s.id)) {
        reordered.push({ ...s, displayOrder: reordered.length + 1 });
      }
    });

    await this.saveDraft(
      {
        heroSlider: {
          ...draft.heroSlider,
          slides: reordered,
        },
      },
      userId
    );

    return reordered;
  }

  /**
   * Reorder or toggle homepage sections
   */
  async reorderSections(sectionIds: string[], userId?: string): Promise<HomepageSection[]> {
    const draft = await this.getTheme("draft");
    const sections = draft.sections || DEFAULT_HOMEPAGE_SECTIONS;
    const secMap = new Map(sections.map((s) => [s.id, s]));

    const reordered: HomepageSection[] = [];
    sectionIds.forEach((id, idx) => {
      const sec = secMap.get(id);
      if (sec) {
        reordered.push({ ...sec, displayOrder: idx + 1 });
      }
    });

    // Add any missing sections
    sections.forEach((s) => {
      if (!sectionIds.includes(s.id)) {
        reordered.push({ ...s, displayOrder: reordered.length + 1 });
      }
    });

    await this.saveDraft({ sections: reordered }, userId);
    return reordered;
  }
}

export const themeService = new ThemeService();
