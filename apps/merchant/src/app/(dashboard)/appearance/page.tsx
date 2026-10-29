import React from "react";
import { ComingSoonPlaceholder } from "@/components/coming-soon";

export default function AppearancePage() {
  return (
    <ComingSoonPlaceholder
      title="Store Appearance & Homepage Customizer"
      milestone="Milestone 03E"
      description="Customize storefront editorial hero slides (Crescendo Reference 02), configure promotional banners (Philox Reference 05), and manage typography tokens."
      plannedFeatures={[
        "Interactive Hero Carousel slide manager (6 default editorial slides preloaded)",
        "Drag-and-drop homepage promotional sections",
        "Color swatch & typography token customizer",
        "Live storefront split-screen preview",
      ]}
    />
  );
}
