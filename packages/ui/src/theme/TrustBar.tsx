"use client";

import React from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";

interface TrustBarProps {
  section?: HomepageSection;
}

const DEFAULT_AUTHENTIC_TRUST_ITEMS = [
  {
    title: "Secure Direct Checkout",
    desc: "Direct payment processing via verified Razorpay & COD",
    icon: (
      <svg className="w-6 h-6 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: "Cash on Delivery Available",
    desc: "Pay safely with cash or QR at your doorstep upon delivery",
    icon: (
      <svg className="w-6 h-6 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: "Single-Merchant Privacy",
    desc: "100% self-hosted software — zero multi-tenant data sharing",
    icon: (
      <svg className="w-6 h-6 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Direct Brand Sourcing",
    desc: "Curated catalog items fulfilled directly from verified stock",
    icon: (
      <svg className="w-6 h-6 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
];

export const TrustBar: React.FC<TrustBarProps> = ({ section }) => {
  const items = section?.config?.items || DEFAULT_AUTHENTIC_TRUST_ITEMS;

  return (
    <section className="w-full py-8 border-y border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {items.map((item: any, idx: number) => {
            const fallbackIcon = DEFAULT_AUTHENTIC_TRUST_ITEMS[idx % DEFAULT_AUTHENTIC_TRUST_ITEMS.length].icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-4 p-4 rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] transition-all hover:border-[var(--brand-primary)]/50"
              >
                <div className="p-2.5 rounded-lg bg-[var(--surface-muted)] shrink-0">
                  {fallbackIcon}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
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
