"use client";

import React from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import type { StoreOrder } from "./types";

interface OrderConfirmationLayoutProps {
  theme: PublicPublishedTheme;
  order: StoreOrder;
}

export const OrderConfirmationLayout: React.FC<OrderConfirmationLayoutProps> = ({
  theme,
  order,
}) => {
  const currency = order.currency_code || "inr";

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
  const items = order.items || [];
  const shippingMethod = order.shipping_methods?.[0];
  const shippingAddress = order.shipping_address;
  const payment = order.payment_collections?.[0]?.payments?.[0];
  const isCOD = payment?.provider_id === "pp_system_default" || !payment?.captured_at;

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] py-8 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header Banner */}
        <div className="p-8 sm:p-10 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-center space-y-4 mb-8 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
              Order Confirmed & Received
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-[var(--font-display)] text-[var(--text-primary)] mt-1">
              Thank You For Your Order!
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              A detailed confirmation has been generated for your records.
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="px-4 py-1.5 rounded-full bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs font-mono">
              <span className="text-[var(--text-muted)]">Order #:</span>{" "}
              <span className="font-bold text-[var(--text-primary)]">
                {order.display_id ? `#${order.display_id}` : order.id}
              </span>
            </div>
            <div className="px-4 py-1.5 rounded-full bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs font-mono">
              <span className="text-[var(--text-muted)]">Status:</span>{" "}
              <span className="font-bold uppercase text-[var(--brand-primary)]">
                {order.status || "Pending"}
              </span>
            </div>
            <div className="px-4 py-1.5 rounded-full bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs font-mono">
              <span className="text-[var(--text-muted)]">Currency:</span>{" "}
              <span className="font-bold uppercase text-[var(--text-primary)]">
                {currency.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Payment & Fulfillment Summary */}
          <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-2">
              Payment Information
            </h3>
            <div className="text-xs space-y-1">
              <p className="font-semibold text-[var(--text-primary)]">
                {isCOD ? "Cash on Delivery (COD)" : "Online Payment (Captured)"}
              </p>
              <p className="text-[var(--text-muted)]">
                {isCOD
                  ? "Status: Pending Payment upon Delivery. Please keep exact cash or UPI ready."
                  : "Status: Authorized & Confirmed."}
              </p>
              <p className="text-[var(--text-muted)] pt-1 font-mono">
                Recipient Email: {order.email}
              </p>
            </div>
          </div>

          {/* Delivery Destination */}
          <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)] pb-2">
              Shipping Destination
            </h3>
            {shippingAddress ? (
              <div className="text-xs space-y-1 text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--text-primary)]">
                  {shippingAddress.first_name} {shippingAddress.last_name}
                </p>
                <p>{shippingAddress.address_1}</p>
                {shippingAddress.address_2 && <p>{shippingAddress.address_2}</p>}
                <p>
                  {shippingAddress.city}, {shippingAddress.province} {shippingAddress.postal_code}
                </p>
                <p className="font-mono uppercase text-[11px] text-[var(--text-muted)]">
                  {shippingAddress.country_code?.toUpperCase()} • {shippingAddress.phone}
                </p>
                {shippingMethod && (
                  <p className="pt-2 text-[11px] text-[var(--brand-primary)] font-semibold">
                    Delivery Speed: {shippingMethod.name || "Express Courier"}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">Standard domestic delivery</p>
            )}
          </div>
        </div>

        {/* Ordered Items Breakdown */}
        <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-4 mb-8">
          <h2 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-3">
            Ordered Line Items ({items.reduce((acc, it) => acc + (it.quantity || 1), 0)})
          </h2>

          <div className="divide-y divide-[var(--border-subtle)]">
            {items.map((it) => (
              <div key={it.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-[var(--theme-radius)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] overflow-hidden shrink-0 flex items-center justify-center">
                    {it.thumbnail ? (
                      <img src={it.thumbnail} alt={it.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-[var(--text-muted)]">item</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{it.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Qty: {it.quantity} {it.variant?.title && it.variant.title !== "Default" ? `• ${it.variant.title}` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-xs font-mono font-bold text-[var(--text-primary)]">
                  {formatPrice(it.unit_price * (it.quantity || 1), currency)}
                </div>
              </div>
            ))}
          </div>

          {/* Financial Totals */}
          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2 text-xs">
            {order.subtotal !== undefined && (
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Subtotal</span>
                <span className="font-mono">{formatPrice(order.subtotal, currency)}</span>
              </div>
            )}
            {order.discount_total !== undefined && order.discount_total > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Discounts</span>
                <span className="font-mono">-{formatPrice(order.discount_total, currency)}</span>
              </div>
            )}
            {order.shipping_total !== undefined && (
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Shipping</span>
                <span className="font-mono">
                  {order.shipping_total === 0 ? "FREE" : formatPrice(order.shipping_total, currency)}
                </span>
              </div>
            )}
            {order.tax_total !== undefined && order.tax_total > 0 && (
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Tax</span>
                <span className="font-mono">{formatPrice(order.tax_total, currency)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-between items-baseline text-sm">
              <span className="font-bold text-[var(--text-primary)]">Total Paid / Payable</span>
              <span className="text-lg font-black font-mono text-[var(--brand-primary)]">
                {formatPrice(order.total, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-xs text-[var(--text-muted)]">
            Need assistance with this order? Contact merchant support with reference #{order.display_id || order.id}.
          </p>
          <a
            href="/"
            className={`py-3 px-8 text-xs font-bold text-white text-center transition-all shadow-md ${
              presetId === "crescendo" ? "rounded-none uppercase tracking-wider" : "rounded-[var(--theme-radius)]"
            } bg-[var(--brand-primary)] hover:opacity-95`}
          >
            Continue Shopping
          </a>
        </div>
      </div>
    </div>
  );
};
