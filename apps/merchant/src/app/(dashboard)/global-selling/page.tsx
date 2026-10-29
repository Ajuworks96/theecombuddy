import React from "react";
import { ComingSoonPlaceholder } from "@/components/coming-soon";

export default function GlobalSellingPage() {
  return (
    <ComingSoonPlaceholder
      title="Global Selling & Multi-Currency Hub"
      milestone="Milestone 03D"
      description="Manage international export markets (US, UAE, UK, EU), monitor currency-specific variant price matrices, and audit exchange rate provider adapters."
      plannedFeatures={[
        "Active market inspection across India (INR), US (USD), UAE (AED), UK (GBP), and EU (EUR)",
        "Fixed international pricing vs automated exchange rate sync",
        "Region-specific tax rules (GST, VAT, Sales Tax)",
        "Zero COD enforcement verification for international shipments",
      ]}
    />
  );
}
