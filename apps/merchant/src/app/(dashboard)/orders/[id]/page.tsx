"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  OrdersIcon,
  PackageIcon,
  CreditCardIcon,
  TruckIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  UserIcon,
  MapPinIcon,
  MailIcon,
  PhoneIcon,
  CopyIcon,
  RefreshIcon,
  XIcon,
} from "@/components/icons";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { AdminOrder } from "@/lib/medusa-admin-client";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [showCodModal, setShowCodModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [selectedFulfillmentId, setSelectedFulfillmentId] = useState<string | null>(null);

  // Fulfillment form state
  const [fulfillQuantities, setFulfillQuantities] = useState<Record<string, number>>({});
  // Shipment form state
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrierUrl, setCarrierUrl] = useState("");

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to load order (HTTP ${res.status})`);
      }
      const data = await res.json();
      setOrder(data.order);

      // Pre-fill fulfill quantities with remaining unfulfilled items
      const initialQtys: Record<string, number> = {};
      (data.order?.items || []).forEach((item: any) => {
        const fulfilled = item.detail?.fulfilled_quantity || 0;
        const remaining = Math.max(0, item.quantity - fulfilled);
        if (remaining > 0) {
          initialQtys[item.id] = remaining;
        }
      });
      setFulfillQuantities(initialQtys);
    } catch (err: any) {
      setError(err.message || "Failed to load order details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Handle COD confirmation / payment capture
  const handleConfirmCod = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/capture`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm payment collection");
      }
      setActionSuccess(data.message || "Payment confirmed successfully!");
      setShowCodModal(false);
      await fetchOrder();
    } catch (err: any) {
      setActionError(err.message || "Failed to confirm payment");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Order Cancellation
  const handleCancelOrder = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel order");
      }
      setActionSuccess(data.message || "Order canceled successfully.");
      setShowCancelModal(false);
      await fetchOrder();
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel order");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Fulfillment Creation
  const handleCreateFulfillment = async () => {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const itemsToFulfill = Object.entries(fulfillQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([itemId, qty]) => ({ id: itemId, quantity: qty }));

      if (itemsToFulfill.length === 0) {
        throw new Error("Please specify at least 1 item to fulfill");
      }

      const res = await fetch(`/api/orders/${order.id}/fulfillments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToFulfill }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create fulfillment");
      }
      setActionSuccess("Fulfillment created successfully!");
      setShowFulfillModal(false);
      await fetchOrder();
    } catch (err: any) {
      setActionError(err.message || "Failed to create fulfillment");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Mark Shipped / Add Tracking
  const handleRecordShipment = async () => {
    if (!order || !selectedFulfillmentId) return;
    if (!trackingNumber.trim()) {
      setActionError("Tracking number is required");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(
        `/api/orders/${order.id}/fulfillments/${selectedFulfillmentId}/shipments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tracking_number: trackingNumber.trim(),
            tracking_url: carrierUrl.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record shipment");
      }
      setActionSuccess("Shipment tracking recorded successfully!");
      setShowShipModal(false);
      setTrackingNumber("");
      setCarrierUrl("");
      setSelectedFulfillmentId(null);
      await fetchOrder();
    } catch (err: any) {
      setActionError(err.message || "Failed to record shipment");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Loading order details...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto py-16 space-y-4 text-center">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-center gap-2">
          <AlertCircleIcon size={16} className="text-rose-600 shrink-0" />
          <span>{error || "Order not found"}</span>
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <ArrowLeftIcon size={14} /> Back to Orders
        </Link>
      </div>
    );
  }

  // Derive payment details
  const payCol = order.payment_collections?.[0];
  const payment = payCol?.payments?.[0];
  const isCod =
    payment?.provider_id?.includes("system") ||
    payment?.provider_id?.includes("manual") ||
    payment?.provider_id?.includes("cod");
  const isCaptured = Boolean(payment?.captured_at || payCol?.status === "completed");
  const isCanceled = order.status === "canceled" || Boolean(payment?.canceled_at);

  // Currency resolution: order.currency_code -> payment.currency_code -> region/country fallback
  const currency = (
    order.currency_code ||
    payment?.currency_code ||
    (order.shipping_address?.country_code?.toLowerCase() === "in" ? "inr" : "usd")
  ).toUpperCase();

  // Determine unfulfilled items
  const items = order.items || [];
  const hasUnfulfilledItems = items.some((item: any) => {
    const fulfilled = item.detail?.fulfilled_quantity || 0;
    return item.quantity > fulfilled;
  });

  const fulfillments = order.fulfillments || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon size={16} className="text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
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

      {/* Canceled Notice Banner */}
      {isCanceled && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-3">
          <AlertCircleIcon size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Order Canceled</h4>
            <p className="text-rose-700 mt-0.5">
              This order was canceled. Inventory reservations have been reversed and returned to available stock.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to orders"
          >
            <ArrowLeftIcon size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Order #{order.display_id || order.id.slice(-8)}
              </h1>
              <Badge variant={order.status}>{order.status}</Badge>
              <Badge variant={isCaptured ? "captured" : isCanceled ? "canceled" : "pending"}>
                {isCaptured ? "Payment Captured" : isCanceled ? "Payment Canceled" : "Payment Awaiting"}
              </Badge>
              <Badge variant={order.fulfillment_status || "not_fulfilled"}>
                {order.fulfillment_status || "not_fulfilled"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              ID: {order.id} • Placed {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchOrder}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshIcon size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Main Grid: Left 2 Cols (Items & Fulfillment), Right 1 Col (Totals, Payment, Customer, Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ordered Line Items Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageIcon size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Items Ordered ({items.length})
                </h3>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const fulfilled = item.detail?.fulfilled_quantity || 0;
                const remaining = Math.max(0, item.quantity - fulfilled);
                const taxLine = item.tax_lines?.[0];

                return (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <PackageIcon size={20} className="text-slate-300" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                        {item.variant_title && (
                          <p className="text-[11px] text-slate-500">Variant: {item.variant_title}</p>
                        )}
                        {item.variant_sku && (
                          <p className="text-[11px] font-mono text-slate-400">SKU: {item.variant_sku}</p>
                        )}
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[11px] text-slate-500">
                            Qty: <strong className="text-slate-800">{item.quantity}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] text-slate-500">
                            Fulfilled: <strong className="text-emerald-700">{fulfilled}</strong>
                          </span>
                          {remaining > 0 && !isCanceled && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] text-amber-600 font-medium">
                                Unfulfilled: {remaining}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right space-y-1 shrink-0 pl-15 sm:pl-0">
                      <div className="text-xs font-bold text-slate-900">
                        {formatCurrency(item.total ?? item.unit_price * item.quantity, currency)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatCurrency(item.unit_price, currency)} × {item.quantity}
                      </div>
                      {taxLine && (
                        <div className="text-[10px] text-slate-500">
                          Incl. {taxLine.code || "GST"} ({taxLine.rate}%)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fulfillment & Shipping Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TruckIcon size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Fulfillments & Shipments
                </h3>
              </div>

              {!isCanceled && hasUnfulfilledItems && (
                <button
                  onClick={() => setShowFulfillModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                >
                  Create Fulfillment
                </button>
              )}
            </div>

            <div className="p-5 space-y-4">
              {fulfillments.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl space-y-2">
                  <TruckIcon size={24} className="mx-auto text-slate-300" />
                  <p className="text-xs font-medium text-slate-600">No fulfillments created yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Fulfill ordered items once packaged to record shipment and track delivery.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fulfillments.map((ful, idx) => {
                    const isShipped = Boolean(ful.shipped_at);
                    const trackingNums = ful.tracking_numbers || [];

                    return (
                      <div
                        key={ful.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 font-mono">
                              Fulfillment #{idx + 1}
                            </span>
                            <Badge variant={isShipped ? "shipped" : "fulfilled"}>
                              {isShipped ? "Shipped" : "Packaged"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isShipped && !isCanceled && (
                              <button
                                onClick={() => {
                                  setSelectedFulfillmentId(ful.id);
                                  setShowShipModal(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                Add Tracking / Mark Shipped
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[11px]">Provider:</span>
                            <span className="font-medium text-slate-800">
                              {ful.provider_id || "Manual Dispatch"}
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[11px]">Tracking Numbers:</span>
                            {trackingNums.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {trackingNums.map((tn) => (
                                  <span
                                    key={tn}
                                    className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px] text-slate-700"
                                  >
                                    {tn}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">None assigned yet</span>
                            )}
                          </div>

                          {ful.items && ful.items.length > 0 && (
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 block text-[11px] mb-1">Items in this package:</span>
                              <div className="flex flex-wrap gap-2">
                                {ful.items.map((fi) => {
                                  const matchingItem = items.find((it) => it.id === fi.item_id);
                                  return (
                                    <span
                                      key={fi.id}
                                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700"
                                    >
                                      {matchingItem?.title || "Item"} × <strong>{fi.quantity}</strong>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Totals, Payment, Customer, Actions) */}
        <div className="space-y-6">
          {/* Payment & COD Cash Collection Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCardIcon size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Payment Status
                </h3>
              </div>
              <Badge variant={isCaptured ? "captured" : isCanceled ? "canceled" : "pending"}>
                {isCaptured ? "Captured" : isCanceled ? "Canceled" : "Awaiting"}
              </Badge>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-semibold text-slate-900">
                    {isCod ? "Cash on Delivery (COD)" : payment?.provider_id || "Online Gateway"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Payment Collection:</span>
                  <span className="font-mono text-slate-700">{payCol?.id || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Authorized:</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(payCol?.authorized_amount ?? payCol?.amount, currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Captured / Collected:</span>
                  <span className={`font-semibold ${isCaptured ? "text-emerald-700" : "text-amber-600"}`}>
                    {formatCurrency(payCol?.captured_amount ?? (isCaptured ? payCol?.amount : 0), currency)}
                  </span>
                </div>
              </div>

              {/* COD Action Callout */}
              {isCod && !isCaptured && !isCanceled && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircleIcon size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">Pending COD Collection</h4>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Cash has not been confirmed collected. Confirm cash collection once delivery agent confirms receipt.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCodModal(true)}
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                  >
                    Confirm Cash Collection
                  </button>
                </div>
              )}

              {isCaptured && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircleIcon size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    Funds confirmed collected and reconciled in full.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Financial Totals
              </h3>
            </div>

            <div className="p-5 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Items Subtotal</span>
                <span>{formatCurrency(order.subtotal ?? (order.total - (order.tax_total || 0) - (order.shipping_total || 0)), currency)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Shipping</span>
                <span>{formatCurrency(order.shipping_total ?? 0, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>GST / Taxes</span>
                <span>{formatCurrency(order.tax_total ?? 0, currency)}</span>
              </div>
              {Boolean(order.discount_total && order.discount_total > 0) && (
                <div className="flex justify-between items-center text-emerald-700">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount_total, currency)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900">Total</span>
                <span className="text-base font-extrabold text-slate-900">
                  {formatCurrency(order.total, currency)}
                </span>
              </div>

              {order.summary && (
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-400">
                  <span>Reconciliation Difference:</span>
                  <span>{formatCurrency(order.summary.pending_difference, currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer & Address Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Customer Information
                </h3>
              </div>
              {order.customer?.id && (
                <Link
                  href={`/customers/${order.customer.id}`}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  View Profile →
                </Link>
              )}
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-slate-900">
                  {order.customer?.first_name || order.shipping_address?.first_name || ""}{" "}
                  {order.customer?.last_name || order.shipping_address?.last_name || "Guest Customer"}
                </div>
                {(order.customer?.email || order.email) && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MailIcon size={13} className="text-slate-400" />
                    <span>{order.customer?.email || order.email}</span>
                  </div>
                )}
                {(order.customer?.phone || order.shipping_address?.phone) && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <PhoneIcon size={13} className="text-slate-400" />
                    <span>{order.customer?.phone || order.shipping_address?.phone}</span>
                  </div>
                )}
              </div>

              {order.shipping_address && (
                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <MapPinIcon size={13} className="text-slate-400" /> Shipping Destination
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {order.shipping_address.address_1}
                    {order.shipping_address.address_2 && `, ${order.shipping_address.address_2}`}
                    <br />
                    {order.shipping_address.city}, {order.shipping_address.province}{" "}
                    {order.shipping_address.postal_code}
                    <br />
                    {order.shipping_address.country_code?.toUpperCase()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Actions */}
          {!isCanceled && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Order Operations
              </h4>
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors"
              >
                Cancel Order & Revert Stock
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM COD COLLECTION MODAL */}
      {showCodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircleIcon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirm Cash Collection</h3>
                <p className="text-xs text-slate-500">Record cash received for Order #{order.display_id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Confirm that <strong>{formatCurrency(order.total, currency)}</strong> has been collected in full from the customer. This will capture the payment in Medusa and reconcile the order receivable.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCodModal(false)}
                disabled={actionLoading}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCod}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
              >
                {actionLoading ? "Processing..." : "Confirm & Mark Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL ORDER MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertCircleIcon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cancel Order #{order.display_id}</h3>
                <p className="text-xs text-slate-500">Permanent action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this order? This will cancel the order in Medusa, release all inventory reservations back to available stock, and void pending payments.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={actionLoading}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
              >
                {actionLoading ? "Canceling..." : "Confirm Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE FULFILLMENT MODAL */}
      {showFulfillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <TruckIcon size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Create Fulfillment</h3>
              </div>
              <button onClick={() => setShowFulfillModal(false)} className="text-slate-400 hover:text-slate-600">
                <XIcon size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select items and quantities to include in this shipment package:
            </p>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto space-y-2">
              {items.map((item) => {
                const fulfilled = item.detail?.fulfilled_quantity || 0;
                const remaining = Math.max(0, item.quantity - fulfilled);
                if (remaining <= 0) return null;

                return (
                  <div key={item.id} className="pt-2 flex items-center justify-between gap-4">
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">{item.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.variant_title || "Standard"} • Max remaining: {remaining}
                      </div>
                    </div>

                    <input
                      type="number"
                      min={0}
                      max={remaining}
                      value={fulfillQuantities[item.id] ?? remaining}
                      onChange={(e) =>
                        setFulfillQuantities({
                          ...fulfillQuantities,
                          [item.id]: Math.min(remaining, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                      className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg text-right font-medium"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowFulfillModal(false)}
                disabled={actionLoading}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFulfillment}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
              >
                {actionLoading ? "Creating..." : "Confirm & Package"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD SHIPMENT / ADD TRACKING MODAL */}
      {showShipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <TruckIcon size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Add Tracking & Mark Shipped</h3>
              </div>
              <button onClick={() => setShowShipModal(false)} className="text-slate-400 hover:text-slate-600">
                <XIcon size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tracking Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. AWB-9876543210 or DELHIVERY-123"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Carrier / Tracking URL (Optional)
                </label>
                <input
                  type="url"
                  value={carrierUrl}
                  onChange={(e) => setCarrierUrl(e.target.value)}
                  placeholder="https://track.courier.com/?awb=..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowShipModal(false)}
                disabled={actionLoading}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordShipment}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-2xs"
              >
                {actionLoading ? "Recording..." : "Record Shipment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
