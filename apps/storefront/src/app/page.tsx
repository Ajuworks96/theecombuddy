import React from "react";
import {
  getPublishedTheme,
  getStoreRegions,
  getStoreCategories,
  getStoreProducts,
  DEFAULT_INDIA_REGION_ID,
} from "@/lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "@/lib/default-theme";
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
    { id: DEFAULT_INDIA_REGION_ID, name: "India", currency_code: "inr" };

  // Fetch initial products for default region
  const initialProducts = await getStoreProducts(defaultRegion?.id, 24);

  // Fallback theme in case no custom merchant theme was published yet
  const effectiveTheme: PublicPublishedTheme = theme || DEFAULT_STOREFRONT_THEME;

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
