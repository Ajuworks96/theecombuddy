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
export type SupportedCurrency = "INR" | "USD" | "EUR" | "GBP";

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

