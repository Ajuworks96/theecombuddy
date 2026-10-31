"use client";

import React, { useState, useEffect } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import type { StoreCart, StoreRegion, StoreShippingOption, StoreCartAddress } from "./types";

interface CheckoutLayoutProps {
  theme: PublicPublishedTheme;
  cart: StoreCart | null;
  regions?: StoreRegion[];
  currentRegion?: StoreRegion;
  shippingOptions: StoreShippingOption[];
  onSelectShippingOption: (optionId: string) => Promise<boolean>;
  onUpdateCartAddress: (data: {
    email: string;
    shipping_address: StoreCartAddress;
    billing_address: StoreCartAddress;
  }) => Promise<boolean>;
  onApplyPromotion: (code: string) => Promise<boolean>;
  onRemovePromotion: (code: string) => Promise<boolean>;
  onSubmitOrder: (data: {
    paymentProviderId: string;
    deliveryInstructions?: string;
  }) => Promise<{ success: boolean; orderId?: string; displayId?: number; error?: string }>;
}

export const CheckoutLayout: React.FC<CheckoutLayoutProps> = ({
  theme,
  cart,
  regions = [],
  currentRegion,
  shippingOptions = [],
  onSelectShippingOption,
  onUpdateCartAddress,
  onApplyPromotion,
  onRemovePromotion,
  onSubmitOrder,
}) => {
  // Contact & Shipping State
  const [email, setEmail] = useState(cart?.email || "");
  const [firstName, setFirstName] = useState(cart?.shipping_address?.first_name || "");
  const [lastName, setLastName] = useState(cart?.shipping_address?.last_name || "");
  const [phone, setPhone] = useState(cart?.shipping_address?.phone || "");
  const [address1, setAddress1] = useState(cart?.shipping_address?.address_1 || "");
  const [address2, setAddress2] = useState(cart?.shipping_address?.address_2 || "");
  const [city, setCity] = useState(cart?.shipping_address?.city || "");
  const [province, setProvince] = useState(cart?.shipping_address?.province || "");
  const [postalCode, setPostalCode] = useState(cart?.shipping_address?.postal_code || "");
  const [countryCode, setCountryCode] = useState(
    cart?.shipping_address?.country_code || currentRegion?.countries?.[0]?.iso_2 || "in"
  );
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // Billing address
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [billingFirstName, setBillingFirstName] = useState("");
  const [billingLastName, setBillingLastName] = useState("");
  const [billingAddress1, setBillingAddress1] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingProvince, setBillingProvince] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [billingCountryCode, setBillingCountryCode] = useState("in");

  // Shipping & Payment selection
  const [selectedShippingOptionId, setSelectedShippingOptionId] = useState<string>(
    cart?.shipping_methods?.[0]?.shipping_option_id || shippingOptions[0]?.id || ""
  );
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<string>("pp_system_default");

  // Promo code
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Submission & Validation States
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isAddressSaved, setIsAddressSaved] = useState(false);
  const [isUpdatingShipping, setIsUpdatingShipping] = useState(false);

  const currency = cart?.currency_code || currentRegion?.currency_code || "inr";
  const isIndia = currency.toLowerCase() === "inr" && countryCode.toLowerCase() === "in";

  // Auto-select shipping option if only one exists and none selected
  useEffect(() => {
    if (shippingOptions.length > 0 && !selectedShippingOptionId) {
      const firstId = shippingOptions[0].id;
      setSelectedShippingOptionId(firstId);
      onSelectShippingOption(firstId);
    }
  }, [shippingOptions, selectedShippingOptionId, onSelectShippingOption]);

  const formatPrice = (amount: number, curr: string) => {
    const sym =
      curr.toLowerCase() === "inr"
        ? "₹"
        : curr.toLowerCase() === "usd"
        ? "$"
        : curr.toLowerCase() === "eur"
        ? "€"
        : curr.toLowerCase() === "gbp"
        ? "£"
        : curr.toUpperCase() + " ";
    return `${sym}${Number(amount).toLocaleString()}`;
  };

  const validateFields = (): boolean => {
    const errs: Record<string, string> = {};

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address";
    }
    if (!firstName.trim()) errs.firstName = "First name is required";
    if (!lastName.trim()) errs.lastName = "Last name is required";
    if (!address1.trim()) errs.address1 = "Street address is required";
    if (!city.trim()) errs.city = "City is required";
    if (!province.trim()) errs.province = "State / Province is required";
    if (!postalCode.trim()) {
      errs.postalCode = "Postal code is required";
    } else if (isIndia && !/^\d{6}$/.test(postalCode.trim())) {
      errs.postalCode = "Enter a valid 6-digit PIN code";
    }
    if (!phone.trim()) errs.phone = "Phone number is required for shipping updates";

    if (!sameAsShipping) {
      if (!billingFirstName.trim()) errs.billingFirstName = "Billing first name is required";
      if (!billingLastName.trim()) errs.billingLastName = "Billing last name is required";
      if (!billingAddress1.trim()) errs.billingAddress1 = "Billing street address is required";
      if (!billingCity.trim()) errs.billingCity = "Billing city is required";
      if (!billingPostalCode.trim()) errs.billingPostalCode = "Billing postal code is required";
    }

    if (!selectedShippingOptionId && shippingOptions.length > 0) {
      errs.shippingMethod = "Please select a shipping delivery method";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveAddress = async (): Promise<boolean> => {
    if (!validateFields()) return false;

    const shippingAddr: StoreCartAddress = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      address_1: address1.trim(),
      address_2: address2.trim() || null,
      city: city.trim(),
      province: province.trim(),
      postal_code: postalCode.trim(),
      country_code: countryCode.toLowerCase(),
    };

    const billingAddr: StoreCartAddress = sameAsShipping
      ? shippingAddr
      : {
          first_name: billingFirstName.trim(),
          last_name: billingLastName.trim(),
          phone: phone.trim(),
          address_1: billingAddress1.trim(),
          city: billingCity.trim(),
          province: billingProvince.trim(),
          postal_code: billingPostalCode.trim(),
          country_code: billingCountryCode.toLowerCase(),
        };

    const ok = await onUpdateCartAddress({
      email: email.trim(),
      shipping_address: shippingAddr,
      billing_address: billingAddr,
    });

    if (ok) {
      setIsAddressSaved(true);
    }
    return ok;
  };

  const handleShippingChange = async (optionId: string) => {
    setSelectedShippingOptionId(optionId);
    setIsUpdatingShipping(true);
    try {
      await onSelectShippingOption(optionId);
    } finally {
      setIsUpdatingShipping(false);
    }
  };

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    setIsApplyingPromo(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const ok = await onApplyPromotion(promoCode.trim());
      if (ok) {
        setPromoSuccess(`Promo code '${promoCode.trim().toUpperCase()}' applied`);
        setPromoCode("");
      } else {
        setPromoError(`Code '${promoCode.trim().toUpperCase()}' is invalid or expired.`);
      }
    } catch (err: any) {
      setPromoError(err.message || "Failed to apply discount");
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (!validateFields()) {
      setCheckoutError("Please resolve the highlighted form fields before placing your order.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Ensure address is saved to cart
      const addressOk = await handleSaveAddress();
      if (!addressOk) {
        throw new Error("Unable to save shipping address. Please check your details.");
      }

      // 2. Ensure shipping method is selected
      if (selectedShippingOptionId) {
        await onSelectShippingOption(selectedShippingOptionId);
      }

      // 3. Submit order
      const result = await onSubmitOrder({
        paymentProviderId: selectedPaymentProvider,
        deliveryInstructions: deliveryInstructions.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to complete checkout. Please try again.");
      }

      // Redirect to confirmation page
      if (result.orderId) {
        window.location.href = `/order/confirmation/${result.orderId}?email=${encodeURIComponent(email.trim())}`;
      }
    } catch (err: any) {
      setCheckoutError(err.message || "An unexpected error occurred during order completion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const items = cart?.items || [];
  const subtotal = cart?.subtotal ?? cart?.item_subtotal ?? 0;
  const discountTotal = cart?.discount_total ?? 0;
  const shippingTotal = cart?.shipping_total ?? 0;
  const taxTotal = cart?.tax_total ?? 0;
  const total = cart?.total ?? (subtotal - discountTotal + shippingTotal + taxTotal);
  const presetId = theme.presetId || "crescendo";

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Breadcrumbs */}
        <div className="border-b border-[var(--border-subtle)] pb-6 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-[var(--font-display)] text-[var(--text-primary)]">
              Express Guest Checkout
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              Direct-to-consumer order fulfillment. No mandatory account setup required.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
            <a href="/cart" className="hover:text-[var(--text-primary)]">Cart</a>
            <span>/</span>
            <span className="text-[var(--brand-primary)]">Checkout</span>
          </div>
        </div>

        {checkoutError && (
          <div className="mb-6 p-4 rounded-[var(--theme-radius)] bg-red-500/10 border border-red-500/30 text-red-500 text-xs sm:text-sm flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{checkoutError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Form Steps */}
          <div className="lg:col-span-7 space-y-8">
            {/* Step 1: Customer Contact */}
            <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white text-xs flex items-center justify-center font-mono">1</span>
                  <span>Contact Information</span>
                </h2>
                <span className="text-[11px] text-[var(--text-muted)]">Guest Order</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                  {fieldErrors.email && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.email}</p>}
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    Your invoice and delivery tracking updates will be sent here.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Address */}
            <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white text-xs flex items-center justify-center font-mono">2</span>
                  <span>Delivery Destination</span>
                </h2>
                <span className="text-[11px] font-mono uppercase text-[var(--text-muted)]">
                  Country: {countryCode.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                  {fieldErrors.firstName && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                  {fieldErrors.lastName && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="House number, flat, building, street"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
                {fieldErrors.address1 && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.address1}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Apartment, Suite, Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="Near landmark or floor"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                  {fieldErrors.city && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.city}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    State / Province *
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="State"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                  {fieldErrors.province && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.province}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {isIndia ? "PIN Code *" : "Postal Code *"}
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder={isIndia ? "6-digit PIN" : "Postal Code"}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                  {fieldErrors.postalCode && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.postalCode}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
                {fieldErrors.phone && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.phone}</p>}
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Required by courier partners for OTP / delivery coordination.
                </p>
              </div>

              {/* Delivery Instructions */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="e.g. Leave with security guard, call before arrival"
                  className="w-full px-3 py-2 text-xs rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              {/* Same as billing checkbox */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  id="sameAsShipping"
                  type="checkbox"
                  checked={sameAsShipping}
                  onChange={(e) => setSameAsShipping(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--brand-primary)] border-[var(--border-subtle)] focus:ring-[var(--brand-primary)]"
                />
                <label htmlFor="sameAsShipping" className="text-xs text-[var(--text-secondary)] cursor-pointer">
                  Billing address is the same as delivery address
                </label>
              </div>
            </div>

            {/* Step 3: Shipping Method */}
            <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white text-xs flex items-center justify-center font-mono">3</span>
                  <span>Delivery Method</span>
                </h2>
                {isUpdatingShipping && (
                  <span className="text-[11px] text-[var(--brand-primary)] animate-pulse">Calculating rates...</span>
                )}
              </div>

              {shippingOptions.length === 0 ? (
                <div className="p-4 rounded-[var(--theme-radius)] bg-[var(--surface-muted)] text-xs text-[var(--text-muted)] text-center">
                  Enter your delivery destination above to view available delivery speeds.
                </div>
              ) : (
                <div className="space-y-2">
                  {shippingOptions.map((opt) => {
                    const isSelected = selectedShippingOptionId === opt.id;
                    const optAmount = opt.calculated_price?.calculated_amount ?? opt.amount ?? 0;
                    return (
                      <label
                        key={opt.id}
                        className={`p-3.5 rounded-[var(--theme-radius)] border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]"
                            : "border-[var(--border-subtle)] bg-[var(--surface-base)] hover:border-[var(--text-muted)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shippingOption"
                            value={opt.id}
                            checked={isSelected}
                            onChange={() => handleShippingChange(opt.id)}
                            className="w-4 h-4 text-[var(--brand-primary)] border-[var(--border-subtle)] focus:ring-[var(--brand-primary)]"
                          />
                          <div>
                            <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                              {opt.name}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {opt.name.toLowerCase().includes("express") ? "2–3 Business Days" : "4–6 Business Days"}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm font-bold font-mono text-[var(--text-primary)]">
                          {optAmount === 0 ? "FREE" : formatPrice(optAmount, currency)}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {fieldErrors.shippingMethod && (
                <p className="text-[11px] text-red-500">{fieldErrors.shippingMethod}</p>
              )}
            </div>

            {/* Step 4: Payment Selection */}
            <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white text-xs flex items-center justify-center font-mono">4</span>
                  <span>Payment Method</span>
                </h2>
                <span className="text-[11px] font-mono uppercase text-emerald-600 font-bold">Secure Checkout</span>
              </div>

              <div className="space-y-3">
                {/* Cash on Delivery option (India only) */}
                {isIndia ? (
                  <label
                    className={`p-4 rounded-[var(--theme-radius)] border transition-all flex items-start gap-3 cursor-pointer ${
                      selectedPaymentProvider === "pp_system_default"
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 ring-1 ring-[var(--brand-primary)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-base)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentProvider"
                      value="pp_system_default"
                      checked={selectedPaymentProvider === "pp_system_default"}
                      onChange={() => setSelectedPaymentProvider("pp_system_default")}
                      className="mt-1 w-4 h-4 text-[var(--brand-primary)] border-[var(--border-subtle)] focus:ring-[var(--brand-primary)]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                          Cash on Delivery (COD)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Verified Available
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1">
                        Pay with cash or UPI directly to delivery agent upon receiving your order.
                      </p>
                    </div>
                  </label>
                ) : (
                  <div className="p-3 rounded-[var(--theme-radius)] bg-[var(--surface-muted)] text-[11px] text-[var(--text-muted)] flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Cash on Delivery is available exclusively for deliveries within India (INR).</span>
                  </div>
                )}

                {/* Razorpay Online Payment */}
                <label
                  className={`p-4 rounded-[var(--theme-radius)] border transition-all flex items-start gap-3 opacity-90 ${
                    selectedPaymentProvider === "pp_razorpay_razorpay"
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                      : "border-[var(--border-subtle)] bg-[var(--surface-base)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentProvider"
                    value="pp_razorpay_razorpay"
                    checked={selectedPaymentProvider === "pp_razorpay_razorpay"}
                    onChange={() => setSelectedPaymentProvider("pp_razorpay_razorpay")}
                    disabled={!isIndia}
                    className="mt-1 w-4 h-4 text-[var(--brand-primary)] border-[var(--border-subtle)] focus:ring-[var(--brand-primary)]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                        UPI / Cards / NetBanking (Razorpay)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        {isIndia ? "Sandbox Verified" : "INR Only"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      {isIndia
                        ? "Instant checkout via PhonePe, Google Pay, RuPay, Visa, Mastercard, and NetBanking."
                        : "Online gateway transactions currently enabled for domestic INR checkout."}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Completion CTA */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] shadow-sm space-y-5 sticky top-24">
              <h2 className="text-base font-bold text-[var(--text-primary)] pb-3 border-b border-[var(--border-subtle)]">
                Order Review ({items.reduce((acc, it) => acc + (it.quantity || 1), 0)} items)
              </h2>

              {/* Items List in Summary */}
              <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border-subtle)] pr-1 space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="pt-2 first:pt-0 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-[var(--theme-radius)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] overflow-hidden shrink-0 flex items-center justify-center">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-[10px] text-[var(--text-muted)]">No img</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">{item.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Qty: {item.quantity} {item.variant?.title && item.variant.title !== "Default" ? `• ${item.variant.title}` : ""}
                      </p>
                    </div>
                    <div className="text-xs font-bold font-mono text-[var(--text-primary)] shrink-0">
                      {formatPrice(item.unit_price * (item.quantity || 1), currency)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Form */}
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Coupon code"
                    className="flex-1 px-3 py-1.5 text-xs uppercase font-mono rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={isApplyingPromo || !promoCode.trim()}
                    className="px-3 py-1.5 text-xs font-bold rounded-[var(--theme-radius)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
                {promoSuccess && <p className="text-[11px] text-emerald-600 font-medium">{promoSuccess}</p>}
                {promoError && <p className="text-[11px] text-red-500 font-medium">{promoError}</p>}
                {cart?.promotions && cart.promotions.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {cart.promotions.map((p) => (
                      <span
                        key={p.code}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      >
                        <span>{p.code}</span>
                        <button
                          type="button"
                          onClick={() => onRemovePromotion(p.code)}
                          className="hover:text-red-600 font-bold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Totals */}
              <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)] text-xs sm:text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium text-[var(--text-primary)]">{formatPrice(subtotal, currency)}</span>
                </div>

                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span className="font-mono">-{formatPrice(discountTotal, currency)}</span>
                  </div>
                )}

                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Shipping</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {shippingTotal === 0 ? "FREE" : formatPrice(shippingTotal, currency)}
                  </span>
                </div>

                {taxTotal > 0 && (
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Tax</span>
                    <span className="font-mono text-[var(--text-primary)]">{formatPrice(taxTotal, currency)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-[var(--border-subtle)] flex justify-between items-baseline">
                  <span className="text-base font-bold text-[var(--text-primary)]">Grand Total</span>
                  <span className="text-xl font-black font-mono text-[var(--brand-primary)]">
                    {formatPrice(total, currency)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className={`w-full py-4 px-6 text-sm font-bold text-white text-center transition-all shadow-lg flex items-center justify-center gap-2 ${
                    presetId === "crescendo" ? "rounded-none uppercase tracking-wider" : "rounded-[var(--theme-radius)]"
                  } ${
                    isSubmitting || items.length === 0
                      ? "bg-[var(--surface-muted)] text-[var(--text-muted)] cursor-not-allowed shadow-none"
                      : "bg-[var(--brand-primary)] hover:opacity-95"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Processing Order...</span>
                    </>
                  ) : (
                    <span>
                      {selectedPaymentProvider === "pp_system_default"
                        ? "Place Order with Cash on Delivery"
                        : "Proceed with Online Payment"}
                    </span>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-[var(--text-muted)] text-center space-y-1">
                <p>🔒 256-Bit Encrypted Secure Checkout</p>
                <p>Single-merchant direct order • Zero intermediate markups</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
