"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  DiscountsIcon,
  SearchIcon,
  RefreshIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CopyIcon,
  TagIcon,
  XIcon,
} from "@/components/icons";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { TableRowSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { AdminPromotion } from "@/lib/medusa-admin-client";

export default function DiscountsPage() {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "inactive" | "percentage" | "fixed">("all");

  // Notifications
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create Promotion Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCode, setCreateCode] = useState("");
  const [createType, setCreateType] = useState<"percentage" | "fixed" | "free_shipping">("percentage");
  const [createValue, setCreateValue] = useState<string>("10");
  const [createCurrency, setCreateCurrency] = useState("inr");
  const [createStatus, setCreateStatus] = useState<"active" | "inactive">("active");
  const [createLoading, setCreateLoading] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<AdminPromotion | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Copied indicator
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/promotions?limit=100");
      if (!res.ok) {
        throw new Error(`Failed to load promotions (HTTP ${res.status})`);
      }
      const data = await res.json();
      let list: AdminPromotion[] = data.promotions || [];

      // Client search filtering
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        list = list.filter((p) => p.code.toLowerCase().includes(q));
      }

      // Filter tabs
      if (filterTab === "active") {
        list = list.filter((p) => p.status === "active");
      } else if (filterTab === "inactive") {
        list = list.filter((p) => p.status === "inactive");
      } else if (filterTab === "percentage") {
        list = list.filter((p) => p.application_method?.type === "percentage" && p.application_method?.target_type !== "shipping_methods");
      } else if (filterTab === "fixed") {
        list = list.filter((p) => p.application_method?.type === "fixed");
      }

      setPromotions(list);
      setTotalCount(data.count || list.length);
    } catch (err: any) {
      setError(err.message || "Failed to load promotions.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterTab]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (promo: AdminPromotion) => {
    setActionError(null);
    setSuccessNotice(null);
    const newStatus = promo.status === "active" ? "inactive" : "active";

    try {
      const res = await fetch(`/api/promotions/${promo.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update promotion status");
      }
      setSuccessNotice(`Promotion ${promo.code} is now ${newStatus}.`);
      await fetchPromotions();
    } catch (err: any) {
      setActionError(err.message || "Failed to toggle promotion status");
    }
  };

  const handleCreatePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setActionError(null);

    try {
      const payload: any = {
        code: createCode.trim().toUpperCase(),
        type: createType,
        value: createType === "free_shipping" ? 100 : Number(createValue),
        currency_code: createCurrency.toLowerCase(),
        status: createStatus,
      };

      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create promotion");
      }

      setSuccessNotice(`Promotion coupon ${data.promotion.code} created successfully!`);
      setShowCreateModal(false);
      setCreateCode("");
      setCreateValue("10");
      await fetchPromotions();
    } catch (err: any) {
      setActionError(err.message || "Failed to create promotion");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeletePromotion = async () => {
    if (!promotionToDelete) return;
    setDeleteLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/promotions/${promotionToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete promotion");
      }

      setSuccessNotice(`Promotion ${promotionToDelete.code} deleted.`);
      setShowDeleteModal(false);
      setPromotionToDelete(null);
      await fetchPromotions();
    } catch (err: any) {
      setActionError(err.message || "Failed to delete promotion");
    } finally {
      setDeleteLoading(false);
    }
  };

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

      {/* Action Error Notification */}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircleIcon size={16} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-800">
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DiscountsIcon size={20} className="text-emerald-600" />
            Discounts & Promotions
          </h2>
          <p className="text-xs text-slate-500">
            Manage coupon codes, percentage reductions, fixed amount discounts, and free shipping incentives.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div className="relative w-48 sm:w-60">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <SearchIcon size={14} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coupon code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs shrink-0"
          >
            <PlusIcon size={15} /> Create Promotion
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Promotions" },
            { id: "active", label: "Active" },
            { id: "inactive", label: "Inactive" },
            { id: "percentage", label: "Percentage %" },
            { id: "fixed", label: "Fixed Amount" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
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

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{promotions.length} promotions</span>
          <button
            onClick={fetchPromotions}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
            title="Refresh"
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
            onClick={fetchPromotions}
            className="text-xs font-semibold underline hover:no-underline text-rose-800"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Promotions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Discount Value</th>
                <th className="py-3 px-4">Applicable Scope</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={7} />
                ))
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <EmptyState
                      title="No promotions found"
                      description={
                        searchQuery
                          ? `No promotion code matched "${searchQuery}".`
                          : "Create percentage discounts, fixed coupons or free shipping offers to incentivize customer checkout."
                      }
                    />
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => {
                  const app = promo.application_method;
                  const isFreeShip = app?.target_type === "shipping_methods";
                  const isFixed = app?.type === "fixed";
                  const isPercentage = app?.type === "percentage" && !isFreeShip;

                  const displayValue = isFreeShip
                    ? "Free Shipping"
                    : isFixed
                    ? formatCurrency(app?.value, (app?.currency_code || "inr").toUpperCase())
                    : `${app?.value}% OFF`;

                  const displayScope = isFreeShip
                    ? "Shipping Rate"
                    : isFixed
                    ? `Entire Order (${(app?.currency_code || "INR").toUpperCase()})`
                    : "Eligible Items";

                  return (
                    <tr
                      key={promo.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                            {promo.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(promo.code)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Copy coupon code"
                          >
                            <CopyIcon size={12} />
                          </button>
                          {copiedCode === promo.code && (
                            <span className="text-[10px] text-emerald-600 font-medium">Copied!</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            isFreeShip
                              ? "proposed"
                              : isPercentage
                              ? "published"
                              : "default"
                          }
                          size="sm"
                        >
                          {isFreeShip
                            ? "Free Shipping"
                            : isPercentage
                            ? "Percentage"
                            : "Fixed Amount"}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {displayValue}
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {displayScope}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={promo.status === "active" ? "active" : "inactive"}
                          size="sm"
                        >
                          {promo.status}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {formatDate(promo.created_at, false)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(promo)}
                            className={`px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                              promo.status === "active"
                                ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                                : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {promo.status === "active" ? "Deactivate" : "Activate"}
                          </button>

                          <button
                            onClick={() => {
                              setPromotionToDelete(promo);
                              setShowDeleteModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Delete promotion"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PROMOTION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <TagIcon size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Create Promotion Coupon</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePromotion} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Coupon Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WELCOME15, DIWALI250, FREESHIP"
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold uppercase border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Promotion Type
                </label>
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                >
                  <option value="percentage">Percentage Discount (% off items)</option>
                  <option value="fixed">Fixed Amount Discount (Fixed sum off order)</option>
                  <option value="free_shipping">Free Shipping (100% off delivery fee)</option>
                </select>
              </div>

              {createType !== "free_shipping" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {createType === "percentage" ? "Percentage (%)" : "Discount Amount"}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={createType === "percentage" ? 100 : undefined}
                      value={createValue}
                      onChange={(e) => setCreateValue(e.target.value)}
                      placeholder={createType === "percentage" ? "15" : "250"}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={createCurrency}
                      onChange={(e) => setCreateCurrency(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                    >
                      <option value="inr">INR (₹)</option>
                      <option value="usd">USD ($)</option>
                      <option value="aed">AED (د.إ)</option>
                      <option value="gbp">GBP (£)</option>
                      <option value="eur">EUR (€)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Status
                </label>
                <select
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                >
                  <option value="active">Active (Usable immediately at checkout)</option>
                  <option value="inactive">Inactive (Disabled)</option>
                </select>
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
                  {createLoading ? "Creating..." : "Save Promotion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && promotionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <TrashIcon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Promotion?</h3>
                <p className="text-xs text-slate-500 font-mono">{promotionToDelete.code}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete coupon <strong>{promotionToDelete.code}</strong>? Shoppers will no longer be able to apply this discount.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPromotionToDelete(null);
                }}
                disabled={deleteLoading}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePromotion}
                disabled={deleteLoading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs"
              >
                {deleteLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
