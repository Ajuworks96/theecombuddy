import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublishedTheme,
  getStoreRegions,
  getStoreCategories,
  getCategoryByHandle,
  getProductsByCategory,
} from "../../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../../lib/default-theme";
import { ListingPageLayout } from "@the-ecom-buddy/ui";

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const category = await getCategoryByHandle(handle);

  if (!category) {
    return {
      title: "Category Not Found | The Ecom Buddy",
      description: "The requested category could not be located.",
    };
  }

  const title = `${category.name} | The Ecom Buddy`;
  const description =
    category.description ||
    `Explore premium ${category.name} products curated directly for The Ecom Buddy white-label commerce platform.`;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const canonicalUrl = `${baseUrl}/categories/${handle}`;

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
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { handle } = await params;

  // 1. Fetch category
  const category = await getCategoryByHandle(handle);
  if (!category) {
    notFound();
  }

  // 2. Fetch regions and categories
  const [regions, categories, theme] = await Promise.all([
    getStoreRegions(),
    getStoreCategories(),
    getPublishedTheme(),
  ]);

  const defaultRegion = regions.find((r) => r.currency_code === "inr") || regions[0];

  // 3. Fetch products in category
  const { products } = await getProductsByCategory(
    category.id,
    defaultRegion?.id,
    100
  );

  const activeTheme = theme || DEFAULT_STOREFRONT_THEME;

  // Sibling category navigation pills
  const categoryPills = categories.map((c) => ({
    label: c.name,
    href: `/categories/${c.handle}`,
    isActive: c.handle === category.handle,
  }));

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Categories", href: "/categories" },
    { label: category.name },
  ];

  return (
    <ListingPageLayout
      theme={activeTheme}
      title={category.name}
      subtitle="Category Department"
      description={category.description || `Browse authentic products curated under ${category.name}.`}
      breadcrumbs={breadcrumbs}
      products={products}
      categories={categories}
      regions={regions}
      currentRegion={defaultRegion}
      categoryPills={categoryPills}
    />
  );
}
