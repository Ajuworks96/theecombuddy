"use client";

import React, { useState } from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";

interface PromotionalBannerProps {
  section?: HomepageSection;
}

export const PromotionalBanner: React.FC<PromotionalBannerProps> = ({ section }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const cfg = section?.config || {};
  const badge = cfg.badge || "LIMITED TIME OFFER";
  const headline = cfg.headline || "Festive Celebration Savings Up to 30% Off";
  const description = cfg.description || "Use coupon code WELCOME10 or FLAT100 during checkout.";
  const ctaLabel = cfg.ctaLabel || "Shop Festive Specials";
  const ctaLink = cfg.ctaLink || "/collections/festive-specials";
  const couponCode = "WELCOME10";

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  return (
    <section className="w-full py-12 sm:py-16 bg-[var(--surface-base)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-[var(--theme-radius)] overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-xl">
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[var(--brand-primary)]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[var(--brand-accent)]/10 blur-3xl pointer-events-none" />

          {/* Left Column: Promotion Copy */}
          <div className="relative z-10 max-w-xl flex flex-col items-start gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[var(--brand-accent)] text-white shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {badge}
            </span>

            <h2 className="font-[var(--font-display)] text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
              {headline}
            </h2>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              {description}
            </p>

            {/* Coupon Code Pill */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-dashed border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 font-mono text-sm font-bold text-[var(--brand-primary)]">
                <span>{couponCode}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(couponCode)}
                  className="p-1 rounded hover:bg-[var(--brand-primary)]/20 transition-colors focus:outline-none"
                  aria-label="Copy coupon code"
                >
                  {copiedCode === couponCode ? (
                    <span className="text-xs font-sans text-[var(--brand-primary)] font-semibold">Copied!</span>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>

              <a
                href={ctaLink}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] shadow-md transition-all active:scale-95"
              >
                <span>{ctaLabel}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right Column: Visual Product / Festive Image */}
          <div className="relative z-10 w-full lg:w-96 shrink-0 aspect-[4/3] rounded-[var(--theme-radius)] overflow-hidden border border-[var(--border-subtle)] shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80"
              alt="Festive Promotion"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-accent)]">Verified Discount</p>
              <p className="text-sm font-semibold">Applies automatically at checkout</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
