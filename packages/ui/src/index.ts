import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind CSS classes safely
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Canonical Design System Tokens
 * Strictly adhering to docs/DESIGN_SYSTEM_PLAN.md
 */
export const DESIGN_TOKENS = {
  colors: {
    brandPrimary: "var(--brand-primary, #18181B)",
    brandAccent: "var(--brand-accent, #C28E5C)",
    surfaceBase: "var(--surface-base, #FFFFFF)",
    surfaceSubtle: "var(--surface-subtle, #F9FAFB)",
    textPrimary: "var(--text-primary, #111827)",
    textSecondary: "var(--text-secondary, #4B5563)",
    borderSubtle: "var(--border-subtle, #E5E7EB)",
  },
  typography: {
    display: "var(--font-display, 'Playfair Display', serif)",
    body: "var(--font-body, 'Plus Jakarta Sans', sans-serif)",
    mono: "var(--font-mono, 'JetBrains Mono', monospace)",
  },
  currency: {
    defaultSymbol: "₹",
    defaultCode: "INR",
  },
} as const;

