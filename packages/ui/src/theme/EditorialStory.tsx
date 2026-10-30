"use client";

import React from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";

interface EditorialStoryProps {
  section?: HomepageSection;
}

export const EditorialStory: React.FC<EditorialStoryProps> = ({ section }) => {
  const cfg = section?.config || {};
  const headline = cfg.headline || "Direct-to-Consumer Excellence Without Centralized SaaS Limits";
  const paragraph =
    cfg.paragraph ||
    "The Ecom Buddy empowers self-hosted merchants with complete data sovereignty, native multi-currency commerce, and lightning-fast storefronts crafted for authentic customer relationships.";
  const image =
    cfg.image ||
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80";

  return (
    <section className="w-full py-16 sm:py-24 bg-[var(--surface-base)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image */}
          <div className="relative rounded-[var(--theme-radius)] overflow-hidden aspect-[4/3] border border-[var(--border-subtle)] shadow-2xl">
            <img
              src={image}
              alt="Craftsmanship and Brand Story"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          {/* Text Story */}
          <div className="flex flex-col gap-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--brand-primary)]">
              Our Brand Journey
            </span>

            <h2 className="font-[var(--font-display)] text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.2]">
              {headline}
            </h2>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              {paragraph}
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-subtle)]">
              <div>
                <span className="font-[var(--font-display)] text-2xl font-bold text-[var(--brand-primary)]">
                  100%
                </span>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Direct Brand Sourcing</p>
              </div>
              <div>
                <span className="font-[var(--font-display)] text-2xl font-bold text-[var(--brand-primary)]">
                  0%
                </span>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Middleman Markup</p>
              </div>
              <div>
                <span className="font-[var(--font-display)] text-2xl font-bold text-[var(--brand-primary)]">
                  520+
                </span>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Curated Catalog Items</p>
              </div>
              <div>
                <span className="font-[var(--font-display)] text-2xl font-bold text-[var(--brand-primary)]">
                  Global
                </span>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Multi-Currency Ready</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
