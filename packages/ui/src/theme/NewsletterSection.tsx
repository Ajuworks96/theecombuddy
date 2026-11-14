"use client";

import React, { useState } from "react";
import type { HomepageSection } from "@the-ecom-buddy/types";

interface NewsletterSectionProps {
  section?: HomepageSection;
}

export const NewsletterSection: React.FC<NewsletterSectionProps> = ({ section }) => {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const title = section?.title || "The Private Journal";
  const subtitle =
    section?.subtitle ||
    "Receive quiet dispatches on limited seasonal releases, rare textile sourcing, and private client privileges.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsError(false);

    if (!email || !email.includes("@")) {
      setIsError(true);
      setStatusMessage("Please enter a valid email address.");
      return;
    }

    if (!consent) {
      setIsError(true);
      setStatusMessage("Please check the box to receive dispatches.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), consent: true, source: "homepage_section" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIsError(true);
        setStatusMessage(data.error || "Failed to process subscription.");
      } else {
        setIsError(false);
        setStatusMessage(data.message || "Welcome to the Journal. Your inaugural dispatch will arrive shortly.");
        setEmail("");
        setConsent(false);
      }
    } catch {
      setIsError(true);
      setStatusMessage("Unable to connect to service. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full py-20 sm:py-28 bg-[#FAF9F5] border-t border-stone-200/60">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="w-4 h-px bg-[#C28E5C]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C28E5C]">
            COMMUNITY & DISPATCHES
          </span>
          <span className="w-4 h-px bg-[#C28E5C]" />
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-stone-950 tracking-tight">
          {title}
        </h2>

        <p className="mt-3 text-sm sm:text-base text-stone-600 font-normal leading-relaxed">
          {subtitle}
        </p>

        {statusMessage && (
          <div
            role="status"
            className={`mt-6 text-xs p-3 rounded-xl border ${
              isError
                ? "text-red-700 bg-red-50 border-red-200"
                : "text-stone-800 bg-stone-100 border-stone-300 font-serif"
            }`}
          >
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="px-5 py-3.5 rounded-xl bg-white border border-stone-300 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-950 flex-1 shadow-xs transition-colors"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3.5 rounded-xl bg-stone-950 text-white hover:bg-[#C28E5C] transition-all text-xs font-semibold uppercase tracking-[0.14em] shadow-sm disabled:opacity-60 shrink-0"
            >
              {isSubmitting ? "Subscribing..." : "Subscribe"}
            </button>
          </div>

          <label className="flex items-start gap-2.5 text-left text-xs text-stone-500 cursor-pointer pt-1 px-1">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-stone-300 text-stone-900 focus:ring-0 cursor-pointer"
            />
            <span>
              I agree to receive private client dispatches. You may withdraw consent at any time.
            </span>
          </label>
        </form>

      </div>
    </section>
  );
};
