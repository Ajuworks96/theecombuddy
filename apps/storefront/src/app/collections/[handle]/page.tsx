import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublishedTheme,
  getStoreRegions,
  getStoreCollections,
  getCollectionByHandle,
  getProductsByCollection,
} from "../../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../../lib/default-theme";
import { ListingPageLayout } from "@the-ecom-buddy/ui";

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const collection = await getCollectionByHandle(handle);

  if (!collection) {
    return {
      title: "Collection Not Found | The Ecom Buddy",
      description: "The requested curated collection could not be located.",
    };
  }

  const title = `${collection.title} | The Ecom Buddy`;
  const description =
    collection.description ||
    `Discover curated ${collection.title} products handpicked for quality and value at The Ecom Buddy.`;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const canonicalUrl = `${baseUrl}/collections/${handle}`;

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

export default async function CollectionPage({ params }: PageProps) {
  const { handle } = await params;

  // 1. Fetch collection
  const collection = await getCollectionByHandle(handle);
  if (!collection) {
    notFound();
  }

  // 2. Fetch regions, collections and theme
  const [regions, collections, theme] = await Promise.all([
    getStoreRegions(),
    getStoreCollections(),
    getPublishedTheme(),
  ]);

  const defaultRegion = regions.find((r) => r.currency_code === "inr") || regions[0];

  // 3. Fetch products in collection
  const { products } = await getProductsByCollection(
    collection.id,
    defaultRegion?.id,
    100
  );

  const activeTheme = theme || DEFAULT_STOREFRONT_THEME;

  // Sibling collection navigation pills
  const collectionPills = collections.map((col) => ({
    label: col.title,
    href: `/collections/${col.handle}`,
    isActive: col.handle === collection.handle,
  }));

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Collections", href: "/collections" },
    { label: collection.title },
  ];

  return (
    <ListingPageLayout
      theme={activeTheme}
      title={collection.title}
      subtitle="Curated Showcase"
      description={collection.description || `Handpicked items from our ${collection.title} catalog showcase.`}
      breadcrumbs={breadcrumbs}
      products={products}
      regions={regions}
      currentRegion={defaultRegion}
      categoryPills={collectionPills}
    />
  );
}
