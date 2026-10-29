"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  InventoryIcon,
  SearchIcon,
  RefreshIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  CheckIcon,
  EditIcon,
} from "@/components/icons";
import { TableRowSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";

interface LocationLevel {
  id: string;
  location_id: string;
  stocked_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
}

interface InventoryItem {
  id: string;
  sku: string;
  title: string;
  description?: string;
  stocked_quantity: number;
  reserved_quantity: number;
  location_levels?: LocationLevel[];
  created_at: string;
}

interface StockLocation {
  id: string;
  name: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Stock Adjustment Modal
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [newStockedQuantity, setNewStockedQuantity] = useState<number>(0);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch Stock Locations
  useEffect(() => {
    async function loadLocations() {
      try {
        const res = await fetch("/api/stock-locations");
        if (res.ok) {
          const data = await res.json();
          setLocations(data.stock_locations || []);
        }
      } catch (err) {
        console.warn("Failed to load stock locations:", err);
      }
    }
    loadLocations();
  }, []);

  // Fetch Inventory Items
  const fetchInventory = useCallback(async () => {
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
      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load inventory items (HTTP ${res.status})`);
      }
      const data = await res.json();
      setItems(data.inventory_items || []);
      setTotalCount(data.count || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, activeSearch]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setActiveSearch(searchQuery);
  };

  const openAdjustmentModal = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustError(null);

    const firstLevel = item.location_levels?.[0];
    const locId = firstLevel?.location_id || locations[0]?.id || "";
    setSelectedLocationId(locId);

    const initialStock = firstLevel ? firstLevel.stocked_quantity : item.stocked_quantity ?? 0;
    setNewStockedQuantity(initialStock);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || !selectedLocationId) return;

    if (newStockedQuantity < 0 || !Number.isInteger(Number(newStockedQuantity))) {
      setAdjustError("Stocked quantity must be a non-negative integer.");
      return;
    }

    setIsAdjusting(true);
    setAdjustError(null);

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: adjustingItem.id,
          locationId: selectedLocationId,
          quantity: Number(newStockedQuantity),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update inventory level");
      }

      setToastMessage(`Stock updated for ${adjustingItem.sku || adjustingItem.title} to ${newStockedQuantity} units`);
      setTimeout(() => setToastMessage(null), 4000);
      setAdjustingItem(null);
      fetchInventory();
    } catch (err: any) {
      setAdjustError(err.message || "Failed to update stock quantity.");
    } finally {
      setIsAdjusting(false);
    }
  };

  const getLocationName = (locationId: string) => {
    const loc = locations.find((l) => l.id === locationId);
    return loc ? loc.name : "India Central Warehouse";
  };

  const filteredItems = lowStockFilter
    ? items.filter((item) => {
        const available = (item.stocked_quantity ?? 0) - (item.reserved_quantity ?? 0);
        return available <= 10;
      })
    : items;

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <InventoryIcon size={20} className="text-emerald-600" />
            Stock & Inventory Control
          </h2>
          <p className="text-xs text-slate-500">
            Real-time stock levels, reservations, and location levels across {totalCount} monitored SKUs.
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
              placeholder="Search by SKU or item name..."
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckIcon size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter Tabs & Pagination Options */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLowStockFilter(false)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              !lowStockFilter
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All Stock Levels ({totalCount})
          </button>
          <button
            onClick={() => setLowStockFilter(true)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              lowStockFilter
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-amber-700 hover:bg-amber-50"
            }`}
          >
            Low Stock Alerts (≤ 10 units)
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2 py-1 text-xs focus:outline-hidden"
            >
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>

          <button
            onClick={fetchInventory}
            disabled={loading}
            title="Refresh inventory"
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
            onClick={fetchInventory}
            className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 font-semibold rounded"
          >
            Retry
          </button>
        </div>
      )}

      {/* High-Density Inventory Table (ColorPixel Reference 06) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B0F19] text-slate-300 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">SKU & Item Title</th>
                <th className="py-3 px-4">Stock Location</th>
                <th className="py-3 px-4 text-center">Stocked</th>
                <th className="py-3 px-4 text-center">Reserved</th>
                <th className="py-3 px-4 text-center">Available</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={7} />
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <EmptyState
                      icon={<InventoryIcon size={24} />}
                      title="No inventory items found"
                      description={
                        activeSearch
                          ? `No inventory items matched "${activeSearch}".`
                          : "No inventory items registered in this location."
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
                filteredItems.map((item) => {
                  const level = item.location_levels?.[0];
                  const stocked = level ? level.stocked_quantity : item.stocked_quantity ?? 0;
                  const reserved = level ? level.reserved_quantity : item.reserved_quantity ?? 0;
                  const available = level
                    ? level.available_quantity
                    : Math.max(0, stocked - reserved);
                  const locationName = level
                    ? getLocationName(level.location_id)
                    : "India Central Warehouse";

                  let statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      In Stock
                    </span>
                  );
                  if (available <= 0) {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                        Out of Stock
                      </span>
                    );
                  } else if (available <= 10) {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Low Stock ({available})
                      </span>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-mono font-semibold text-slate-900">
                          {item.sku || "NO-SKU"}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {item.title}
                        </div>
                      </td>

                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        <span className="font-medium">{locationName}</span>
                      </td>

                      <td className="py-2.5 px-4 text-center font-semibold text-slate-800">
                        {stocked}
                      </td>

                      <td className="py-2.5 px-4 text-center font-medium text-slate-500">
                        {reserved > 0 ? (
                          <span className="text-amber-600 font-semibold">{reserved}</span>
                        ) : (
                          "0"
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-center font-bold text-slate-900">
                        {available}
                      </td>

                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        {statusBadge}
                      </td>

                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openAdjustmentModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                        >
                          <EditIcon size={12} />
                          <span>Adjust Stock</span>
                        </button>
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
            of <span className="font-semibold text-slate-900">{totalCount}</span> items
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

      {/* Stock Adjustment Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustSubmit}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Adjust Physical Stock Level
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {adjustingItem.sku} • {adjustingItem.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            {adjustError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircleIcon size={14} className="shrink-0 text-red-600" />
                <span>{adjustError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warehouse Location
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden text-slate-800"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Physical Stocked Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newStockedQuantity}
                  onChange={(e) => setNewStockedQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Reservations ({adjustingItem.reserved_quantity ?? 0} units) are managed automatically by order workflows and will not be overwritten.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                disabled={isAdjusting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdjusting}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isAdjusting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckIcon size={14} />
                )}
                Save Stock Level
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
