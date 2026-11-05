import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  createRegionsWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  createCollectionsWorkflow,
  createProductsWorkflow,
} from "@medusajs/core-flows";

export default async function bootstrapProduction({ container }: { container: MedusaContainer }) {
  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const authService = container.resolve(Modules.AUTH);
  const workflowEngine = container.resolve(Modules.WORKFLOW_ENGINE);
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);

  logger.info("==============================================================================");
  logger.info("[bootstrap] THE ECOM BUDDY — LIVE PRODUCTION CLOUD INITIALIZATION");
  logger.info("==============================================================================");

  // 0. Ensure custom theme_configurations schema exists
  try {
    const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any;
    if (pgConnection && typeof pgConnection.raw === "function") {
      await pgConnection.raw(`
        CREATE TABLE IF NOT EXISTS theme_configurations (
          id VARCHAR(64) PRIMARY KEY,
          version INTEGER NOT NULL DEFAULT 1,
          status VARCHAR(20) NOT NULL DEFAULT 'draft',
          preset_id VARCHAR(50) NOT NULL DEFAULT 'velora',
          name VARCHAR(255) NOT NULL,
          theme_data JSONB NOT NULL,
          created_by VARCHAR(255) DEFAULT 'admin@theecombuddy.com',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          published_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_theme_status ON theme_configurations (status);
        CREATE INDEX IF NOT EXISTS idx_theme_version ON theme_configurations (version DESC);
        CREATE INDEX IF NOT EXISTS idx_theme_preset ON theme_configurations (preset_id);
      `);
      logger.info("[bootstrap] Verified theme_configurations schema.");
    }
  } catch (err: any) {
    logger.warn(`[bootstrap] theme_configurations schema notice: ${err.message}`);
  }

  // 1. Ensure Admin User Exists
  const adminEmail = process.env.ADMIN_EMAIL || "admin@theecombuddy.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "TheEcomBuddy2026!";

  let adminUser: any = null;
  const existingUsers: any[] = await query({
    entryPoint: "user",
    fields: ["id", "email"],
    variables: { filters: { email: adminEmail } },
  });

  if (existingUsers.length > 0) {
    adminUser = existingUsers[0];
    logger.info(`[bootstrap] Admin user already exists: ${adminUser.email} (${adminUser.id})`);
  } else {
    logger.info(`[bootstrap] Creating admin user: ${adminEmail}...`);
    const { result: users } = await workflowEngine.run("create-users-workflow", {
      input: {
        users: [
          {
            email: adminEmail,
            first_name: "The Ecom",
            last_name: "Buddy Admin",
          },
        ],
      },
    });
    adminUser = users[0];

    const { authIdentity, error } = await authService.register("emailpass", {
      body: {
        email: adminEmail,
        password: adminPassword,
      },
    });

    if (error) {
      logger.warn(`[bootstrap] Auth register notice: ${error}`);
    } else if (authIdentity) {
      await authService.updateAuthIdentities({
        id: authIdentity.id,
        app_metadata: {
          user_id: adminUser.id,
        },
      });
      logger.info(`[bootstrap] Admin credentials registered for: ${adminEmail}`);
    }
  }

  // 2. Ensure Default Sales Channel
  let [defaultSalesChannel] = await salesChannelModule.listSalesChannels({ name: "Default Sales Channel" });
  if (!defaultSalesChannel) {
    [defaultSalesChannel] = await salesChannelModule.createSalesChannels([{ name: "Default Sales Channel" }]);
    logger.info(`[bootstrap] Created Default Sales Channel: ${defaultSalesChannel.id}`);
  } else {
    logger.info(`[bootstrap] Found Default Sales Channel: ${defaultSalesChannel.id}`);
  }

  // 3. Ensure Publishable API Key
  const existingKeys: any[] = await query({
    entryPoint: "api_key",
    fields: ["id", "token", "type", "title"],
    variables: { filters: { type: "publishable" } },
  });

  let publishableKeyToken = "";
  if (existingKeys.length > 0) {
    publishableKeyToken = existingKeys[0].token;
    logger.info(`[bootstrap] Found existing publishable API key: ${publishableKeyToken}`);
    // Ensure linked to sales channel
    try {
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: {
          id: existingKeys[0].id,
          add: [defaultSalesChannel.id],
        },
      });
    } catch {}
  } else {
    logger.info("[bootstrap] Creating new publishable API key for storefront...");
    const { result: apiKeys } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            type: "publishable",
            title: "Web Storefront Live",
            created_by: adminUser.id,
          },
        ],
      },
    });

    const newKey = apiKeys[0];
    publishableKeyToken = newKey.token;
    logger.info(`[bootstrap] Created publishable API key: ${publishableKeyToken}`);

    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: newKey.id,
        add: [defaultSalesChannel.id],
      },
    });
    logger.info("[bootstrap] Linked publishable API key to Default Sales Channel.");
  }

  // 4. Ensure Multi-Region Setup (India, US, UAE, UK, EU)
  const existingRegions: any[] = await query({
    entryPoint: "region",
    fields: ["id", "name", "currency_code"],
  });
  const existingCurrencies = new Set(existingRegions.map((r: any) => r.currency_code.toLowerCase()));

  const targetRegions = [
    { name: "India", currency_code: "inr", countries: ["in"] },
    { name: "United States", currency_code: "usd", countries: ["us"] },
    { name: "United Arab Emirates", currency_code: "aed", countries: ["ae"] },
    { name: "United Kingdom", currency_code: "gbp", countries: ["gb"] },
    { name: "European Union", currency_code: "eur", countries: ["de", "fr", "it", "es", "nl"] },
  ];

  const regionsToCreate = targetRegions.filter((r) => !existingCurrencies.has(r.currency_code));
  if (regionsToCreate.length > 0) {
    logger.info(`[bootstrap] Creating ${regionsToCreate.length} missing regions...`);
    await createRegionsWorkflow(container).run({
      input: { regions: regionsToCreate },
    });
    logger.info("[bootstrap] Regions provisioned successfully.");
  } else {
    logger.info(`[bootstrap] All ${targetRegions.length} target regions already provisioned.`);
  }

  // 5. Ensure Stock Location
  const locQuery: any[] = await query({
    entryPoint: "stock_location",
    fields: ["id", "name"],
    variables: { filters: { name: "India Central Warehouse" } },
  });
  let stockLocation = locQuery[0];
  if (!stockLocation) {
    const { result: locations } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "India Central Warehouse",
            address: {
              address_1: "Bandra Kurla Complex",
              city: "Mumbai",
              country_code: "in",
              postal_code: "400051",
            },
          },
        ],
      },
    });
    stockLocation = locations[0];
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel.id],
      },
    });
    logger.info(`[bootstrap] Created and linked Stock Location: ${stockLocation.name} (${stockLocation.id})`);
  } else {
    logger.info(`[bootstrap] Found Stock Location: ${stockLocation.name}`);
  }

  // 6. Ensure Showcase Products (if catalog is empty)
  const existingProducts: any[] = await query({
    entryPoint: "product",
    fields: ["id", "title"],
  });
  logger.info(`[bootstrap] Current products count: ${existingProducts.length}`);

  if (existingProducts.length === 0) {
    logger.info("[bootstrap] Catalog is empty. Seeding initial baseline catalog...");

    // Create Collections
    const { result: collections } = await createCollectionsWorkflow(container).run({
      input: {
        collections: [
          { title: "Bestsellers", handle: "bestsellers" },
          { title: "New Arrivals", handle: "new-arrivals" },
          { title: "Featured Audio", handle: "featured-audio" },
        ],
      },
    });

    // Create Showcase Products
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "True Wireless Active Noise Cancelling Earbuds",
            handle: "teb-elec-001",
            description: "Studio-grade active noise cancellation with 10mm titanium drivers and 40-hour wireless playback.",
            collection_id: collections[0].id,
            sales_channels: [{ id: defaultSalesChannel.id }],
            options: [{ title: "Color", values: ["Matte Black", "Arctic White"] }],
            variants: [
              {
                title: "Matte Black",
                sku: "TEB-ELEC-001-BLK",
                options: { Color: "Matte Black" },
                prices: [
                  { amount: 4999, currency_code: "inr" },
                  { amount: 59, currency_code: "usd" },
                  { amount: 219, currency_code: "aed" },
                  { amount: 49, currency_code: "gbp" },
                  { amount: 55, currency_code: "eur" },
                ],
              },
              {
                title: "Arctic White",
                sku: "TEB-ELEC-001-WHT",
                options: { Color: "Arctic White" },
                prices: [
                  { amount: 4999, currency_code: "inr" },
                  { amount: 59, currency_code: "usd" },
                  { amount: 219, currency_code: "aed" },
                  { amount: 49, currency_code: "gbp" },
                  { amount: 55, currency_code: "eur" },
                ],
              },
            ],
          },
          {
            title: "Handloom Khadi Pure Cotton Kurta",
            handle: "teb-appr-001",
            description: "Handcrafted breathable organic Khadi cotton tailored for minimalist elegance and all-day comfort.",
            collection_id: collections[1].id,
            sales_channels: [{ id: defaultSalesChannel.id }],
            options: [{ title: "Size", values: ["M", "L", "XL"] }],
            variants: [
              {
                title: "M",
                sku: "TEB-APPR-001-M",
                options: { Size: "M" },
                prices: [
                  { amount: 1999, currency_code: "inr" },
                  { amount: 25, currency_code: "usd" },
                  { amount: 89, currency_code: "aed" },
                  { amount: 20, currency_code: "gbp" },
                  { amount: 22, currency_code: "eur" },
                ],
              },
              {
                title: "L",
                sku: "TEB-APPR-001-L",
                options: { Size: "L" },
                prices: [
                  { amount: 1999, currency_code: "inr" },
                  { amount: 25, currency_code: "usd" },
                  { amount: 89, currency_code: "aed" },
                  { amount: 20, currency_code: "gbp" },
                  { amount: 22, currency_code: "eur" },
                ],
              },
            ],
          },
        ],
      },
    });
    logger.info("[bootstrap] Baseline showcase catalog created.");
  }

  logger.info("==============================================================================");
  logger.info("[bootstrap] CLOUD BOOTSTRAP COMPLETE");
  logger.info(`- Admin Email:       ${adminEmail}`);
  logger.info(`- Publishable Key:   ${publishableKeyToken}`);
  logger.info("==============================================================================");
}

