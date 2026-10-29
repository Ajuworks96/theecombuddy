import React from "react";
import { ComingSoonPlaceholder } from "@/components/coming-soon";

export default function AnalyticsPage() {
  return (
    <ComingSoonPlaceholder
      title="Storefront Analytics & Conversion Metrics"
      milestone="Milestone 03F"
      description="Track conversion funnels, cart abandonment rates, average order values, and sales performance strictly from verified completed orders."
      plannedFeatures={[
        "Zero-fabricated statistics policy: real order records only",
        "Conversion rate tracking from visitor to checkout completion",
        "Cart abandonment breakdown by region and payment provider",
        "CSV & Excel sales summary export for accounting",
      ]}
    />
  );
}
