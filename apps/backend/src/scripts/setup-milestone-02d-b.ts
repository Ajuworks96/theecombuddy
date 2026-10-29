import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateRegionsWorkflow } from "@medusajs/core-flows";

export default async function setupMilestone02DB({ container }: { container: MedusaContainer }) {
  console.log("==============================================================================");
  console.log("[setup-02d-b] THE ECOM BUDDY — MILESTONE 02D-B RAZORPAY GATEWAY SETUP");
  console.log("==============================================================================");

  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const paymentService = container.resolve(Modules.PAYMENT);

  // 1. Audit Registered Payment Providers
  const dbProviders: any[] = await paymentService.listPaymentProviders();
  console.log(`[setup-02d-b] Registered providers in database: ${JSON.stringify(dbProviders.map((p) => p.id))}`);

  const hasRazorpay = dbProviders.some((p) => p.id === "pp_razorpay_razorpay" && p.is_enabled);
  if (!hasRazorpay) {
    throw new Error("pp_razorpay_razorpay payment provider is not registered or not enabled in the database!");
  }
  console.log("[setup-02d-b] pp_razorpay_razorpay confirmed active in database.");

  // 2. Link Razorpay to India Region (preserving pp_system_default for COD) and International Regions
  console.log("\n[setup-02d-b] Linking payment providers to commerce regions...");
  const allRegions: any[] = await query({
    entryPoint: "region",
    fields: ["id", "name", "currency_code", "payment_providers.id"],
  });

  for (const r of allRegions) {
    const existingProviderIds: string[] = (r.payment_providers || []).map((p: any) => p.id);
    let targetProviders: string[];

    if (r.currency_code.toLowerCase() === "inr") {
      // India supports both Cash on Delivery (pp_system_default) and Online Payment (pp_razorpay_razorpay)
      targetProviders = Array.from(new Set([...existingProviderIds, "pp_system_default", "pp_razorpay_razorpay"]));
    } else {
      // International regions support Online Payment (pp_razorpay_razorpay)
      targetProviders = Array.from(new Set([...existingProviderIds, "pp_razorpay_razorpay"]));
    }

    const needsUpdate = targetProviders.some((tp) => !existingProviderIds.includes(tp));
    if (needsUpdate) {
      console.log(`[setup-02d-b] Updating ${r.name} (${r.currency_code.toUpperCase()}) with providers: ${JSON.stringify(targetProviders)}...`);
      await updateRegionsWorkflow(container).run({
        input: {
          selector: { id: r.id },
          update: { payment_providers: targetProviders },
        },
      });
      console.log(`[setup-02d-b] Region ${r.name} updated successfully.`);
    } else {
      console.log(`[setup-02d-b] Region ${r.name} already has expected payment providers: ${JSON.stringify(existingProviderIds)}.`);
    }
  }

  console.log("\n==============================================================================");
  console.log("[setup-02d-b] MILESTONE 02D-B RAZORPAY SETUP COMPLETED SUCCESSFULLY");
  console.log("==============================================================================");
}
