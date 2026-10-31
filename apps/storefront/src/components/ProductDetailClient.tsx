"use client";

import React, { useState } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import {
  ThemeRoot,
  Header,
  Footer,
  ProductGallery,
  ProductInfo,
  CartDrawer,
  type StoreProduct,
  type StoreRegion,
  type StoreVariant,
} from "@the-ecom-buddy/ui";
import { CartProvider, useCart } from "../context/CartContext";

interface ProductDetailClientProps {
  theme: PublicPublishedTheme;
  initialProduct: StoreProduct;
  initialInventory: Record<
    string,
    {
      in_stock: boolean;
      available_quantity: number;
      manage_inventory: boolean;
      allow_backorder: boolean;
      sku: string;
    }
  >;
  relatedProducts: StoreProduct[];
  regions: StoreRegion[];
  initialRegion?: StoreRegion;
}

const ProductDetailContent: React.FC<ProductDetailClientProps> = ({
  theme,
  initialProduct,
  initialInventory,
  relatedProducts = [],
  regions = [],
  initialRegion,
}) => {
  const [currentRegion, setCurrentRegion] = useState<StoreRegion | undefined>(
    initialRegion || regions[0]
  );
  const [product, setProduct] = useState<StoreProduct>(initialProduct);
  const [inventoryMap, setInventoryMap] = useState(initialInventory);
  const [isUpdatingRegion, setIsUpdatingRegion] = useState(false);

  const {
    cart,
    addToCart,
    isAdding,
    itemCount,
    isCartDrawerOpen,
    openCartDrawer,
    closeCartDrawer,
    updateItemQuantity,
    removeItem,
    isMutating,
  } = useCart();

  const presetId = theme.presetId || "crescendo";
  const cardStyle = theme.styling?.cardStyle || "bordered";

  // Handle region switch: reload product with new regional price
  const handleSelectRegion = async (reg: StoreRegion) => {
    setCurrentRegion(reg);
    setIsUpdatingRegion(true);

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
      const key =
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
        "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

      const params = new URLSearchParams({
        handle: product.handle,
        region_id: reg.id,
        limit: "1",
        fields:
          "*variants,*variants.calculated_price,*variants.prices,*variants.options,*options,*options.values,*images,*categories,*collection",
      });

      const res = await fetch(`${backendUrl}/store/products?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": key,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.products?.[0]) {
          setProduct(json.products[0]);
        }
      }
    } catch (err) {
      console.error("[PDP] Failed to update region:", err);
    } finally {
      setIsUpdatingRegion(false);
    }
  };

  const handleAddToCart = async (variant: StoreVariant, qty: number) => {
    return await addToCart(variant, qty);
  };

  const currencyCode = (currentRegion?.currency_code || "inr").toLowerCase();

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

  return (
    <ThemeRoot theme={theme}>
      <div className="min-h-screen flex flex-col bg-[var(--surface-base)] text-[var(--text-primary)]">
        {/* Header */}
        <Header
          theme={theme}
          regions={regions}
          currentRegion={currentRegion}
          cartItemCount={itemCount}
          onOpenCartDrawer={openCartDrawer}
          onSelectRegion={handleSelectRegion}
        />

        {isUpdatingRegion && (
          <div className="fixed top-3 right-4 z-50 px-3 py-1.5 rounded-full bg-[var(--brand-primary)] text-white text-xs font-semibold shadow-lg flex items-center gap-2 animate-pulse">
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Updating Currency...</span>
          </div>
        )}

        {/* Main PDP Grid */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Dual Column Layout: Left Gallery, Right Sticky Info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Image Gallery (6 or 7 cols) */}
            <div className="lg:col-span-7">
              <ProductGallery
                images={product.images || []}
                thumbnail={product.thumbnail}
                title={product.title}
                presetId={presetId}
                cardStyle={cardStyle}
              />
            </div>

            {/* Right Column: Product Info & Purchase Controls (5 cols sticky) */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <ProductInfo
                product={product}
                currentRegion={currentRegion}
                inventoryMap={inventoryMap}
                presetId={presetId}
                onAddToCart={handleAddToCart}
                isAddingToCart={isAdding}
              />
            </div>
          </div>

          {/* Related Products Section */}
          {relatedProducts.length > 0 && (
            <div className="mt-16 sm:mt-24 pt-12 border-t border-[var(--border-subtle)]">
              <div className="mb-8">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                  Complementary Selection
                </span>
                <h2 className="mt-1 font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                  You May Also Like
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {relatedProducts.map((rel) => {
                  const firstVar = rel.variants?.[0];
                  const relPrice = firstVar?.calculated_price?.calculated_amount ?? 0;
                  return (
                    <a
                      key={rel.id}
                      href={`/products/${rel.handle}`}
                      className={`group flex flex-col overflow-hidden transition-all duration-300 ${
                        cardStyle === "bordered" || presetId === "crescendo"
                          ? "rounded-none border border-[var(--border-strong)] bg-[#0B0F19] hover:border-[var(--brand-primary)]"
                          : cardStyle === "tactile" || presetId === "velora"
                          ? "rounded-2xl border border-[var(--border-subtle)] bg-[#FAFAF9] shadow-sm hover:shadow-md hover:border-[var(--brand-accent)]"
                          : cardStyle === "elevated" || presetId === "aero_step"
                          ? "rounded-xl border border-[var(--border-subtle)] bg-[#18181B] shadow-md hover:-translate-y-1 hover:shadow-xl hover:border-red-500"
                          : "rounded-lg border border-[var(--border-subtle)] bg-white shadow-sm hover:shadow-md"
                      }`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-[var(--surface-muted)]">
                        {rel.thumbnail ? (
                          <img
                            src={rel.thumbnail}
                            alt={rel.title}
                            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                            <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                        <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2">
                          {rel.title}
                        </h4>
                        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-baseline justify-between">
                          <span className="text-xs sm:text-sm font-bold font-mono text-[var(--text-primary)]">
                            {formatPrice(relPrice, currencyCode)}
                          </span>
                          <span className="text-[11px] font-medium text-[var(--brand-primary)] group-hover:underline">
                            View &rarr;
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <Footer theme={theme} />
      </div>

      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={closeCartDrawer}
        cart={cart}
        onUpdateQuantity={updateItemQuantity}
        onRemoveItem={removeItem}
        isMutating={isMutating}
        theme={theme}
      />
    </ThemeRoot>
  );
};

export const ProductDetailClient: React.FC<ProductDetailClientProps> = (props) => {
  return (
    <CartProvider currentRegion={props.initialRegion || props.regions[0]}>
      <ProductDetailContent {...props} />
    </CartProvider>
  );
};

