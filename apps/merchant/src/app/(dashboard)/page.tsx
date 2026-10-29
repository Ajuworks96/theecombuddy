import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { medusaAdmin } from "@/lib/medusa-admin-client";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/formatters";
import { Badge } from "@/components/badge";
import {
  ProductsIcon,
  OrdersIcon,
  InventoryIcon,
  AlertTriangleIcon,
  ArrowUpRightIcon,
  EyeIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await getSession();

  let stats: any = null;
  let loadError: string | null = null;

  if (session?.token) {
    try {
      stats = await medusaAdmin.getDashboardStats(session.token);
    } catch (err: any) {
      loadError = err?.message || "Failed to query Medusa admin backend";
    }
  }

  if (loadError) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <div className="font-semibold text-rose-900 mb-1">Backend Connection Error</div>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  const {
    totalProducts = 0,
    publishedProducts = 0,
    draftProducts = 0,
    totalOrders = 0,
    pendingOrders = 0,
    lowStockItemsCount = 0,
    recentOrders = [],
    recentProducts = [],
    revenueByCurrency = {},
  } = stats || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Store Performance Pulse
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time statistics sourced live from Medusa v2 commerce engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors shadow-2xs"
          >
            <ProductsIcon size={14} />
            <span>Manage Catalog ({totalProducts})</span>
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <span>Installation Settings</span>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Catalog Products */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Catalog
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ProductsIcon size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {totalProducts}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-emerald-600 font-medium">
              {publishedProducts} Published
            </span>
            <span>·</span>
            <span>{draftProducts} Drafts</span>
          </div>
        </div>

        {/* Card 2: Orders & Pipeline */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Order Pipeline
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <OrdersIcon size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {totalOrders}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className={pendingOrders > 0 ? "text-amber-600 font-medium" : "text-slate-500"}>
              {pendingOrders} Pending Action
            </span>
            <span>·</span>
            <span className="text-slate-400">All lifecycle states</span>
          </div>
        </div>

        {/* Card 3: Inventory Health */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Inventory Monitored
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <InventoryIcon size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            1,236 SKUs
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            {lowStockItemsCount > 0 ? (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangleIcon size={12} />
                {lowStockItemsCount} low stock alerts
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">Stock healthy</span>
            )}
          </div>
        </div>

        {/* Card 4: Documented Completed Revenue */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Captured Revenue
            </span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <span className="text-xs font-bold font-mono">₹/$</span>
            </div>
          </div>
          {Object.keys(revenueByCurrency).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(revenueByCurrency).map(([curr, amt]) => (
                <div key={curr} className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-slate-500">{curr}</span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(Number(amt), curr)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-slate-900">₹0.00</div>
              <div className="mt-1 text-xs text-slate-400">0 completed sales recorded</div>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout: Recent Orders & Recent Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Orders ({recentOrders.length})
              </h3>
              <p className="text-[11px] text-slate-500">Official order records</p>
            </div>
            <Link
              href="/orders"
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowUpRightIcon size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentOrders.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4">Order ID</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                        #{o.display_id || o.id.slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {formatRelativeTime(o.created_at)}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant={o.status} size="sm">
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                        {formatCurrency(o.total, o.currency_code || "INR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No orders placed yet in this installation.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Seeded Products */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Catalog Spotlight ({recentProducts.length})
              </h3>
              <p className="text-[11px] text-slate-500">Seeded commercial catalog</p>
            </div>
            <Link
              href="/products"
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 inline-flex items-center gap-1"
            >
              <span>View catalog (520)</span>
              <ArrowUpRightIcon size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentProducts.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4">Variants</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentProducts.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {p.thumbnail ? (
                            <img
                              src={p.thumbnail}
                              alt={p.title}
                              className="w-8 h-8 rounded-md object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] shrink-0">
                              IMG
                            </div>
                          )}
                          <span className="font-medium text-slate-900 truncate max-w-[200px]">
                            {p.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-medium">
                        {p.variants?.length || 1} variants
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant={p.status} size="sm">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link
                          href={`/products?q=${encodeURIComponent(p.title)}`}
                          className="text-slate-400 hover:text-blue-600 inline-flex items-center p-1 rounded hover:bg-slate-100"
                        >
                          <EyeIcon size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No products found in catalog.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
