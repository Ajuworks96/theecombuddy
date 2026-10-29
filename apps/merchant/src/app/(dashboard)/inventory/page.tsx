import React from "react";
import { ComingSoonPlaceholder } from "@/components/coming-soon";

export default function InventoryPage() {
  return (
    <ComingSoonPlaceholder
      title="Stock Control & Multi-Location Inventory"
      milestone="Milestone 03B"
      description="Track stock levels across warehouses, manage reserved vs available inventory, and configure automatic low-stock notifications."
      plannedFeatures={[
        "Stock tracking across all 1,236 seeded inventory levels",
        "Multi-warehouse stock allocation & transfers",
        "Low-stock threshold triggers & email alerts",
        "Stock reservation inspection for pending checkouts",
      ]}
    />
  );
}
