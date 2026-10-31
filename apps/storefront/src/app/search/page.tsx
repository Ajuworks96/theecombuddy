import { Metadata } from "next";
import {
  getPublishedTheme,
  getStoreRegions,
  getStoreCategories,
  searchStoreProducts,
} from "../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../lib/default-theme";
import { ListingPageLayout } from "@the-ecom-buddy/ui";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  const title = query ? `Search: "${query}" | The Ecom Buddy` : "Search Catalog | The Ecom Buddy";
  const description = query
    ? `Explore search results for "${query}" across our catalog at The Ecom Buddy.`
    : "Search across 520+ curated lifestyle, electronics, apparel, and home essentials.";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const canonicalUrl = query
    ? `${baseUrl}/search?q=${encodeURIComponent(query)}`
    : `${baseUrl}/search`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  // 1. Fetch store regions, categories, and theme
  const [regions, categories, theme] = await Promise.all([
    getStoreRegions(),
    getStoreCategories(),
    getPublishedTheme(),
  ]);

  const defaultRegion = regions.find((r) => r.currency_code === "inr") || regions[0];

  // 2. Perform search if query provided
  let products: any[] = [];
  let count = 0;

  if (query) {
    const searchRes = await searchStoreProducts(query, defaultRegion?.id, 100);
    products = searchRes.products;
    count = searchRes.count;
  }

  const activeTheme = theme || DEFAULT_STOREFRONT_THEME;

  // Category shortcut suggestion pills
  const categoryPills = categories.slice(0, 6).map((c) => ({
    label: c.name,
    href: `/categories/${c.handle}`,
    isActive: false,
  }));

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Search Results" },
    ...(query ? [{ label: `"${query}"` }] : []),
  ];

  const title = query ? `Search: "${query}"` : "Product Catalog Search";
  const subtitle = query ? `Results for keyword query` : "Discover by title or keyword";
  const description = query
    ? `Found ${count} ${count === 1 ? "catalog item" : "catalog items"} matching your query.`
    : "Enter keywords above or browse our curated category departments below.";

  return (
    <ListingPageLayout
      theme={activeTheme}
      title={title}
      subtitle={subtitle}
      description={description}
      breadcrumbs={breadcrumbs}
      products={products}
      categories={categories}
      regions={regions}
      currentRegion={defaultRegion}
      categoryPills={categoryPills}
      initialQuery={query}
      isSearchPage={true}
    />
  );
}
