"use client";

import React, { useState } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import type { StoreCart, StoreRegion } from "./types";

interface CartPageLayoutProps {
  theme: PublicPublishedTheme;
  cart: StoreCart | null;
  currentRegion?: StoreRegion;
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<void>;
  onRemoveItem: (lineId: string) => Promise<void>;
  onApplyPromotion: (code: string) => Promise<boolean>;
  onRemovePromotion: (code: string) => Promise<boolean>;
  isMutating?: boolean;
}

export const CartPageLayout: React.FC<CartPageLayoutProps> = ({
  theme,
  cart,
  currentRegion,
  onUpdateQuantity,
  onRemoveItem,
  onApplyPromotion,
  onRemovePromotion,
  isMutating = false,
}) => {
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  const items = cart?.items || [];
  const currency = cart?.currency_code || currentRegion?.currency_code || "inr";
  const subtotal = cart?.subtotal ?? cart?.item_subtotal ?? 0;
  const discountTotal = cart?.discount_total ?? 0;
  const shippingTotal = cart?.shipping_total ?? 0;
  const taxTotal = cart?.tax_total ?? 0;
  const total = cart?.total ?? (subtotal - discountTotal + shippingTotal + taxTotal);

  const formatPrice = (amount: number, curr: string) => {
    const sym =
      curr.toLowerCase() === "inr"
        ? "₹"
        : curr.toLowerCase() === "usd"
        ? "$"
        : curr.toLowerCase() === "eur"
        ? "€"
        : curr.toLowerCase() === "gbp"
        ? "£"
        : curr.toUpperCase() + " ";
    return `${sym}${Number(amount).toLocaleString()}`;
  };

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    setIsApplyingPromo(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const ok = await onApplyPromotion(promoCode.trim());
      if (ok) {
        setPromoSuccess(`Promo code '${promoCode.trim().toUpperCase()}' applied successfully`);
        setPromoCode("");
      } else {
        setPromoError(`Promotion code '${promoCode.trim().toUpperCase()}' is invalid or expired for this market.`);
      }
    } catch (err: any) {
      setPromoError(err.message || "Failed to apply discount code");
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const presetId = theme.presetId || "crescendo";

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="border-b border-[var(--border-subtle)] pb-6 mb-8 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-[var(--font-display)] text-[var(--text-primary)]">
              Your Shopping Bag
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              Review items, apply promo codes, and proceed to secure checkout.
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]">
            {items.reduce((acc, it) => acc + (it.quantity || 1), 0)} items
          </span>
        </div>

        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="p-12 text-center rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] max-w-xl mx-auto space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)]">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Your shopping bag is currently empty</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-sm mx-auto">
              Explore our verified catalog across apparel, electronics, gourmet, and wellness items.
            </p>
            <div className="pt-2">
              <a
                href="/"
                className={`inline-block py-3 px-8 text-xs font-bold text-white transition-all shadow-md ${
                  presetId === "crescendo" ? "rounded-none uppercase tracking-wider" : "rounded-[var(--theme-radius)]"
                } bg-[var(--brand-primary)] hover:opacity-95`}
              >
                Explore Catalog
              </a>
            </div>
          </div>
        ) : (
          /* Active Cart Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                {items.map((item) => (
                  <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[var(--theme-radius)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] overflow-hidden shrink-0 flex items-center justify-center">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors">
                        {item.title}
                      </h3>
                      {item.variant?.title && item.variant.title !== "Default" && (
                        <p className="text-xs text-[var(--text-muted)]">
                          Option: <span className="font-semibold text-[var(--text-secondary)]">{item.variant.title}</span>
                        </p>
                      )}
                      {item.variant?.sku && (
                        <p className="text-[11px] font-mono text-[var(--text-muted)]">
                          SKU: {item.variant.sku}
                        </p>
                      )}
                      <div className="text-xs sm:text-sm font-bold font-mono text-[var(--brand-primary)] pt-1">
                        {formatPrice(item.unit_price, currency)}
                      </div>
                    </div>

                    {/* Quantity Selector and Total */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0">
                      <div className="flex items-center border border-[var(--border-subtle)] rounded-[var(--theme-radius)] bg-[var(--surface-base)]">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))}
                          disabled={isMutating || item.quantity <= 1}
                          className="px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-xs font-mono font-semibold text-[var(--text-primary)] min-w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, (item.quantity || 1) + 1)}
                          disabled={isMutating}
                          className="px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 focus:outline-none"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm sm:text-base font-bold font-mono text-[var(--text-primary)]">
                          {formatPrice(item.unit_price * (item.quantity || 1), currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          disabled={isMutating}
                          className="text-xs text-red-500 hover:text-red-600 transition-colors"
                          aria-label={`Remove ${item.title}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shopping Continuity Link */}
              <div className="pt-2 flex justify-between items-center text-xs">
                <a
                  href="/"
                  className="text-[var(--brand-primary)] hover:underline font-semibold flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Continue Shopping</span>
                </a>
              </div>
            </div>

            {/* Right Column: Order Summary & Coupon */}
            <div className="lg:col-span-4 space-y-6">
              {/* Order Summary Card */}
              <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] shadow-sm space-y-5">
                <h2 className="text-base font-bold text-[var(--text-primary)] pb-3 border-b border-[var(--border-subtle)]">
                  Order Summary
                </h2>

                {/* Subtotals Breakdown */}
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Items Subtotal</span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">
                      {formatPrice(subtotal, currency)}
                    </span>
                  </div>

                  {discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Promotions / Coupons</span>
                      <span className="font-mono">-{formatPrice(discountTotal, currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Estimated Shipping</span>
                    <span className="font-mono text-[var(--text-muted)]">
                      {shippingTotal > 0 ? formatPrice(shippingTotal, currency) : "Calculated at checkout"}
                    </span>
                  </div>

                  {taxTotal > 0 && (
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Estimated Tax</span>
                      <span className="font-mono text-[var(--text-primary)]">
                        {formatPrice(taxTotal, currency)}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-between items-baseline">
                    <span className="text-base font-bold text-[var(--text-primary)]">Estimated Total</span>
                    <span className="text-xl font-black font-mono text-[var(--brand-primary)]">
                      {formatPrice(total, currency)}
                    </span>
                  </div>
                </div>

                {/* Coupon Code Input */}
                <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                  <label htmlFor="promoCode" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Promotional Code
                  </label>
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      id="promoCode"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="e.g. WELCOME10"
                      className="flex-1 px-3 py-2 text-xs uppercase font-mono rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingPromo || !promoCode.trim()}
                      className="px-4 py-2 text-xs font-bold rounded-[var(--theme-radius)] bg-[var(--surface-muted)] hover:bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] disabled:opacity-50 transition-colors"
                    >
                      {isApplyingPromo ? "Applying..." : "Apply"}
                    </button>
                  </form>

                  {promoSuccess && (
                    <p className="text-xs text-emerald-600 font-medium">{promoSuccess}</p>
                  )}
                  {promoError && (
                    <p className="text-xs text-red-500 font-medium">{promoError}</p>
                  )}

                  {/* Applied Promotions List */}
                  {cart?.promotions && cart.promotions.length > 0 && (
                    <div className="pt-2 space-y-1">
                      <p className="text-[11px] text-[var(--text-muted)] font-semibold">Applied Coupons:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cart.promotions.map((p) => (
                          <span
                            key={p.code}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                          >
                            <span>{p.code}</span>
                            <button
                              type="button"
                              onClick={() => onRemovePromotion(p.code)}
                              className="hover:text-red-600 font-normal focus:outline-none"
                              aria-label={`Remove coupon ${p.code}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Checkout CTA Button */}
                <div className="pt-4">
                  <a
                    href="/checkout"
                    className={`block w-full py-3.5 px-6 text-sm font-bold text-white text-center transition-all shadow-md ${
                      presetId === "crescendo"
                        ? "rounded-none uppercase tracking-wider"
                        : "rounded-[var(--theme-radius)]"
                    } bg-[var(--brand-primary)] hover:opacity-95`}
                  >
                    Proceed to Checkout
                  </a>
                </div>

                <div className="text-[11px] text-[var(--text-muted)] text-center space-y-1 pt-1">
                  <p>Guaranteed genuine sourcing • Direct brand delivery</p>
                  <p>Cash on Delivery available nationwide in India</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
