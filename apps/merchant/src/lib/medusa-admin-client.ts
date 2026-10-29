/**
 * The Ecom Buddy — Medusa v2 Admin API Client
 *
 * Communicates directly with official Medusa v2 Admin endpoints.
 * Never exposes secrets to the browser — designed for Next.js Route Handlers & Server Components.
 */

const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

export class MedusaApiError extends Error {
  public status: number;
  public details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = "MedusaApiError";
    this.status = status;
    this.details = details;
  }
}

export interface AdminProduct {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  handle: string;
  is_giftcard: boolean;
  status: "draft" | "proposed" | "published" | "rejected";
  thumbnail?: string | null;
  collection_id?: string | null;
  collection?: { id: string; title: string } | null;
  categories?: Array<{ id: string; name: string }>;
  variants: Array<{
    id: string;
    title: string;
    sku?: string | null;
    inventory_quantity?: number;
    prices?: Array<{
      amount: number;
      currency_code: string;
    }>;
    options?: Array<{
      id: string;
      value: string;
    }>;
  }>;
  options?: Array<{
    id: string;
    title: string;
    values: Array<{ id: string; value: string }>;
  }>;
  created_at: string;
  updated_at: string;
}

export interface AdminOrder {
  id: string;
  display_id: number;
  status: string;
  currency_code: string;
  total: number;
  subtotal?: number;
  tax_total?: number;
  shipping_total?: number;
  discount_total?: number;
  created_at: string;
  email?: string;
  customer?: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  items?: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    thumbnail?: string | null;
  }>;
  payment_collections?: Array<{
    id: string;
    status: string;
    payments?: Array<{
      id: string;
      provider_id: string;
      amount: number;
      currency_code: string;
    }>;
  }>;
}

export interface DashboardStats {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalInventoryUnits: number;
  lowStockItemsCount: number;
  recentOrders: AdminOrder[];
  recentProducts: AdminProduct[];
  revenueByCurrency: Record<string, number>;
}

export class MedusaAdminClient {
  private baseUrl: string;

  constructor(baseUrl: string = MEDUSA_BACKEND_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        cache: "no-store",
      });

      if (!response.ok) {
        let errBody: any = null;
        try {
          errBody = await response.json();
        } catch {
          errBody = { message: response.statusText };
        }

        const message =
          errBody?.message ||
          errBody?.error ||
          `Medusa Admin API failed with status ${response.status}`;

        throw new MedusaApiError(message, response.status, errBody);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err instanceof MedusaApiError) {
        throw err;
      }
      throw new MedusaApiError(
        `Failed to reach Medusa backend at ${this.baseUrl}: ${err?.message || err}`,
        503,
        err
      );
    }
  }

  /**
   * Authenticate admin merchant using Medusa v2 emailpass provider
   */
  async login(
    email: string,
    password: string
  ): Promise<{ token: string; user: { id: string; email: string; first_name?: string; last_name?: string } }> {
    const authRes = await this.request<{ token: string }>(
      "/auth/user/emailpass",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );

    if (!authRes.token) {
      throw new MedusaApiError("Authentication response missing session token", 401);
    }

    // Retrieve user details with newly issued token
    const userRes = await this.getMe(authRes.token);

    return {
      token: authRes.token,
      user: userRes,
    };
  }

  /**
   * Retrieve currently authenticated admin profile
   */
  async getMe(
    token: string
  ): Promise<{ id: string; email: string; first_name?: string; last_name?: string }> {
    const res = await this.request<{ user: any }>("/admin/users/me", { method: "GET" }, token);
    return res.user;
  }

  /**
   * Retrieve products with pagination, search, status and ordering
   */
  async getProducts(
    token: string,
    params: {
      limit?: number;
      offset?: number;
      q?: string;
      status?: string;
      order?: string;
    } = {}
  ): Promise<{ products: AdminProduct[]; count: number; limit: number; offset: number }> {
    const query = new URLSearchParams();
    query.set("limit", String(params.limit ?? 20));
    query.set("offset", String(params.offset ?? 0));
    if (params.q) query.set("q", params.q.trim());
    if (params.status) {
      if (Array.isArray(params.status)) {
        params.status.forEach((s) => query.append("status[]", s));
      } else {
        query.append("status[]", params.status);
      }
    }
    if (params.order) query.set("order", params.order);

    return await this.request<{
      products: AdminProduct[];
      count: number;
      limit: number;
      offset: number;
    }>(`/admin/products?${query.toString()}`, { method: "GET" }, token);
  }

  /**
   * Create a new product in Medusa v2
   */
  async createProduct(token: string, productData: any): Promise<AdminProduct> {
    const res = await this.request<{ product: AdminProduct }>(
      "/admin/products",
      {
        method: "POST",
        body: JSON.stringify(productData),
      },
      token
    );
    return res.product;
  }

  /**
   * Update an existing product
   */
  async updateProduct(token: string, id: string, productData: any): Promise<AdminProduct> {
    const res = await this.request<{ product: AdminProduct }>(
      `/admin/products/${id}`,
      {
        method: "POST",
        body: JSON.stringify(productData),
      },
      token
    );
    return res.product;
  }

  /**
   * Delete a product by ID
   */
  async deleteProduct(token: string, id: string): Promise<{ id: string; object: string; deleted: boolean }> {
    return await this.request<{ id: string; object: string; deleted: boolean }>(
      `/admin/products/${id}`,
      { method: "DELETE" },
      token
    );
  }

  /**
   * Upload files to Medusa storage
   */
  async uploadFiles(token: string, formData: FormData): Promise<Array<{ id: string; url: string }>> {
    const url = `${this.baseUrl}/admin/uploads`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      let errBody: any = null;
      try {
        errBody = await res.json();
      } catch {
        errBody = { message: res.statusText };
      }
      throw new MedusaApiError(
        errBody?.message || `File upload failed with status ${res.status}`,
        res.status,
        errBody
      );
    }

    const json = await res.json();
    return json.files || [];
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(token: string, fileId: string): Promise<{ id: string; object: string; deleted: boolean }> {
    return await this.request<{ id: string; object: string; deleted: boolean }>(
      `/admin/uploads/${fileId}`,
      { method: "DELETE" },
      token
    );
  }

  /**
   * Create a product category
   */
  async createCategory(token: string, categoryData: any): Promise<any> {
    const res = await this.request<{ product_category: any }>(
      "/admin/product-categories",
      {
        method: "POST",
        body: JSON.stringify(categoryData),
      },
      token
    );
    return res.product_category;
  }

  /**
   * Update a product category
   */
  async updateCategory(token: string, id: string, categoryData: any): Promise<any> {
    const res = await this.request<{ product_category: any }>(
      `/admin/product-categories/${id}`,
      {
        method: "POST",
        body: JSON.stringify(categoryData),
      },
      token
    );
    return res.product_category;
  }

  /**
   * Delete a product category
   */
  async deleteCategory(token: string, id: string): Promise<{ id: string; object: string; deleted: boolean }> {
    return await this.request<{ id: string; object: string; deleted: boolean }>(
      `/admin/product-categories/${id}`,
      { method: "DELETE" },
      token
    );
  }

  /**
   * Create a collection
   */
  async createCollection(token: string, collectionData: any): Promise<any> {
    const res = await this.request<{ collection: any }>(
      "/admin/collections",
      {
        method: "POST",
        body: JSON.stringify(collectionData),
      },
      token
    );
    return res.collection;
  }

  /**
   * Update a collection
   */
  async updateCollection(token: string, id: string, collectionData: any): Promise<any> {
    const res = await this.request<{ collection: any }>(
      `/admin/collections/${id}`,
      {
        method: "POST",
        body: JSON.stringify(collectionData),
      },
      token
    );
    return res.collection;
  }

  /**
   * Delete a collection
   */
  async deleteCollection(token: string, id: string): Promise<{ id: string; object: string; deleted: boolean }> {
    return await this.request<{ id: string; object: string; deleted: boolean }>(
      `/admin/collections/${id}`,
      { method: "DELETE" },
      token
    );
  }

  /**
   * Retrieve stock locations
   */
  async getStockLocations(token: string): Promise<{ stock_locations: any[]; count: number }> {
    return await this.request<{ stock_locations: any[]; count: number }>(
      "/admin/stock-locations",
      { method: "GET" },
      token
    );
  }

  /**
   * Update stock quantity on a location level
   */
  async updateInventoryLevel(
    token: string,
    inventoryItemId: string,
    locationId: string,
    quantity: number
  ): Promise<any> {
    const res = await this.request<{ inventory_item: any }>(
      `/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
      {
        method: "POST",
        body: JSON.stringify({ stocked_quantity: quantity }),
      },
      token
    );
    return res.inventory_item;
  }

  /**
   * Retrieve single product by ID
   */
  async getProduct(token: string, id: string): Promise<AdminProduct> {
    const res = await this.request<{ product: AdminProduct }>(
      `/admin/products/${id}?fields=*variants,*categories,*collection,*images,*options,*options.values,*variants.prices`,
      { method: "GET" },
      token
    );
    return res.product;
  }

  /**
   * Retrieve orders with pagination
   */
  async getOrders(
    token: string,
    params: { limit?: number; offset?: number; status?: string } = {}
  ): Promise<{ orders: AdminOrder[]; count: number; limit: number; offset: number }> {
    const query = new URLSearchParams();
    query.set("limit", String(params.limit ?? 20));
    query.set("offset", String(params.offset ?? 0));
    if (params.status) {
      if (Array.isArray(params.status)) {
        params.status.forEach((s) => query.append("status[]", s));
      } else {
        query.append("status[]", params.status);
      }
    }

    return await this.request<{
      orders: AdminOrder[];
      count: number;
      limit: number;
      offset: number;
    }>(`/admin/orders?${query.toString()}`, { method: "GET" }, token);
  }

  /**
   * Add a variant to an existing product
   */
  async createVariant(token: string, productId: string, variantData: any): Promise<any> {
    const res = await this.request<{ product: AdminProduct }>(
      `/admin/products/${productId}/variants`,
      {
        method: "POST",
        body: JSON.stringify(variantData),
      },
      token
    );
    return res.product;
  }

  /**
   * Update a product variant
   */
  async updateVariant(
    token: string,
    productId: string,
    variantId: string,
    variantData: any
  ): Promise<any> {
    const res = await this.request<{ product: AdminProduct }>(
      `/admin/products/${productId}/variants/${variantId}`,
      {
        method: "POST",
        body: JSON.stringify(variantData),
      },
      token
    );
    return res.product;
  }

  /**
   * Delete a variant
   */
  async deleteVariant(
    token: string,
    productId: string,
    variantId: string
  ): Promise<{ id: string; object: string; deleted: boolean }> {
    return await this.request<{ id: string; object: string; deleted: boolean }>(
      `/admin/products/${productId}/variants/${variantId}`,
      { method: "DELETE" },
      token
    );
  }

  /**
   * Retrieve inventory items
   */
  async getInventoryItems(
    token: string,
    params: { limit?: number; offset?: number; q?: string } = {}
  ): Promise<{ inventory_items: any[]; count: number }> {
    const query = new URLSearchParams();
    query.set("limit", String(params.limit ?? 50));
    query.set("offset", String(params.offset ?? 0));
    query.set("fields", "*location_levels");
    if (params.q) {
      query.set("q", params.q.trim());
    }

    return await this.request<{ inventory_items: any[]; count: number }>(
      `/admin/inventory-items?${query.toString()}`,
      { method: "GET" },
      token
    );
  }

  /**
   * Retrieve categories
   */
  async getCategories(token: string): Promise<{ product_categories: any[]; count: number }> {
    return await this.request<{ product_categories: any[]; count: number }>(
      "/admin/product-categories",
      { method: "GET" },
      token
    );
  }

  /**
   * Retrieve collections
   */
  async getCollections(token: string): Promise<{ collections: any[]; count: number }> {
    return await this.request<{ collections: any[]; count: number }>(
      "/admin/collections",
      { method: "GET" },
      token
    );
  }

  /**
   * Retrieve regions
   */
  async getRegions(token: string): Promise<{ regions: any[]; count: number }> {
    return await this.request<{ regions: any[]; count: number }>(
      "/admin/regions",
      { method: "GET" },
      token
    );
  }

  /**
   * Retrieve store information
   */
  async getStores(token: string): Promise<{ stores: any[] }> {
    return await this.request<{ stores: any[] }>("/admin/stores", { method: "GET" }, token);
  }

  /**
   * Aggregates real backend data for Dashboard Overview (Phase 6)
   */
  async getDashboardStats(token: string): Promise<DashboardStats> {
    const [productsRes, draftProductsRes, ordersRes, inventoryRes] = await Promise.all([
      this.getProducts(token, { limit: 5 }),
      this.getProducts(token, { limit: 1, status: "draft" }),
      this.getOrders(token, { limit: 10 }),
      this.getInventoryItems(token, { limit: 100 }),
    ]);

    const totalProducts = productsRes.count;
    const draftProducts = draftProductsRes.count;
    const publishedProducts = Math.max(0, totalProducts - draftProducts);

    const totalOrders = ordersRes.count;
    const pendingOrders = ordersRes.orders.filter(
      (o) => o.status === "pending" || o.status === "requires_action"
    ).length;

    // Real revenue calculation grouped strictly by original transaction currency
    const revenueByCurrency: Record<string, number> = {};
    for (const order of ordersRes.orders) {
      if (order.status !== "canceled" && order.total) {
        const curr = (order.currency_code || "INR").toUpperCase();
        revenueByCurrency[curr] = (revenueByCurrency[curr] || 0) + Number(order.total);
      }
    }

    // Low stock detection
    let lowStockCount = 0;
    let totalStockUnits = 0;
    for (const item of inventoryRes.inventory_items) {
      const stocked = item.stocked_quantity ?? 0;
      totalStockUnits += stocked;
      if (stocked <= 10) {
        lowStockCount++;
      }
    }

    return {
      totalProducts,
      publishedProducts,
      draftProducts,
      totalOrders,
      pendingOrders,
      totalInventoryUnits: totalStockUnits,
      lowStockItemsCount: lowStockCount,
      recentOrders: ordersRes.orders.slice(0, 5),
      recentProducts: productsRes.products.slice(0, 5),
      revenueByCurrency,
    };
  }
}

export const medusaAdmin = new MedusaAdminClient();
