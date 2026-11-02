"use client";

import React, { useState, useEffect } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import { type StoreRegion } from "@the-ecom-buddy/ui";
import { AccountLayout } from "./AccountLayout";
import { useCustomer } from "../context/CustomerContext";

interface OrdersListClientProps {
  theme: PublicPublishedTheme;
  regions: StoreRegion[];
  initialRegion?: StoreRegion;
}

export const OrdersListClient: React.FC<OrdersListClientProps> = ({
  theme,
  regions,
  initialRegion,
}) => {
  const { customer, isAuthenticated, isLoading } = useCustomer();
  const [orders, setOrders] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login?redirect=/account/orders";
      return;
    }

    if (isAuthenticated) {
      fetch("/api/account/orders")
        .then((r) => (r.ok ? r.json() : { orders: [] }))
        .then((data) => setOrders(data.orders || []))
        .finally(() => setIsLoadingOrders(false));
    }
  }, [isLoading, isAuthenticated]);

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

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === "all") return true;
    return o.status === filterStatus;
  });

  return (
    <AccountLayout
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
      activeTab="orders"
      title="Order History"
      subtitle="View all past purchases, payment verification records, and live delivery status."
    >
      <div className="space-y-6">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["all", "pending", "completed", "canceled"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                filterStatus === status
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]"
              }`}
            >
              {status === "all" ? `All Orders (${orders.length})` : status}
            </button>
          ))}
        </div>

        {/* Orders Listing */}
        {isLoadingOrders ? (
          <div className="py-20 text-center">
            <svg className="w-8 h-8 mx-auto animate-spin text-[var(--brand-primary)] mb-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-xs text-[var(--text-muted)]">Retrieving orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-sm font-bold">No orders found</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
              {filterStatus !== "all"
                ? `You have no orders matching status '${filterStatus}'.`
                : "You haven't placed any orders with this account yet."}
            </p>
            <a href="/" className="inline-flex items-center px-4 py-2 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-xs font-semibold hover:opacity-90">
              Browse Catalog
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isCod = order.payment_collections?.[0]?.payments?.some(
                (p: any) => p.provider_id === "pp_system_default"
              );

              return (
                <div
                  key={order.id}
                  className="rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] overflow-hidden shadow-sm"
                >
                  {/* Order Card Header */}
                  <div className="p-4 sm:px-6 bg-[var(--surface-base)] border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase block">Order Placed</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {new Date(order.created_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase block">Total</span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {formatPrice(order.total || 0, order.currency_code)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase block">Ship To</span>
                        <span className="font-medium text-[var(--text-secondary)] truncate max-w-[120px] block">
                          {order.shipping_address?.first_name} {order.shipping_address?.last_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        #{order.display_id || order.id.slice(-8)}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        order.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : order.status === "canceled"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {order.status || "Processing"}
                      </span>
                      {isCod && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          COD
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order Items Body */}
                  <div className="p-4 sm:p-6 divide-y divide-[var(--border-subtle)]">
                    {(order.items || []).map((item: any) => (
                      <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-12 h-12 object-cover rounded-[var(--theme-radius)] border border-[var(--border-subtle)] shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-[var(--theme-radius)] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)] shrink-0">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-[var(--text-primary)]">{item.title}</p>
                            {item.variant_title && (
                              <p className="text-[11px] text-[var(--text-muted)]">Option: {item.variant_title}</p>
                            )}
                            <p className="text-[11px] text-[var(--text-secondary)]">Qty: {item.quantity}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-semibold">
                            {formatPrice((item.unit_price || 0) * (item.quantity || 1), order.currency_code)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-3 sm:px-6 bg-[var(--surface-base)] border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {order.fulfillments?.length > 0 ? "Fulfillment in progress" : "Pending fulfillment dispatch"}
                    </span>
                    <a
                      href={`/account/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-xs font-semibold hover:opacity-90 transition-all"
                    >
                      <span>Track Shipment</span>
                      <span>&rarr;</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AccountLayout>
  );
};

