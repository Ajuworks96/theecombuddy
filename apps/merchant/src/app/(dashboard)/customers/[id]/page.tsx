"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CustomersIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  OrdersIcon,
  EditIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  RefreshIcon,
  EyeIcon,
  XIcon,
} from "@/components/icons";
import { Badge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { AdminCustomer, AdminOrder } from "@/lib/medusa-admin-client";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Customer Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to load customer (HTTP ${res.status})`);
      }
      const data = await res.json();
      setCustomer(data.customer);

      setEditFirstName(data.customer.first_name || "");
      setEditLastName(data.customer.last_name || "");
      setEditPhone(data.customer.phone || "");
    } catch (err: any) {
      setError(err.message || "Failed to load customer details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editFirstName.trim() || null,
          last_name: editLastName.trim() || null,
          phone: editPhone.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update customer profile");
      }

      setSuccessNotice("Customer profile updated successfully!");
      setShowEditModal(false);
      await fetchCustomer();
    } catch (err: any) {
      setEditError(err.message || "Failed to update customer");
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-20 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Loading customer profile...</span>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-xl mx-auto py-16 space-y-4 text-center">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-center gap-2">
          <AlertCircleIcon size={16} className="text-rose-600 shrink-0" />
          <span>{error || "Customer record not found"}</span>
        </div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <ArrowLeftIcon size={14} /> Back to Customers
        </Link>
      </div>
    );
  }

  const displayName =
    customer.first_name || customer.last_name
      ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
      : customer.email.split("@")[0];

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const orders = customer.orders || [];
  const addresses = customer.addresses || [];

  // Financial metrics strictly segregated by currency (Never add different currencies directly)
  const totalOrders = orders.length;
  const spendByCurrency: Record<string, { total: number; count: number }> = {};
  orders.forEach((o) => {
    const curr = (
      o.currency_code ||
      o.payment_collections?.[0]?.payments?.[0]?.currency_code ||
      (o.shipping_address?.country_code?.toLowerCase() === "in" ? "inr" : "usd")
    ).toUpperCase();

    if (!spendByCurrency[curr]) {
      spendByCurrency[curr] = { total: 0, count: 0 };
    }
    spendByCurrency[curr].total += o.total || 0;
    spendByCurrency[curr].count += 1;
  });

  const currencyKeys = Object.keys(spendByCurrency);

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to customers"
          >
            <ArrowLeftIcon size={18} />
          </Link>
          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
            {initials || "U"}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {displayName}
              </h1>
              <Badge variant={customer.has_account ? "published" : "default"} size="sm">
                {customer.has_account ? "Registered Account" : "Guest Shopper"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Customer ID: {customer.id} • Joined {formatDate(customer.created_at, false)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <EditIcon size={14} /> Edit Profile
          </button>
          <button
            onClick={fetchCustomer}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshIcon size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Metrics Row (Strictly Segregated by Currency) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Total Orders Placed</span>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalOrders}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Lifetime Spend (By Currency)</span>
          <div className="mt-1 space-y-0.5">
            {currencyKeys.length === 0 ? (
              <span className="text-sm font-bold text-slate-400">—</span>
            ) : (
              currencyKeys.map((curr) => (
                <div key={curr} className="flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span>{formatCurrency(spendByCurrency[curr].total, curr)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({spendByCurrency[curr].count} ord)</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Average Order Value (AOV)</span>
          <div className="mt-1 space-y-0.5">
            {currencyKeys.length === 0 ? (
              <span className="text-sm font-bold text-slate-400">—</span>
            ) : (
              currencyKeys.map((curr) => (
                <div key={curr} className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>{formatCurrency(spendByCurrency[curr].total / spendByCurrency[curr].count, curr)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{curr}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left 2 cols (Orders history & Addresses), Right 1 col (Profile details) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order History Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <OrdersIcon size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Order History ({orders.length})
                </h3>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <OrdersIcon size={24} className="mx-auto text-slate-300" />
                <p className="text-xs text-slate-600 font-medium">No orders placed by this customer yet.</p>
                <p className="text-[11px] text-slate-400">
                  Orders completed with this email address will automatically link here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-4">Order #</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4 text-center">Payment</th>
                      <th className="py-2.5 px-4 text-center">Fulfillment</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((o) => {
                      const curr = (
                        o.currency_code ||
                        o.payment_collections?.[0]?.payments?.[0]?.currency_code ||
                        "INR"
                      ).toUpperCase();
                      return (
                        <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-900 font-mono">
                            <Link href={`/orders/${o.id}`} className="hover:text-emerald-700">
                              #{o.display_id || o.id.slice(-8)}
                            </Link>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                            {formatDate(o.created_at)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Badge variant={o.payment_status || "default"} size="sm">
                              {o.payment_status || "Awaiting"}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Badge variant={o.fulfillment_status || "not_fulfilled"} size="sm">
                              {o.fulfillment_status || "not_fulfilled"}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                            {formatCurrency(o.total, curr)}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Link
                              href={`/orders/${o.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-emerald-700 transition-colors shadow-2xs"
                            >
                              <EyeIcon size={12} /> View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Saved Addresses Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPinIcon size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Saved Delivery Addresses ({addresses.length})
                </h3>
              </div>
            </div>

            <div className="p-5">
              {addresses.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl space-y-1">
                  <MapPinIcon size={20} className="mx-auto text-slate-300" />
                  <p className="text-xs text-slate-600 font-medium">No addresses saved on file.</p>
                  <p className="text-[11px] text-slate-400">
                    Addresses saved during checkout will appear here for recurring delivery.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {addr.first_name} {addr.last_name}
                        </span>
                        <div className="flex gap-1">
                          {addr.is_default_shipping && (
                            <Badge variant="published" size="sm">
                              Shipping
                            </Badge>
                          )}
                          {addr.is_default_billing && (
                            <Badge variant="proposed" size="sm">
                              Billing
                            </Badge>
                          )}
                        </div>
                      </div>

                      {addr.company && (
                        <div className="text-slate-500 font-medium">{addr.company}</div>
                      )}

                      <p className="text-slate-600 leading-relaxed text-[11px]">
                        {addr.address_1}
                        {addr.address_2 && `, ${addr.address_2}`}
                        <br />
                        {addr.city}, {addr.province} {addr.postal_code}
                        <br />
                        {addr.country_code?.toUpperCase()}
                      </p>

                      {addr.phone && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <PhoneIcon size={11} className="text-slate-400" />
                          <span>{addr.phone}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Profile details) */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Contact Profile
              </h3>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Full Name:</span>
                <span className="font-bold text-slate-900">{displayName}</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Email Address:</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-slate-700">
                  <MailIcon size={13} className="text-slate-400" />
                  <span className="font-mono">{customer.email}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Phone Number:</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-slate-700">
                  <PhoneIcon size={13} className="text-slate-400" />
                  <span className="font-mono">{customer.phone || "None registered"}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 block">Account Status:</span>
                <span className="font-semibold text-slate-800">
                  {customer.has_account ? "Registered & Password Protected" : "Guest Shopper Record"}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Created On:</span>
                <span className="text-slate-700">{formatDate(customer.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT CUSTOMER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <EditIcon size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Edit Customer Profile</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XIcon size={16} />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateCustomer} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
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
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={editLoading}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                >
                  {editLoading ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

