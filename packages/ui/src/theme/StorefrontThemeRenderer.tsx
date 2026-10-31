"use client";

import React, { useState, useMemo } from "react";
import type { PublicPublishedTheme, HomepageSection } from "@the-ecom-buddy/types";
import { ThemeRoot } from "./ThemeRoot";
import { Header } from "./Header";
import { HeroSlider } from "./HeroSlider";
import { TrustBar } from "./TrustBar";
import { FeaturedCategories } from "./FeaturedCategories";
import { ProductGrid } from "./ProductGrid";
import { PromotionalBanner } from "./PromotionalBanner";
import { EditorialStory } from "./EditorialStory";
import { NewsletterSection } from "./NewsletterSection";
import { Footer } from "./Footer";
import type { StoreProduct, StoreCategory, StoreRegion } from "./types";

export interface StorefrontThemeRendererProps {
  theme: PublicPublishedTheme;
  products?: StoreProduct[];
  categories?: StoreCategory[];
  regions?: StoreRegion[];
  currentRegion?: StoreRegion;
  cartItemCount?: number;
  onSelectRegion?: (region: StoreRegion) => void;
  isMerchantPreview?: boolean;
}

export const StorefrontThemeRenderer: React.FC<StorefrontThemeRendererProps> = ({
  theme,
  products = [],
  categories = [],
  regions = [],
  currentRegion,
  cartItemCount = 0,
  onSelectRegion,
  isMerchantPreview = false,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Close search modal on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  // Sort enabled sections by displayOrder
  const activeSections = useMemo(() => {
    const list = [...(theme.sections || [])];
    return list
      .filter((s) => s.isEnabled !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [theme.sections]);

  // Client-side search filtering over products
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      const matchHandle = p.handle?.toLowerCase().includes(q);
      const matchCollection = p.collection?.title?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchHandle || matchCollection;
    });
  }, [searchQuery, products]);

  // Render individual section dynamically based on type
  const renderSection = (section: HomepageSection) => {
    switch (section.type) {
      case "hero_slider":
        return (
          <HeroSlider
            key={section.id}
            slides={theme.heroSlider?.slides || []}
            autoplay={theme.heroSlider?.autoplay ?? true}
            autoplaySpeed={theme.heroSlider?.autoplaySpeed ?? 5000}
            showArrows={theme.heroSlider?.showArrows ?? true}
            showDots={theme.heroSlider?.showDots ?? true}
            presetId={theme.presetId}
          />
        );

      case "trust_benefits":
        return <TrustBar key={section.id} section={section} />;

      case "featured_categories":
        return (
          <FeaturedCategories
            key={section.id}
            section={section}
            categories={categories}
          />
        );

      case "featured_products":
        return (
          <ProductGrid
            key={section.id}
            section={section}
            products={products}
            currentRegion={currentRegion}
            presetId={theme.presetId}
            cardStyle={theme.styling?.cardStyle}
          />
        );

      case "new_arrivals":
        return (
          <ProductGrid
            key={section.id}
            section={section}
            products={products.slice(0, 4)}
            currentRegion={currentRegion}
            presetId={theme.presetId}
            cardStyle={theme.styling?.cardStyle}
          />
        );

      case "best_sellers":
        return (
          <ProductGrid
            key={section.id}
            section={section}
            products={products.slice(2, 6)}
            currentRegion={currentRegion}
            presetId={theme.presetId}
            cardStyle={theme.styling?.cardStyle}
          />
        );

      case "promotional_banner":
        return <PromotionalBanner key={section.id} section={section} />;

      case "editorial_story":
        return <EditorialStory key={section.id} section={section} />;

      case "newsletter":
        return <NewsletterSection key={section.id} section={section} />;

      default:
        return null;
    }
  };

  return (
    <ThemeRoot theme={theme}>
      {/* Merchant Preview Badge if in preview mode */}
      {isMerchantPreview && (
        <div className="bg-amber-500 text-stone-950 px-4 py-1.5 text-xs font-bold text-center tracking-wide flex items-center justify-center gap-2">
          <span>MERCHANT PREVIEW MODE — Live Canvas Simulation</span>
        </div>
      )}

      {/* Storefront Header */}
      <Header
        theme={theme}
        regions={regions}
        currentRegion={currentRegion}
        cartItemCount={cartItemCount}
        onSelectRegion={onSelectRegion}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Ordered Homepage Sections */}
      <main className="flex flex-col w-full">
        {activeSections.map((section) => renderSection(section))}
      </main>

      {/* Storefront Footer */}
      <Footer theme={theme} />

      {/* Interactive Live Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Search catalog products"
        >
          <div
            className="w-full max-w-2xl rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
                }
              }}
              className="p-4 border-b border-[var(--border-subtle)] flex items-center gap-3"
            >
              <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by title, keyword, or SKU..."
                className="flex-1 bg-transparent border-none text-[var(--text-primary)] placeholder-[var(--text-muted)] text-base focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery("");
                }}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
                aria-label="Close search"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </form>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {!searchQuery.trim() ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  Type at least 2 characters to search across all catalog products.
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
                  No products found matching &ldquo;<span className="font-semibold text-[var(--text-primary)]">{searchQuery}</span>&rdquo;.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Found {searchResults.length} {searchResults.length === 1 ? "product" : "products"}
                  </p>
                  {searchResults.slice(0, 10).map((prod) => (
                    <a
                      key={prod.id}
                      href={`/products/${prod.handle}`}
                      onClick={() => setIsSearchOpen(false)}
                      className="flex items-center gap-4 p-2.5 rounded-[var(--theme-radius)] hover:bg-[var(--surface-subtle)] border border-transparent hover:border-[var(--border-subtle)] transition-all group"
                    >
                      <div className="w-12 h-12 rounded bg-[var(--surface-muted)] overflow-hidden shrink-0 border border-[var(--border-subtle)]">
                        {prod.thumbnail ? (
                          <img
                            src={prod.thumbnail}
                            alt={prod.title}
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] truncate transition-colors">
                          {prod.title}
                        </h4>
                        {prod.collection?.title && (
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {prod.collection.title}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-[var(--brand-primary)]">
                          View Item &rarr;
                        </span>
                      </div>
                    </a>
                  ))}
                  {searchResults.length > 5 && (
                    <div className="pt-2 text-center border-t border-[var(--border-subtle)]">
                      <a
                        href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="text-xs font-bold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                      >
                        <span>View all {searchResults.length} results on search page</span>
                        <span>&rarr;</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ThemeRoot>
  );
};

