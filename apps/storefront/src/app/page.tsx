import React from "react";
import {
  getPublishedTheme,
  getStoreRegions,
  getStoreCategories,
  getStoreProducts,
} from "@/lib/medusa-client";
import { StorefrontClient } from "@/components/StorefrontClient";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [theme, regions, categories] = await Promise.all([
    getPublishedTheme(),
    getStoreRegions(),
    getStoreCategories(),
  ]);

  // Find India region or first available region
  const defaultRegion =
    regions.find((r) => r.currency_code?.toLowerCase() === "inr") ||
    regions[0] ||
    { id: "reg_default", name: "India", currency_code: "inr" };

  // Fetch initial products for default region
  const initialProducts = await getStoreProducts(defaultRegion?.id, 24);

  // Fallback theme in case no theme was published yet
  const effectiveTheme: PublicPublishedTheme = theme || {
    version: 1,
    presetId: "crescendo",
    presetName: "Crescendo Electronics",
    publishedAt: new Date().toISOString(),
    identity: {
      storeName: "The Ecom Buddy",
      tagline: "Independently Self-Hosted Direct-to-Consumer Commerce",
      logoUrl: "/images/logo.svg",
      faviconUrl: "/favicon.ico",
      contactEmail: "care@theecombuddy.in",
      contactPhone: "+91 98765 12345",
      contactAddress: "Maker Maxity, BKC, Mumbai, MH 400051",
      businessHours: "Mon – Sat: 9:00 AM – 7:00 PM IST",
      socialLinks: {
        twitter: "https://twitter.com/theecombuddy",
        instagram: "https://instagram.com/theecombuddy",
      },
    },
    typography: {
      displayFont: "Plus Jakarta Sans",
      bodyFont: "Inter",
      monoFont: "JetBrains Mono",
      headingWeight: "semibold",
      bodySize: "base",
    },
    colors: {
      brandPrimary: "#10B981",
      brandPrimaryHover: "#059669",
      brandAccent: "#3B82F6",
      brandAccentHover: "#2563EB",
      surfaceBase: "#0B0F19",
      surfaceSubtle: "#111827",
      surfaceMuted: "#1F2937",
      surfaceInverted: "#FFFFFF",
      textPrimary: "#F9FAFB",
      textSecondary: "#9CA3AF",
      textMuted: "#6B7280",
      textInverted: "#111827",
      borderSubtle: "#1F2937",
      borderStrong: "#374151",
      headerBg: "#0B0F19",
      headerText: "#F9FAFB",
      footerBg: "#060911",
      footerText: "#9CA3AF",
    },
    styling: {
      borderRadius: "sm",
      buttonStyle: "sharp",
      cardStyle: "bordered",
      headerStyle: "sticky",
    },
    announcement: {
      enabled: true,
      text: "🚀 FESTIVE LAUNCH: Direct Self-Hosted Direct-to-Consumer Savings with Code WELCOME10",
      bgColor: "#10B981",
      textColor: "#FFFFFF",
      closeable: true,
      linkUrl: "/products",
    },
    navigation: {
      menuItems: [
        { id: "nav_1", href: "/products", label: "Shop All" },
        { id: "nav_2", href: "/categories/electronics-audio", label: "Electronics" },
        { id: "nav_3", href: "/categories/home-kitchen-living", label: "Home Living" },
        { id: "nav_4", href: "/categories/health-ayurvedic-wellness", label: "Wellness" },
        { id: "nav_5", href: "/categories/apparel-ethnic-wear", label: "Apparel" },
        { id: "nav_6", href: "/collections/festive-specials", label: "Festive Deals", badge: "HOT" },
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
      slides: [
        {
          id: "slide_1",
          isActive: true,
          displayOrder: 1,
          heading: "Immersive Sound Engineered for Audiophiles",
          subheading: "FLAGSHIP ACOUSTICS",
          description: "Studio-grade active noise cancellation with 40mm titanium drivers and 60-hour lossless playback.",
          ctaLabel: "Explore Audio Gear",
          ctaDestination: "/categories/electronics-audio",
          desktopImageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80",
          mobileImageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
          textAlignment: "left",
          overlayColor: "#0B0F19",
          overlayOpacity: 45,
          textColor: "#F9FAFB",
          buttonBgColor: "#10B981",
          buttonTextColor: "#FFFFFF",
          badge: "New Release",
        },
      ],
    },
    sections: [
      {
        id: "sec_trust",
        type: "trust_benefits",
        title: "Store Guarantees",
        isEnabled: true,
        displayOrder: 1,
        config: {},
      },
      {
        id: "sec_hero",
        type: "hero_slider",
        title: "Flagship Hero Carousel",
        isEnabled: true,
        displayOrder: 2,
        config: {},
      },
      {
        id: "sec_categories",
        type: "featured_categories",
        title: "Curated Catalog Categories",
        isEnabled: true,
        displayOrder: 3,
        config: { limit: 8 },
      },
      {
        id: "sec_promo",
        type: "promotional_banner",
        title: "Festive Season Showcase",
        isEnabled: true,
        displayOrder: 4,
        config: {},
      },
      {
        id: "sec_products",
        type: "featured_products",
        title: "Editor's Spotlight Picks",
        isEnabled: true,
        displayOrder: 5,
        config: { limit: 8 },
      },
      {
        id: "sec_editorial",
        type: "editorial_story",
        title: "Craftsmanship & White-Label Independence",
        isEnabled: true,
        displayOrder: 6,
        config: {},
      },
      {
        id: "sec_newsletter",
        type: "newsletter",
        title: "Join the Exclusive Community",
        isEnabled: true,
        displayOrder: 7,
        config: {},
      },
    ],
    footer: {
      tagline: "Independently self-hosted direct-to-consumer e-commerce platform.",
      copyrightText: "© 2026 The Ecom Buddy. All rights reserved. Self-Hosted White-Label License.",
      columns: [],
      showNewsletter: true,
      newsletterTitle: "Join the Exclusive Community",
      newsletterSubtitle: "Get early access to drops and festive coupons.",
      showPaymentIcons: true,
    },
    domain: {
      primaryDomain: "localhost:3000",
      sslStatus: "active",
    },
  };

  return (
    <StorefrontClient
      theme={effectiveTheme}
      initialProducts={initialProducts}
      categories={categories}
      regions={regions}
      initialRegion={defaultRegion}
    />
  );
}
