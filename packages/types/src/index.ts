import { z } from "zod";

/**
 * Health Check API Response Schema
 */
export const HealthCheckResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: z.string(),
  environment: z.string().optional(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

/**
 * India-First Currency & Pricing Types
 */
export type SupportedCurrency = "INR" | "USD" | "EUR" | "GBP" | "AED";

export interface MoneyAmount {
  amount: number;
  currency_code: SupportedCurrency;
}

/**
 * Custom Module Types Reference (Standardized Naming)
 */
export interface CarouselSlideDTO {
  id: string;
  is_active: boolean;
  display_order: number;
  title: string;
  subtitle?: string | null;
  image_desktop_url: string;
  image_mobile_url: string;
  cta_label: string;
  cta_link: string;
  text_alignment: "left" | "center" | "right";
  scrim_opacity: number;
}

export interface ThemeConfigDTO {
  id: string;
  brand_name: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color: string;
  accent_color: string;
  surface_color: string;
  typography_preset: string;
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_link: string;
  announcement_bg_color: string;
  announcement_text_color: string;
}

/**
 * ==============================================================================
 * Milestone 03E: Store Appearance, Brand Customization & Theme Architecture Types
 * ==============================================================================
 */

export type ThemePresetId = "crescendo" | "velora" | "aero_step" | "philox";

export interface HeroSlide {
  id: string;
  isActive: boolean;
  displayOrder: number;
  heading: string;
  subheading?: string;
  description: string;
  ctaLabel: string;
  ctaDestination: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  textAlignment: "left" | "center" | "right";
  overlayColor: string;
  overlayOpacity: number; // 0 to 100
  textColor: string;
  buttonBgColor: string;
  buttonTextColor: string;
  badge?: string;
  schedule?: {
    startsAt?: string | null;
    endsAt?: string | null;
  };
}

export type SectionType =
  | "hero_slider"
  | "featured_categories"
  | "featured_products"
  | "promotional_banner"
  | "new_arrivals"
  | "best_sellers"
  | "editorial_story"
  | "trust_benefits"
  | "newsletter"
  | "footer";

export interface HomepageSection {
  id: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  isEnabled: boolean;
  displayOrder: number;
  config: Record<string, any>;
}

export interface ThemeConfig {
  id: string;
  version: number;
  status: "draft" | "published" | "archived";
  presetId: ThemePresetId;
  presetName: string;
  updatedAt: string;
  publishedAt?: string | null;

  // 1. Store Identity & Brand
  identity: {
    storeName: string;
    tagline: string;
    logoUrl: string;
    faviconUrl: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    businessHours: string;
    socialLinks: {
      instagram?: string;
      facebook?: string;
      twitter?: string;
      youtube?: string;
      linkedin?: string;
    };
  };

  // 2. Visual Styling Tokens & Typography
  typography: {
    displayFont: "Playfair Display" | "Instrument Serif" | "Outfit" | "Cinzel" | "Plus Jakarta Sans";
    bodyFont: "Plus Jakarta Sans" | "Inter" | "Geist" | "Roboto";
    monoFont: "JetBrains Mono" | "Geist Mono";
    headingWeight: "normal" | "medium" | "semibold" | "bold";
    bodySize: "sm" | "base" | "lg";
  };

  // 3. Color Tokens
  colors: {
    brandPrimary: string;
    brandPrimaryHover: string;
    brandAccent: string;
    brandAccentHover: string;
    surfaceBase: string;
    surfaceSubtle: string;
    surfaceMuted: string;
    surfaceInverted: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textInverted: string;
    borderSubtle: string;
    borderStrong: string;
    headerBg: string;
    headerText: string;
    footerBg: string;
    footerText: string;
  };

  // 4. Component Styling
  styling: {
    borderRadius: "none" | "sm" | "md" | "lg" | "xl" | "full";
    buttonStyle: "sharp" | "rounded" | "pill";
    cardStyle: "flat" | "bordered" | "elevated" | "tactile";
    headerStyle: "floating" | "sticky" | "minimal" | "stacked";
  };

  // 5. Announcement Bar
  announcement: {
    enabled: boolean;
    text: string;
    linkUrl?: string;
    bgColor: string;
    textColor: string;
    closeable: boolean;
  };

  // 6. Navigation
  navigation: {
    menuItems: Array<{
      id: string;
      label: string;
      href: string;
      badge?: string;
      isExternal?: boolean;
    }>;
    showSearch: boolean;
    showAccount: boolean;
    showCart: boolean;
    showCurrencyPicker: boolean;
  };

  // 7. Hero Slider
  heroSlider: {
    autoplay: boolean;
    autoplaySpeed: number;
    showArrows: boolean;
    showDots: boolean;
    slides: HeroSlide[];
  };

  // 8. Homepage Sections
  sections: HomepageSection[];

  // 9. Footer
  footer: {
    tagline: string;
    copyrightText: string;
    columns: Array<{
      id: string;
      title: string;
      links: Array<{ id: string; label: string; href: string }>;
    }>;
    showNewsletter: boolean;
    newsletterTitle: string;
    newsletterSubtitle: string;
    showPaymentIcons: boolean;
  };

  // 10. Custom Domain Info
  domain: {
    primaryDomain: string;
    customDomain?: string;
    sslStatus: "active" | "pending" | "none";
  };
}

export interface ThemeVersionRecord {
  id: string;
  version: number;
  status: "draft" | "published" | "archived";
  presetId: string;
  name: string;
  createdBy: string;
  createdAt: string;
  publishedAt?: string | null;
}

export interface PublicPublishedTheme {
  version: number;
  presetId: ThemePresetId;
  presetName: string;
  publishedAt: string;
  identity: ThemeConfig["identity"];
  typography: ThemeConfig["typography"];
  colors: ThemeConfig["colors"];
  styling: ThemeConfig["styling"];
  announcement: ThemeConfig["announcement"];
  navigation: ThemeConfig["navigation"];
  heroSlider: {
    autoplay: boolean;
    autoplaySpeed: number;
    showArrows: boolean;
    showDots: boolean;
    slides: HeroSlide[];
  };
  sections: HomepageSection[];
  footer: ThemeConfig["footer"];
  domain: ThemeConfig["domain"];
}
