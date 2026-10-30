import type { PublicPublishedTheme, HeroSlide, HomepageSection } from "@the-ecom-buddy/types";

export interface StoreRegion {
  id: string;
  name: string;
  currency_code: string;
  countries?: Array<{ iso_2: string; display_name: string }>;
}

export interface StoreCategory {
  id: string;
  name: string;
  handle: string;
  description?: string | null;
  rank?: number;
}

export interface StoreProduct {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  handle: string;
  thumbnail?: string | null;
  collection_id?: string | null;
  collection?: { id: string; title: string; handle: string } | null;
  categories?: StoreCategory[];
  variants?: Array<{
    id: string;
    title: string;
    sku?: string | null;
    calculated_price?: {
      calculated_amount: number;
      currency_code: string;
      original_amount?: number;
    } | null;
    prices?: Array<{
      id: string;
      currency_code: string;
      amount: number;
    }>;
  }>;
}

export interface StorefrontThemeProps {
  theme: PublicPublishedTheme;
  products?: StoreProduct[];
  categories?: StoreCategory[];
  regions?: StoreRegion[];
  currentRegion?: StoreRegion;
  onSelectRegion?: (region: StoreRegion) => void;
  isMerchantPreview?: boolean;
}
