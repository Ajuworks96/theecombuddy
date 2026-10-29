"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CustomersIcon,
  SearchIcon,
  RefreshIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  PlusIcon,
  EyeIcon,
  UserIcon,
  XIcon,
} from "@/components/icons";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/formatters";
import { TableRowSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { AdminCustomer } from "@/lib/medusa-admin-client";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "with_orders" | "registered" | "guest">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Create Customer Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const offset = (currentPage - 1) * pageSize;
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String(offset));

    if (activeSearch.trim()) {
      params.set("q", activeSearch.trim());
    }

    try {
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load customers (HTTP ${res.status})`);
      }
      const data = await res.json();
      let list = data.customers || [];

      if (filterTab === "with_orders") {
        list = list.filter((c: AdminCustomer) => (c.orders?.length || 0) > 0);
      } else if (filterTab === "registered") {
        list = list.filter((c: AdminCustomer) => c.has_account);
      } else if (filterTab === "guest") {
        list = list.filter((c: AdminCustomer) => !c.has_account);
      }

      setCustomers(list);
      setTotalCount(data.count || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, activeSearch, filterTab]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setActiveSearch(searchQuery);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      if (!createEmail.trim() || !createEmail.includes("@")) {
        throw new Error("Valid email address is required");
      }

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail.trim(),
          first_name: createFirstName.trim() || undefined,
          last_name: createLastName.trim() || undefined,
          phone: createPhone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create customer");
      }

      setSuccessNotice(`Customer ${data.customer.email} added successfully!`);
      setShowCreateModal(false);
      setCreateEmail("");
      setCreateFirstName("");
      setCreateLastName("");
      setCreatePhone("");
      await fetchCustomers();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create customer");
    } finally {
      setCreateLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16">
      {/* Success Notification */}
      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon size={16} className="text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-600 hover:text-emerald-800">
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CustomersIcon size={20} className="text-emerald-600" />
            Customers Directory
          </h2>
          <p className="text-xs text-slate-500">
            Manage registered shoppers, guest checkout accounts, shipping address books, and order history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <SearchIcon size={14} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email or phone..."
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

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs shrink-0"
          >
            <PlusIcon size={15} /> Add Customer
          </button>
        </div>
      </div>

      {/* Filter Tabs & Pagination Options */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Customers" },
            { id: "with_orders", label: "With Orders" },
            { id: "registered", label: "Registered Accounts" },
            { id: "guest", label: "Guest Shoppers" },
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
            onClick={fetchCustomers}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
            title="Refresh customers"
          >
            <RefreshIcon size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircleIcon size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchCustomers}
            className="text-xs font-semibold underline hover:no-underline text-rose-800"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-center">Account Type</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={6} />
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState
                      title="No customers found"
                      description={
                        activeSearch
                          ? `No customer records matched "${activeSearch}".`
                          : "Customer records will automatically populate as shoppers check out or register."
                      }
                    />
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const displayName =
                    c.first_name || c.last_name
                      ? `${c.first_name || ""} ${c.last_name || ""}`.trim()
                      : c.email.split("@")[0];
                  const initials = displayName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const ordersCount = c.orders?.length || 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                            {initials || "U"}
                          </div>
                          <div>
                            <Link
                              href={`/customers/${c.id}`}
                              className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors"
                            >
                              {displayName}
                            </Link>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {c.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {c.phone || "—"}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Badge variant={c.has_account ? "published" : "default"} size="sm">
                          {c.has_account ? "Registered" : "Guest"}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {ordersCount}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {formatDate(c.created_at, false)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/customers/${c.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-emerald-700 transition-colors shadow-2xs"
                        >
                          <EyeIcon size={13} /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, totalCount)}
            </span>{" "}
            of <span className="font-semibold text-slate-800">{totalCount}</span> customers
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 text-slate-700 font-medium"
            >
              <ChevronLeftIcon size={14} />
            </button>
            <span className="px-2 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 text-slate-700 font-medium"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* CREATE CUSTOMER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <UserIcon size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Add New Customer</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XIcon size={16} />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="shopper@example.com"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={createFirstName}
                    onChange={(e) => setCreateFirstName(e.target.value)}
                    placeholder="Aarav"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={createLastName}
                    onChange={(e) => setCreateLastName(e.target.value)}
                    placeholder="Sharma"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                >
                  {createLoading ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
