import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import type {
  StoreProduct,
  StoreCategory,
  StoreRegion,
  StoreCollection,
  StoreCart,
} from "@the-ecom-buddy/ui";

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
 * Fetch category by handle
 */
export async function getCategoryByHandle(handle: string): Promise<StoreCategory | null> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/product-categories?handle=${encodeURIComponent(handle)}&fields=id,name,handle,description,rank`,
      {
        headers: defaultHeaders,
        cache: "no-store",
      }
    );

    if (!res.ok) return null;
    const json = await res.json();
    const categories = json.product_categories || [];
    return categories[0] || null;
  } catch (err: any) {
    console.error("[Storefront] Failed to fetch category by handle:", err.message);
    return null;
  }
}

/**
 * Fetch public product collections
 */
export async function getStoreCollections(): Promise<StoreCollection[]> {
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/collections`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.collections || [];
  } catch (err: any) {
    console.error("[Storefront] Failed to load collections:", err.message);
    return [];
  }
}

/**
 * Fetch collection by handle
 */
export async function getCollectionByHandle(handle: string): Promise<StoreCollection | null> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/collections?handle=${encodeURIComponent(handle)}`,
      {
        headers: defaultHeaders,
        cache: "no-store",
      }
    );

    if (!res.ok) return null;
    const json = await res.json();
    const collections = json.collections || [];
    return collections[0] || null;
  } catch (err: any) {
    console.error("[Storefront] Failed to fetch collection by handle:", err.message);
    return null;
  }
}

/**
 * Fetch store products with server-calculated region prices
 */
export async function getStoreProducts(
  regionId?: string,
  limit = 24,
  offset = 0
): Promise<StoreProduct[]> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
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
 * Fetch single product by handle with all variant options, images, and region pricing
 */
export async function getProductByHandle(
  handle: string,
  regionId?: string
): Promise<StoreProduct | null> {
  try {
    const params = new URLSearchParams({
      handle: handle,
      limit: "1",
      fields:
        "*variants,*variants.calculated_price,*variants.prices,*variants.options,*options,*options.values,*images,*categories,*collection",
    });

    if (regionId) {
      params.set("region_id", regionId);
    }

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/products?${params.toString()}`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json = await res.json();
    const products = json.products || [];
    const prod = products[0];
    if (!prod || prod.status === "draft" || prod.deleted_at) {
      return null;
    }
    return prod;
  } catch (err: any) {
    console.error("[Storefront] Failed to load product by handle:", err.message);
    return null;
  }
}

/**
 * Query real-time inventory levels for a product's variants
 */
export async function getProductInventory(productId: string): Promise<
  Record<
    string,
    {
      in_stock: boolean;
      available_quantity: number;
      manage_inventory: boolean;
      allow_backorder: boolean;
      sku: string;
    }
  >
> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/inventory?product_id=${encodeURIComponent(productId)}`,
      {
        headers: defaultHeaders,
        cache: "no-store",
      }
    );

    if (!res.ok) return {};
    const json = await res.json();
    return json.inventory || {};
  } catch {
    return {};
  }
}

/**
 * Fetch products by category ID with regional pricing
 */
export async function getProductsByCategory(
  categoryId: string,
  regionId?: string,
  limit = 50,
  offset = 0
): Promise<{ products: StoreProduct[]; count: number }> {
  try {
    const params = new URLSearchParams({
      "category_id[]": categoryId,
      limit: String(limit),
      offset: String(offset),
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

    if (!res.ok) return { products: [], count: 0 };
    const json = await res.json();
    return {
      products: json.products || [],
      count: json.count || (json.products || []).length,
    };
  } catch (err: any) {
    console.error("[Storefront] getProductsByCategory failed:", err.message);
    return { products: [], count: 0 };
  }
}

/**
 * Fetch products by collection ID with regional pricing
 */
export async function getProductsByCollection(
  collectionId: string,
  regionId?: string,
  limit = 50,
  offset = 0
): Promise<{ products: StoreProduct[]; count: number }> {
  try {
    const params = new URLSearchParams({
      "collection_id[]": collectionId,
      limit: String(limit),
      offset: String(offset),
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

    if (!res.ok) return { products: [], count: 0 };
    const json = await res.json();
    return {
      products: json.products || [],
      count: json.count || (json.products || []).length,
    };
  } catch (err: any) {
    console.error("[Storefront] getProductsByCollection failed:", err.message);
    return { products: [], count: 0 };
  }
}

/**
 * Search products by query term with regional pricing
 */
export async function searchStoreProducts(
  query: string,
  regionId?: string,
  limit = 40,
  offset = 0
): Promise<{ products: StoreProduct[]; count: number }> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      offset: String(offset),
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

    if (!res.ok) return { products: [], count: 0 };

    const json = await res.json();
    const prods = (json.products || []).filter(
      (p: any) => p.status !== "draft" && !p.deleted_at
    );
    return {
      products: prods,
      count: json.count ?? prods.length,
    };
  } catch (err: any) {
    console.error("[Storefront] Search failed:", err.message);
    return { products: [], count: 0 };
  }
}

/**
 * Fetch related products from the same category or collection
 */
export async function getRelatedProducts(
  currentProductId: string,
  categoryId?: string,
  collectionId?: string,
  regionId?: string,
  limit = 4
): Promise<StoreProduct[]> {
  try {
    let prods: StoreProduct[] = [];
    if (categoryId) {
      const res = await getProductsByCategory(categoryId, regionId, limit + 2);
      prods = res.products.filter((p) => p.id !== currentProductId);
    }
    if (prods.length < limit && collectionId) {
      const colRes = await getProductsByCollection(collectionId, regionId, limit + 2);
      for (const p of colRes.products) {
        if (p.id !== currentProductId && !prods.some((x) => x.id === p.id)) {
          prods.push(p);
        }
      }
    }
    if (prods.length < limit) {
      const fallback = await getStoreProducts(regionId, limit + 2);
      for (const p of fallback) {
        if (p.id !== currentProductId && !prods.some((x) => x.id === p.id)) {
          prods.push(p);
        }
      }
    }
    return prods.slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * CART OPERATIONS via official Medusa Store APIs
 */

export async function createCart(regionId: string): Promise<StoreCart | null> {
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/carts`, {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify({ region_id: regionId }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.cart || null;
  } catch (err: any) {
    console.error("[Storefront] createCart error:", err.message);
    return null;
  }
}

export async function getCart(cartId: string): Promise<StoreCart | null> {
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.cart || null;
  } catch (err: any) {
    console.error("[Storefront] getCart error:", err.message);
    return null;
  }
}

export async function addItemToCart(
  cartId: string,
  variantId: string,
  quantity: number
): Promise<{ cart: StoreCart | null; error?: string }> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}/line-items`,
      {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify({ variant_id: variantId, quantity }),
      }
    );

    const json = await res.json();

    if (!res.ok) {
      return {
        cart: null,
        error: json.message || "Failed to add item to bag",
      };
    }

    return { cart: json.cart || null };
  } catch (err: any) {
    return { cart: null, error: err.message || "Network error adding item" };
  }
}
