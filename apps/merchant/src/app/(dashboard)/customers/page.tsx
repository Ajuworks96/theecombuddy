import React from "react";
import { ComingSoonPlaceholder } from "@/components/coming-soon";

export default function CustomersPage() {
  return (
    <ComingSoonPlaceholder
      title="Customer Directory & Groups"
      milestone="Milestone 03C"
      description="View registered shoppers, guest checkout accounts, shipping address books, order histories, and lifetime customer value."
      plannedFeatures={[
        "Customer search & account verification",
        "Saved delivery addresses across Indian states & global destinations",
        "Customer lifetime value & average order value metrics",
        "VIP & wholesale customer group assignments",
      ]}
    />
  );
}
