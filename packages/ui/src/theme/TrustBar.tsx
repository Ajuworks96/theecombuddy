"use client";

import React from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";

interface TrustBarProps {
  section?: HomepageSection;
}

const LUXURY_BRAND_COMMITMENTS = [
  {
    title: "Complimentary Delivery",
    desc: "Insured express shipping on all orders over ₹1,999",
    icon: (
      <svg className="w-5 h-5 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    title: "Artisanal Integrity",
    desc: "Crafted in limited runs with pure natural materials",
    icon: (
      <svg className="w-5 h-5 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    title: "Cash on Delivery",
    desc: "Inspect your package before paying at your doorstep",
    icon: (
      <svg className="w-5 h-5 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: "Client Concierge",
    desc: "7-day effortless returns & dedicated personal assistance",
    icon: (
      <svg className="w-5 h-5 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

export const TrustBar: React.FC<TrustBarProps> = ({ section }) => {
  const items = section?.config?.items || LUXURY_BRAND_COMMITMENTS;

  return (
    <section className="w-full py-10 sm:py-12 border-y border-stone-200/70 bg-[#FAF9F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {items.map((item: any, idx: number) => {
            const fallbackIcon = LUXURY_BRAND_COMMITMENTS[idx % LUXURY_BRAND_COMMITMENTS.length].icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-full bg-white border border-stone-200/90 flex items-center justify-center shrink-0 shadow-xs group-hover:border-[#C28E5C] transition-colors">
                  {fallbackIcon}
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-[0.12em] font-semibold text-stone-900">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-xs text-stone-500 leading-relaxed font-normal">
                    {item.desc || item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
