import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function setupMilestone02DB({ container }: { container: MedusaContainer }) {
  console.log("==============================================================================");
  console.log("[setup-02d-b] THE ECOM BUDDY — MILESTONE 02D-B RAZORPAY GATEWAY & REGION SAFETY");
  console.log("==============================================================================");

  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const paymentService = container.resolve(Modules.PAYMENT);

  // 1. Audit Registered Payment Providers
  const dbProviders: any[] = await paymentService.listPaymentProviders();
  console.log(`[setup-02d-b] Registered providers in database: ${JSON.stringify(dbProviders.map((p) => p.id))}`);

  const hasRazorpay = dbProviders.some((p) => p.id === "pp_razorpay_razorpay" && p.is_enabled);
  if (!hasRazorpay) {
    throw new Error("pp_razorpay_razorpay payment provider is not registered or not enabled in the database!");
  }
  console.log("[setup-02d-b] pp_razorpay_razorpay confirmed active in database.");

  // 2. Fetch all regions
  const allRegions: any[] = await query({
    entryPoint: "region",
    fields: ["id", "name", "currency_code", "payment_providers.id"],
  });

  // 3. Remove pp_system_default (COD) from all International regions
  console.log("\n[setup-02d-b] Enforcing COD safety policy: stripping pp_system_default from foreign markets...");
  const intlRegions = allRegions.filter((r) => r.currency_code.toLowerCase() !== "inr");
  const dismissPayload = intlRegions.map((r) => ({
    [Modules.REGION]: { region_id: r.id },
    [Modules.PAYMENT]: { payment_provider_id: "pp_system_default" },
  }));

  try {
    await link.dismiss(dismissPayload);
    console.log(`[setup-02d-b] Dismissed pp_system_default from ${intlRegions.length} international regions.`);
  } catch (err: any) {
    console.log(`[setup-02d-b] Note on dismiss: ${err.message}`);
  }

  // 4. Ensure pp_razorpay_razorpay is linked to all 5 markets
  console.log("\n[setup-02d-b] Linking pp_razorpay_razorpay to all 5 markets...");
  const linkPayload = allRegions.map((r) => ({
    [Modules.REGION]: { region_id: r.id },
    [Modules.PAYMENT]: { payment_provider_id: "pp_razorpay_razorpay" },
  }));
  try {
    await link.create(linkPayload);
    console.log("[setup-02d-b] Verified pp_razorpay_razorpay link on all regions.");
  } catch (err: any) {
    console.log(`[setup-02d-b] Note on link create: ${err.message}`);
  }

  // 5. Ensure India retains pp_system_default for Cash on Delivery
  const indiaRegion = allRegions.find((r) => r.currency_code.toLowerCase() === "inr");
  if (indiaRegion) {
    try {
      await link.create([
        {
          [Modules.REGION]: { region_id: indiaRegion.id },
          [Modules.PAYMENT]: { payment_provider_id: "pp_system_default" },
        },
      ]);
      console.log("[setup-02d-b] Verified pp_system_default link on India Region.");
    } catch {
      // Already linked
    }
  }

  console.log("\n==============================================================================");
  console.log("[setup-02d-b] REGION PAYMENT SAFETY SETUP COMPLETED SUCCESSFULLY");
  console.log("==============================================================================");
}
