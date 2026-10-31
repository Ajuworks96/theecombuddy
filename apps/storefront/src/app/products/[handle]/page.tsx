import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublishedTheme,
  getStoreRegions,
  getProductByHandle,
  getProductInventory,
  getRelatedProducts,
} from "../../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../../lib/default-theme";
import { ProductDetailClient } from "../../../components/ProductDetailClient";

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product) {
    return {
      title: "Product Not Found | The Ecom Buddy",
      description: "The requested product is not available in our catalog.",
    };
  }

  const title = `${product.title} | The Ecom Buddy`;
  const description =
    product.description?.slice(0, 155) ||
    product.subtitle ||
    `Shop ${product.title} with secure direct checkout at The Ecom Buddy.`;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const canonicalUrl = `${baseUrl}/products/${handle}`;

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
      images: product.thumbnail ? [{ url: product.thumbnail, alt: product.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { handle } = await params;

  // 1. Fetch Store regions
  const regions = await getStoreRegions();
  const defaultRegion = regions.find((r) => r.currency_code === "inr") || regions[0];

  // 2. Fetch product details with regional pricing
  const product = await getProductByHandle(handle, defaultRegion?.id);

  if (!product) {
    notFound();
  }

  // 3. Fetch published theme
  const theme = await getPublishedTheme();
  const activeTheme = theme || DEFAULT_STOREFRONT_THEME;

  // 4. Fetch live inventory status
  const inventory = await getProductInventory(product.id);

  // 5. Fetch related products
  const relatedProducts = await getRelatedProducts(
    product.id,
    product.categories?.[0]?.id,
    product.collection_id || undefined,
    defaultRegion?.id,
    4
  );

  // 6. Generate verified Schema.org Product Structured Data
  const primaryVariant = product.variants?.[0];
  const price = primaryVariant?.calculated_price?.calculated_amount ?? 0;
  const currency = (defaultRegion?.currency_code || "inr").toUpperCase();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || product.subtitle || product.title,
    image: product.thumbnail ? [product.thumbnail] : [],
    sku: primaryVariant?.sku || product.handle,
    offers: {
      "@type": "Offer",
      price: price,
      priceCurrency: currency,
      availability:
        inventory[primaryVariant?.id || ""]?.in_stock !== false
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${baseUrl}/products/${handle}`,
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      ...(product.categories?.[0]
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: product.categories[0].name,
              item: `${baseUrl}/categories/${product.categories[0].handle}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: product.title,
              item: `${baseUrl}/products/${handle}`,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 2,
              name: product.title,
              item: `${baseUrl}/products/${handle}`,
            },
          ]),
    ],
  };

  return (
    <>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <ProductDetailClient
        theme={activeTheme}
        initialProduct={product}
        initialInventory={inventory}
        relatedProducts={relatedProducts}
        regions={regions}
        initialRegion={defaultRegion}
      />
    </>
  );
}
