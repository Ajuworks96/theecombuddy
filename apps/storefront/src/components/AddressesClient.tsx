"use client";

import React, { useState, useEffect } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import { type StoreRegion } from "@the-ecom-buddy/ui";
import { AccountLayout } from "./AccountLayout";
import { useCustomer, type CustomerAddress } from "../context/CustomerContext";

interface AddressesClientProps {
  theme: PublicPublishedTheme;
  regions: StoreRegion[];
  initialRegion?: StoreRegion;
}

export const AddressesClient: React.FC<AddressesClientProps> = ({
  theme,
  regions,
  initialRegion,
}) => {
  const { customer, isAuthenticated, isLoading } = useCustomer();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [countryCode, setCountryCode] = useState("in");
  const [phone, setPhone] = useState("");
  const [isDefaultShipping, setIsDefaultShipping] = useState(false);
  const [isDefaultBilling, setIsDefaultBilling] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAddresses = async () => {
    try {
      const res = await fetch("/api/account/addresses", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login?redirect=/account/addresses";
      return;
    }

    if (isAuthenticated) {
      fetchAddresses();
    }
  }, [isLoading, isAuthenticated]);

  const openAddModal = () => {
    setEditingAddressId(null);
    setFirstName(customer?.first_name || "");
    setLastName(customer?.last_name || "");
    setAddress1("");
    setAddress2("");
    setCity("");
    setProvince("");
    setPostalCode("");
    setCountryCode("in");
    setPhone(customer?.phone || "");
    setIsDefaultShipping(addresses.length === 0);
    setIsDefaultBilling(addresses.length === 0);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setFirstName(addr.first_name || "");
    setLastName(addr.last_name || "");
    setAddress1(addr.address_1 || "");
    setAddress2(addr.address_2 || "");
    setCity(addr.city || "");
    setProvince(addr.province || "");
    setPostalCode(addr.postal_code || "");
    setCountryCode(addr.country_code || "in");
    setPhone(addr.phone || "");
    setIsDefaultShipping(Boolean(addr.is_default_shipping));
    setIsDefaultBilling(Boolean(addr.is_default_billing));
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!firstName || !lastName || !address1 || !city || !postalCode || !countryCode) {
      setFormError("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        address_1: address1,
        address_2: address2 || undefined,
        city,
        province: province || undefined,
        postal_code: postalCode,
        country_code: countryCode.toLowerCase(),
        phone: phone || undefined,
        is_default_shipping: isDefaultShipping,
        is_default_billing: isDefaultBilling,
      };

      const url = editingAddressId
        ? `/api/account/addresses/${encodeURIComponent(editingAddressId)}`
        : "/api/account/addresses";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save address");
        return;
      }

      setIsModalOpen(false);
      await fetchAddresses();
    } catch {
      setFormError("Failed to save address. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to remove this address?")) return;

    try {
      const res = await fetch(`/api/account/addresses/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAddresses();
      }
    } catch (err) {
      console.error("Failed to delete address:", err);
    }
  };

  return (
    <AccountLayout
      theme={theme}
      regions={regions}
      initialRegion={initialRegion}
      activeTab="addresses"
      title="Saved Addresses"
      subtitle="Manage your saved shipping and billing destinations for fast 1-click checkout."
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            {addresses.length} address{addresses.length === 1 ? "" : "es"} on file
          </span>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-xs font-semibold hover:opacity-90 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add New Address</span>
          </button>
        </div>

        {isLoadingAddresses ? (
          <div className="py-20 text-center">
            <svg className="w-8 h-8 mx-auto animate-spin text-[var(--brand-primary)] mb-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-xs text-[var(--text-muted)]">Loading addresses...</p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-sm font-bold">No saved addresses</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
              Add a delivery address to make checkout faster on future purchases.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-xs font-semibold hover:opacity-90"
            >
              + Add Address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="p-5 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col justify-between shadow-sm relative"
              >
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {addr.is_default_shipping && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-800">
                        Default Shipping
                      </span>
                    )}
                    {addr.is_default_billing && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-100 text-blue-800">
                        Default Billing
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {addr.first_name} {addr.last_name}
                  </h3>
                  <div className="mt-2 text-xs text-[var(--text-secondary)] space-y-0.5">
                    <p>{addr.address_1}</p>
                    {addr.address_2 && <p>{addr.address_2}</p>}
                    <p>
                      {addr.city}, {addr.province} {addr.postal_code}
                    </p>
                    <p className="uppercase font-mono text-[11px] font-semibold">{addr.country_code}</p>
                    {addr.phone && <p className="pt-1 text-[var(--text-muted)]">{addr.phone}</p>}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => openEditModal(addr)}
                    className="font-semibold text-[var(--brand-primary)] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-red-500 hover:text-red-700 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Address Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[var(--surface-base)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] p-6 max-w-lg w-full shadow-2xl my-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
                <h3 className="text-base font-bold">
                  {editingAddressId ? "Edit Delivery Address" : "Add Delivery Address"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-[var(--theme-radius)] bg-red-50 border border-red-200 text-xs text-red-700">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveAddress} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    placeholder="House / Flat / Street address"
                    className="w-full px-3 py-2 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">Apartment / Suite (Optional)</label>
                  <input
                    type="text"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    placeholder="Apt, Suite, Building, Floor"
                    className="w-full px-3 py-2 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">State / Province</label>
                    <input
                      type="text"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">Postal Code *</label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">Country *</label>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)] uppercase"
                    >
                      <option value="in">India (IN)</option>
                      <option value="us">United States (US)</option>
                      <option value="ae">United Arab Emirates (AE)</option>
                      <option value="gb">United Kingdom (GB)</option>
                      <option value="de">Germany (DE)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91..."
                      className="w-full px-3 py-2 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isDefaultShipping}
                      onChange={(e) => setIsDefaultShipping(e.target.checked)}
                      className="rounded text-[var(--brand-primary)]"
                    />
                    <span>Set as default shipping address</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isDefaultBilling}
                      onChange={(e) => setIsDefaultBilling(e.target.checked)}
                      className="rounded text-[var(--brand-primary)]"
                    />
                    <span>Set as default billing address</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-[var(--theme-radius)] border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
};

