"use client";

import React from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";

interface EditorialStoryProps {
  section?: HomepageSection;
}

export const EditorialStory: React.FC<EditorialStoryProps> = ({ section }) => {
  const cfg = section?.config || {};
  const badge = cfg.badge || "Our Brand Journey";
  const headline = cfg.headline || "Direct-to-Consumer Excellence With Full Data Sovereignty";
  const paragraph =
    cfg.paragraph ||
    "The Ecom Buddy empowers self-hosted merchants with complete data sovereignty, native multi-currency commerce, and lightning-fast storefronts crafted for authentic customer relationships.";
  const image =
    cfg.image ||
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80";

  // Only render stats if explicitly configured by the merchant
  const stats: Array<{ label: string; value: string }> = Array.isArray(cfg.stats) ? cfg.stats : [];

  return (
    <section className="w-full py-16 sm:py-24 bg-[var(--surface-base)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image */}
          <div className="relative rounded-[var(--theme-radius)] overflow-hidden aspect-[4/3] border border-[var(--border-subtle)] shadow-2xl">
            <img
              src={image}
              alt="Brand Heritage and Story"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>

          {/* Text Story */}
          <div className="flex flex-col gap-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--brand-primary)]">
              {badge}
            </span>

            <h2 className="font-[var(--font-display)] text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.2]">
              {headline}
            </h2>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              {paragraph}
            </p>

            {/* Merchant-configured genuine stats (only if configured) */}
            {stats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-[var(--border-subtle)]">
                {stats.map((s, idx) => (
                  <div key={idx}>
                    <span className="font-[var(--font-display)] text-2xl font-bold text-[var(--brand-primary)]">
                      {s.value}
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
