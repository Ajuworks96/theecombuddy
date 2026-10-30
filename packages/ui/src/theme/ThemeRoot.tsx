"use client";

import React, { useMemo } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";

interface ThemeRootProps {
  theme: PublicPublishedTheme;
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

const RADIUS_MAP: Record<string, string> = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
};

const DISPLAY_FONTS: Record<string, string> = {
  "Playfair Display": "'Playfair Display', Georgia, serif",
  "Instrument Serif": "'Instrument Serif', Georgia, serif",
  Outfit: "'Outfit', sans-serif",
  Cinzel: "'Cinzel', serif",
  "Plus Jakarta Sans": "'Plus Jakarta Sans', sans-serif",
};

const BODY_FONTS: Record<string, string> = {
  "Plus Jakarta Sans": "'Plus Jakarta Sans', sans-serif",
  Inter: "'Inter', sans-serif",
  Geist: "'Geist', sans-serif",
  Roboto: "'Roboto', sans-serif",
};

export const ThemeRoot: React.FC<ThemeRootProps> = ({
  theme,
  children,
  className = "",
}) => {
  const cssVariables = useMemo(() => {
    const { colors, typography, styling } = theme;
    const radius = RADIUS_MAP[styling?.borderRadius || "sm"] || "4px";
    const displayFont = DISPLAY_FONTS[typography?.displayFont || "Plus Jakarta Sans"] || "sans-serif";
    const bodyFont = BODY_FONTS[typography?.bodyFont || "Inter"] || "sans-serif";
    const monoFont = typography?.monoFont === "Geist Mono" ? "'Geist Mono', monospace" : "'JetBrains Mono', monospace";

    return {
      "--brand-primary": colors?.brandPrimary || "#10B981",
      "--brand-primary-hover": colors?.brandPrimaryHover || "#059669",
      "--brand-accent": colors?.brandAccent || "#3B82F6",
      "--brand-accent-hover": colors?.brandAccentHover || "#2563EB",
      "--surface-base": colors?.surfaceBase || "#0B0F19",
      "--surface-subtle": colors?.surfaceSubtle || "#111827",
      "--surface-muted": colors?.surfaceMuted || "#1F2937",
      "--surface-inverted": colors?.surfaceInverted || "#FFFFFF",
      "--text-primary": colors?.textPrimary || "#F9FAFB",
      "--text-secondary": colors?.textSecondary || "#9CA3AF",
      "--text-muted": colors?.textMuted || "#6B7280",
      "--text-inverted": colors?.textInverted || "#111827",
      "--border-subtle": colors?.borderSubtle || "#1F2937",
      "--border-strong": colors?.borderStrong || "#374151",
      "--header-bg": colors?.headerBg || colors?.surfaceBase || "#0B0F19",
      "--header-text": colors?.headerText || colors?.textPrimary || "#F9FAFB",
      "--footer-bg": colors?.footerBg || "#060911",
      "--footer-text": colors?.footerText || "#9CA3AF",
      "--font-display": displayFont,
      "--font-body": bodyFont,
      "--font-mono": monoFont,
      "--theme-radius": radius,
    } as React.CSSProperties;
  }, [theme]);

  return (
    <div
      style={cssVariables}
      data-theme-preset={theme.presetId}
      data-card-style={theme.styling?.cardStyle || "bordered"}
      data-button-style={theme.styling?.buttonStyle || "sharp"}
      data-border-radius={theme.styling?.borderRadius || "sm"}
      className={`min-h-screen text-[var(--text-primary)] bg-[var(--surface-base)] font-[var(--font-body)] ${className}`}
    >
      {children}
    </div>
  );
};
