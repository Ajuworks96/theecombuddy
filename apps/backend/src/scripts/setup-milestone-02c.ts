import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createLocationFulfillmentSetWorkflow,
  createPromotionsWorkflow,
  createRegionsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createTaxRatesWorkflow,
  createTaxRegionsWorkflow,
  updateTaxRegionsWorkflow,
  upsertVariantPricesWorkflow,
} from "@medusajs/core-flows";

export default async function setupMilestone02C({ container }: { container: MedusaContainer }) {
  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);

  console.log("==============================================================================");
  console.log("[setup-02c] THE ECOM BUDDY — MILESTONE 02C COMMERCE & MULTI-REGION SETUP");
  console.log("==============================================================================");

  // 1. Get Stock Location & Default Shipping Profile
  const stockLocations = await query({
    entryPoint: "stock_location",
    fields: ["id", "name"],
    variables: { filters: { name: "India Central Warehouse" } },
  });
  const stockLocation = stockLocations[0];
  if (!stockLocation) {
    throw new Error("India Central Warehouse stock location not found!");
  }
  console.log(`[setup-02c] Found Stock Location: ${stockLocation.name} (${stockLocation.id})`);

  const profiles = await query({
    entryPoint: "shipping_profile",
    fields: ["id", "name", "type"],
    variables: { filters: { type: "default" } },
  });
  const defaultProfile = profiles[0];
  if (!defaultProfile) {
    throw new Error("Default shipping profile not found!");
  }
  console.log(`[setup-02c] Found Shipping Profile: ${defaultProfile.name} (${defaultProfile.id})`);

  // 2. Provision Initial Markets / Regions (INR, USD, AED, GBP, EUR)
  console.log("\n[setup-02c] --- Step 2: Multi-Region & Multi-Market Provisioning ---");
  const existingRegions = await query({
    entryPoint: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  });
  const existingCurrencies = new Set(existingRegions.map((r: any) => r.currency_code.toLowerCase()));

  const targetRegions = [
    { name: "India", currency_code: "inr", countries: ["in"] },
    { name: "United States", currency_code: "usd", countries: ["us"] },
    { name: "United Arab Emirates", currency_code: "aed", countries: ["ae"] },
    { name: "United Kingdom", currency_code: "gbp", countries: ["gb"] },
    { name: "European Union", currency_code: "eur", countries: ["de", "fr", "it", "es", "nl"] },
  ];

  const regionsToCreate = targetRegions.filter((tr) => !existingCurrencies.has(tr.currency_code));
  if (regionsToCreate.length > 0) {
    console.log(`[setup-02c] Creating ${regionsToCreate.length} international region(s)...`);
    const { result: createdRegions } = await createRegionsWorkflow(container).run({
      input: {
        regions: regionsToCreate,
      },
    });
    console.log(`[setup-02c] Successfully created ${createdRegions.length} region(s): ${createdRegions.map((r: any) => r.name).join(", ")}`);
  } else {
    console.log("[setup-02c] All 5 target regions (INR, USD, AED, GBP, EUR) already exist.");
  }

  // 3. Fulfillment Set & Service Zones for Stock Location
  console.log("\n[setup-02c] --- Step 3: Fulfillment Set & Service Zones ---");
  let fulfillmentSets = await query({
    entryPoint: "fulfillment_set",
    fields: ["id", "name", "service_zones.id", "service_zones.name", "service_zones.geo_zones.country_code"],
    variables: { filters: { name: "India Domestic & Global Shipping" } },
  });

  if (fulfillmentSets.length === 0) {
    fulfillmentSets = await query({
      entryPoint: "fulfillment_set",
      fields: ["id", "name", "service_zones.id", "service_zones.name", "service_zones.geo_zones.country_code"],
      variables: { filters: { name: "India Domestic Shipping" } },
    });
  }

  let fulfillmentSet = fulfillmentSets[0];
  if (!fulfillmentSet) {
    console.log("[setup-02c] Creating Fulfillment Set for India Central Warehouse...");
    await createLocationFulfillmentSetWorkflow(container).run({
      input: {
        location_id: stockLocation.id,
        fulfillment_set_data: {
          name: "India Domestic & Global Shipping",
          type: "shipping",
        },
      },
    });
    const refreshed = await query({
      entryPoint: "fulfillment_set",
      fields: ["id", "name", "service_zones.id", "service_zones.name"],
      variables: { filters: { name: "India Domestic & Global Shipping" } },
    });
    fulfillmentSet = refreshed[0];
  }
  console.log(`[setup-02c] Using Fulfillment Set: ${fulfillmentSet.name} (${fulfillmentSet.id})`);

  // Link Stock Location to Fulfillment Provider (manual_manual)
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    });
    console.log("[setup-02c] Linked Stock Location to manual_manual provider.");
  } catch {
    console.log("[setup-02c] Stock location already linked to manual_manual provider.");
  }

  // Service Zones for all target markets
  const targetZones = [
    { name: "India Delivery Zone", countries: ["in"] },
    { name: "United States Zone", countries: ["us"] },
    { name: "UAE Zone", countries: ["ae"] },
    { name: "UK Zone", countries: ["gb"] },
    { name: "EU Zone", countries: ["de", "fr", "it", "es", "nl"] },
  ];

  const existingZones = fulfillmentSet.service_zones || [];
  const existingZoneNames = new Set(existingZones.map((z: any) => z.name));

  const zonesToCreate = targetZones.filter((tz) => !existingZoneNames.has(tz.name));
  if (zonesToCreate.length > 0) {
    console.log(`[setup-02c] Creating ${zonesToCreate.length} service zone(s)...`);
    const { result: createdZones } = await createServiceZonesWorkflow(container).run({
      input: {
        data: zonesToCreate.map((tz) => ({
          name: tz.name,
          fulfillment_set_id: fulfillmentSet.id,
          geo_zones: tz.countries.map((c) => ({
            type: "country" as const,
            country_code: c,
          })),
        })),
      },
    });
    console.log(`[setup-02c] Created ${createdZones.length} new service zone(s).`);
  }

  // Reload refreshed service zones map
  const refreshedFulfillmentSets = await query({
    entryPoint: "fulfillment_set",
    fields: ["id", "service_zones.id", "service_zones.name"],
    variables: { filters: { id: fulfillmentSet.id } },
  });
  const serviceZonesList = refreshedFulfillmentSets[0]?.service_zones || [];
  const zoneMap = new Map<string, string>();
  for (const sz of serviceZonesList) {
    zoneMap.set(sz.name, sz.id);
  }

  // 4. Region-Aware Shipping Options
  console.log("\n[setup-02c] --- Step 4: Region-Aware Shipping Options ---");
  const existingOptions = await query({
    entryPoint: "shipping_option",
    fields: ["id", "name"],
  });
  const existingOptionNames = new Set(existingOptions.map((o: any) => o.name));

  const optionsToCreate: any[] = [];

  // India Options
  const indiaZoneId = zoneMap.get("India Delivery Zone");
  if (indiaZoneId && !existingOptionNames.has("Standard Surface Delivery")) {
    optionsToCreate.push({
      name: "Standard Surface Delivery",
      service_zone_id: indiaZoneId,
      shipping_profile_id: defaultProfile.id,
      provider_id: "manual_manual",
      type: {
        label: "Standard Delivery",
        description: "Reliable surface transit across India (3-5 business days)",
        code: "standard_surface",
      },
      price_type: "flat",
      prices: [{ amount: 99, currency_code: "inr" }],
      data: { is_cod: true, cod_eligible: true, delivery_days: "3-5 business days" },
    });
  }
  if (indiaZoneId && !existingOptionNames.has("Express Air Delivery")) {
    optionsToCreate.push({
      name: "Express Air Delivery",
      service_zone_id: indiaZoneId,
      shipping_profile_id: defaultProfile.id,
      provider_id: "manual_manual",
      type: {
        label: "Express Air Delivery",
        description: "Expedited air cargo delivery across major Indian metros (1-2 business days)",
        code: "express_air",
      },
      price_type: "flat",
      prices: [{ amount: 199, currency_code: "inr" }],
      data: { is_cod: false, cod_eligible: false, delivery_days: "1-2 business days" },
    });
  }

  // US Options
  const usZoneId = zoneMap.get("United States Zone");
  if (usZoneId && !existingOptionNames.has("US Express Courier")) {
    optionsToCreate.push({
      name: "US Express Courier",
      service_zone_id: usZoneId,
      shipping_profile_id: defaultProfile.id,
      provider_id: "manual_manual",
      type: {
        label: "US Express Courier",
        description: "Tracked international air courier to United States (4-7 business days)",
        code: "us_express",
      },
      price_type: "flat",
      prices: [{ amount: 15, currency_code: "usd" }],
      data: { is_cod: false, cod_eligible: false, delivery_days: "4-7 business days" },
    });
  }

  // UAE Options
  const uaeZoneId = zoneMap.get("UAE Zone");
  if (uaeZoneId && !existingOptionNames.has("Gulf Air Express")) {
    optionsToCreate.push({
      name: "Gulf Air Express",
      service_zone_id: uaeZoneId,
      shipping_profile_id: defaultProfile.id,
      provider_id: "manual_manual",
      type: {
        label: "Gulf Air Express",
        description: "Expedited air shipping to UAE / Gulf region (3-5 business days)",
        code: "gulf_air_express",
      },
      price_type: "flat",
      prices: [{ amount: 50, currency_code: "aed" }],
      data: { is_cod: false, cod_eligible: false, delivery_days: "3-5 business days" },
    });
  }

  // UK Options
  const ukZoneId = zoneMap.get("UK Zone");
  if (ukZoneId && !existingOptionNames.has("UK Royal Mail International")) {
    optionsToCreate.push({
      name: "UK Royal Mail International",
      service_zone_id: ukZoneId,
      shipping_profile_id: defaultProfile.id,
      provider_id: "manual_manual",
      type: {
        label: "UK Royal Mail International",
        description: "Tracked international delivery to the United Kingdom (5-8 business days)",
        code: "uk_royal_mail",
      },
      price_type: "flat",
      prices: [{ amount: 12, currency_code: "gbp" }],
      data: { is_cod: false, cod_eligible: false, delivery_days: "5-8 business days" },
    });
  }

  // EU Options
  const euZoneId = zoneMap.get("EU Zone");
  if (euZoneId && !existingOptionNames.has("Euro Standard Tracked")) {
    optionsToCreate.push({
      name: "Euro Standard Tracked",
      service_zone_id: euZoneId,
      shipping_profile_id: defaultProfile.id,
      provider_id: "manual_manual",
      type: {
        label: "Euro Standard Tracked",
        description: "Tracked road and air transit across European Union (5-8 business days)",
        code: "eu_standard",
      },
      price_type: "flat",
      prices: [{ amount: 15, currency_code: "eur" }],
      data: { is_cod: false, cod_eligible: false, delivery_days: "5-8 business days" },
    });
  }

  if (optionsToCreate.length > 0) {
    console.log(`[setup-02c] Creating ${optionsToCreate.length} shipping option(s)...`);
    const { result: createdOptions } = await createShippingOptionsWorkflow(container).run({
      input: optionsToCreate,
    });
    console.log(`[setup-02c] Successfully created ${createdOptions.length} shipping option(s).`);
  } else {
    console.log("[setup-02c] Shipping options already provisioned.");
  }

  // 5. Extensible Tax Regions & Rates
  console.log("\n[setup-02c] --- Step 5: Extensible Tax Regions ---");
  const targetTaxes = [
    { country_code: "in", rate_name: "Standard GST", rate: 18, code: "GST18" },
    { country_code: "us", rate_name: "US Federal / State Zero Base", rate: 0, code: "US0" },
    { country_code: "ae", rate_name: "UAE VAT", rate: 5, code: "UAE5" },
    { country_code: "gb", rate_name: "UK Standard VAT", rate: 20, code: "UK20" },
    { country_code: "de", rate_name: "EU Standard VAT", rate: 19, code: "EU19" },
  ];

  for (const tax of targetTaxes) {
    const existingTax = await query({
      entryPoint: "tax_region",
      fields: ["id", "country_code", "provider_id", "tax_rates.id"],
      variables: { filters: { country_code: tax.country_code } },
    });

    if (existingTax.length === 0) {
      console.log(`[setup-02c] Creating Tax Region for country: ${tax.country_code}...`);
      const { result: createdTaxRegions } = await createTaxRegionsWorkflow(container).run({
        input: [{ country_code: tax.country_code, provider_id: "tp_system" }],
      });
      const createdRegion = createdTaxRegions[0];

      await createTaxRatesWorkflow(container).run({
        input: [
          {
            tax_region_id: createdRegion.id,
            name: tax.rate_name,
            rate: tax.rate,
            code: tax.code,
            is_default: true,
          },
        ],
      });
      console.log(`[setup-02c] Provisioned Tax Region for ${tax.country_code} (${tax.rate_name} @ ${tax.rate}%).`);
    } else {
      const region = existingTax[0];
      if (region.provider_id !== "tp_system") {
        console.log(`[setup-02c] Updating tax region ${region.id} provider_id to tp_system...`);
        await updateTaxRegionsWorkflow(container).run({
          input: [{ id: region.id, provider_id: "tp_system" }],
        });
      }
      console.log(`[setup-02c] Tax Region for ${tax.country_code} verified with tp_system.`);
    }
  }

  // 6. Multi-Currency Pricing for Catalog Variants
  console.log("\n[setup-02c] --- Step 6: Multi-Currency Variant Pricing ---");
  const pricingModule = container.resolve(Modules.PRICING);

  const variants = await query({
    entryPoint: "product_variant",
    fields: [
      "id",
      "sku",
      "product_id",
      "price_set.id",
      "price_set.prices.id",
      "price_set.prices.currency_code",
      "price_set.prices.amount",
    ],
  });

  const priceSetsToAdd: Array<{ priceSetId: string; prices: Array<{ amount: number; currency_code: string }> }> = [];

  for (const v of variants) {
    if (!v.price_set?.id) continue;
    const prices = v.price_set?.prices || [];
    const currenciesPresent = new Set(prices.map((p: any) => p.currency_code.toLowerCase()));

    // Find the base INR price
    const inrPriceObj = prices.find((p: any) => p.currency_code.toLowerCase() === "inr");
    const baseInrPrice = inrPriceObj ? Number(inrPriceObj.amount) : 999;

    const neededCurrencies = ["usd", "aed", "gbp", "eur"].filter((c) => !currenciesPresent.has(c));
    if (neededCurrencies.length > 0) {
      // Calculate realistic merchant international pricing
      // USD: ~INR / 84
      // AED: ~INR / 23
      // GBP: ~INR / 108
      // EUR: ~INR / 91
      const newPrices: Array<{ amount: number; currency_code: string }> = [];
      if (!currenciesPresent.has("usd")) {
        newPrices.push({
          currency_code: "usd",
          amount: Math.max(5, Math.round(baseInrPrice / 84)),
        });
      }
      if (!currenciesPresent.has("aed")) {
        newPrices.push({
          currency_code: "aed",
          amount: Math.max(20, Math.round(baseInrPrice / 23)),
        });
      }
      if (!currenciesPresent.has("gbp")) {
        newPrices.push({
          currency_code: "gbp",
          amount: Math.max(4, Math.round(baseInrPrice / 108)),
        });
      }
      if (!currenciesPresent.has("eur")) {
        newPrices.push({
          currency_code: "eur",
          amount: Math.max(5, Math.round(baseInrPrice / 91)),
        });
      }

      priceSetsToAdd.push({
        priceSetId: v.price_set.id,
        prices: newPrices,
      });
    }
  }

  console.log(`[setup-02c] Found ${priceSetsToAdd.length} variant price sets requiring international prices.`);
  if (priceSetsToAdd.length > 0) {
    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(priceSetsToAdd.length / BATCH_SIZE);
    for (let b = 0; b < priceSetsToAdd.length; b += BATCH_SIZE) {
      const chunk = priceSetsToAdd.slice(b, b + BATCH_SIZE);
      const batchNum = Math.floor(b / BATCH_SIZE) + 1;
      console.log(`[setup-02c] Adding variant prices batch ${batchNum}/${totalBatches}...`);

      await pricingModule.addPrices(chunk);
    }
    console.log(`[setup-02c] Successfully added multi-currency prices for all ${priceSetsToAdd.length} variants.`);
  }

  // 7. Promotions & Discounts (WELCOME10 & FLAT100)
  console.log("\n[setup-02c] --- Step 7: Multi-Currency Promotions ---");
  const existingPromotions = await query({
    entryPoint: "promotion",
    fields: ["id", "code"],
  });
  const existingPromoCodes = new Set(existingPromotions.map((p: any) => p.code));

  const promosToCreate: any[] = [];
  if (!existingPromoCodes.has("WELCOME10")) {
    promosToCreate.push({
      code: "WELCOME10",
      type: "standard",
      status: "active",
      application_method: {
        type: "percentage",
        target_type: "items",
        allocation: "across",
        value: 10,
        currency_code: "inr",
      },
    });
  }

  if (!existingPromoCodes.has("FLAT100")) {
    promosToCreate.push({
      code: "FLAT100",
      type: "standard",
      status: "active",
      application_method: {
        type: "fixed",
        target_type: "order",
        allocation: "across",
        value: 100,
        currency_code: "inr",
      },
    });
  }

  if (promosToCreate.length > 0) {
    console.log(`[setup-02c] Creating ${promosToCreate.length} test promotion(s)...`);
    const { result: createdPromos } = await createPromotionsWorkflow(container).run({
      input: {
        promotionsData: promosToCreate,
      },
    });
    console.log(`[setup-02c] Successfully created ${createdPromos.length} promotion(s).`);
  } else {
    console.log("[setup-02c] Promotions already provisioned.");
  }

  console.log("\n==============================================================================");
  console.log("[setup-02c] MILESTONE 02C COMMERCE & MULTI-REGION SETUP COMPLETED");
  console.log("==============================================================================");
}
