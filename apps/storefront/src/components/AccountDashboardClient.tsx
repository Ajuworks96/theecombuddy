"use client";

import React, { useState, useEffect } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import { type StoreRegion } from "@the-ecom-buddy/ui";
import { AccountLayout } from "./AccountLayout";
import { useCustomer } from "../context/CustomerContext";

interface AccountDashboardClientProps {
  theme: PublicPublishedTheme;
  regions: StoreRegion[];
  initialRegion?: StoreRegion;
}

export const AccountDashboardClient: React.FC<AccountDashboardClientProps> = ({
  theme,
  regions,
  initialRegion,
}) => {
  const { customer, isAuthenticated, isLoading } = useCustomer();
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Claim Order State
  const [claimOrderId, setClaimOrderId] = useState("");
  const [claimToken, setClaimToken] = useState("");
  const [claimStatus, setClaimStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login?redirect=/account";
      return;
    }

    if (isAuthenticated) {
      // Fetch customer orders and addresses
      Promise.all([
        fetch("/api/account/orders").then((r) => (r.ok ? r.json() : { orders: [] })),
        fetch("/api/account/addresses").then((r) => (r.ok ? r.json() : { addresses: [] })),
      ])
        .then(([ordersData, addrData]) => {
          setOrders(ordersData.orders || []);
          setAddresses(addrData.addresses || []);
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    }
  }, [isLoading, isAuthenticated]);

  const handleClaimOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimStatus(null);

    if (!claimOrderId) {
      setClaimStatus({ success: false, message: "Please enter an Order ID." });
      return;
    }

    setIsClaiming(true);
    try {
      const res = await fetch("/api/account/orders/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: claimOrderId.trim(),
          guest_token: claimToken.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setClaimStatus({ success: true, message: data.message || "Order linked successfully!" });
        setClaimOrderId("");
        setClaimToken("");
        // Refresh orders list
        const refreshedOrders = await fetch("/api/account/orders").then((r) => r.json());
        setOrders(refreshedOrders.orders || []);
      } else {
        setClaimStatus({ success: false, message: data.error || "Failed to link order" });
      }
    } catch {
      setClaimStatus({ success: false, message: "Failed to link order. Please try again." });
    } finally {
      setIsClaiming(false);
    }
  };

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

  if (isLoading || !customer) {
    return (
      <AccountLayout theme={theme} regions={regions} initialRegion={initialRegion} activeTab="dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 animate-spin text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs text-[var(--text-secondary)] font-medium">Loading account details...</span>
          </div>
        </div>
      </AccountLayout>
    );
  }

  const defaultShipping = addresses.find((a) => a.is_default_shipping) || addresses[0];

  return (
    <AccountLayout
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
      activeTab="dashboard"
      title={`Welcome back, ${customer.first_name || customer.email.split("@")[0]}`}
      subtitle="Manage your profile, tracked shipments, and delivery addresses from your self-hosted merchant portal."
    >
      <div className="space-y-8">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Total Orders
              </span>
              <div className="p-2 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold tracking-tight">{orders.length}</span>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Verified customer orders</p>
            </div>
          </div>

          <div className="p-5 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Saved Addresses
              </span>
              <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold tracking-tight">{addresses.length}</span>
              <p className="mt-1 text-xs text-[var(--text-muted)]">Delivery locations</p>
            </div>
          </div>

          <div className="p-5 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Account Status
              </span>
              <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active & Verified
              </span>
              <p className="mt-1 text-xs text-[var(--text-muted)] truncate">{customer.email}</p>
            </div>
          </div>
        </div>

        {/* Recent Orders Section */}
        <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-subtle)]">
            <h2 className="text-base font-bold">Recent Orders</h2>
            <a href="/account/orders" className="text-xs font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1">
              <span>View All ({orders.length})</span>
              <span>&rarr;</span>
            </a>
          </div>

          {isLoadingData ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center">
              <svg className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-sm font-semibold">No orders yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
                When you place an order, it will appear here with live fulfillment tracking.
              </p>
              <a href="/" className="inline-flex items-center px-4 py-2 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-xs font-semibold hover:opacity-90">
                Start Shopping
              </a>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {orders.slice(0, 3).map((order) => {
                const isCod = order.payment_collections?.[0]?.payments?.some(
                  (p: any) => p.provider_id === "pp_system_default"
                );
                return (
                  <div key={order.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold">#{order.display_id || order.id.slice(-8)}</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          • {new Date(order.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
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
                            Cash on Delivery
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {order.items?.length || 0} item{(order.items?.length || 0) === 1 ? "" : "s"} • {formatPrice(order.total || 0, order.currency_code)}
                      </p>
                    </div>

                    <a
                      href={`/account/orders/${order.id}`}
                      className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-semibold rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                    >
                      Track Order &rarr;
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Primary Address & Claim Order Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Default Address Preview */}
          <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
              <h2 className="text-sm font-bold">Default Delivery Address</h2>
              <a href="/account/addresses" className="text-xs font-semibold text-[var(--brand-primary)] hover:underline">
                Manage
              </a>
            </div>

            {defaultShipping ? (
              <div className="text-xs text-[var(--text-secondary)] space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  {defaultShipping.first_name} {defaultShipping.last_name}
                </p>
                <p>{defaultShipping.address_1}</p>
                {defaultShipping.address_2 && <p>{defaultShipping.address_2}</p>}
                <p>
                  {defaultShipping.city}, {defaultShipping.province} {defaultShipping.postal_code}
                </p>
                <p className="uppercase font-mono">{defaultShipping.country_code}</p>
                {defaultShipping.phone && <p className="pt-1 text-[var(--text-muted)]">{defaultShipping.phone}</p>}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-[var(--text-muted)]">
                <p>No saved addresses yet.</p>
                <a href="/account/addresses" className="mt-2 inline-block font-semibold text-[var(--brand-primary)] hover:underline">
                  + Add your first address
                </a>
              </div>
            )}
          </div>

          {/* Link Past Guest Order Card (Phase 7) */}
          <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <h2 className="text-sm font-bold mb-1">Claim a Past Guest Order</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Did you place an order before creating this account? Link it to your order history.
            </p>

            {claimStatus && (
              <div className={`p-2.5 mb-3 rounded-[var(--theme-radius)] text-xs ${
                claimStatus.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {claimStatus.message}
              </div>
            )}

            <form onSubmit={handleClaimOrder} className="space-y-2.5">
              <div>
                <input
                  type="text"
                  required
                  value={claimOrderId}
                  onChange={(e) => setClaimOrderId(e.target.value)}
                  placeholder="Order ID (e.g. order_01M6...)"
                  className="w-full px-3 py-2 text-xs rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={claimToken}
                  onChange={(e) => setClaimToken(e.target.value)}
                  placeholder="Guest access token (Optional if matching email)"
                  className="w-full px-3 py-2 text-xs rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                />
              </div>
              <button
                type="submit"
                disabled={isClaiming}
                className="w-full py-2 px-3 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {isClaiming ? "Linking Order..." : "Link Order to Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
};

