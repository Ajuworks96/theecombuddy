"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  OrdersIcon,
  SearchIcon,
  RefreshIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  EyeIcon,
} from "@/components/icons";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { TableRowSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { AdminOrder } from "@/lib/medusa-admin-client";

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "pending_cod" | "online" | "unfulfilled">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    const offset = (currentPage - 1) * pageSize;
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String(offset));

    if (activeSearch.trim()) {
      params.set("q", activeSearch.trim());
    }

    if (filterTab === "pending_cod") {
      params.set("payment_type", "pending_cod");
    } else if (filterTab === "online") {
      params.set("payment_type", "online");
    }

    try {
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load orders (HTTP ${res.status})`);
      }
      const data = await res.json();
      let ords = data.orders || [];

      if (filterTab === "unfulfilled") {
        ords = ords.filter(
          (o: AdminOrder) =>
            o.status !== "canceled" &&
            (o.fulfillment_status === "not_fulfilled" || !o.fulfillments || o.fulfillments.length === 0)
        );
      }

      setOrders(ords);
      setTotalCount(data.count || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, activeSearch, filterTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setActiveSearch(searchQuery);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Helper to determine payment info
  const getOrderPaymentInfo = (order: AdminOrder) => {
    const payCol = order.payment_collections?.[0];
    const payment = payCol?.payments?.[0];
    const isCod =
      payment?.provider_id?.includes("system") ||
      payment?.provider_id?.includes("manual") ||
      payment?.provider_id?.includes("cod");
    const isCaptured = Boolean(payment?.captured_at || payCol?.status === "completed");
    const isCanceled = order.status === "canceled" || Boolean(payment?.canceled_at);

    return {
      provider: isCod ? "Cash on Delivery" : payment?.provider_id || "Online Gateway",
      isCod,
      isCaptured,
      isCanceled,
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <OrdersIcon size={20} className="text-emerald-600" />
            Orders & Fulfillment
          </h2>
          <p className="text-xs text-slate-500">
            Real-time customer orders, fulfillment lifecycle, and COD payment tracking.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <SearchIcon size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID or email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-2xs shrink-0"
          >
            Search
          </button>
          {activeSearch && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveSearch("");
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Filter Tabs & Pagination Options */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Orders" },
            { id: "pending_cod", label: "COD Pending Collection" },
            { id: "online", label: "Online Paid" },
            { id: "unfulfilled", label: "Unfulfilled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                filterTab === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs focus:outline-hidden"
            >
              <option value="15">15 per page</option>
              <option value="30">30 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>

          <button
            onClick={fetchOrders}
            disabled={loading}
            title="Refresh orders"
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <RefreshIcon size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircleIcon size={16} className="text-red-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchOrders}
            className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 font-semibold rounded"
          >
            Retry
          </button>
        </div>
      )}

      {/* High-Density Orders Table (ColorPixel Reference 06) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B0F19] text-slate-300 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order # & Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment Method & Status</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4 text-right">Order Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={7} />
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <EmptyState
                      icon={<OrdersIcon size={24} />}
                      title="No orders found"
                      description={
                        activeSearch
                          ? `No orders matched query "${activeSearch}".`
                          : "No customer orders have been placed under this filter."
                      }
                      action={
                        activeSearch
                          ? {
                              label: "Clear Search",
                              onClick: () => {
                                setSearchQuery("");
                                setActiveSearch("");
                                setCurrentPage(1);
                              },
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const payInfo = getOrderPaymentInfo(order);
                  const customerName =
                    order.customer?.first_name || order.customer?.last_name
                      ? `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim()
                      : order.shipping_address?.first_name
                      ? `${order.shipping_address?.first_name} ${order.shipping_address?.last_name || ""}`.trim()
                      : "Guest Customer";
                  const email = order.email || order.customer?.email || "—";

                  let paymentBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Captured
                    </span>
                  );
                  if (payInfo.isCanceled) {
                    paymentBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Canceled
                      </span>
                    );
                  } else if (payInfo.isCod && !payInfo.isCaptured) {
                    paymentBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                        Pending Collection
                      </span>
                    );
                  } else if (!payInfo.isCaptured) {
                    paymentBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Awaiting Payment
                      </span>
                    );
                  }

                  let fulfillmentBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      Unfulfilled
                    </span>
                  );
                  if (order.status === "canceled") {
                    fulfillmentBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        Canceled
                      </span>
                    );
                  } else if (order.fulfillments && order.fulfillments.length > 0) {
                    const isShipped = order.fulfillments.some((f) => f.shipped_at);
                    fulfillmentBadge = isShipped ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Shipped
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Fulfilled
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    >
                      {/* Order # & Date */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-mono font-bold text-slate-900 group-hover:text-emerald-600 transition-colors"
                        >
                          #{order.display_id}
                        </Link>
                        <div className="text-[11px] text-slate-400">
                          {formatDate(order.created_at, false)}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs font-mono">
                          {email}
                        </div>
                      </td>

                      {/* Payment Method & Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700 flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              payInfo.isCod ? "bg-amber-500" : "bg-blue-500"
                            }`}
                          />
                          {payInfo.provider}
                        </div>
                        <div className="pt-0.5">{paymentBadge}</div>
                      </td>

                      {/* Fulfillment */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {fulfillmentBadge}
                      </td>

                      {/* Order Total (Original Currency) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900 font-mono text-sm">
                          {formatCurrency(order.total, order.currency_code)}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                          {order.currency_code}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge variant={order.status} size="sm">
                          {order.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        >
                          <EyeIcon size={13} />
                          <span>View Details</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * pageSize, totalCount)}
            </span>{" "}
            of <span className="font-semibold text-slate-900">{totalCount}</span> orders
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeftIcon size={14} />
            </button>
            <span className="font-medium text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
