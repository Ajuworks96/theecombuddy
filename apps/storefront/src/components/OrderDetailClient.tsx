"use client";

import React, { useState, useEffect } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import { type StoreRegion } from "@the-ecom-buddy/ui";
import { AccountLayout } from "./AccountLayout";
import { useCustomer } from "../context/CustomerContext";

interface OrderDetailClientProps {
  orderId: string;
  theme: PublicPublishedTheme;
  regions: StoreRegion[];
  initialRegion?: StoreRegion;
}

export const OrderDetailClient: React.FC<OrderDetailClientProps> = ({
  orderId,
  theme,
  regions,
  initialRegion,
}) => {
  const { customer, isAuthenticated, isLoading } = useCustomer();
  const [order, setOrder] = useState<any | null>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = `/login?redirect=/account/orders/${orderId}`;
      return;
    }

    if (isAuthenticated) {
      fetch(`/api/account/orders/${encodeURIComponent(orderId)}`)
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Access denied or order not found");
          }
          return res.json();
        })
        .then((data) => {
          setOrder(data.order);
          setShipments(data.shipments || []);
        })
        .catch((err) => {
          setError(err.message || "Failed to load order details");
        })
        .finally(() => {
          setIsLoadingOrder(false);
        });
    }
  }, [orderId, isLoading, isAuthenticated]);

  const formatPrice = (amount: number, currency = "INR") => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency.toUpperCase(),
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
    }
  };

  if (isLoading || isLoadingOrder) {
    return (
      <AccountLayout theme={theme} regions={regions} initialRegion={initialRegion} activeTab="orders">
        <div className="py-20 text-center">
          <svg className="w-8 h-8 mx-auto animate-spin text-[var(--brand-primary)] mb-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-xs text-[var(--text-muted)]">Loading order details...</p>
        </div>
      </AccountLayout>
    );
  }

  if (error || !order) {
    return (
      <AccountLayout theme={theme} regions={regions} initialRegion={initialRegion} activeTab="orders">
        <div className="p-8 rounded-[var(--theme-radius)] bg-red-50 border border-red-200 text-center">
          <svg className="w-10 h-10 mx-auto text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-base font-bold text-red-800">Order Access Error</h2>
          <p className="text-xs text-red-700 mt-1 mb-4">{error || "Order not found."}</p>
          <a href="/account/orders" className="inline-flex items-center px-4 py-2 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-xs font-semibold hover:opacity-90">
            &larr; Back to Order History
          </a>
        </div>
      </AccountLayout>
    );
  }

  const isCod = order.payment_collections?.[0]?.payments?.some(
    (p: any) => p.provider_id === "pp_system_default"
  );

  const hasTracking = shipments.some((s: any) => Boolean(s.tracking_number));
  const orderStatus = order.status || "pending";

  return (
    <AccountLayout
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
      activeTab="orders"
      title={`Order #${order.display_id || order.id.slice(-8)}`}
      subtitle={`Placed on ${new Date(order.created_at).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}`}
    >
      <div className="space-y-6">
        {/* Back Link */}
        <div>
          <a href="/account/orders" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:underline">
            <span>&larr;</span>
            <span>Back to all orders</span>
          </a>
        </div>

        {/* Live Shipment Tracking Card (Phase 6) */}
        <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-6">
            <div>
              <h2 className="text-base font-bold">Shipment & Delivery Status</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Official fulfillment status directly from merchant inventory dispatch.
              </p>
            </div>
            <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full ${
              orderStatus === "completed"
                ? "bg-emerald-100 text-emerald-800"
                : orderStatus === "canceled"
                ? "bg-red-100 text-red-800"
                : "bg-amber-100 text-amber-800"
            }`}>
              {orderStatus}
            </span>
          </div>

          {/* Tracking Timeline */}
          <div className="relative py-4 px-2">
            <div className="grid grid-cols-4 gap-2 text-center relative z-10">
              {/* Step 1: Confirmed */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow">
                  ✓
                </div>
                <span className="text-xs font-bold mt-2">Placed</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {new Date(order.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                </span>
              </div>

              {/* Step 2: Processing */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow ${
                  orderStatus !== "canceled" ? "bg-emerald-500 text-white" : "bg-gray-300 text-gray-600"
                }`}>
                  {orderStatus !== "canceled" ? "✓" : "2"}
                </div>
                <span className="text-xs font-bold mt-2">Processing</span>
                <span className="text-[10px] text-[var(--text-muted)]">Stock reserved</span>
              </div>

              {/* Step 3: Dispatched */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow ${
                  hasTracking ? "bg-emerald-500 text-white" : "bg-[var(--surface-base)] border-2 border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}>
                  {hasTracking ? "✓" : "3"}
                </div>
                <span className="text-xs font-bold mt-2">Dispatched</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {hasTracking ? "In Transit" : "Pending"}
                </span>
              </div>

              {/* Step 4: Delivered */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow ${
                  orderStatus === "completed" ? "bg-emerald-500 text-white" : "bg-[var(--surface-base)] border-2 border-[var(--border-subtle)] text-[var(--text-muted)]"
                }`}>
                  {orderStatus === "completed" ? "✓" : "4"}
                </div>
                <span className="text-xs font-bold mt-2">Delivered</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {orderStatus === "completed" ? "Delivered" : "Awaiting"}
                </span>
              </div>
            </div>
          </div>

          {/* Courier & Tracking Details Box */}
          <div className="mt-4 p-4 rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-xs">
            {hasTracking ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Courier Partner:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{shipments[0]?.carrier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Tracking Number:</span>
                  <span className="font-mono font-bold text-[var(--brand-primary)]">{shipments[0]?.tracking_number}</span>
                </div>
                {shipments[0]?.tracking_url && (
                  <div className="pt-2 border-t border-[var(--border-subtle)] text-right">
                    <a
                      href={shipments[0].tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Track on Courier Portal</span>
                      <span>&rarr;</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-2.5 text-[var(--text-secondary)]">
                <svg className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Pending Courier Dispatch</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    Your order has been verified and stock is secured. Tracking details and carrier updates will automatically appear here once dispatched by the fulfillment team.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Items & Totals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items Summary (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <h2 className="text-sm font-bold pb-3 border-b border-[var(--border-subtle)] mb-4">
              Items in this Order ({order.items?.length || 0})
            </h2>

            <div className="divide-y divide-[var(--border-subtle)]">
              {(order.items || []).map((item: any) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-14 h-14 object-cover rounded-[var(--theme-radius)] border border-[var(--border-subtle)] shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-[var(--theme-radius)] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)] shrink-0">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{item.title}</p>
                      {item.variant_title && (
                        <p className="text-[11px] text-[var(--text-muted)]">Option: {item.variant_title}</p>
                      )}
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Quantity: <span className="font-semibold">{item.quantity}</span> × {formatPrice(item.unit_price || 0, order.currency_code)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {formatPrice((item.unit_price || 0) * (item.quantity || 1), order.currency_code)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals & Address Column (1 col) */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs">
              <h2 className="text-sm font-bold pb-3 border-b border-[var(--border-subtle)] mb-3">
                Order Summary
              </h2>

              <div className="space-y-2 text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatPrice(order.item_subtotal || order.subtotal || 0, order.currency_code)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatPrice(order.shipping_total || 0, order.currency_code)}
                  </span>
                </div>
                {order.discount_total > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="font-semibold">
                      -{formatPrice(order.discount_total, order.currency_code)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxes (Included/Calculated)</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatPrice(order.tax_total || 0, order.currency_code)}
                  </span>
                </div>

                <div className="my-2 border-t border-[var(--border-subtle)] pt-2 flex justify-between text-sm font-bold text-[var(--text-primary)]">
                  <span>Total Amount</span>
                  <span className="text-[var(--brand-primary)]">
                    {formatPrice(order.total || 0, order.currency_code)}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping & Payment Info */}
            <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs space-y-4">
              <div>
                <h3 className="font-bold text-[var(--text-primary)] uppercase text-[10px] tracking-wider text-[var(--text-muted)] mb-1">
                  Delivery Destination
                </h3>
                {order.shipping_address ? (
                  <div className="text-[var(--text-secondary)]">
                    <p className="font-semibold text-[var(--text-primary)]">
                      {order.shipping_address.first_name} {order.shipping_address.last_name}
                    </p>
                    <p>{order.shipping_address.address_1}</p>
                    {order.shipping_address.address_2 && <p>{order.shipping_address.address_2}</p>}
                    <p>
                      {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.postal_code}
                    </p>
                    <p className="uppercase font-mono">{order.shipping_address.country_code}</p>
                  </div>
                ) : (
                  <p className="text-[var(--text-muted)]">Address not available</p>
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <h3 className="font-bold text-[var(--text-primary)] uppercase text-[10px] tracking-wider text-[var(--text-muted)] mb-1">
                  Payment Method
                </h3>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {isCod ? "Cash on Delivery (COD)" : "Prepaid Online Payment"}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isCod
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {isCod ? "Pending Collection" : "Paid"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
};

