"use client";

import React, { useState } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";

interface FooterProps {
  theme: PublicPublishedTheme;
}

export const Footer: React.FC<FooterProps> = ({ theme }) => {
  const { footer, identity, colors } = theme;
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsError(false);

    if (!email || !email.includes("@")) {
      setIsError(true);
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!consent) {
      setIsError(true);
      setMessage("Please check the consent box to subscribe.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), consent: true, source: "footer" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIsError(true);
        setMessage(data.error || "Failed to subscribe.");
      } else {
        setIsError(false);
        setMessage(data.message || "Subscribed successfully.");
        setEmail("");
        setConsent(false);
      }
    } catch {
      setIsError(true);
      setMessage("Subscription request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer
      style={{
        backgroundColor: colors?.footerBg || "#060911",
        color: colors?.footerText || "#9CA3AF",
      }}
      className="w-full border-t border-[var(--border-subtle)] transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {/* Footer Newsletter Subscription */}
        {footer?.showNewsletter && (
          <div className="pb-12 mb-12 border-b border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-[var(--font-display)] text-lg sm:text-xl font-bold text-white">
                {footer.newsletterTitle || "Join Store Updates"}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                {footer.newsletterSubtitle || "Get updates on newly listed products and verified store announcements."}
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto max-w-md">
              {message && (
                <div
                  role="status"
                  className={`text-xs p-2 rounded ${
                    isError ? "text-red-400 bg-red-950/40" : "text-emerald-400 bg-emerald-950/40"
                  }`}
                >
                  {message}
                </div>
              )}
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="px-3.5 py-2.5 rounded-[var(--theme-radius)] bg-white/5 border border-white/10 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[var(--brand-primary)] flex-1 min-w-[220px]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-xs font-semibold hover:bg-[var(--brand-primary-hover)] transition-all shrink-0 disabled:opacity-50"
                  >
                    {isSubmitting ? "..." : "Subscribe"}
                  </button>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="rounded border-white/20 text-[var(--brand-primary)]"
                  />
                  <span>I agree to receive store communications</span>
                </label>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info (Spans 2 columns on lg) */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <a href="/" className="flex items-center gap-3">
              {identity.logoUrl && (
                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center p-1 border border-white/20">
                  <img
                    src={identity.logoUrl}
                    alt={identity.storeName}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              <span className="font-[var(--font-display)] text-xl font-bold tracking-tight text-white">
                {identity.storeName}
              </span>
            </a>

            {footer?.tagline && (
              <p className="text-sm opacity-85 leading-relaxed max-w-sm">
                {footer.tagline}
              </p>
            )}

            {/* Merchant Details */}
            <div className="text-xs space-y-1.5 pt-2 opacity-80">
              {identity.contactAddress && (
                <p className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{identity.contactAddress}</span>
                </p>
              )}
              {identity.contactPhone && (
                <p className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{identity.contactPhone}</span>
                </p>
              )}
              {identity.contactEmail && (
                <p className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{identity.contactEmail}</span>
                </p>
              )}
              {identity.businessHours && (
                <p className="text-[11px] pt-1 opacity-70">
                  Hours: {identity.businessHours}
                </p>
              )}
            </div>

            {/* Social Links */}
            {identity.socialLinks && (
              <div className="flex items-center gap-3 pt-2">
                {identity.socialLinks.twitter && (
                  <a
                    href={identity.socialLinks.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Twitter / X"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
                {identity.socialLinks.instagram && (
                  <a
                    href={identity.socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Instagram"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}
                {identity.socialLinks.facebook && (
                  <a
                    href={identity.socialLinks.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    aria-label="Facebook"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.688 5H18V0h-3.808C10.595 0 9 1.583 9 4.615V8z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Navigation Columns (3 cols on lg) */}
          {(footer?.columns || []).map((col) => (
            <div key={col.id} className="flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                {col.title}
              </h4>
              <ul className="space-y-2 text-xs">
                {(col.links || []).map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      className="hover:text-white hover:underline transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="opacity-75">
            {footer?.copyrightText || "© 2026 The Ecom Buddy. All rights reserved."}
          </p>

          {/* Verified Active Payment Providers Only */}
          {footer?.showPaymentIcons && (
            <div className="flex flex-wrap items-center gap-2 opacity-85">
              <span className="px-2.5 py-1 rounded bg-white/10 text-white font-mono text-[10px] font-bold tracking-wider">
                Razorpay (UPI / NetBanking / Cards)
              </span>
              <span className="px-2.5 py-1 rounded bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 font-semibold text-[10px]">
                Cash on Delivery (COD)
              </span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
