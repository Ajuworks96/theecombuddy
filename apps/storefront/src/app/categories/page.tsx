import { Metadata } from "next";
import Link from "next/link";
import {
  getPublishedTheme,
  getStoreRegions,
  getStoreCategories,
  DEFAULT_INDIA_REGION_ID,
} from "../../lib/medusa-client";
import { DEFAULT_STOREFRONT_THEME } from "../../lib/default-theme";
import { Header, Footer, ThemeRoot } from "@the-ecom-buddy/ui";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Categories Directory | The Ecom Buddy";
  const description =
    "Browse our complete department directory spanning electronics, artisanal home living, organic wellness, and heritage apparel.";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const canonicalUrl = `${baseUrl}/categories`;

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

const CATEGORY_IMAGES: Record<string, string> = {
  "electronics-audio":
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
  "home-kitchen-living":
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
  "health-ayurvedic-wellness":
    "https://images.unsplash.com/photo-1608248597359-3351d38eb5e1?auto=format&fit=crop&w=800&q=80",
  "apparel-ethnic-wear":
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80",
  "beauty-personal-care":
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
  "sports-fitness":
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
  "books-stationery":
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
  "gourmet-organic-foods":
    "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80",
};

export default async function CategoriesIndexPage() {
  const [regions, categories, theme] = await Promise.all([
    getStoreRegions(),
    getStoreCategories(),
    getPublishedTheme(),
  ]);

  const defaultRegion =
    regions.find((r) => r.currency_code === "inr") ||
    regions[0] ||
    { id: DEFAULT_INDIA_REGION_ID, name: "India", currency_code: "inr" };

  const activeTheme = theme || DEFAULT_STOREFRONT_THEME;

  return (
    <ThemeRoot theme={activeTheme}>
      <Header
        theme={activeTheme}
        regions={regions}
        currentRegion={defaultRegion}
      />

      <main className="w-full min-h-[70vh] py-12 sm:py-16 bg-[var(--surface-base)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Link href="/" className="hover:text-[var(--brand-primary)]">Home</Link>
            <span>/</span>
            <span className="text-[var(--text-primary)] font-medium">Categories</span>
          </nav>

          {/* Page Heading */}
          <div className="mb-12 pb-6 border-b border-[var(--border-subtle)]">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--brand-primary)]">
              Catalog Directory
            </span>
            <h1 className="mt-2 font-[var(--font-display)] text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)]">
              Curated Departments
            </h1>
            <p className="mt-3 text-base text-[var(--text-secondary)] max-w-2xl">
              Explore our independently sourced catalog departments. Every collection is curated directly from trusted artisans and manufacturers with complete transparency.
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => {
              const img =
                CATEGORY_IMAGES[cat.handle] ||
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";

              return (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.handle}`}
                  className="group relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-subtle)] aspect-[4/5] flex flex-col justify-end p-6 transition-all hover:border-[var(--brand-primary)] hover:shadow-2xl"
                >
                  {/* Category Image */}
                  <img
                    src={img}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent transition-opacity group-hover:opacity-95" />

                  {/* Content */}
                  <div className="relative z-10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Collection
                    </span>
                    <h2 className="mt-1 font-[var(--font-display)] text-xl font-bold text-white group-hover:text-[var(--brand-primary)] transition-colors">
                      {cat.name}
                    </h2>
                    {cat.description && (
                      <p className="mt-1.5 text-xs text-stone-200 line-clamp-2 opacity-90 leading-relaxed">
                        {cat.description}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center text-xs font-semibold text-white/95 group-hover:text-[var(--brand-primary)] gap-1.5">
                      <span>Explore Collection</span>
                      <svg
                        className="w-4 h-4 transition-transform group-hover:translate-x-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <Footer theme={activeTheme} />
    </ThemeRoot>
  );
}

