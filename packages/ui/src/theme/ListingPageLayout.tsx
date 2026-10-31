"use client";

import React, { useState, useMemo } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import type { StoreProduct, StoreCategory, StoreRegion } from "./types";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ThemeRoot } from "./ThemeRoot";

interface ListingPageLayoutProps {
  theme: PublicPublishedTheme;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  breadcrumbs: Array<{ label: string; href?: string }>;
  products: StoreProduct[];
  categories?: StoreCategory[];
  regions?: StoreRegion[];
  currentRegion?: StoreRegion;
  cartItemCount?: number;
  onOpenCartDrawer?: () => void;
  onSelectRegion?: (region: StoreRegion) => void;
  categoryPills?: Array<{ label: string; href: string; isActive?: boolean }>;
  initialQuery?: string;
  isSearchPage?: boolean;
}

export const ListingPageLayout: React.FC<ListingPageLayoutProps> = ({
  theme,
  title,
  subtitle,
  description,
  breadcrumbs,
  products = [],
  categories = [],
  regions = [],
  currentRegion,
  cartItemCount = 0,
  onOpenCartDrawer,
  onSelectRegion,
  categoryPills = [],
  initialQuery = "",
  isSearchPage = false,
}) => {
  const presetId = theme.presetId || "crescendo";
  const cardStyle = theme.styling?.cardStyle || "bordered";

  // Filter & Sort State
  const [searchFilter, setSearchFilter] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<"featured" | "price_asc" | "price_desc" | "newest">("featured");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<"all" | "under_1000" | "1000_3000" | "3000_5000" | "above_5000">("all");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Currency code
  const currencyCode = (currentRegion?.currency_code || "inr").toLowerCase();

  const formatPrice = (amount: number, code: string) => {
    switch (code) {
      case "inr":
        return `₹${amount.toLocaleString("en-IN")}`;
      case "usd":
        return `$${amount.toFixed(2)}`;
      case "aed":
        return `AED ${amount.toFixed(2)}`;
      case "gbp":
        return `£${amount.toFixed(2)}`;
      case "eur":
        return `€${amount.toFixed(2)}`;
      default:
        return `${code.toUpperCase()} ${amount.toFixed(2)}`;
    }
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. In-page search filter
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        const matchHandle = p.handle?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchHandle) return false;
      }

      // 2. Stock filter
      if (inStockOnly) {
        const anyVariantInStock = p.variants?.some((v) => {
          if (v.inventory_quantity !== undefined && v.inventory_quantity !== null) {
            return v.allow_backorder === true || v.inventory_quantity > 0;
          }
          return v.manage_inventory === false;
        });
        if (!anyVariantInStock) return false;
      }

      // 3. Price filter
      const price = p.variants?.[0]?.calculated_price?.calculated_amount ?? 0;
      if (priceRange === "under_1000" && price >= 1000) return false;
      if (priceRange === "1000_3000" && (price < 1000 || price > 3000)) return false;
      if (priceRange === "3000_5000" && (price < 3000 || price > 5000)) return false;
      if (priceRange === "above_5000" && price <= 5000) return false;

      return true;
    });
  }, [products, searchFilter, inStockOnly, priceRange]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === "price_asc") {
      list.sort((a, b) => {
        const pa = a.variants?.[0]?.calculated_price?.calculated_amount ?? 0;
        const pb = b.variants?.[0]?.calculated_price?.calculated_amount ?? 0;
        return pa - pb;
      });
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => {
        const pa = a.variants?.[0]?.calculated_price?.calculated_amount ?? 0;
        const pb = b.variants?.[0]?.calculated_price?.calculated_amount ?? 0;
        return pb - pa;
      });
    } else if (sortBy === "newest") {
      // Reverse ID sort as chronological proxy
      list.reverse();
    }
    return list;
  }, [filteredProducts, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchFilter("");
    setSortBy("featured");
    setInStockOnly(false);
    setPriceRange("all");
    setCurrentPage(1);
  };

  return (
    <ThemeRoot theme={theme}>
      <div className="min-h-screen flex flex-col bg-[var(--surface-base)] text-[var(--text-primary)]">
        {/* Header */}
        <Header
          theme={theme}
          regions={regions}
          currentRegion={currentRegion}
          cartItemCount={cartItemCount}
          onOpenCartDrawer={onOpenCartDrawer}
          onSelectRegion={onSelectRegion}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            {breadcrumbs.map((b, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {b.href && !isLast ? (
                    <a href={b.href} className="hover:text-[var(--text-primary)] transition-colors">
                      {b.label}
                    </a>
                  ) : (
                    <span className={isLast ? "text-[var(--text-primary)] font-medium" : ""}>
                      {b.label}
                    </span>
                  )}
                  {!isLast && <span>/</span>}
                </React.Fragment>
              );
            })}
          </nav>

          {/* Page Banner / Header */}
          <div className="mb-8 border-b border-[var(--border-subtle)] pb-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                {subtitle && (
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] mb-1">
                    {subtitle}
                  </p>
                )}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
                  {title}
                </h1>
                {description && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">
                    {description}
                  </p>
                )}
              </div>
              <div className="text-xs text-[var(--text-muted)] font-mono shrink-0">
                Showing <span className="font-bold text-[var(--text-primary)]">{sortedProducts.length}</span> {sortedProducts.length === 1 ? "product" : "products"}
              </div>
            </div>

            {/* Category / Subcategory Pills */}
            {categoryPills.length > 0 && (
              <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categoryPills.map((pill, idx) => (
                  <a
                    key={idx}
                    href={pill.href}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      pill.isActive
                        ? "bg-[var(--brand-primary)] text-white shadow-sm"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {pill.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Filter & Sort Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-3 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            {/* Search within page */}
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter results by keyword or SKU..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              />
              <svg className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Desktop Filters & Sort */}
            <div className="hidden sm:flex items-center gap-3 text-xs">
              {/* In-Stock Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
                <span>In Stock Only</span>
              </label>

              {/* Price Filter */}
              <select
                value={priceRange}
                onChange={(e) => {
                  setPriceRange(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none"
              >
                <option value="all">All Prices</option>
                <option value="under_1000">Under ₹1,000</option>
                <option value="1000_3000">₹1,000 – ₹3,000</option>
                <option value="3000_5000">₹3,000 – ₹5,000</option>
                <option value="above_5000">Above ₹5,000</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-medium focus:outline-none"
              >
                <option value="featured">Sort: Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>

            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters & Sort</span>
            </button>
          </div>

          {/* Product Grid or Empty State */}
          {paginatedProducts.length === 0 ? (
            <div className="py-20 text-center rounded-[var(--theme-radius)] border border-dashed border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-8">
              <svg className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-base font-bold text-[var(--text-primary)]">No products found</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                No catalog items match your active filters or search terms. Try clearing your filters.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {paginatedProducts.map((prod) => {
                const variant = prod.variants?.[0];
                const price = variant?.calculated_price?.calculated_amount ?? 0;
                const origPrice = variant?.calculated_price?.original_amount;
                const hasDiscount = origPrice !== undefined && origPrice !== null && origPrice > price;

                return (
                  <a
                    key={prod.id}
                    href={`/products/${prod.handle}`}
                    className={`group flex flex-col overflow-hidden transition-all duration-300 ${
                      cardStyle === "bordered" || presetId === "crescendo"
                        ? "rounded-none border border-[var(--border-strong)] bg-[#0B0F19] hover:border-[var(--brand-primary)]"
                        : cardStyle === "tactile" || presetId === "velora"
                        ? "rounded-2xl border border-[var(--border-subtle)] bg-[#FAFAF9] shadow-sm hover:shadow-md hover:border-[var(--brand-accent)]"
                        : cardStyle === "elevated" || presetId === "aero_step"
                        ? "rounded-xl border border-[var(--border-subtle)] bg-[#18181B] shadow-md hover:-translate-y-1 hover:shadow-xl hover:border-red-500"
                        : "rounded-lg border border-[var(--border-subtle)] bg-white shadow-sm hover:shadow-md"
                    }`}
                  >
                    {/* Thumbnail Frame */}
                    <div className="relative aspect-square w-full overflow-hidden bg-[var(--surface-muted)]">
                      {prod.thumbnail ? (
                        <img
                          src={prod.thumbnail}
                          alt={prod.title}
                          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                          <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      {/* Collection badge */}
                      {prod.collection?.title && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-black/70 text-white backdrop-blur-sm">
                          {prod.collection.title}
                        </span>
                      )}

                      {/* Discount pill */}
                      {hasDiscount && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-500 text-white">
                          Sale
                        </span>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2">
                      <div>
                        {variant?.sku && (
                          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                            {variant.sku}
                          </span>
                        )}
                        <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2">
                          {prod.title}
                        </h3>
                      </div>

                      <div className="pt-2 border-t border-[var(--border-subtle)]/50 flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm sm:text-base font-bold font-mono text-[var(--text-primary)]">
                            {formatPrice(price, currencyCode)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs line-through font-mono text-[var(--text-muted)]">
                              {formatPrice(origPrice!, currencyCode)}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-[var(--brand-primary)] group-hover:underline">
                          View &rarr;
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2 pt-6 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-muted)] transition-colors"
              >
                &larr; Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 text-xs font-semibold rounded-[var(--theme-radius)] transition-all ${
                    currentPage === pageNum
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--surface-muted)] transition-colors"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </main>

        {/* Mobile Filters Drawer */}
        {isMobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex sm:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileFiltersOpen(false)}
            />
            <div className="relative ml-auto w-4/5 max-w-sm h-full bg-[var(--surface-base)] border-l border-[var(--border-subtle)] shadow-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Filters & Sort</h3>
                  <button
                    type="button"
                    onClick={() => setIsMobileFiltersOpen(false)}
                    className="p-1 rounded text-[var(--text-muted)]"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="py-4 space-y-5 text-xs">
                  <div>
                    <label className="font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded p-2 text-xs"
                    >
                      <option value="featured">Featured</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="newest">Newest Arrivals</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                      Price Range
                    </label>
                    <select
                      value={priceRange}
                      onChange={(e) => setPriceRange(e.target.value as any)}
                      className="w-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded p-2 text-xs"
                    >
                      <option value="all">All Prices</option>
                      <option value="under_1000">Under ₹1,000</option>
                      <option value="1000_3000">₹1,000 – ₹3,000</option>
                      <option value="3000_5000">₹3,000 – ₹5,000</option>
                      <option value="above_5000">Above ₹5,000</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="rounded text-[var(--brand-primary)]"
                      />
                      <span className="font-medium text-[var(--text-primary)]">In Stock Only</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex-1 py-2.5 text-xs font-semibold rounded bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold rounded bg-[var(--brand-primary)] text-white"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <Footer theme={theme} />
      </div>
    </ThemeRoot>
  );
};

