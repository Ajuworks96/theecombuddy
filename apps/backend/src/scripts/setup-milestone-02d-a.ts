import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateRegionsWorkflow, createTaxRatesWorkflow } from "@medusajs/core-flows";

export default async function setupMilestone02DA({ container }: { container: MedusaContainer }) {
  console.log("==============================================================================");
  console.log("[setup-02d-a] THE ECOM BUDDY — MILESTONE 02D-A CHECKOUT & COD SETUP");
  console.log("==============================================================================");

  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);

  // 1. Get Default Shipping Profile
  const profiles: any[] = await query({
    entryPoint: "shipping_profile",
    fields: ["id", "name", "type"],
    variables: { filters: { type: "default" } },
  });
  const defaultProfile = profiles[0];
  if (!defaultProfile) {
    throw new Error("Default shipping profile not found!");
  }
  console.log(`[setup-02d-a] Using Shipping Profile: ${defaultProfile.name} (${defaultProfile.id})`);

  // 2. Link all 520 catalog products to Default Shipping Profile
  console.log("[setup-02d-a] Linking catalog products to default shipping profile...");
  const products: any[] = await query({
    entryPoint: "product",
    fields: ["id", "handle"],
    variables: { filters: { handle: { $like: "teb-%" } } },
  });
  console.log(`[setup-02d-a] Found ${products.length} catalog products.`);

  const existingProductLinks: any[] = await query({
    entryPoint: "product_shipping_profile",
    fields: ["product_id", "shipping_profile_id"],
  });
  const linkedProductIds = new Set(existingProductLinks.map((l: any) => l.product_id));

  const productsNeedingLink = products.filter((p: any) => !linkedProductIds.has(p.id));
  console.log(`[setup-02d-a] Products needing shipping profile link: ${productsNeedingLink.length}`);

  if (productsNeedingLink.length > 0) {
    const BATCH_SIZE = 50;
    for (let i = 0; i < productsNeedingLink.length; i += BATCH_SIZE) {
      const chunk = productsNeedingLink.slice(i, i + BATCH_SIZE);
      const linkPayload = chunk.map((p: any) => ({
        [Modules.PRODUCT]: { product_id: p.id },
        [Modules.FULFILLMENT]: { shipping_profile_id: defaultProfile.id },
      }));
      await link.create(linkPayload);
    }
    console.log(`[setup-02d-a] Successfully linked ${productsNeedingLink.length} products to default shipping profile.`);
  } else {
    console.log("[setup-02d-a] All catalog products already linked to shipping profile.");
  }

  // 3. Link pp_system_default payment provider to India Region (and other regions)
  console.log("\n[setup-02d-a] Linking pp_system_default payment provider to regions...");
  const allRegions: any[] = await query({
    entryPoint: "region",
    fields: ["id", "name", "currency_code", "payment_providers.id"],
  });

  for (const r of allRegions) {
    const hasSystemProvider = r.payment_providers?.some((p: any) => p.id === "pp_system_default");
    if (!hasSystemProvider) {
      console.log(`[setup-02d-a] Linking pp_system_default to ${r.name} (${r.currency_code})...`);
      await updateRegionsWorkflow(container).run({
        input: {
          selector: { id: r.id },
          update: { payment_providers: ["pp_system_default"] },
        },
      });
    } else {
      console.log(`[setup-02d-a] Region ${r.name} already linked to pp_system_default.`);
    }
  }

  // 4. Provision Development Tiered GST Rate Fixtures for India
  console.log("\n[setup-02d-a] Provisioning Indian GST Rate Fixtures (Development Baseline)...");
  const indiaTaxRegions: any[] = await query({
    entryPoint: "tax_region",
    fields: ["id", "country_code", "tax_rates.id", "tax_rates.code"],
    variables: { filters: { country_code: "in" } },
  });
  const indiaTaxRegion = indiaTaxRegions[0];

  if (indiaTaxRegion) {
    const existingTaxCodes = new Set(indiaTaxRegion.tax_rates?.map((r: any) => r.code) || []);
    const tieredGstRates = [
      { name: "Essential Commodities GST", rate: 5, code: "GST5", is_default: false },
      { name: "Apparel & Stationery GST", rate: 12, code: "GST12", is_default: false },
      { name: "Luxury / Electronics GST", rate: 28, code: "GST28", is_default: false },
    ];

    const ratesToCreate = tieredGstRates.filter((r) => !existingTaxCodes.has(r.code));
    if (ratesToCreate.length > 0) {
      console.log(`[setup-02d-a] Creating ${ratesToCreate.length} additional GST tier fixtures...`);
      await createTaxRatesWorkflow(container).run({
        input: ratesToCreate.map((r) => ({
          tax_region_id: indiaTaxRegion.id,
          name: r.name,
          rate: r.rate,
          code: r.code,
          is_default: r.is_default,
        })),
      });
      console.log(`[setup-02d-a] Successfully provisioned tiered GST rate fixtures.`);
    } else {
      console.log("[setup-02d-a] Tiered GST rate fixtures already present.");
    }
  }

  console.log("\n==============================================================================");
  console.log("[setup-02d-a] MILESTONE 02D-A SETUP COMPLETED SUCCESSFULLY");
  console.log("==============================================================================");
}
