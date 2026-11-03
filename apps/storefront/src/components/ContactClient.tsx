"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import {
  ThemeRoot,
  Header,
  Footer,
  CartDrawer,
  type StoreRegion,
} from "@the-ecom-buddy/ui";
import { useCart } from "../context/CartContext";

export interface ContactClientProps {
  theme: PublicPublishedTheme;
  regions?: StoreRegion[];
  initialRegion?: StoreRegion;
}

export const ContactClient: React.FC<ContactClientProps> = ({
  theme,
  regions = [],
  initialRegion,
}) => {
  const [currentRegion, setCurrentRegion] = useState<StoreRegion | undefined>(
    initialRegion || regions[0]
  );

  const {
    cart,
    itemCount,
    isCartDrawerOpen,
    openCartDrawer,
    closeCartDrawer,
    updateItemQuantity,
    removeItem,
    isMutating,
  } = useCart();

  const handleSelectRegion = (region: StoreRegion) => {
    setCurrentRegion(region);
  };

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Order Inquiry");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [inquiryId, setInquiryId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim() || name.trim().length < 2) {
      setFormError("Please enter your full name (at least 2 characters).");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (!message.trim() || message.trim().length < 10) {
      setFormError("Please enter your message (at least 10 characters).");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit message");
      }

      setFormSuccess(data.message || "Thank you! Your message has been received.");
      setInquiryId(data.inquiryId || null);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const storeName = theme.identity?.storeName || "The Ecom Buddy";

  return (
    <ThemeRoot theme={theme}>
      <div className="min-h-screen flex flex-col bg-[var(--surface-base)] text-[var(--text-primary)] antialiased font-[family-name:var(--font-body)]">
        <Header
          theme={theme}
          cartItemCount={itemCount}
          onOpenCartDrawer={openCartDrawer}
          regions={regions}
          currentRegion={currentRegion}
          onSelectRegion={handleSelectRegion}
        />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-6 font-medium">
            <Link href="/" className="hover:text-[var(--brand-primary)] transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">Contact Us</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12 items-start">
            {/* Left 2 Cols: Contact Form */}
            <div className="lg:col-span-2 bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] p-6 sm:p-10 shadow-sm">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-[family-name:var(--font-display)] tracking-tight mb-2">
                Get in Touch
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mb-8">
                Have a question about an order, shipment, or custom product? Send us a message and our team will get back to you within 24 business hours.
              </p>

              {formSuccess ? (
                <div className="p-6 rounded-[var(--theme-radius)] bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-4">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <h3 className="font-bold text-base text-emerald-950">Message Sent Successfully!</h3>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">{formSuccess}</p>
                  {inquiryId && (
                    <div className="text-[11px] font-mono text-emerald-700 bg-emerald-100/60 p-2.5 rounded">
                      Reference Inquiry ID: {inquiryId}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setFormSuccess(null)}
                    className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900 pt-2 block"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {formError && (
                    <div className="p-4 rounded-[var(--theme-radius)] bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        required
                        className="w-full px-3.5 py-2.5 bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. rahul@example.com"
                        required
                        className="w-full px-3.5 py-2.5 bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider">
                        Topic / Subject
                      </label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                      >
                        <option value="Order Inquiry">Order Inquiry</option>
                        <option value="Shipment & Tracking">Shipment &amp; Tracking</option>
                        <option value="Returns & Refunds">Returns &amp; Refunds</option>
                        <option value="Product Specifications">Product Specifications</option>
                        <option value="Wholesale & Commercial">Wholesale &amp; Commercial</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider">
                      Message <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe how we can assist you..."
                      required
                      className="w-full px-3.5 py-2.5 bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3 bg-[var(--brand-primary)] text-white text-xs font-bold uppercase tracking-wider rounded-[var(--theme-radius)] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending message...</span>
                      </>
                    ) : (
                      <span>Send Message</span>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Right Col: Store Info & Direct Support */}
            <div className="space-y-6">
              <div className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] p-6 shadow-sm space-y-5">
                <h2 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-3">
                  Direct Support
                </h2>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="font-bold text-[var(--text-secondary)] uppercase text-[10px] tracking-wider block mb-1">
                      Customer Service
                    </span>
                    <a
                      href={`mailto:support@theecombuddy.local`}
                      className="text-sm font-semibold text-[var(--brand-primary)] hover:underline"
                    >
                      support@theecombuddy.local
                    </a>
                  </div>

                  <div>
                    <span className="font-bold text-[var(--text-secondary)] uppercase text-[10px] tracking-wider block mb-1">
                      Business Hours
                    </span>
                    <p className="text-[var(--text-primary)] leading-relaxed">
                      Monday &ndash; Saturday<br />
                      9:00 AM &ndash; 6:00 PM IST
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-[var(--text-secondary)] uppercase text-[10px] tracking-wider block mb-1">
                      Fulfillment Hub
                    </span>
                    <p className="text-[var(--text-primary)] leading-relaxed">
                      {storeName} Logistics Hub<br />
                      DLF CyberCity, Phase 2<br />
                      Gurugram, Haryana 122002, India
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-[var(--theme-radius)] p-5 text-blue-950 text-xs space-y-2">
                <div className="font-bold flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Fast Response Commitment</span>
                </div>
                <p className="text-blue-900 leading-relaxed text-[11px]">
                  All order status, refund, and shipping inquiries are reviewed directly by our store operations staff with a response guaranteed within 24 business hours.
                </p>
              </div>
            </div>
          </div>
        </main>

        <Footer theme={theme} />

        <CartDrawer
          theme={theme}
          isOpen={isCartDrawerOpen}
          onClose={closeCartDrawer}
          cart={cart}
          onUpdateQuantity={updateItemQuantity}
          onRemoveItem={removeItem}
          isMutating={isMutating}
        />
      </div>
    </ThemeRoot>
  );
};
