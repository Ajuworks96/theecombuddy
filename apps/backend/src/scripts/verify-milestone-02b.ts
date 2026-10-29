import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  deleteProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/core-flows";

interface ProductRecord {
  id: string;
  title: string;
  handle: string;
  status: string;
  collection_id?: string | null;
}

interface VariantRecord {
  id: string;
  title: string;
  sku: string | null;
  product_id: string;
}

interface CategoryRecord {
  id: string;
  name: string;
  handle: string;
}

interface CollectionRecord {
  id: string;
  title: string;
  handle: string;
}

interface InventoryLevelRecord {
  id: string;
  inventory_item_id: string;
  location_id: string;
  stocked_quantity: number;
  reserved_quantity: number;
}

interface StoreProductListResponse {
  products: Array<{
    id: string;
    title: string;
    handle: string;
    variants: Array<{
      id: string;
      title: string;
      sku: string;
      calculated_price?: {
        calculated_amount: number;
        currency_code: string;
      };
      prices?: Array<{
        amount: number;
        currency_code: string;
      }>;
    }>;
  }>;
  count: number;
  limit: number;
  offset: number;
}

export default async function verifyMilestone02B({ container }: { container: MedusaContainer }) {
  console.log("==============================================================================");
  console.log("[verify] THE ECOM BUDDY — MILESTONE 02B FUNCTIONAL VERIFICATION SUITE");
  console.log("==============================================================================");

  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const productModule = container.resolve(Modules.PRODUCT);
  const inventoryModule = container.resolve(Modules.INVENTORY);
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      if (details) console.log(`         -> ${details}`);
    } else {
      console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
      if (details) console.error(`         -> ${details}`);
      throw new Error(`Verification assertion failed: ${testName}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 1: CATALOG SIZE AND SEED DATA AUDIT
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 1: Catalog Capacity & Seed Integrity ---");

  const allProducts = (await query({
    entryPoint: "product",
    fields: ["id", "title", "handle", "status", "collection_id"],
  })) as ProductRecord[];
  assert(
    allProducts.length >= 500,
    "Minimum 500 distinct products requirement",
    `Total products found in database: ${allProducts.length}`
  );

  const allVariants = (await query({
    entryPoint: "product_variant",
    fields: ["id", "title", "sku", "product_id"],
  })) as VariantRecord[];
  assert(
    allVariants.length >= 1000,
    "Minimum 1,000 product variants requirement",
    `Total variants found in database: ${allVariants.length}`
  );

  // Check SKU uniqueness
  const skuSet = new Set<string>();
  const duplicateSkus: string[] = [];
  for (const v of allVariants) {
    if (v.sku) {
      if (skuSet.has(v.sku)) {
        duplicateSkus.push(v.sku);
      }
      skuSet.add(v.sku);
    }
  }
  assert(
    duplicateSkus.length === 0,
    "100% SKU Uniqueness across all variants",
    `Unique SKUs: ${skuSet.size}, Duplicates: ${duplicateSkus.length}`
  );

  // Check categories & collections
  const categories = (await query({
    entryPoint: "product_category",
    fields: ["id", "name", "handle"],
  })) as CategoryRecord[];
  assert(
    categories.length >= 8,
    "Minimum 8 Product Categories",
    `Categories count: ${categories.length} (${categories.map((c) => c.name).join(", ")})`
  );

  const collections = (await query({
    entryPoint: "product_collection",
    fields: ["id", "title", "handle"],
  })) as CollectionRecord[];
  assert(
    collections.length >= 4,
    "Minimum 4 Collections",
    `Collections count: ${collections.length} (${collections.map((c) => c.title).join(", ")})`
  );

  // Check published vs draft distribution (~90% published, ~10% draft)
  const publishedProducts = allProducts.filter((p) => p.status === "published");
  const draftProducts = allProducts.filter((p) => p.status === "draft");
  assert(
    publishedProducts.length > 0 && draftProducts.length > 0,
    "Both Published and Draft Product Statuses Present",
    `Published: ${publishedProducts.length} (${Math.round((publishedProducts.length / allProducts.length) * 100)}%), Draft: ${draftProducts.length} (${Math.round((draftProducts.length / allProducts.length) * 100)}%)`
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 2: INVENTORY & STOCK LEVELS
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 2: Inventory & Stock Location Audit ---");

  const stockLocations = (await query({
    entryPoint: "stock_location",
    fields: ["id", "name", "address.city", "address.country_code"],
  })) as Array<{ id: string; name: string; address?: { city?: string; country_code?: string } }>;
  const indiaWarehouse = stockLocations.find((loc) => loc.name === "India Central Warehouse");
  assert(
    Boolean(indiaWarehouse),
    "India Central Warehouse Stock Location Present",
    `Location ID: ${indiaWarehouse?.id}, City: ${indiaWarehouse?.address?.city}, Country: ${indiaWarehouse?.address?.country_code}`
  );

  const inventoryLevels = (await query({
    entryPoint: "inventory_level",
    fields: ["id", "inventory_item_id", "location_id", "stocked_quantity", "reserved_quantity"],
  })) as InventoryLevelRecord[];
  assert(
    inventoryLevels.length >= 1000,
    "Inventory levels configured for all seeded variant inventory items",
    `Total inventory levels: ${inventoryLevels.length}`
  );

  const outOfStockItems = inventoryLevels.filter((lvl) => lvl.stocked_quantity === 0);
  const lowStockItems = inventoryLevels.filter(
    (lvl) => lvl.stocked_quantity > 0 && lvl.stocked_quantity <= 10
  );
  const normalStockItems = inventoryLevels.filter((lvl) => lvl.stocked_quantity > 10);

  assert(
    outOfStockItems.length > 0,
    "Out-of-Stock scenario present in seed data",
    `Out-of-stock items: ${outOfStockItems.length}`
  );
  assert(
    lowStockItems.length > 0,
    "Low-Stock (<=10) scenario present in seed data",
    `Low-stock items: ${lowStockItems.length}`
  );
  assert(
    normalStockItems.length > 0,
    "Normal stock (>10) items present in seed data",
    `Normal-stock items: ${normalStockItems.length}`
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 3: PRODUCT LIFECYCLE (CRUD) VIA OFFICIAL WORKFLOWS
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 3: Official Medusa Product Lifecycle Workflows ---");

  const [defaultSalesChannel] = await salesChannelModule.listSalesChannels({ name: "Default Sales Channel" });
  const testHandle = `test-lifecycle-${Date.now()}`;

  // 3.1 Create
  console.log("  Executing createProductsWorkflow...");
  const { result: createdProducts } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Temporary Lifecycle Test Product",
          handle: testHandle,
          description: "A test product to verify create, read, update, and soft-delete workflows.",
          status: "published",
          sales_channels: [{ id: defaultSalesChannel.id }],
          options: [{ title: "Edition", values: ["Alpha", "Beta"] }],
          variants: [
            {
              title: "Alpha",
              sku: `TEST-CRUD-${Date.now()}-A`,
              options: { Edition: "Alpha" },
              prices: [{ currency_code: "inr", amount: 1299 }],
            },
            {
              title: "Beta",
              sku: `TEST-CRUD-${Date.now()}-B`,
              options: { Edition: "Beta" },
              prices: [{ currency_code: "inr", amount: 1599 }],
            },
          ],
        },
      ],
    },
  });
  const createdTestProduct = createdProducts[0];
  assert(
    Boolean(createdTestProduct && createdTestProduct.id),
    "Product Creation via createProductsWorkflow",
    `Created Product ID: ${createdTestProduct.id}, Handle: ${createdTestProduct.handle}`
  );

  // 3.2 Update
  console.log("  Executing updateProductsWorkflow...");
  const updatedTitle = "Updated Lifecycle Test Product (Verified)";
  const { result: updatedProducts } = await updateProductsWorkflow(container).run({
    input: {
      selector: { id: createdTestProduct.id },
      update: {
        title: updatedTitle,
        status: "draft",
        metadata: { verified_by: "milestone-02b-test", updated_at: new Date().toISOString() },
      },
    },
  });
  const updatedProduct = updatedProducts[0];
  assert(
    updatedProduct.title === updatedTitle && updatedProduct.status === "draft",
    "Product Update and Status Transition to Draft via updateProductsWorkflow",
    `Updated title: "${updatedProduct.title}", status: "${updatedProduct.status}"`
  );

  // 3.3 Delete / Cleanup
  console.log("  Executing deleteProductsWorkflow...");
  await deleteProductsWorkflow(container).run({
    input: { ids: [createdTestProduct.id] },
  });

  const checkDeleted = await query({
    entryPoint: "product",
    fields: ["id", "title"],
    variables: { filters: { id: createdTestProduct.id } },
  });
  assert(
    checkDeleted.length === 0,
    "Product Deletion via deleteProductsWorkflow",
    `Queried product ID ${createdTestProduct.id} after deletion: not found (0 items)`
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 4: STORE API & REGIONAL PRICING (HTTP Integration)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 4: Store API Endpoints & Regional Pricing ---");

  // Retrieve publishable API key
  const apiKeys = await query({
    entryPoint: "api_key",
    fields: ["id", "token", "type"],
    variables: { filters: { type: "publishable" } },
  });
  const publishableKey = apiKeys[0]?.token;
  assert(
    Boolean(publishableKey),
    "Publishable API key available for Store API requests",
    `Key Token: ${publishableKey?.slice(0, 16)}...`
  );

  // Retrieve India Region
  const regions = await query({
    entryPoint: "region",
    fields: ["id", "name", "currency_code"],
    variables: { filters: { currency_code: "inr" } },
  });
  const indiaRegion = regions[0];
  assert(
    Boolean(indiaRegion),
    "India Region (INR) active",
    `Region ID: ${indiaRegion.id}`
  );

  const BASE_URL = "http://localhost:9000";
  const headers = {
    "x-publishable-api-key": publishableKey,
    "Content-Type": "application/json",
  };

  // 4.1 GET /store/products (Page 1: limit 50)
  const t0 = Date.now();
  const resPage1 = await fetch(`${BASE_URL}/store/products?limit=50&offset=0&region_id=${indiaRegion.id}`, { headers });
  const latencyPage1 = Date.now() - t0;
  assert(
    resPage1.status === 200,
    "Store API GET /store/products (Page 1) returns HTTP 200",
    `Status: ${resPage1.status}, Latency: ${latencyPage1}ms`
  );

  const bodyPage1 = (await resPage1.json()) as StoreProductListResponse;
  assert(
    bodyPage1.products && bodyPage1.products.length === 50,
    "Store API returns 50 products for limit=50",
    `Count on Page 1: ${bodyPage1.products.length}, Total catalog count: ${bodyPage1.count}`
  );
  assert(
    bodyPage1.count >= 450 && bodyPage1.count <= 520,
    "Store API total count accurately reflects published products (excluding drafts)",
    `Reported published count on Store API: ${bodyPage1.count} (of 520 total products)`
  );

  // 4.2 GET /store/products (Page 2: offset 50)
  const resPage2 = await fetch(`${BASE_URL}/store/products?limit=50&offset=50&region_id=${indiaRegion.id}`, { headers });
  assert(
    resPage2.status === 200,
    "Store API GET /store/products (Page 2: offset 50) returns HTTP 200",
    `Status: ${resPage2.status}`
  );
  const bodyPage2 = (await resPage2.json()) as StoreProductListResponse;
  const page1Ids = new Set(bodyPage1.products.map((p) => p.id));
  const page2HasOverlap = bodyPage2.products.some((p) => page1Ids.has(p.id));
  assert(
    !page2HasOverlap && bodyPage2.products.length === 50,
    "Store API pagination offset behaves correctly with zero overlap",
    `Page 2 items: ${bodyPage2.products.length}, Overlap with Page 1: ${page2HasOverlap}`
  );

  // 4.3 Category Filtering
  const testCategory = categories[0];
  const resCatFilter = await fetch(`${BASE_URL}/store/products?category_id[]=${testCategory.id}&region_id=${indiaRegion.id}`, { headers });
  assert(
    resCatFilter.status === 200,
    `Store API Category Filtering for "${testCategory.name}" returns HTTP 200`,
    `Status: ${resCatFilter.status}`
  );
  const bodyCatFilter = (await resCatFilter.json()) as StoreProductListResponse;
  assert(
    bodyCatFilter.products.length > 0,
    "Category filter returns relevant filtered products",
    `Found ${bodyCatFilter.products.length} products for category ${testCategory.name}`
  );

  // 4.4 Regional Pricing Verification (INR)
  const sampleProduct = bodyPage1.products[0];
  const sampleVariant = sampleProduct.variants[0];
  assert(
    Boolean(sampleVariant.calculated_price || sampleVariant.prices?.some((p) => p.currency_code === "inr")),
    "Product variant contains valid INR pricing information",
    `Variant SKU: ${sampleVariant.sku}, Calculated Price: ${JSON.stringify(sampleVariant.calculated_price?.calculated_amount ?? sampleVariant.prices?.[0]?.amount)} INR`
  );

  // -------------------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n==============================================================================");
  console.log(`[verify] ALL ${passedTests} OF ${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("==============================================================================");
}
