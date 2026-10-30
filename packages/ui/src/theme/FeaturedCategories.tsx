"use client";

import React from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";
import type { StoreCategory } from "./types";

interface FeaturedCategoriesProps {
  section?: HomepageSection;
  categories?: StoreCategory[];
}

const CATEGORY_IMAGES: Record<string, string> = {
  "electronics-audio": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
  "home-kitchen-living": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80",
  "health-ayurvedic-wellness": "https://images.unsplash.com/photo-1608248597359-3351d38eb5e1?auto=format&fit=crop&w=600&q=80",
  "apparel-ethnic-wear": "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80",
  "beauty-personal-care": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80",
  "sports-fitness": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80",
  "books-stationery": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
  "gourmet-organic-foods": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80",
};

export const FeaturedCategories: React.FC<FeaturedCategoriesProps> = ({
  section,
  categories = [],
}) => {
  const title = section?.title || "Curated Catalog Categories";
  const subtitle = section?.subtitle || "Browse our authentic direct-to-consumer categories";
  const limit = section?.config?.limit || 8;
  const displayCategories = categories.slice(0, limit);

  return (
    <section className="w-full py-16 sm:py-20 bg-[var(--surface-base)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[var(--border-subtle)] gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">
              Direct Sourcing
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
            href="/categories"
            className="text-xs sm:text-sm font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1 shrink-0"
          >
            <span>View all categories</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayCategories.map((cat) => {
            const img = CATEGORY_IMAGES[cat.handle] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80";
            return (
              <a
                key={cat.id}
                href={`/categories/${cat.handle}`}
                className="group relative rounded-[var(--theme-radius)] overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-subtle)] aspect-square flex flex-col justify-end p-5 transition-all hover:border-[var(--brand-primary)] hover:shadow-xl"
              >
                {/* Background image */}
                <img
                  src={img}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />

                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity group-hover:opacity-90" />

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="font-[var(--font-display)] text-base sm:text-lg font-bold text-white group-hover:text-[var(--brand-primary)] transition-colors">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="mt-1 text-xs text-stone-300 line-clamp-1 opacity-80">
                      {cat.description}
                    </p>
                  )}
                  <span className="mt-2 inline-flex items-center text-[11px] font-semibold text-white/90 group-hover:text-[var(--brand-primary)] gap-1">
                    <span>Explore items</span>
                    <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};
