"use client";

import React from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";
import type { StoreCategory } from "./types";

interface FeaturedCategoriesProps {
  section?: HomepageSection;
  categories?: StoreCategory[];
}

const LUXURY_CATEGORY_IMAGES: Record<string, string> = {
  "home-kitchen-living": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
  "apparel-ethnic-wear": "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80",
  "electronics-audio": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
  "health-ayurvedic-wellness": "https://images.unsplash.com/photo-1608248597359-5776c5b6b107?auto=format&fit=crop&w=800&q=80",
  "beauty-personal-care": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
  "gourmet-foods-spices": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80",
  "artisanal-crafts-decor": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
  "travel-everyday-accessories": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
};

export const FeaturedCategories: React.FC<FeaturedCategoriesProps> = ({
  section,
  categories = [],
}) => {
  const title = section?.title || "Curated Departments";
  const subtitle = section?.subtitle || "Explore our signature edits across apparel, acoustics, and living spaces.";
  const limit = section?.config?.limit || 8;
  const displayCategories = categories.slice(0, limit);

  return (
    <section className="w-full py-20 sm:py-28 bg-[#FAF9F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 pb-6 border-b border-stone-200/80 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-px bg-[#C28E5C]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C28E5C]">
                COLLECTION ARCHIVE
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
            href="/categories"
            className="text-xs uppercase tracking-[0.16em] font-semibold text-stone-900 hover:text-[#C28E5C] transition-colors flex items-center gap-2 group shrink-0"
          >
            <span>View All Departments</span>
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </a>
        </div>

        {/* 3:4 Portrait Department Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {displayCategories.map((cat, idx) => {
            const img = LUXURY_CATEGORY_IMAGES[cat.handle] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";
            return (
              <a
                key={cat.id || idx}
                href={`/categories/${cat.handle}`}
                className="group relative rounded-2xl overflow-hidden aspect-[3/4] bg-stone-100 flex flex-col justify-end p-5 sm:p-6 transition-all duration-500 hover:shadow-xl"
              >
                {/* Background Image with Slow Smooth Zoom */}
                <img
                  src={img}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />

                {/* Dark Editorial Vignette Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-500 group-hover:opacity-95" />

                {/* Content */}
                <div className="relative z-10 flex flex-col">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#E8C59A] font-medium mb-1">
                    Department 0{idx + 1}
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-normal text-white group-hover:text-[#E8C59A] transition-colors leading-snug">
                    {cat.name}
                  </h3>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-stone-300 group-hover:text-white transition-colors">
                    <span>Discover Edit</span>
                    <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

      </div>
    </section>
  );
};
