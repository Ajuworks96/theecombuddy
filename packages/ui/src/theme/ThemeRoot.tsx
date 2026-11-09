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
      "--brand-primary": colors?.brandPrimary || "#C28E5C",
      "--brand-primary-hover": colors?.brandPrimaryHover || "#A67545",
      "--brand-accent": colors?.brandAccent || "#1C1917",
      "--brand-accent-hover": colors?.brandAccentHover || "#292524",
      "--surface-base": colors?.surfaceBase || "#FAF9F5",
      "--surface-subtle": colors?.surfaceSubtle || "#F5F3ED",
      "--surface-muted": colors?.surfaceMuted || "#EAE6DC",
      "--surface-inverted": colors?.surfaceInverted || "#1C1917",
      "--text-primary": colors?.textPrimary || "#1C1917",
      "--text-secondary": colors?.textSecondary || "#57534E",
      "--text-muted": colors?.textMuted || "#8C867A",
      "--text-inverted": colors?.textInverted || "#FAF9F5",
      "--border-subtle": colors?.borderSubtle || "#E7E3D8",
      "--border-strong": colors?.borderStrong || "#D1CBC0",
      "--header-bg": colors?.headerBg || "#FFFFFF",
      "--header-text": colors?.headerText || "#1C1917",
      "--footer-bg": colors?.footerBg || "#141312",
      "--footer-text": colors?.footerText || "#D1CBC0",
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

