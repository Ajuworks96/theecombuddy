import { Metadata } from "next";
import {
  getPublishedTheme,
  getStoreRegions,
  getStoreCategories,
  getStoreProducts,
  DEFAULT_INDIA_REGION_ID,
} from "../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../lib/default-theme";
import { ListingPageLayout } from "@the-ecom-buddy/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const title = "All Products | The Ecom Buddy";
  const description =
    "Explore our complete curated catalog of artisanal living, heritage textiles, studio acoustics, and clean wellness essentials.";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const canonicalUrl = `${baseUrl}/products`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProductsPage() {
  const [regions, categories, theme] = await Promise.all([
    getStoreRegions(),
    getStoreCategories(),
    getPublishedTheme(),
  ]);

  const defaultRegion =
    regions.find((r) => r.currency_code === "inr") ||
    regions[0] ||
    { id: DEFAULT_INDIA_REGION_ID, name: "India", currency_code: "inr" };

  const products = await getStoreProducts(defaultRegion?.id, 100);
  const activeTheme = theme || DEFAULT_STOREFRONT_THEME;

  const categoryPills = categories.map((c) => ({
    label: c.name,
    href: `/categories/${c.handle}`,
    isActive: false,
  }));

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "All Products" },
  ];

  return (
    <ListingPageLayout
      theme={activeTheme}
      title="All Curated Products"
      subtitle="Complete Catalog"
      description="Direct-to-consumer essentials crafted for exceptional quality, tactile beauty, and everyday longevity."
      breadcrumbs={breadcrumbs}
      products={products}
      categories={categories}
      regions={regions}
      currentRegion={defaultRegion}
      categoryPills={categoryPills}
    />
  );
}
