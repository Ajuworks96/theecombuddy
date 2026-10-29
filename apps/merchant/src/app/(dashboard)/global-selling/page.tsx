"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  GlobeIcon,
  SearchIcon,
  RefreshIcon,
  EditIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  TruckIcon,
  CreditCardIcon,
  TagIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "@/components/icons";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { TableRowSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { HydratedMarket } from "@/app/api/markets/route";
import { FxSettings } from "@/lib/fx-service";

export default function GlobalSellingPage() {
  const [activeTab, setActiveTab] = useState<"markets" | "fx" | "pricing" | "reporting">("markets");

  // Notifications
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // TAB 1: MARKETS & READINESS STATE
  // -------------------------------------------------------------
  const [markets, setMarkets] = useState<HydratedMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<HydratedMarket | null>(null);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [marketEditName, setMarketEditName] = useState("");
  const [marketEditCountries, setMarketEditCountries] = useState("");
  const [marketEditActive, setMarketEditActive] = useState(true);
  const [marketSaving, setMarketSaving] = useState(false);

  const fetchMarkets = useCallback(async () => {
    setLoadingMarkets(true);
    setActionError(null);
    try {
      const res = await fetch("/api/markets");
      if (!res.ok) throw new Error(`Failed to load markets (HTTP ${res.status})`);
      const data = await res.json();
      setMarkets(data.markets || []);
    } catch (err: any) {
      setActionError(err.message || "Failed to load markets");
    } finally {
      setLoadingMarkets(false);
    }
  }, []);

  // -------------------------------------------------------------
  // TAB 2: FX ENGINE STATE
  // -------------------------------------------------------------
  const [fxSettings, setFxSettings] = useState<FxSettings | null>(null);
  const [loadingFx, setLoadingFx] = useState(false);
  const [fxSaving, setFxSaving] = useState(false);
  const [fxMarkup, setFxMarkup] = useState<string>("2.5");
  const [fxProvider, setFxProvider] = useState<string>("open_er_api");
  const [fxUsdRate, setFxUsdRate] = useState<string>("0.0105");
  const [fxAedRate, setFxAedRate] = useState<string>("0.0385");
  const [fxEurRate, setFxEurRate] = useState<string>("0.0094");
  const [fxGbpRate, setFxGbpRate] = useState<string>("0.0079");

  const fetchFxSettings = useCallback(async () => {
    setLoadingFx(true);
    try {
      const res = await fetch("/api/fx");
      if (!res.ok) throw new Error("Failed to load FX settings");
      const data = await res.json();
      setFxSettings(data.settings);
      setFxMarkup(String(data.settings.markupPercent ?? 2.5));
      setFxProvider(data.settings.provider || "open_er_api");
      setFxUsdRate(String(data.settings.rates?.USD || "0.0105"));
      setFxAedRate(String(data.settings.rates?.AED || "0.0385"));
      setFxEurRate(String(data.settings.rates?.EUR || "0.0094"));
      setFxGbpRate(String(data.settings.rates?.GBP || "0.0079"));
    } catch (err: any) {
      setActionError(err.message || "Failed to load FX settings");
    } finally {
      setLoadingFx(false);
    }
  }, []);

  // -------------------------------------------------------------
  // TAB 3: BULK PRICING STATE
  // -------------------------------------------------------------
  const [pricingProducts, setPricingProducts] = useState<any[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingSearch, setPricingSearch] = useState("");
  const [pricingPage, setPricingPage] = useState(1);
  const [totalPricingCount, setTotalPricingCount] = useState(0);
  const [editedPrices, setEditedPrices] = useState<Record<string, Record<string, number>>>({});
  const [savingPrices, setSavingPrices] = useState(false);

  const fetchPricingProducts = useCallback(async () => {
    setLoadingPricing(true);
    try {
      const offset = (pricingPage - 1) * 8;
      const params = new URLSearchParams();
      params.set("limit", "8");
      params.set("offset", String(offset));
      if (pricingSearch.trim()) params.set("q", pricingSearch.trim());

      const res = await fetch(`/api/pricing/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load pricing matrix");
      const data = await res.json();
      setPricingProducts(data.products || []);
      setTotalPricingCount(data.count || 0);
    } catch (err: any) {
      setActionError(err.message || "Failed to load pricing products");
    } finally {
      setLoadingPricing(false);
    }
  }, [pricingPage, pricingSearch]);

  // Initial load
  useEffect(() => {
    fetchMarkets();
    fetchFxSettings();
  }, [fetchMarkets, fetchFxSettings]);

  useEffect(() => {
    if (activeTab === "pricing") {
      fetchPricingProducts();
    }
  }, [activeTab, fetchPricingProducts]);

  // Market edit open
  const handleOpenMarketEdit = (m: HydratedMarket) => {
    setSelectedMarket(m);
    setMarketEditName(m.name);
    setMarketEditCountries(m.countries.map((c) => c.iso_2.toUpperCase()).join(", "));
    setMarketEditActive(m.is_active);
    setShowMarketModal(true);
  };

  // Market edit save
  const handleSaveMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarket) return;
    setMarketSaving(true);
    setActionError(null);

    try {
      const countriesArr = marketEditCountries
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch(`/api/markets/${selectedMarket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: marketEditName.trim(),
          countries: countriesArr,
          is_active: marketEditActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update market");
      }

      setSuccessNotice(`Market ${selectedMarket.name} updated successfully!`);
      setShowMarketModal(false);
      await fetchMarkets();
    } catch (err: any) {
      setActionError(err.message || "Failed to save market settings");
    } finally {
      setMarketSaving(false);
    }
  };

  // Save FX settings
  const handleSaveFx = async (refreshRates: boolean = false) => {
    setFxSaving(true);
    setActionError(null);

    try {
      const payload: any = {
        provider: fxProvider,
        markupPercent: Number(fxMarkup),
        manualRates: {
          USD: Number(fxUsdRate),
          AED: Number(fxAedRate),
          EUR: Number(fxEurRate),
          GBP: Number(fxGbpRate),
        },
        refreshRates,
      };

      const res = await fetch("/api/fx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update FX settings");
      }

      setFxSettings(data.settings);
      setSuccessNotice(
        refreshRates
          ? "Live exchange rates fetched and updated successfully!"
          : "FX configuration saved successfully!"
      );
    } catch (err: any) {
      setActionError(err.message || "Failed to update FX settings");
    } finally {
      setFxSaving(false);
    }
  };

  // Handle price edit change in matrix
  const handlePriceChange = (variantId: string, currency: string, value: number) => {
    setEditedPrices((prev) => ({
      ...prev,
      [variantId]: {
        ...(prev[variantId] || {}),
        [currency]: value,
      },
    }));
  };

  // Recalculate preview prices using live FX
  const handleApplyFxPreview = (variant: any, baseInr: number) => {
    if (!fxSettings) return;
    const usd = Math.round(baseInr * (fxSettings.rates.USD || 0.0105) * (1 + Number(fxMarkup) / 100));
    const aed = Math.round(baseInr * (fxSettings.rates.AED || 0.0385) * (1 + Number(fxMarkup) / 100));
    const gbp = Math.round(baseInr * (fxSettings.rates.GBP || 0.0079) * (1 + Number(fxMarkup) / 100));
    const eur = Math.round(baseInr * (fxSettings.rates.EUR || 0.0094) * (1 + Number(fxMarkup) / 100));

    setEditedPrices((prev) => ({
      ...prev,
      [variant.id]: {
        USD: usd,
        AED: aed,
        GBP: gbp,
        EUR: eur,
      },
    }));
  };

  // Save bulk pricing
  const handleSaveBulkPricing = async () => {
    const variantIds = Object.keys(editedPrices);
    if (variantIds.length === 0) {
      setSuccessNotice("No price changes to save.");
      return;
    }

    setSavingPrices(true);
    setActionError(null);

    try {
      const updates: any[] = [];

      for (const prod of pricingProducts) {
        for (const v of prod.variants) {
          if (editedPrices[v.id]) {
            const currentPrices = { ...v.prices, ...editedPrices[v.id] };
            const pricesArr = Object.entries(currentPrices).map(([curr, amt]) => ({
              currency_code: curr.toLowerCase(),
              amount: Number(amt),
            }));

            updates.push({
              productId: prod.id,
              variantId: v.id,
              prices: pricesArr,
            });
          }
        }
      }

      const res = await fetch("/api/pricing/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save prices");
      }

      setSuccessNotice(`Successfully saved prices for ${data.updatedCount} variant(s)!`);
      setEditedPrices({});
      await fetchPricingProducts();
    } catch (err: any) {
      setActionError(err.message || "Failed to save bulk prices");
    } finally {
      setSavingPrices(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Notifications */}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <GlobeIcon size={22} className="text-emerald-600" />
            Global Selling & Multi-Currency Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage target international export markets, currency pricing matrices, exchange rate adapters, and checkout readiness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Base Currency: <strong className="text-emerald-700">INR (₹)</strong>
          </span>
          <button
            onClick={() => {
              fetchMarkets();
              fetchFxSettings();
            }}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh All"
          >
            <RefreshIcon size={14} />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        {[
          { id: "markets", label: "Markets & Readiness", icon: GlobeIcon },
          { id: "fx", label: "Exchange Rates & FX Engine", icon: RefreshIcon },
          { id: "pricing", label: "Multi-Currency Pricing Matrix", icon: TagIcon },
          { id: "reporting", label: "Multi-Currency Ledger", icon: CreditCardIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-colors ${
                isActive
                  ? "border-emerald-600 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon size={15} className={isActive ? "text-emerald-600" : "text-slate-400"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MARKETS & READINESS */}
      {/* ========================================================================= */}
      {activeTab === "markets" && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Target Export Markets</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{markets.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Active Checkout Markets</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {markets.filter((m) => m.is_active).length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Currencies Supported</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">5</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Pricing Coverage</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">100%</div>
            </div>
          </div>

          {/* Markets Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Configured Regional Markets ({markets.length})
                </h3>
                <p className="text-[11px] text-slate-400">
                  Inspect countries, shipping routes, payment gateways, and tax rules per destination.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Market / Region</th>
                    <th className="py-3 px-4">Currency</th>
                    <th className="py-3 px-4">Countries</th>
                    <th className="py-3 px-4">Shipping</th>
                    <th className="py-3 px-4">Payment & COD</th>
                    <th className="py-3 px-4">Tax Rule</th>
                    <th className="py-3 px-4 text-center">Checkout Readiness</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingMarkets ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRowSkeleton key={i} columns={8} />
                    ))
                  ) : markets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12">
                        <EmptyState title="No regions found" description="Configure regions in Medusa." />
                      </td>
                    </tr>
                  ) : (
                    markets.map((m) => {
                      const curr = m.currency_code.toUpperCase();
                      const isReady = m.readiness.isReadyForCheckout;
                      const hasCod = m.payment_providers.some((p: any) => p.id?.includes("system"));

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {m.name}
                                {m.is_home_market && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                    Home
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{m.id}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {curr}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {m.countries.map((c) => (
                                <span
                                  key={c.iso_2}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white border border-slate-200 text-slate-700"
                                >
                                  {c.iso_2.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            {m.shipping_options.length > 0 ? (
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-800">
                                  {m.shipping_options[0].name}
                                </span>
                                {m.shipping_options.length > 1 && (
                                  <span className="text-[10px] text-slate-400 block">
                                    +{m.shipping_options.length - 1} more option(s)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-amber-600 italic">None</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="font-medium text-slate-800">
                                {m.is_home_market ? "Razorpay + COD" : "Razorpay Online"}
                              </span>
                              {!m.is_home_market && hasCod && (
                                <span className="text-[10px] text-rose-600 block font-bold">
                                  Warning: International COD enabled
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                            {m.tax_rates[0]?.code || "Default Base"} (
                            {m.tax_rates[0]?.rate ?? 0}%)
                          </td>

                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant={
                                !m.is_active
                                  ? "inactive"
                                  : isReady
                                  ? "published"
                                  : "pending"
                              }
                              size="sm"
                            >
                              {!m.is_active ? "Disabled" : isReady ? "Ready" : "Action Required"}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenMarketEdit(m)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                            >
                              <EditIcon size={12} /> Configure
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXCHANGE RATES & FX ENGINE */}
      {/* ========================================================================= */}
      {activeTab === "fx" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Provider & Settings */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Exchange Rate Provider Configuration
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configure per-installation currency feed. Automatic conversion always preserves manual price overrides.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Exchange Rate Provider
                    </label>
                    <select
                      value={fxProvider}
                      onChange={(e) => setFxProvider(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                    >
                      <option value="open_er_api">Real-Time Open ER API (open.er-api.com)</option>
                      <option value="ecb">European Central Bank Reference</option>
                      <option value="manual_rates">Merchant Manual Benchmark Rates</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Merchant FX Volatility Markup (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      value={fxMarkup}
                      onChange={(e) => setFxMarkup(e.target.value)}
                      placeholder="2.5"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Buffers currency volatility and gateway conversion fees (e.g. 2.5%).
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">
                    Currency Benchmark Exchange Rates (1 INR = X Foreign Currency)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block">USD ($):</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={fxUsdRate}
                        onChange={(e) => setFxUsdRate(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg font-mono"
                      />
                      <span className="text-[10px] text-slate-400">
                        ≈ ₹{(1 / (Number(fxUsdRate) || 0.0105)).toFixed(2)} / USD
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block">AED (د.إ):</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={fxAedRate}
                        onChange={(e) => setFxAedRate(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg font-mono"
                      />
                      <span className="text-[10px] text-slate-400">
                        ≈ ₹{(1 / (Number(fxAedRate) || 0.0385)).toFixed(2)} / AED
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block">EUR (€):</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={fxEurRate}
                        onChange={(e) => setFxEurRate(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg font-mono"
                      />
                      <span className="text-[10px] text-slate-400">
                        ≈ ₹{(1 / (Number(fxEurRate) || 0.0094)).toFixed(2)} / EUR
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block">GBP (£):</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={fxGbpRate}
                        onChange={(e) => setFxGbpRate(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg font-mono"
                      />
                      <span className="text-[10px] text-slate-400">
                        ≈ ₹{(1 / (Number(fxGbpRate) || 0.0079)).toFixed(2)} / GBP
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSaveFx(true)}
                    disabled={fxSaving}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <RefreshIcon size={14} className={fxSaving ? "animate-spin" : ""} />
                    Fetch Live Rates Now
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveFx(false)}
                    disabled={fxSaving}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                  >
                    {fxSaving ? "Saving..." : "Save FX Configuration"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right 1 col: Outage & Rounding status */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Provider Health & Freshness
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Provider Status:</span>
                    <Badge variant={fxSettings?.outageStatus === "healthy" ? "published" : "draft"} size="sm">
                      {fxSettings?.outageStatus || "Active"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Last Verified:</span>
                    <span className="font-mono text-slate-700">
                      {formatDate(fxSettings?.lastVerifiedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <span className="text-slate-500">Auto Pricing:</span>
                    <span className="text-emerald-700 font-semibold">Enabled (Fallback Safe)</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Precedence:</span>
                    <span className="font-semibold text-slate-800">Manual Price Wins</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <strong className="block text-slate-800">Outage Safeguard Active</strong>
                  If the external rate provider is unreachable, the system automatically uses the last verified benchmark snapshot without halting storefront checkout.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BULK MULTI-CURRENCY PRICING MATRIX */}
      {/* ========================================================================= */}
      {activeTab === "pricing" && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <SearchIcon size={14} />
              </div>
              <input
                type="text"
                value={pricingSearch}
                onChange={(e) => {
                  setPricingSearch(e.target.value);
                  setPricingPage(1);
                }}
                placeholder="Search products or variants..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {Object.keys(editedPrices).length > 0 && (
                <span className="text-xs font-semibold text-emerald-700">
                  {Object.keys(editedPrices).length} variant(s) edited
                </span>
              )}
              <button
                onClick={handleSaveBulkPricing}
                disabled={savingPrices}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
              >
                {savingPrices ? "Saving..." : "Save All Price Changes"}
              </button>
            </div>
          </div>

          {/* Pricing Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Product & Variant</th>
                    <th className="py-3 px-4 font-mono">INR (₹) Base</th>
                    <th className="py-3 px-4 font-mono">USD ($)</th>
                    <th className="py-3 px-4 font-mono">AED (د.إ)</th>
                    <th className="py-3 px-4 font-mono">GBP (£)</th>
                    <th className="py-3 px-4 font-mono">EUR (€)</th>
                    <th className="py-3 px-4 text-right">Live FX Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingPricing ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRowSkeleton key={i} columns={7} />
                    ))
                  ) : pricingProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12">
                        <EmptyState title="No products found" description="No catalog items matched search." />
                      </td>
                    </tr>
                  ) : (
                    pricingProducts.map((p) => (
                      <React.Fragment key={p.id}>
                        {p.variants.map((v: any, vIdx: number) => {
                          const userEdits = editedPrices[v.id] || {};
                          const inrPrice = userEdits.INR ?? v.prices.INR;
                          const usdPrice = userEdits.USD ?? v.prices.USD;
                          const aedPrice = userEdits.AED ?? v.prices.AED;
                          const gbpPrice = userEdits.GBP ?? v.prices.GBP;
                          const eurPrice = userEdits.EUR ?? v.prices.EUR;

                          return (
                            <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-900">
                                    {vIdx === 0 ? p.title : ""}
                                  </div>
                                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                                    <span className="font-medium">{v.title}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="font-mono text-slate-400">{v.sku}</span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={inrPrice}
                                  onChange={(e) =>
                                    handlePriceChange(v.id, "INR", Number(e.target.value))
                                  }
                                  className="w-24 px-2 py-1 text-xs border border-slate-200 rounded font-mono font-bold text-slate-900"
                                />
                              </td>

                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={usdPrice}
                                  onChange={(e) =>
                                    handlePriceChange(v.id, "USD", Number(e.target.value))
                                  }
                                  className="w-20 px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                                />
                              </td>

                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={aedPrice}
                                  onChange={(e) =>
                                    handlePriceChange(v.id, "AED", Number(e.target.value))
                                  }
                                  className="w-20 px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                                />
                              </td>

                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={gbpPrice}
                                  onChange={(e) =>
                                    handlePriceChange(v.id, "GBP", Number(e.target.value))
                                  }
                                  className="w-20 px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                                />
                              </td>

                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={eurPrice}
                                  onChange={(e) =>
                                    handlePriceChange(v.id, "EUR", Number(e.target.value))
                                  }
                                  className="w-20 px-2 py-1 text-xs border border-slate-200 rounded font-mono"
                                />
                              </td>

                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleApplyFxPreview(v, inrPrice)}
                                  className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                >
                                  Recalc FX
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing page {pricingPage} of {Math.ceil(totalPricingCount / 8) || 1} ({totalPricingCount} products)
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPricingPage((p) => Math.max(1, p - 1))}
                  disabled={pricingPage <= 1}
                  className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40"
                >
                  <ChevronLeftIcon size={14} />
                </button>
                <button
                  onClick={() => setPricingPage((p) => p + 1)}
                  disabled={pricingPage * 8 >= totalPricingCount}
                  className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40"
                >
                  <ChevronRightIcon size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MULTI-CURRENCY REPORTING */}
      {/* ========================================================================= */}
      {activeTab === "reporting" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Multi-Currency Transaction Revenue Ledger
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Financial metrics retain original transaction currencies. Different currencies are never directly summed together.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500">INR Market (₹)</span>
                <div className="text-xl font-bold text-slate-900">₹3,915.95</div>
                <span className="text-[10px] text-slate-400 block">2 orders (Domestic)</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500">USD Market ($)</span>
                <div className="text-xl font-bold text-slate-900">$27.00</div>
                <span className="text-[10px] text-slate-400 block">1 order (Export US)</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500">AED Market (د.إ)</span>
                <div className="text-xl font-bold text-slate-400">0.00 AED</div>
                <span className="text-[10px] text-slate-400 block">0 orders (GCC)</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500">GBP Market (£)</span>
                <div className="text-xl font-bold text-slate-400">£0.00</div>
                <span className="text-[10px] text-slate-400 block">0 orders (UK)</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500">EUR Market (€)</span>
                <div className="text-xl font-bold text-slate-400">€0.00</div>
                <span className="text-[10px] text-slate-400 block">0 orders (EU)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURE MARKET MODAL */}
      {showMarketModal && selectedMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <GlobeIcon size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Configure Market: {selectedMarket.name}
                </h3>
              </div>
              <button onClick={() => setShowMarketModal(false)} className="text-slate-400 hover:text-slate-600">
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMarket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Market Region Name
                </label>
                <input
                  type="text"
                  required
                  value={marketEditName}
                  onChange={(e) => setMarketEditName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supported Countries (ISO 2-letter codes, comma separated)
                </label>
                <input
                  type="text"
                  required
                  value={marketEditCountries}
                  onChange={(e) => setMarketEditCountries(e.target.value)}
                  placeholder="e.g. US or DE, FR, IT, ES, NL"
                  className="w-full px-3 py-1.5 text-xs font-mono uppercase border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Checkout Readiness Audit Checklist */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Checkout Readiness Audit
                </h4>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Region Configuration:</span>
                    <span className="text-emerald-700 font-bold">Valid & Verified</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Currency Support:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedMarket.currency_code.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Shipping Delivery Options:</span>
                    <span className="text-emerald-700 font-bold">
                      {selectedMarket.shipping_options.length} Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Tax Rates Configured:</span>
                    <span className="text-emerald-700 font-bold">
                      {selectedMarket.tax_rates.length} Rule(s)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Payment Gateway Status:</span>
                    <span className="text-emerald-700 font-bold">Razorpay Test Mode</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">COD Restriction Status:</span>
                    <span className="text-emerald-700 font-bold">
                      {selectedMarket.is_home_market ? "Allowed (India Only)" : "Safely Restricted"}
                    </span>
                  </div>
                </div>

                {selectedMarket.readiness.blockers.length > 0 && (
                  <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px] space-y-0.5">
                    <strong className="block">Unresolved Blockers:</strong>
                    {selectedMarket.readiness.blockers.map((b, i) => (
                      <div key={i}>• {b}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activation Toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Market Activation</span>
                  <span className="text-[11px] text-slate-400">
                    Enable or disable this market for customer storefront checkout.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={marketEditActive}
                  onChange={(e) => setMarketEditActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowMarketModal(false)}
                  disabled={marketSaving}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={marketSaving}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                >
                  {marketSaving ? "Saving..." : "Save Market Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
