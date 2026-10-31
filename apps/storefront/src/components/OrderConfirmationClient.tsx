"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import {
  ThemeRoot,
  Header,
  Footer,
  OrderConfirmationLayout,
  type StoreOrder,
  type StoreRegion,
} from "@the-ecom-buddy/ui";

interface OrderConfirmationClientProps {
  theme: PublicPublishedTheme;
  orderId: string;
  regions: StoreRegion[];
  initialOrder?: StoreOrder | null;
}

export const OrderConfirmationClient: React.FC<OrderConfirmationClientProps> = ({
  theme,
  orderId,
  regions,
  initialOrder,
}) => {
  const searchParams = useSearchParams();
  const urlEmail = searchParams?.get("email") || "";

  const [order, setOrder] = useState<StoreOrder | null>(initialOrder || null);
  const [emailInput, setEmailInput] = useState(urlEmail);
  const [isLoading, setIsLoading] = useState(!initialOrder);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async (emailToVerify: string) => {
    if (!emailToVerify.trim()) {
      setError("Please enter your order confirmation email to view order details.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}?email=${encodeURIComponent(emailToVerify.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Order details could not be retrieved.");
      }

      if (data.order) {
        setOrder(data.order);
      } else {
        throw new Error("Order record was not found.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load order details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialOrder && urlEmail) {
      fetchOrder(urlEmail);
    } else if (!initialOrder && !urlEmail) {
      setIsLoading(false);
    }
  }, [initialOrder, urlEmail, orderId]);

  return (
    <ThemeRoot theme={theme}>
      <Header theme={theme} regions={regions} cartItemCount={0} />

      <main className="w-full">
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[var(--text-muted)]">Retrieving verified order details...</p>
          </div>
        ) : order ? (
          <OrderConfirmationLayout theme={theme} order={order} />
        ) : (
          /* Email Verification Gate for Guest Order */
          <div className="max-w-md mx-auto my-16 p-8 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] shadow-sm space-y-5">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-muted)] flex items-center justify-center mx-auto text-[var(--brand-primary)]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <div className="text-center">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Guest Order Verification</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                To protect customer privacy, please enter the email address used during checkout.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-[var(--theme-radius)] bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchOrder(emailInput);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. you@example.com"
                  required
                  className="w-full px-3 py-2 text-xs rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white hover:opacity-95 transition-opacity"
              >
                Access Order
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer theme={theme} />
    </ThemeRoot>
  );
};
