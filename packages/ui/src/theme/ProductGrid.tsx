"use client";

import React from "react";
import type { HomepageSection, ThemePresetId } from "@the-ecom-buddy/types";
import type { StoreProduct, StoreRegion } from "./types";

interface ProductGridProps {
  section?: HomepageSection;
  products?: StoreProduct[];
  currentRegion?: StoreRegion;
  presetId?: ThemePresetId;
  cardStyle?: "bordered" | "tactile" | "elevated" | "flat";
}

// Currency format helper
function formatPrice(amount?: number | null, currencyCode: string = "inr"): string {
  if (amount == null) return "₹0";
  const upper = currencyCode.toUpperCase();
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "AED ",
  };
  const sym = symbols[upper] || `${upper} `;

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
  const title = section?.title || "Signature Acquisitions";
  const subtitle = section?.subtitle || "Selected editions crafted for enduring permanence.";
  const limit = section?.config?.limit || 8;
  const displayProducts = products.slice(0, limit);

  return (
    <section className="w-full py-20 sm:py-28 bg-[#FAF9F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 pb-6 border-b border-stone-200/80 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-px bg-[#C28E5C]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C28E5C]">
                CURATED EDITS
              </span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-950">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm text-stone-500 font-normal max-w-xl">
                {subtitle}
              </p>
            )}
          </div>
          <a
            href="/products"
            className="text-xs uppercase tracking-[0.16em] font-semibold text-stone-900 hover:text-[#C28E5C] transition-colors flex items-center gap-2 group shrink-0"
          >
            <span>Explore Complete Archive</span>
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </a>
        </div>

        {/* Empty state */}
        {displayProducts.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-stone-300 bg-stone-50/50">
            <p className="font-serif text-lg text-stone-700">The collection archive is momentarily replenishing.</p>
            <p className="mt-1 text-xs text-stone-500">Please explore our departments above or return shortly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
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
                  className="group flex flex-col justify-between rounded-2xl overflow-hidden bg-white border border-stone-200/80 shadow-xs hover:shadow-lg transition-all duration-500"
                >
                  {/* Portrait 3:4 Image Frame */}
                  <a
                    href={`/products/${prod.handle}`}
                    className="relative block aspect-[3/4] overflow-hidden bg-stone-100"
                  >
                    {prod.thumbnail ? (
                      <img
                        src={prod.thumbnail}
                        alt={prod.title}
                        className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-50">
                        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Subtle Editorial Badge */}
                    {hasDiscount ? (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-[0.16em] bg-stone-900 text-white shadow-xs">
                        Archive Privilege
                      </span>
                    ) : (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-[0.16em] bg-white/90 text-stone-900 backdrop-blur-md border border-stone-200/60 shadow-xs">
                        Edition
                      </span>
                    )}
                  </a>

                  {/* Product Details */}
                  <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                    <div>
                      {collectionTitle && (
                        <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1">
                          {collectionTitle}
                        </p>
                      )}
                      <h3 className="font-serif text-base font-normal text-stone-950 group-hover:text-[#C28E5C] transition-colors leading-snug line-clamp-2">
                        <a href={`/products/${prod.handle}`}>{prod.title}</a>
                      </h3>
                      {prod.subtitle && (
                        <p className="mt-1 text-xs text-stone-500 line-clamp-1 font-normal">
                          {prod.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Price and CTA */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif text-base font-semibold text-stone-950">
                          {formatPrice(amount, currency)}
                        </span>
                        {hasDiscount && (
                          <span className="font-serif text-xs text-stone-400 line-through">
                            {formatPrice(originalAmount, currency)}
                          </span>
                        )}
                      </div>

                      <a
                        href={`/products/${prod.handle}`}
                        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-900 group-hover:text-[#C28E5C] transition-colors flex items-center gap-1"
                      >
                        <span>View Piece</span>
                        <span>&rarr;</span>
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
