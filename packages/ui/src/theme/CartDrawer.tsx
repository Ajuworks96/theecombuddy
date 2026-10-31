"use client";

import React, { useEffect } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import type { StoreCart } from "./types";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: StoreCart | null;
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<void>;
  onRemoveItem: (lineId: string) => Promise<void>;
  isMutating?: boolean;
  theme: PublicPublishedTheme;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  isMutating = false,
  theme,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const items = cart?.items || [];
  const currency = cart?.currency_code || "inr";
  const subtotal = cart?.subtotal ?? cart?.item_subtotal ?? 0;
  const discountTotal = cart?.discount_total ?? 0;

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

  const presetId = theme.presetId || "crescendo";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart Drawer"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-[var(--surface-base)] border-l border-[var(--border-subtle)] h-full shadow-2xl z-10 flex flex-col justify-between overflow-hidden animate-slide-left">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Shopping Bag</h2>
            <span className="px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-bold font-mono">
              {items.reduce((acc, it) => acc + (it.quantity || 1), 0)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[var(--theme-radius)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            aria-label="Close cart drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)]">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Your bag is empty</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Discover curated direct-to-consumer items from our catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-5 py-2 text-xs font-semibold rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white hover:opacity-95 transition-opacity"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex gap-3 relative group"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-[var(--theme-radius)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] overflow-hidden shrink-0 flex items-center justify-center">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div className="pr-6">
                    <h4 className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">
                      {item.title}
                    </h4>
                    {item.variant?.title && item.variant.title !== "Default" && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {item.variant.title}
                      </p>
                    )}
                    <div className="text-xs font-bold font-mono text-[var(--brand-primary)] mt-1">
                      {formatPrice(item.unit_price, currency)}
                    </div>
                  </div>

                  {/* Quantity and Remove */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-subtle)]/60">
                    <div className="flex items-center border border-[var(--border-subtle)] rounded-[var(--theme-radius)] bg-[var(--surface-base)]">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))}
                        disabled={isMutating || item.quantity <= 1}
                        className="px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-2 py-0.5 text-xs font-mono font-semibold text-[var(--text-primary)] min-w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.id, (item.quantity || 1) + 1)}
                        disabled={isMutating}
                        className="px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 focus:outline-none"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      disabled={isMutating}
                      className="text-[11px] text-red-500 hover:text-red-600 font-medium transition-colors p-1"
                      aria-label="Remove item"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Totals and Actions */}
        {items.length > 0 && (
          <div className="p-5 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/80 space-y-3">
            {discountTotal > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-600 font-medium">
                <span>Promotional Savings</span>
                <span className="font-mono">-{formatPrice(discountTotal, currency)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[var(--text-secondary)]">Subtotal</span>
              <span className="text-base font-bold font-mono text-[var(--text-primary)]">
                {formatPrice(subtotal, currency)}
              </span>
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              Shipping & taxes calculated dynamically at checkout.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href="/cart"
                onClick={onClose}
                className="py-2.5 px-4 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] text-xs font-bold text-center hover:bg-[var(--surface-muted)] transition-colors"
              >
                View Full Bag
              </a>
              <a
                href="/checkout"
                onClick={onClose}
                className={`py-2.5 px-4 text-xs font-bold text-white text-center transition-all ${
                  presetId === "crescendo" ? "rounded-none uppercase tracking-wider" : "rounded-[var(--theme-radius)]"
                } bg-[var(--brand-primary)] hover:opacity-95 shadow-md`}
              >
                Checkout Now
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
