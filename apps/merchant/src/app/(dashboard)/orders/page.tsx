import React from "react";
import { ComingSoonPlaceholder } from "@/components/coming-soon";

export default function OrdersPage() {
  return (
    <ComingSoonPlaceholder
      title="Orders, Fulfillment & Cash-on-Delivery"
      milestone="Milestone 03C"
      description="Inspect order line items, fulfill shipments via courier partners, generate tax invoices, and process manual Cash on Delivery collections."
      plannedFeatures={[
        "Complete order lifecycle transitions (Placed, Fulfilled, Completed, Canceled)",
        "Separate COD collection authorization workflow",
        "AWB shipping label and packing slip printing",
        "GST-compliant automated invoice PDF generator",
      ]}
    />
  );
}
