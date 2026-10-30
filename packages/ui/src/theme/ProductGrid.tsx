"use client";

import React from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";
import type { StoreProduct, StoreRegion } from "./types";

interface ProductGridProps {
  section?: HomepageSection;
  products?: StoreProduct[];
  currentRegion?: StoreRegion;
}

// Currency format helper
function formatPrice(amount?: number | null, currencyCode: string = "inr"): string {
  if (amount == null) return "₹0.00";
  const upper = currencyCode.toUpperCase();
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "AED ",
  };
  const sym = symbols[upper] || `${upper} `;

  // Medusa prices can be integer units or decimals depending on currency
  return `${sym}${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: upper === "INR" ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  section,
  products = [],
  currentRegion,
}) => {
  const title = section?.title || "Featured Products";
  const subtitle = section?.subtitle || "Handpicked selections from our catalog";
  const limit = section?.config?.limit || 8;
  const displayProducts = products.slice(0, limit);

  return (
    <section className="w-full py-16 sm:py-20 bg-[var(--surface-base)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[var(--border-subtle)] gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">
              Curated Selection
            </span>
            <h2 className="mt-1 font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {subtitle}
              </p>
            )}
          </div>
          <a
            href="/products"
            className="text-xs sm:text-sm font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1 shrink-0"
          >
            <span>View full catalog</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>

        {/* Empty state */}
        {displayProducts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[var(--border-subtle)] rounded-[var(--theme-radius)] bg-[var(--surface-subtle)]">
            <svg className="w-12 h-12 mx-auto text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">No products available in this selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts.map((prod) => {
              const firstVariant = prod.variants?.[0];
              const calculatedPrice = firstVariant?.calculated_price;
              const currency = calculatedPrice?.currency_code || currentRegion?.currency_code || "inr";
              const amount = calculatedPrice?.calculated_amount ?? firstVariant?.prices?.[0]?.amount ?? 0;
              const originalAmount = calculatedPrice?.original_amount;
              const hasDiscount = originalAmount && originalAmount > amount;
              const collectionTitle = prod.collection?.title || prod.categories?.[0]?.name;

              return (
                <div
                  key={prod.id}
                  className="group flex flex-col justify-between rounded-[var(--theme-radius)] overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-subtle)] transition-all hover:border-[var(--brand-primary)] hover:shadow-xl"
                >
                  {/* Top Thumbnail Image */}
                  <a href={`/products/${prod.handle}`} className="relative block aspect-square overflow-hidden bg-[var(--surface-muted)]">
                    {prod.thumbnail ? (
                      <img
                        src={prod.thumbnail}
                        alt={prod.title}
                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Badge */}
                    {hasDiscount && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--brand-accent)] text-white shadow">
                        Sale
                      </span>
                    )}

                    {/* Stock status */}
                    <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white backdrop-blur-sm">
                      In Stock
                    </span>
                  </a>

                  {/* Product Details */}
                  <div className="p-4 flex flex-col flex-1 justify-between">
                    <div>
                      {collectionTitle && (
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-primary)] mb-1">
                          {collectionTitle}
                        </p>
                      )}
                      <h3 className="font-[var(--font-display)] text-sm font-bold text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors">
                        <a href={`/products/${prod.handle}`}>{prod.title}</a>
                      </h3>
                      {prod.subtitle && (
                        <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-1">
                          {prod.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Price and CTA */}
                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-mono text-base font-bold text-[var(--text-primary)]">
                          {formatPrice(amount, currency)}
                        </span>
                        {hasDiscount && (
                          <span className="font-mono text-xs text-[var(--text-muted)] line-through">
                            {formatPrice(originalAmount, currency)}
                          </span>
                        )}
                      </div>

                      <a
                        href={`/products/${prod.handle}`}
                        className="px-3 py-1.5 text-xs font-semibold rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] transition-colors"
                      >
                        View
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
