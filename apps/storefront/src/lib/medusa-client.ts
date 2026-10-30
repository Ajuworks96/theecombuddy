import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import type { StoreProduct, StoreCategory, StoreRegion } from "@the-ecom-buddy/ui";

const MEDUSA_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:9000";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

const defaultHeaders = {
  "Content-Type": "application/json",
  "x-publishable-api-key": PUBLISHABLE_KEY,
};

/**
 * Fetch the public published theme configuration
 */
export async function getPublishedTheme(): Promise<PublicPublishedTheme | null> {
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/theme`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[Storefront] getPublishedTheme HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    return json.theme || null;
  } catch (err: any) {
    console.error("[Storefront] Failed to load published theme:", err.message);
    return null;
  }
}

/**
 * Fetch available store regions (India, US, UAE, UK, EU)
 */
export async function getStoreRegions(): Promise<StoreRegion[]> {
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/regions`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[Storefront] getStoreRegions HTTP ${res.status}`);
      return [];
    }

    const json = await res.json();
    return json.regions || [];
  } catch (err: any) {
    console.error("[Storefront] Failed to load regions:", err.message);
    return [];
  }
}

/**
 * Fetch active public product categories
 */
export async function getStoreCategories(): Promise<StoreCategory[]> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/product-categories?fields=id,name,handle,description,rank`,
      {
        headers: defaultHeaders,
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.warn(`[Storefront] getStoreCategories HTTP ${res.status}`);
      return [];
    }

    const json = await res.json();
    return json.product_categories || [];
  } catch (err: any) {
    console.error("[Storefront] Failed to load categories:", err.message);
    return [];
  }
}

/**
 * Fetch store products with server-calculated region prices
 */
export async function getStoreProducts(
  regionId?: string,
  limit = 24
): Promise<StoreProduct[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      fields:
        "*variants.calculated_price,*variants.prices,*categories,*collection",
    });

    if (regionId) {
      params.set("region_id", regionId);
    }

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/products?${params.toString()}`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[Storefront] getStoreProducts HTTP ${res.status}`);
      return [];
    }

    const json = await res.json();
    return json.products || [];
  } catch (err: any) {
    console.error("[Storefront] Failed to load products:", err.message);
    return [];
  }
}

/**
 * Search products by query term
 */
export async function searchStoreProducts(
  query: string,
  regionId?: string
): Promise<StoreProduct[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: "16",
      fields:
        "*variants.calculated_price,*variants.prices,*categories,*collection",
    });

    if (regionId) {
      params.set("region_id", regionId);
    }

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/products?${params.toString()}`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return json.products || [];
  } catch (err: any) {
    console.error("[Storefront] Search failed:", err.message);
    return [];
  }
}

