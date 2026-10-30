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

  const title = section?.title || "Join Store Updates";
  const subtitle =
    section?.subtitle ||
    "Be the first to hear about curated catalog additions, seasonal sales, and brand updates.";

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
      setStatusMessage("Please check the consent box to agree to store communications.");
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
        setStatusMessage(data.message || "Thank you for subscribing! Your email has been added to our updates list.");
        setEmail("");
        setConsent(false);
      }
    } catch {
      setIsError(true);
      setStatusMessage("Unable to connect to subscription service. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
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

        {statusMessage && (
          <div
            role="status"
            className={`mt-6 p-4 rounded-[var(--theme-radius)] text-sm inline-flex items-center gap-2 max-w-md mx-auto ${
              isError
                ? "bg-red-500/10 border border-red-500/30 text-red-500"
                : "bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30 text-[var(--brand-primary)] font-medium"
            }`}
          >
            {!isError ? (
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
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
              disabled={isSubmitting}
              className="px-6 py-3 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-sm font-semibold hover:bg-[var(--brand-primary-hover)] transition-all active:scale-95 shrink-0 disabled:opacity-50"
            >
              {isSubmitting ? "Subscribing..." : "Subscribe"}
            </button>
          </div>

          {/* Privacy Consent Checkbox */}
          <label className="flex items-start gap-2.5 text-left text-xs text-[var(--text-secondary)] cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-[var(--border-subtle)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
            />
            <span>
              I agree to receive store news and promotional communications. Unsubscribe at any time.
            </span>
          </label>
        </form>
      </div>
    </section>
  );
};
