import React from "react";
import { ComingSoonPlaceholder } from "@/components/coming-soon";

export default function CategoriesPage() {
  return (
    <ComingSoonPlaceholder
      title="Category & Taxonomy Manager"
      milestone="Milestone 03B"
      description="Organize your catalog into multi-level hierarchical categories with custom handles, search engine metadata, and automated storefront navigation menus."
      plannedFeatures={[
        "Multi-level nested category trees",
        "Category image thumbnails & banners",
        "Automated handle & SEO URL slug generation",
        "Drag-and-drop hierarchy reordering",
      ]}
    />
  );
}
