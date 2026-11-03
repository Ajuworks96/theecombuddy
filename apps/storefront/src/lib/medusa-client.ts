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

export const DEFAULT_INDIA_REGION_ID = "reg_01M617GB6G0JD57ZT481HYV9MV";

export const DEFAULT_REGIONS: StoreRegion[] = [
  { id: "reg_01M617GB6G0JD57ZT481HYV9MV", name: "India", currency_code: "inr" },
  { id: "reg_01M6351W7B0HRW2SYNDCNHHPJ6", name: "United Arab Emirates", currency_code: "aed" },
  { id: "reg_01M6351W7B431VGASFQD9TN1VX", name: "United States", currency_code: "usd" },
  { id: "reg_01M6351W7BARPAY3B4BHP4RFVV", name: "United Kingdom", currency_code: "gbp" },
  { id: "reg_01M6351W7BVQ2KAXF81ZV6P288", name: "European Union", currency_code: "eur" },
];

export const DEFAULT_CATEGORIES: StoreCategory[] = [
  {
    id: "pcat_01M6192PMARK1PVE7DJTWJZGRH",
    name: "Electronics & Audio",
    handle: "electronics-audio",
    description: "Studio-grade audio gear, smart accessories, and precision tech.",
    rank: 0,
  },
  {
    id: "pcat_01M6192PNB5XHPZ7XAJZ6P41HC",
    name: "Apparel & Ethnic Wear",
    handle: "apparel-ethnic-wear",
    description: "Handcrafted festive silhouettes, organic linens, and heritage weaves.",
    rank: 1,
  },
  {
    id: "pcat_01M6192PNMWYDCGDAC94ZW3Y38",
    name: "Home & Kitchen Living",
    handle: "home-kitchen-living",
    description: "Pure hammered copper, natural stoneware, and slow-crafted home decor.",
    rank: 2,
  },
  {
    id: "pcat_01M6192PNW5CW7RJ5HWEHXD326",
    name: "Health & Ayurvedic Wellness",
    handle: "health-ayurvedic-wellness",
    description: "Cold-pressed herbal oils, organic saffron extracts, and clean wellness.",
    rank: 3,
  },
  {
    id: "pcat_01M6192PP380WWMJDC75ZXBRTJ",
    name: "Books & Artisanal Stationery",
    handle: "books-stationery",
    description: "Handmade archival cotton journals, fountain pens, and timeless stationery.",
    rank: 4,
  },
  {
    id: "pcat_01M6192PPCDZY942J97C3EMEHC",
    name: "Gourmet & Organic Foods",
    handle: "gourmet-organic-foods",
    description: "Single-origin spices, raw forest honey, and organic artisanal pantry.",
    rank: 5,
  },
  {
    id: "pcat_01M6192PPMR3W4NBMSQP02HW45",
    name: "Sports & Fitness Gear",
    handle: "sports-fitness",
    description: "High-performance smart trackers, natural yoga mats, and endurance gear.",
    rank: 6,
  },
  {
    id: "pcat_01M6192PPX52E959MFYN30Z05Y",
    name: "Clean Beauty & Personal Care",
    handle: "beauty-personal-care",
    description: "Botanical skincare, non-toxic formulations, and restorative self-care.",
    rank: 7,
  },
];

export const SHOWCASE_PRODUCTS: StoreProduct[] = [
  {
    id: "prod_01M61961MB2NCN9KTSCGWJZVS0",
    title: "True Wireless Active Noise Cancelling Earbuds",
    handle: "teb-elec-001",
    subtitle: "Lossless Bluetooth 5.3 with 40-Hour Charging Case",
    description:
      "Engineered with 10mm graphene dynamic drivers and hybrid active noise cancellation up to 42dB. Features transparency mode, quad-mic beamforming for crystal clear calls, and IPX5 water resistance.",
    thumbnail:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80",
    categories: [DEFAULT_CATEGORIES[0]],
    variants: [
      {
        id: "variant_earbuds_01",
        title: "Obsidian Black",
        sku: "TEB-EARBUD-BLK",
        prices: [{ id: "price_eb_01", amount: 2499, currency_code: "inr" }],
        calculated_price: {
          calculated_amount: 2499,
          original_amount: 3999,
          currency_code: "inr",
        },
      },
    ],
  },
  {
    id: "prod_01M61961MB0FRN7FN60P7AKPMT",
    title: "Compact Magnetic Car Phone Mount Charger",
    handle: "teb-elec-015",
    subtitle: "15W Fast Wireless MagSafe Air Vent Clamp",
    description:
      "Ultra-strong N52 neodymium magnets provide instant lock for your phone even on bumpy terrain. Full 360-degree rotation and aerospace aluminium housing.",
    thumbnail:
      "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80",
    categories: [DEFAULT_CATEGORIES[0]],
    variants: [
      {
        id: "variant_car_mount_01",
        title: "Titanium Silver",
        sku: "TEB-MOUNT-SILVER",
        prices: [{ id: "price_cm_01", amount: 1199, currency_code: "inr" }],
        calculated_price: {
          calculated_amount: 1199,
          original_amount: 1799,
          currency_code: "inr",
        },
      },
    ],
  },
  {
    id: "prod_01M61961MB101A97V2FKKY4AY1",
    title: "Precision Optical Wireless Ergonomic Mouse",
    handle: "teb-elec-011",
    subtitle: "Silent Clicks with Dual 2.4GHz & Bluetooth 5.0",
    description:
      "Ergonomically contoured body sculpted to reduce wrist strain by 35%. 4000 DPI optical sensor that tracks on glass, wood, and marble without a mousepad.",
    thumbnail:
      "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80",
    categories: [DEFAULT_CATEGORIES[0]],
    variants: [
      {
        id: "variant_mouse_01",
        title: "Stone Grey",
        sku: "TEB-MOUSE-GREY",
        prices: [{ id: "price_ms_01", amount: 1499, currency_code: "inr" }],
        calculated_price: {
          calculated_amount: 1499,
          original_amount: 2299,
          currency_code: "inr",
        },
      },
    ],
  },
  {
    id: "prod_01M61961MB4M2VDJ8W17YXY4QJ",
    title: "Wireless MagSafe Charging Power Bank 10000mAh",
    handle: "teb-elec-007",
    subtitle: "22.5W Two-Way Fast Charge with Foldable Kickstand",
    description:
      "Slim profile pocket power bank with zinc-alloy foldout stand. Supports simultaneous wireless and USB-C Power Delivery charging for up to 3 devices.",
    thumbnail:
      "https://images.unsplash.com/photo-1609592426508-cc810fec67c6?auto=format&fit=crop&w=600&q=80",
    categories: [DEFAULT_CATEGORIES[0]],
    variants: [
      {
        id: "variant_powerbank_01",
        title: "Midnight Slate",
        sku: "TEB-PB-10K",
        prices: [{ id: "price_pb_01", amount: 1999, currency_code: "inr" }],
        calculated_price: {
          calculated_amount: 1999,
          original_amount: 2999,
          currency_code: "inr",
        },
      },
    ],
  },
  {
    id: "prod_01M61961MB7ZY871K45NST3YA7",
    title: "Portable Waterproof Bluetooth Speaker 20W",
    handle: "teb-elec-004",
    subtitle: "IPX7 Submersible with Dual Passive Radiators",
    description:
      "360-degree immersive acoustic projection with punchy sub-bass. 16 hours of continuous outdoor playtime with rugged rubberized shockproof bumpers.",
    thumbnail:
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80",
    categories: [DEFAULT_CATEGORIES[0]],
    variants: [
      {
        id: "variant_speaker_01",
        title: "Deep Olive",
        sku: "TEB-SPK-20W",
        prices: [{ id: "price_sp_01", amount: 2899, currency_code: "inr" }],
        calculated_price: {
          calculated_amount: 2899,
          original_amount: 4499,
          currency_code: "inr",
        },
      },
    ],
  },
  {
    id: "prod_01M61961MBA8SEBMRXG19A9T69",
    title: "Smart Fitness Tracker with AMOLED Display",
    handle: "teb-elec-006",
    subtitle: "Continuous Heart Rate, SpO2 & Sleep Stage Analysis",
    description:
      "Vibrant 1.47-inch curved AMOLED screen with always-on display. Tracks 110+ sporting disciplines with 14-day ultra-long endurance battery life.",
    thumbnail:
      "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=600&q=80",
    categories: [DEFAULT_CATEGORIES[6]],
    variants: [
      {
        id: "variant_tracker_01",
        title: "Graphite Black",
        sku: "TEB-TRACKER-01",
        prices: [{ id: "price_tr_01", amount: 2199, currency_code: "inr" }],
        calculated_price: {
          calculated_amount: 2199,
          original_amount: 3499,
          currency_code: "inr",
        },
      },
    ],
  },
  {
    id: "prod_01M61961MB7015XS8A1PARRVZT",
    title: "USB-C Multiport Hub with 4K HDMI & SD Card",
    handle: "teb-elec-013",
    subtitle: "7-in-1 Aluminum Adapter with 100W Power Delivery",
    description:
      "Crafted from space-grade sandblasted aluminum. Delivers crystal clear 4K@60Hz video output, Gigabit Ethernet, 5Gbps USB-A ports, and micro-SD UHS-I slots.",
    thumbnail:
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
    categories: [DEFAULT_CATEGORIES[0]],
    variants: [
      {
        id: "variant_hub_01",
        title: "Space Grey",
        sku: "TEB-HUB-7IN1",
        prices: [{ id: "price_hb_01", amount: 1699, currency_code: "inr" }],
        calculated_price: {
          calculated_amount: 1699,
          original_amount: 2499,
          currency_code: "inr",
        },
      },
    ],
  },
  {
    id: "prod_01M61961MB8FCR4FMP7K17MN2T",
    title: "Braided Fast-Charging USB-C Cable 2m",
    handle: "teb-elec-018",
    subtitle: "100W PD Ultra-Durable E-Mark Certified Cord",
    description:
      "Reinforced with double-braided ballistic nylon jacket tested for 30,000+ bends. Built-in E-Marker smart chip ensures safe power delivery to laptops and tablets.",
    thumbnail:
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80",
    categories: [DEFAULT_CATEGORIES[0]],
    variants: [
      {
        id: "variant_cable_01",
        title: "Gunmetal Braided",
        sku: "TEB-CABLE-2M",
        prices: [{ id: "price_cb_01", amount: 499, currency_code: "inr" }],
        calculated_price: {
          calculated_amount: 499,
          original_amount: 899,
          currency_code: "inr",
        },
      },
    ],
  },
];

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
      return DEFAULT_REGIONS;
    }

    const json = await res.json();
    const regions = json.regions || [];
    return regions.length > 0 ? regions : DEFAULT_REGIONS;
  } catch (err: any) {
    console.error("[Storefront] Failed to load regions:", err.message);
    return DEFAULT_REGIONS;
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
      return DEFAULT_CATEGORIES;
    }

    const json = await res.json();
    const categories = json.product_categories || [];
    return categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  } catch (err: any) {
    console.error("[Storefront] Failed to load categories:", err.message);
    return DEFAULT_CATEGORIES;
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

    if (res.ok) {
      const json = await res.json();
      const categories = json.product_categories || [];
      if (categories[0]) return categories[0];
    }
  } catch (err: any) {
    console.error("[Storefront] Failed to fetch category by handle:", err.message);
  }

  // Graceful fallback to verified category directory
  return DEFAULT_CATEGORIES.find((c) => c.handle === handle) || null;
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
  const effectiveRegionId = regionId || DEFAULT_INDIA_REGION_ID;

  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      region_id: effectiveRegionId,
      fields:
        "*variants.calculated_price,*variants.prices,*categories,*collection",
    });

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/products?${params.toString()}`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const prods = (json.products || []).filter(
        (p: any) => p.status !== "draft" && !p.deleted_at
      );
      if (prods.length > 0) return prods;
    } else {
      console.warn(`[Storefront] getStoreProducts HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.error("[Storefront] Failed to load products:", err.message);
  }

  // Resilient showcase catalog fallback
  return SHOWCASE_PRODUCTS.slice(offset, offset + limit);
}

/**
 * Fetch single product by handle with all variant options, images, and region pricing
 */
export async function getProductByHandle(
  handle: string,
  regionId?: string
): Promise<StoreProduct | null> {
  const effectiveRegionId = regionId || DEFAULT_INDIA_REGION_ID;

  try {
    const params = new URLSearchParams({
      handle: handle,
      limit: "1",
      region_id: effectiveRegionId,
      fields:
        "*variants,*variants.calculated_price,*variants.prices,*variants.options,*options,*options.values,*images,*categories,*collection",
    });

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/products?${params.toString()}`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const products = json.products || [];
      const prod = products[0];
      if (prod && prod.status !== "draft" && !prod.deleted_at) {
        return prod;
      }
    }
  } catch (err: any) {
    console.error("[Storefront] Failed to load product by handle:", err.message);
  }

  // Graceful showcase fallback
  return SHOWCASE_PRODUCTS.find((p) => p.handle === handle) || null;
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

    if (!res.ok) {
      return {
        default: {
          in_stock: true,
          available_quantity: 50,
          manage_inventory: false,
          allow_backorder: true,
          sku: "INSTOCK",
        },
      };
    }
    const json = await res.json();
    return json.inventory || {};
  } catch {
    return {
      default: {
        in_stock: true,
        available_quantity: 50,
        manage_inventory: false,
        allow_backorder: true,
        sku: "INSTOCK",
      },
    };
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
  const effectiveRegionId = regionId || DEFAULT_INDIA_REGION_ID;

  try {
    const params = new URLSearchParams({
      "category_id[]": categoryId,
      limit: String(limit),
      offset: String(offset),
      region_id: effectiveRegionId,
      fields:
        "*variants.calculated_price,*variants.prices,*categories,*collection",
    });

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/products?${params.toString()}`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const prods = (json.products || []).filter(
        (p: any) => p.status !== "draft" && !p.deleted_at
      );
      if (prods.length > 0) {
        return {
          products: prods,
          count: json.count || prods.length,
        };
      }
    }
  } catch (err: any) {
    console.error("[Storefront] getProductsByCategory failed:", err.message);
  }

  // Graceful category product filtering fallback
  const filtered = SHOWCASE_PRODUCTS.filter((p) =>
    p.categories?.some((c) => c.id === categoryId)
  );
  const fallbackList = filtered.length > 0 ? filtered : SHOWCASE_PRODUCTS.slice(0, limit);
  return { products: fallbackList, count: fallbackList.length };
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
  const effectiveRegionId = regionId || DEFAULT_INDIA_REGION_ID;

  try {
    const params = new URLSearchParams({
      "collection_id[]": collectionId,
      limit: String(limit),
      offset: String(offset),
      region_id: effectiveRegionId,
      fields:
        "*variants.calculated_price,*variants.prices,*categories,*collection",
    });

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/products?${params.toString()}`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const prods = (json.products || []).filter(
        (p: any) => p.status !== "draft" && !p.deleted_at
      );
      if (prods.length > 0) {
        return {
          products: prods,
          count: json.count || prods.length,
        };
      }
    }
  } catch (err: any) {
    console.error("[Storefront] getProductsByCollection failed:", err.message);
  }

  return { products: SHOWCASE_PRODUCTS.slice(0, limit), count: SHOWCASE_PRODUCTS.length };
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
  const effectiveRegionId = regionId || DEFAULT_INDIA_REGION_ID;

  try {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      offset: String(offset),
      region_id: effectiveRegionId,
      fields:
        "*variants.calculated_price,*variants.prices,*categories,*collection",
    });

    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/products?${params.toString()}`, {
      headers: defaultHeaders,
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const prods = (json.products || []).filter(
        (p: any) => p.status !== "draft" && !p.deleted_at
      );
      if (prods.length > 0) {
        return {
          products: prods,
          count: json.count ?? prods.length,
        };
      }
    }
  } catch (err: any) {
    console.error("[Storefront] Search failed:", err.message);
  }

  const q = query.toLowerCase();
  const matched = SHOWCASE_PRODUCTS.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
  );
  return { products: matched, count: matched.length };
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
    return SHOWCASE_PRODUCTS.filter((p) => p.id !== currentProductId).slice(0, limit);
  }
}

/**
 * CART OPERATIONS via official Medusa Store APIs
 */

export async function createCart(regionId: string): Promise<StoreCart | null> {
  const effectiveRegionId = regionId || DEFAULT_INDIA_REGION_ID;
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/carts`, {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify({ region_id: effectiveRegionId }),
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

export async function updateCart(
  cartId: string,
  data: {
    region_id?: string;
    email?: string;
    shipping_address?: any;
    billing_address?: any;
  }
): Promise<{ cart: StoreCart | null; error?: string }> {
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}`, {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      return { cart: null, error: json.message || "Failed to update cart" };
    }
    return { cart: json.cart || null };
  } catch (err: any) {
    return { cart: null, error: err.message || "Network error updating cart" };
  }
}

export async function updateCartLineItem(
  cartId: string,
  lineId: string,
  quantity: number
): Promise<{ cart: StoreCart | null; error?: string }> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineId)}`,
      {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify({ quantity }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { cart: null, error: json.message || "Failed to update item quantity" };
    }
    return { cart: json.cart || null };
  } catch (err: any) {
    return { cart: null, error: err.message || "Network error updating item" };
  }
}

export async function deleteCartLineItem(
  cartId: string,
  lineId: string
): Promise<{ cart: StoreCart | null; error?: string }> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}/line-items/${encodeURIComponent(lineId)}`,
      {
        method: "DELETE",
        headers: defaultHeaders,
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { cart: null, error: json.message || "Failed to remove item" };
    }
    return { cart: json.cart || json.parent || null };
  } catch (err: any) {
    return { cart: null, error: err.message || "Network error removing item" };
  }
}

export async function applyPromotionToCart(
  cartId: string,
  code: string
): Promise<{ cart: StoreCart | null; error?: string }> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}/promotions`,
      {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify({ promo_codes: [code] }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { cart: null, error: json.message || "Invalid or expired promotion code" };
    }
    return { cart: json.cart || null };
  } catch (err: any) {
    return { cart: null, error: err.message || "Network error applying discount" };
  }
}

export async function removePromotionFromCart(
  cartId: string,
  code: string
): Promise<{ cart: StoreCart | null; error?: string }> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}/promotions`,
      {
        method: "DELETE",
        headers: defaultHeaders,
        body: JSON.stringify({ promo_codes: [code] }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { cart: null, error: json.message || "Failed to remove promotion" };
    }
    return { cart: json.cart || null };
  } catch (err: any) {
    return { cart: null, error: err.message || "Network error removing discount" };
  }
}

export async function getCartShippingOptions(
  cartId: string
): Promise<{ shipping_options: any[]; error?: string }> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`,
      {
        headers: defaultHeaders,
        cache: "no-store",
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { shipping_options: [], error: json.message || "Failed to load shipping options" };
    }
    return { shipping_options: json.shipping_options || [] };
  } catch (err: any) {
    return { shipping_options: [], error: err.message || "Network error loading shipping options" };
  }
}

export async function setCartShippingMethod(
  cartId: string,
  optionId: string
): Promise<{ cart: StoreCart | null; error?: string }> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}/shipping-methods`,
      {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify({ option_id: optionId }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { cart: null, error: json.message || "Failed to set shipping method" };
    }
    return { cart: json.cart || null };
  } catch (err: any) {
    return { cart: null, error: err.message || "Network error setting shipping method" };
  }
}

export async function createCartPaymentCollection(
  cartId: string
): Promise<{ payment_collection: any | null; error?: string }> {
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/payment-collections`, {
      method: "POST",
      headers: defaultHeaders,
      body: JSON.stringify({ cart_id: cartId }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { payment_collection: null, error: json.message || "Failed to initialize payment" };
    }
    return { payment_collection: json.payment_collection || null };
  } catch (err: any) {
    return { payment_collection: null, error: err.message || "Network error initializing payment" };
  }
}

export async function createCartPaymentSession(
  paymentCollectionId: string,
  providerId: string
): Promise<{ payment_collection: any | null; error?: string }> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/payment-collections/${encodeURIComponent(paymentCollectionId)}/payment-sessions`,
      {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify({ provider_id: providerId }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { payment_collection: null, error: json.message || "Failed to create payment session" };
    }
    return { payment_collection: json.payment_collection || null };
  } catch (err: any) {
    return { payment_collection: null, error: err.message || "Network error creating payment session" };
  }
}

export async function completeCartOrder(
  cartId: string
): Promise<{ order: any | null; type?: string; error?: string }> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}/complete`,
      {
        method: "POST",
        headers: defaultHeaders,
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return { order: null, error: json.message || "Failed to complete order" };
    }
    return { order: json.order || null, type: json.type };
  } catch (err: any) {
    return { order: null, error: err.message || "Network error completing order" };
  }
}

export async function getStoreOrder(
  orderId: string
): Promise<any | null> {
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/orders/${encodeURIComponent(orderId)}?fields=*items,*shipping_address,*billing_address,*shipping_methods,*payment_collections,*payment_collections.payments`,
      {
        headers: defaultHeaders,
        cache: "no-store",
      }
    );

    if (!res.ok) return null;
    const json = await res.json();
    return json.order || null;
  } catch {
    return null;
  }
}
