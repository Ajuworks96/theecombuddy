"use client";

import React, { useState, useMemo } from "react";
import type { StoreProduct, StoreVariant, StoreRegion } from "./types";

interface ProductInfoProps {
  product: StoreProduct;
  currentRegion?: StoreRegion;
  inventoryMap?: Record<
    string,
    {
      in_stock: boolean;
      available_quantity: number;
      manage_inventory: boolean;
      allow_backorder: boolean;
      sku: string;
    }
  >;
  presetId?: string;
  onAddToCart?: (variant: StoreVariant, quantity: number) => Promise<boolean | void>;
  isAddingToCart?: boolean;
}

export const ProductInfo: React.FC<ProductInfoProps> = ({
  product,
  currentRegion,
  inventoryMap = {},
  presetId = "crescendo",
  onAddToCart,
  isAddingToCart = false,
}) => {
  const variants = product.variants || [];
  const options = product.options || [];

  // Default option state: initialize from first variant if available
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (variants.length > 0 && variants[0]?.options) {
      for (const opt of variants[0].options) {
        const title = opt.option?.title || "Option";
        initial[title] = opt.value;
      }
    } else if (options.length > 0) {
      for (const opt of options) {
        if (opt.values && opt.values.length > 0) {
          initial[opt.title] = opt.values[0].value;
        }
      }
    }
    return initial;
  });

  const [quantity, setQuantity] = useState(1);
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>("specs");

  // Resolve matching variant from selectedOptions
  const currentVariant: StoreVariant | undefined = useMemo(() => {
    if (variants.length === 0) return undefined;
    if (variants.length === 1) return variants[0];

    const match = variants.find((v) => {
      if (!v.options || v.options.length === 0) return true;
      return v.options.every((opt) => {
        const optTitle = opt.option?.title || "Option";
        return selectedOptions[optTitle] === opt.value;
      });
    });

    return match || variants[0];
  }, [variants, selectedOptions]);

  // Inventory & Stock determination
  const variantInventory = currentVariant ? inventoryMap[currentVariant.id] : undefined;
  const isInStock = useMemo(() => {
    if (!currentVariant) return true;
    if (variantInventory !== undefined) {
      return variantInventory.in_stock;
    }
    if (currentVariant.inventory_quantity !== undefined && currentVariant.inventory_quantity !== null) {
      return currentVariant.allow_backorder === true || currentVariant.inventory_quantity > 0;
    }
    // Fallback: manage_inventory false or unspecified defaults to available
    return currentVariant.manage_inventory === false;
  }, [currentVariant, variantInventory]);

  const availableQuantity = variantInventory?.available_quantity ?? currentVariant?.inventory_quantity ?? 10;
  const maxPurchaseable = Math.max(1, Math.min(10, availableQuantity > 0 ? availableQuantity : 10));

  // Currency & Price formatting
  const currencyCode = (currentRegion?.currency_code || currentVariant?.calculated_price?.currency_code || "inr").toLowerCase();
  const calculatedAmount = currentVariant?.calculated_price?.calculated_amount ?? 0;
  const originalAmount = currentVariant?.calculated_price?.original_amount;
  const hasCompareAt = originalAmount !== undefined && originalAmount !== null && originalAmount > calculatedAmount;

  const formatPrice = (amount: number, code: string) => {
    switch (code) {
      case "inr":
        return `₹${amount.toLocaleString("en-IN")}`;
      case "usd":
        return `$${amount.toFixed(2)}`;
      case "aed":
        return `AED ${amount.toFixed(2)}`;
      case "gbp":
        return `£${amount.toFixed(2)}`;
      case "eur":
        return `€${amount.toFixed(2)}`;
      default:
        return `${code.toUpperCase()} ${amount.toFixed(2)}`;
    }
  };

  const handleSelectOption = (optionTitle: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionTitle]: value,
    }));
  };

  const handleAddToCart = async () => {
    if (!currentVariant || !isInStock || isAddingToCart) return;
    try {
      const res = await onAddToCart?.(currentVariant, quantity);
      if (res !== false) {
        setShowAddSuccess(true);
        setTimeout(() => setShowAddSuccess(false), 2800);
      }
    } catch {
      // Handled by parent or toast
    }
  };

  // Color option detection helper
  const isColorOption = (title: string) => /color|colour|shade|finish/i.test(title);

  // Approximate color map for circular swatches
  const getColorHex = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes("black") || n.includes("obsidian")) return "#111827";
    if (n.includes("white") || n.includes("arctic") || n.includes("ivory")) return "#F9FAFB";
    if (n.includes("grey") || n.includes("gray") || n.includes("silver") || n.includes("gunmetal")) return "#6B7280";
    if (n.includes("blue") || n.includes("navy") || n.includes("sapphire")) return "#2563EB";
    if (n.includes("red") || n.includes("crimson") || n.includes("ruby")) return "#DC2626";
    if (n.includes("green") || n.includes("emerald") || n.includes("sage")) return "#059669";
    if (n.includes("gold") || n.includes("amber") || n.includes("yellow") || n.includes("tan")) return "#D97706";
    if (n.includes("rose") || n.includes("pink")) return "#DB2777";
    if (n.includes("brown") || n.includes("walnut") || n.includes("espresso")) return "#78350F";
    return "#9CA3AF";
  };

  // Category breadcrumb link
  const primaryCategory = product.categories?.[0];

  return (
    <div className="w-full flex flex-col gap-6">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <a href="/" className="hover:text-[var(--text-primary)] transition-colors">Home</a>
        <span>/</span>
        {primaryCategory ? (
          <>
            <a
              href={`/categories/${primaryCategory.handle}`}
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              {primaryCategory.name}
            </a>
            <span>/</span>
          </>
        ) : null}
        <span className="text-[var(--text-primary)] font-medium truncate max-w-[200px]">
          {product.title}
        </span>
      </nav>

      {/* 2. Header: Title, Category & SKU */}
      <div>
        {product.collection && (
          <a
            href={`/collections/${product.collection.handle}`}
            className="inline-block text-[11px] font-bold uppercase tracking-wider text-[var(--brand-primary)] mb-1 hover:underline"
          >
            {product.collection.title}
          </a>
        )}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
          {product.title}
        </h1>
        {product.subtitle && (
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            {product.subtitle}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span>SKU: <span className="font-mono font-medium text-[var(--text-primary)]">{currentVariant?.sku || "N/A"}</span></span>
          <span>•</span>
          {isInStock ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {availableQuantity <= 5 && availableQuantity > 0 ? `Only ${availableQuantity} left in stock` : "In Stock — Ready to ship"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Out of Stock
            </span>
          )}
        </div>
      </div>

      {/* 3. Pricing Display */}
      <div className="py-2 border-y border-[var(--border-subtle)] flex items-baseline gap-3">
        <span className="text-3xl font-bold tracking-tight text-[var(--text-primary)] font-mono">
          {formatPrice(calculatedAmount, currencyCode)}
        </span>
        {hasCompareAt && (
          <>
            <span className="text-lg line-through text-[var(--text-muted)] font-mono">
              {formatPrice(originalAmount!, currencyCode)}
            </span>
            <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Save {Math.round(((originalAmount! - calculatedAmount) / originalAmount!) * 100)}%
            </span>
          </>
        )}
        <span className="text-xs text-[var(--text-muted)] ml-auto">
          Taxes calculated at checkout
        </span>
      </div>

      {/* 4. Variant Selectors */}
      {options.length > 0 && (
        <div className="space-y-5">
          {options.map((opt) => {
            const optTitle = opt.title;
            const isColor = isColorOption(optTitle);
            const currentSelected = selectedOptions[optTitle] || "";

            return (
              <div key={opt.id} className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {optTitle}: <span className="text-[var(--text-primary)] font-bold">{currentSelected}</span>
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {(opt.values || []).map((val) => {
                    const isSelected = val.value === currentSelected;

                    if (isColor) {
                      const colorHex = getColorHex(val.value);
                      return (
                        <button
                          key={val.id}
                          type="button"
                          onClick={() => handleSelectOption(optTitle, val.value)}
                          className={`relative p-0.5 rounded-full transition-all focus:outline-none ${
                            isSelected
                              ? "ring-2 ring-[var(--brand-primary)] scale-110"
                              : "hover:scale-105 opacity-80 hover:opacity-100"
                          }`}
                          title={val.value}
                          aria-label={`Color ${val.value}`}
                        >
                          <span
                            className="block w-7 h-7 rounded-full border border-black/15 shadow-inner"
                            style={{ backgroundColor: colorHex }}
                          />
                        </button>
                      );
                    }

                    return (
                      <button
                        key={val.id}
                        type="button"
                        onClick={() => handleSelectOption(optTitle, val.value)}
                        className={`px-3.5 py-2 text-xs font-semibold transition-all focus:outline-none ${
                          presetId === "crescendo"
                            ? "rounded-none"
                            : presetId === "velora"
                            ? "rounded-xl"
                            : presetId === "aero_step"
                            ? "rounded-full"
                            : "rounded-lg"
                        } ${
                          isSelected
                            ? "bg-[var(--brand-primary)] text-white shadow-sm ring-1 ring-[var(--brand-primary)]"
                            : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {val.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Quantity & Add to Cart Controls */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-3">
          {/* Quantity Selector */}
          <div className="flex items-center border border-[var(--border-subtle)] rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] overflow-hidden">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || !isInStock}
              className="px-3.5 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="w-10 text-center font-mono font-semibold text-sm text-[var(--text-primary)]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxPurchaseable, q + 1))}
              disabled={quantity >= maxPurchaseable || !isInStock}
              className="px-3.5 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors disabled:opacity-30"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Primary Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isInStock || isAddingToCart}
            className={`flex-1 py-3.5 px-6 font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm ${
              presetId === "crescendo"
                ? "rounded-none uppercase tracking-wider"
                : presetId === "velora"
                ? "rounded-2xl"
                : presetId === "aero_step"
                ? "rounded-full uppercase tracking-wider font-extrabold"
                : "rounded-lg"
            } ${
              !isInStock
                ? "bg-[var(--surface-muted)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-subtle)]"
                : showAddSuccess
                ? "bg-emerald-600 text-white"
                : "bg-[var(--brand-primary)] text-white hover:opacity-90 active:scale-[0.99]"
            }`}
          >
            {isAddingToCart ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Adding to Bag...</span>
              </>
            ) : showAddSuccess ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span>Added to Bag!</span>
              </>
            ) : !isInStock ? (
              <span>Sold Out</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Add to Cart • {formatPrice(calculatedAmount * quantity, currencyCode)}</span>
              </>
            )}
          </button>
        </div>

        {/* Region-Specific Shipping & Delivery Note */}
        <div className="p-3.5 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] space-y-1">
          {currencyCode === "inr" ? (
            <>
              <p className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Free delivery across India on orders above ₹999</span>
              </p>
              <p className="pl-6 text-[11px] text-[var(--text-muted)]">
                Cash on Delivery (COD) available nationwide. Delivered within 2–5 business days.
              </p>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
                <span>International Express Courier (3–5 Business Days)</span>
              </p>
              <p className="pl-6 text-[11px] text-[var(--text-muted)]">
                Digital checkout via Cards and UPI. Note: Cash on Delivery is available exclusively within India.
              </p>
            </>
          )}
        </div>
      </div>

      {/* 6. Product Description */}
      {product.description && (
        <div className="pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Description
          </h3>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
            {product.description}
          </p>
        </div>
      )}

      {/* 7. Product Specifications Accordion */}
      <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
        {/* Accordion 1: Technical & Product Specs */}
        <div>
          <button
            type="button"
            onClick={() => setActiveAccordion((a) => (a === "specs" ? null : "specs"))}
            className="w-full py-3.5 flex items-center justify-between text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors focus:outline-none"
          >
            <span>Product Specifications</span>
            <svg
              className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${
                activeAccordion === "specs" ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {activeAccordion === "specs" && (
            <div className="pb-4 text-xs space-y-2 text-[var(--text-secondary)]">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] font-mono">
                <div><span className="text-[var(--text-muted)]">SKU:</span> {currentVariant?.sku || "N/A"}</div>
                <div><span className="text-[var(--text-muted)]">Status:</span> {isInStock ? "Available" : "Sold Out"}</div>
                {product.material && <div><span className="text-[var(--text-muted)]">Material:</span> {product.material}</div>}
                {product.origin_country && <div><span className="text-[var(--text-muted)]">Origin:</span> {product.origin_country}</div>}
                {product.weight && <div><span className="text-[var(--text-muted)]">Weight:</span> {product.weight}g</div>}
                {primaryCategory && <div><span className="text-[var(--text-muted)]">Category:</span> {primaryCategory.name}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Accordion 2: Care, Warranty & Authenticity */}
        <div>
          <button
            type="button"
            onClick={() => setActiveAccordion((a) => (a === "care" ? null : "care"))}
            className="w-full py-3.5 flex items-center justify-between text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors focus:outline-none"
          >
            <span>Brand Sourcing & Authenticity</span>
            <svg
              className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${
                activeAccordion === "care" ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {activeAccordion === "care" && (
            <div className="pb-4 text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
              <p>
                100% authentic curated catalog item sourced directly through verified domestic suppliers. Packaged in tamper-evident retail protective boxing with complete manufacturer barcodes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 8. Sticky Mobile Buy Box */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-3 sm:hidden bg-[var(--surface-base)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] shadow-2xl flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold font-mono text-[var(--text-primary)] truncate">
            {formatPrice(calculatedAmount, currencyCode)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] truncate">
            {currentVariant?.title} • {isInStock ? "In Stock" : "Sold Out"}
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!isInStock || isAddingToCart}
          className={`py-2.5 px-5 text-xs font-bold transition-all shrink-0 ${
            presetId === "crescendo" ? "rounded-none uppercase" : "rounded-full"
          } ${
            !isInStock
              ? "bg-[var(--surface-muted)] text-[var(--text-muted)] cursor-not-allowed"
              : showAddSuccess
              ? "bg-emerald-600 text-white"
              : "bg-[var(--brand-primary)] text-white"
          }`}
        >
          {isAddingToCart ? "Adding..." : showAddSuccess ? "Added!" : !isInStock ? "Sold Out" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
};

