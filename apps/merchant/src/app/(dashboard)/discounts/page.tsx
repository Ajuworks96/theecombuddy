import React from "react";
import { ComingSoonPlaceholder } from "@/components/coming-soon";

export default function DiscountsPage() {
  return (
    <ComingSoonPlaceholder
      title="Promotions, Coupons & Campaign Rules"
      milestone="Milestone 03C"
      description="Create percentage discounts, flat fee deductions, free shipping coupons, and minimum order threshold rules."
      plannedFeatures={[
        "Percentage and fixed monetary discounts in INR & global currencies",
        "Free shipping coupons with minimum cart thresholds",
        "Single-use and multi-use coupon code generators",
        "Category and customer-specific promotional rules",
      ]}
    />
  );
}
