"use client";

import React, { useState } from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";

interface PromotionalBannerProps {
  section?: HomepageSection;
}

export const PromotionalBanner: React.FC<PromotionalBannerProps> = ({ section }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const cfg = section?.config || {};
  const badge = cfg.badge || "PRIVATE CLIENT PRIVILEGE";
  const headline = cfg.headline || "The Seasonal Archive — Inaugural Edit.";
  const description =
    cfg.description ||
    "Enjoy an exclusive 15% inaugural privilege across our curated wardrobe, studio audio, and artisanal living collections with code ARCHIVE15.";
  const ctaLabel = cfg.ctaLabel || "Discover The Capsule";
  const ctaLink = cfg.ctaLink || "/products";
  const couponCode = cfg.couponCode || "ARCHIVE15";

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  return (
    <section className="w-full py-16 sm:py-24 bg-[#FAF9F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-[#181615] text-white p-8 sm:p-14 lg:p-20 shadow-2xl">
          {/* Subtle warm amber radial glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#C28E5C]/15 blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Editorial Campaign Invitation */}
            <div className="lg:col-span-7 flex flex-col items-start gap-5">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] bg-white/10 text-stone-200 border border-white/15 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C28E5C]" />
                {badge}
              </span>

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.15]">
                {headline}
              </h2>

              <p className="text-sm sm:text-base text-stone-300 leading-relaxed font-normal max-w-xl">
                {description}
              </p>

              {/* Coupon Privilege Pill & CTA */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-dashed border-[#C28E5C]/60 bg-[#C28E5C]/10 font-mono text-xs font-semibold tracking-wider text-[#E8C59A]">
                  <span>CODE: {couponCode}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(couponCode)}
                    className="p-1 rounded hover:bg-white/10 transition-colors focus:outline-none text-stone-300 hover:text-white"
                    aria-label="Copy privilege code"
                  >
                    {copiedCode === couponCode ? (
                      <span className="text-[11px] font-sans text-emerald-400 font-medium">Copied!</span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>

                <a
                  href={ctaLink}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] rounded-xl bg-white text-stone-950 hover:bg-stone-100 transition-all shadow-md active:scale-95"
                >
                  <span>{ctaLabel}</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>

            {/* Right Column: High Fashion Editorial Still */}
            <div className="lg:col-span-5 w-full aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
              <img
                src={cfg.imageUrl || "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80"}
                alt="Seasonal Campaign Still"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-stone-300">
                <span className="uppercase tracking-[0.15em] text-[10px]">Winter Capsule Drop</span>
                <span className="font-mono text-[11px] text-[#C28E5C]">Limited Edition</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
