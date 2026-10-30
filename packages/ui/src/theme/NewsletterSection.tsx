"use client";

import React, { useState } from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";

interface NewsletterSectionProps {
  section?: HomepageSection;
}

export const NewsletterSection: React.FC<NewsletterSectionProps> = ({ section }) => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const title = section?.title || "Join the Exclusive Community";
  const subtitle =
    section?.subtitle ||
    "Be the first to hear about curated drops, seasonal private sales, and brand stories.";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <section className="w-full py-16 sm:py-20 bg-[var(--surface-subtle)] border-t border-[var(--border-subtle)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--brand-primary)]">
          Stay Connected
        </span>
        <h2 className="mt-2 font-[var(--font-display)] text-2xl sm:text-4xl font-bold text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto">
          {subtitle}
        </p>

        {subscribed ? (
          <div className="mt-8 p-4 rounded-[var(--theme-radius)] bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30 text-[var(--brand-primary)] font-medium text-sm inline-flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Thank you for subscribing! We've sent a welcome confirmation to your inbox.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 px-4 py-3 rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] transition-all"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-sm font-semibold hover:bg-[var(--brand-primary-hover)] transition-all active:scale-95 shrink-0"
            >
              Subscribe
            </button>
          </form>
        )}

        <p className="mt-3 text-xs text-[var(--text-muted)]">
          We respect your privacy. No spam. Unsubscribe at any time.
        </p>
      </div>
    </section>
  );
};
