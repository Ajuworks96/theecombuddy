"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminProduct } from "@/lib/medusa-admin-client";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Badge } from "@/components/badge";
import { TableRowSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PackageIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
} from "@/components/icons";

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Pagination
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Modal / Drawer
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);

  // Selection & Bulk Deletion
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<
    | { type: "single"; product: AdminProduct }
    | { type: "selected"; count: number }
    | { type: "all"; count: number }
    | null
  >(null);
  const [confirmInputText, setConfirmInputText] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const offset = (currentPage - 1) * pageSize;
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String(offset));

    if (activeSearch.trim()) {
      params.set("q", activeSearch.trim());
    }

    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    try {
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load catalog products (HTTP ${res.status})`);
      }

      const data = await res.json();
      setProducts(data.products || []);
      setTotalCount(data.count || 0);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred loading products.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, activeSearch, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setActiveSearch(searchQuery);
  };

  // Selection handlers
  const isAllSelected =
    products.length > 0 && products.every((p) => selectedProductIds.includes(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Execute single deletion
  const executeDeleteSingle = async (product: AdminProduct) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(`Failed to delete product (HTTP ${res.status})`);
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setSelectedProductIds((prev) => prev.filter((id) => id !== product.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (selectedProduct?.id === product.id) {
        setSelectedProduct(null);
      }
      setNotification({
        type: "success",
        message: `Product "${product.title}" deleted successfully.`,
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to delete product.",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmTarget(null);
    }
  };

  // Execute bulk delete selected
  const executeDeleteSelected = async () => {
    if (selectedProductIds.length === 0) return;
    setIsDeleting(true);
    let successCount = 0;
    try {
      for (const id of selectedProductIds) {
        try {
          const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
          if (res.ok) successCount++;
        } catch (e) {
          console.error(`Failed to delete product ${id}:`, e);
        }
      }
      setNotification({
        type: "success",
        message: `Deleted ${successCount} of ${selectedProductIds.length} selected products.`,
      });
      setSelectedProductIds([]);
      fetchProducts();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Bulk deletion failed.",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmTarget(null);
    }
  };

  // Execute delete all products
  const executeDeleteAll = async () => {
    setIsDeleting(true);
    try {
      // 1. Fetch all product IDs from the backend API
      const res = await fetch(`/api/products?limit=250`);
      if (!res.ok) throw new Error("Failed to load catalog for deletion");
      const data = await res.json();
      const allProducts: AdminProduct[] = data.products || [];

      let deletedCount = 0;
      for (const p of allProducts) {
        try {
          const delRes = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
          if (delRes.ok) deletedCount++;
        } catch (e) {
          console.error(`Failed to delete product ${p.id}:`, e);
        }
      }

      setProducts([]);
      setSelectedProductIds([]);
      setTotalCount(0);
      setSelectedProduct(null);
      setNotification({
        type: "success",
        message: `Catalog cleared. All ${deletedCount} products have been permanently deleted.`,
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to delete all products.",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmTarget(null);
      setConfirmInputText("");
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircleIcon size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircleIcon size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-75 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Title & Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Catalog Management
          </h2>
          <p className="text-xs text-slate-500">
            {totalCount} products currently in store catalog.
          </p>
        </div>

        {/* Search Bar & Actions */}
        <div className="flex flex-wrap items-center gap-2 max-w-xl w-full sm:w-auto">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <SearchIcon size={14} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by title..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

          {/* Delete All Products Danger Button */}
          {totalCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setConfirmInputText("");
                setDeleteConfirmTarget({ type: "all", count: totalCount });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shrink-0"
              title="Delete all products in the catalog"
            >
              <TrashIcon size={13} className="text-rose-600" />
              <span>Delete All</span>
            </button>
          )}

          <Link
            href="/products/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <PlusIcon size={14} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Bulk Selection Action Bar (Displays when items are selected) */}
      {selectedProductIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>{selectedProductIds.length} product(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedProductIds([])}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white transition-colors"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={() =>
                setDeleteConfirmTarget({
                  type: "selected",
                  count: selectedProductIds.length,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-2xs"
            >
              <TrashIcon size={13} />
              <span>Delete Selected ({selectedProductIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs & Page Size Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1">
          {[
            { id: "all", label: "All Products" },
            { id: "published", label: "Published" },
            { id: "draft", label: "Drafts" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Page Size & Refresh */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="15">15 per page</option>
              <option value="30">30 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>

          <button
            onClick={fetchProducts}
            disabled={loading}
            title="Refresh product list"
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <RefreshIcon size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircleIcon size={16} className="text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchProducts}
            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-semibold rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B0F19] text-slate-300 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    disabled={products.length === 0}
                    aria-label="Select all products"
                    className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 bg-slate-800"
                  />
                </th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Variants</th>
                <th className="py-3 px-4">Collection / Categories</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: pageSize > 15 ? 10 : pageSize }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={7} />
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <EmptyState
                      icon={<PackageIcon size={24} />}
                      title="No products found"
                      description={
                        activeSearch
                          ? `No catalog items matched "${activeSearch}". Try adjusting your keywords.`
                          : "No products currently available in your store catalog."
                      }
                      action={
                        activeSearch
                          ? {
                              label: "Clear Search Filters",
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
                products.map((p) => {
                  const variantCount = p.variants?.length || 0;
                  const categories = p.categories || [];
                  const isSelected = selectedProductIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors group cursor-pointer ${
                        isSelected ? "bg-blue-50/50 hover:bg-blue-50/80" : "hover:bg-slate-50/80"
                      }`}
                      onClick={() => setSelectedProduct(p)}
                    >
                      {/* Selection Checkbox */}
                      <td
                        className="py-2.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(p.id)}
                          aria-label={`Select ${p.title}`}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                      </td>

                      {/* Product Thumbnail & Title */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          {p.thumbnail ? (
                            <img
                              src={p.thumbnail}
                              alt={p.title}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-[10px] shrink-0">
                              IMG
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-sm">
                              {p.title}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate">
                              /{p.handle}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <Badge variant={p.status} size="sm">
                          {p.status}
                        </Badge>
                      </td>

                      {/* Variants Count */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-700">
                          {variantCount} {variantCount === 1 ? "variant" : "variants"}
                        </span>
                        {p.variants?.[0]?.sku && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            SKU: {p.variants[0].sku}
                          </div>
                        )}
                      </td>

                      {/* Categories / Collection */}
                      <td className="py-2.5 px-4">
                        {p.collection ? (
                          <span className="inline-block text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 mr-1.5">
                            {p.collection.title}
                          </span>
                        ) : null}
                        {categories.length > 0 ? (
                          categories.map((c) => (
                            <span
                              key={c.id}
                              className="inline-block text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mr-1"
                            >
                              {c.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {formatDate(p.created_at, false)}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/products/${p.id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <EditIcon size={13} />
                            <span>Edit</span>
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(p);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <EyeIcon size={13} />
                            <span>Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmTarget({ type: "single", product: p });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title={`Delete ${p.title}`}
                          >
                            <TrashIcon size={13} />
                            <span>Delete</span>
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
            of <span className="font-semibold text-slate-900">{totalCount}</span> products
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeftIcon size={14} />
              <span>Previous</span>
            </button>

            <span className="px-2 font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <span>Next</span>
              <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Product Quick-View Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                {selectedProduct.thumbnail ? (
                  <img
                    src={selectedProduct.thumbnail}
                    alt={selectedProduct.title}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs">
                    IMG
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedProduct.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-slate-400">
                      ID: {selectedProduct.id}
                    </span>
                    <Badge variant={selectedProduct.status} size="sm">
                      {selectedProduct.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Description */}
              {selectedProduct.description && (
                <div>
                  <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                    Description
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {/* Variants Matrix */}
              <div>
                <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Variant Matrix ({selectedProduct.variants?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2 px-3">Variant Title</th>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3 text-right">Price (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedProduct.variants?.map((v) => {
                        const inrPrice = v.prices?.find(
                          (pr) => pr.currency_code?.toLowerCase() === "inr"
                        );
                        return (
                          <tr key={v.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {v.title}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500">
                              {v.sku || "—"}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              {inrPrice ? formatCurrency(inrPrice.amount, "INR") : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link
                  href={`/products/${selectedProduct.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                >
                  <EditIcon size={14} /> Edit Full Product
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const prodToDelete = selectedProduct;
                    setDeleteConfirmTarget({ type: "single", product: prodToDelete });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                >
                  <TrashIcon size={13} className="text-rose-600" />
                  <span>Delete Product</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single / Bulk / All Deletion */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-rose-50/50">
              <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <TrashIcon size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {deleteConfirmTarget.type === "single"
                    ? "Delete Product"
                    : deleteConfirmTarget.type === "selected"
                    ? `Delete ${deleteConfirmTarget.count} Selected Products`
                    : "Delete All Catalog Products"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-slate-600">
              {deleteConfirmTarget.type === "single" && (
                <p>
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-slate-900 font-semibold">
                    &ldquo;{deleteConfirmTarget.product.title}&rdquo;
                  </strong>{" "}
                  from your catalog?
                </p>
              )}

              {deleteConfirmTarget.type === "selected" && (
                <p>
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-slate-900 font-semibold">
                    {deleteConfirmTarget.count} selected products
                  </strong>{" "}
                  from your catalog?
                </p>
              )}

              {deleteConfirmTarget.type === "all" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                    <p className="font-bold">⚠️ Warning: Complete Catalog Wipe</p>
                    <p>
                      This will permanently delete all{" "}
                      <strong>{deleteConfirmTarget.count} products</strong> in your store.
                    </p>
                  </div>
                  <p className="text-slate-700">
                    To confirm, please type{" "}
                    <strong className="font-mono text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                      DELETE
                    </strong>{" "}
                    below:
                  </p>
                  <input
                    type="text"
                    value={confirmInputText}
                    onChange={(e) => setConfirmInputText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    autoFocus
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmTarget(null);
                  setConfirmInputText("");
                }}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmTarget.type === "single") {
                    executeDeleteSingle(deleteConfirmTarget.product);
                  } else if (deleteConfirmTarget.type === "selected") {
                    executeDeleteSelected();
                  } else if (deleteConfirmTarget.type === "all") {
                    executeDeleteAll();
                  }
                }}
                disabled={
                  isDeleting ||
                  (deleteConfirmTarget.type === "all" &&
                    confirmInputText.trim().toUpperCase() !== "DELETE")
                }
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50 disabled:pointer-events-none"
              >
                {isDeleting ? (
                  <>
                    <RefreshIcon size={12} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <TrashIcon size={12} />
                    <span>
                      {deleteConfirmTarget.type === "all"
                        ? "Permanently Delete All"
                        : "Confirm Delete"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
