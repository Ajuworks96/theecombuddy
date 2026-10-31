"use client";

import React, { useState } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import {
  StorefrontThemeRenderer,
  CartDrawer,
  type StoreProduct,
  type StoreCategory,
  type StoreRegion,
} from "@the-ecom-buddy/ui";
import { CartProvider, useCart } from "../context/CartContext";

interface StorefrontClientProps {
  theme: PublicPublishedTheme;
  initialProducts: StoreProduct[];
  categories: StoreCategory[];
  regions: StoreRegion[];
  initialRegion?: StoreRegion;
}

const StorefrontClientContent: React.FC<StorefrontClientProps> = ({
  theme,
  initialProducts,
  categories,
  regions,
  initialRegion,
}) => {
  const [currentRegion, setCurrentRegion] = useState<StoreRegion | undefined>(
    initialRegion || regions[0]
  );
  const [products, setProducts] = useState<StoreProduct[]>(initialProducts);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const {
    cart,
    itemCount,
    isCartDrawerOpen,
    openCartDrawer,
    closeCartDrawer,
    updateItemQuantity,
    removeItem,
    isMutating,
  } = useCart();

  const handleSelectRegion = async (region: StoreRegion) => {
    setCurrentRegion(region);
    setIsLoadingProducts(true);

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
      const key =
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
        "pk_ff34c9cc987ee5880382dba5c708c0e3613226919f08e1f5e3e43c9fd817266a";

      const params = new URLSearchParams({
        region_id: region.id,
        limit: "24",
        fields:
          "*variants.calculated_price,*variants.prices,*categories,*collection",
      });

      const res = await fetch(`${backendUrl}/store/products?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": key,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.products)) {
          setProducts(json.products);
        }
      }
    } catch (err) {
      console.error("[Storefront] Failed to reload products for region:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  return (
    <div className="relative">
      {isLoadingProducts && (
        <div className="fixed top-2 right-4 z-50 px-3 py-1.5 rounded-full bg-[var(--brand-primary)] text-white text-xs font-semibold shadow-lg flex items-center gap-2 animate-pulse">
          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Updating Currency...</span>
        </div>
      )}

      <StorefrontThemeRenderer
        theme={theme}
        products={products}
        categories={categories}
        regions={regions}
        currentRegion={currentRegion}
        cartItemCount={itemCount}
        onOpenCartDrawer={openCartDrawer}
        onSelectRegion={handleSelectRegion}
      />

      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={closeCartDrawer}
        cart={cart}
        onUpdateQuantity={updateItemQuantity}
        onRemoveItem={removeItem}
        isMutating={isMutating}
        theme={theme}
      />
    </div>
  );
};

export const StorefrontClient: React.FC<StorefrontClientProps> = (props) => {
  return (
    <CartProvider currentRegion={props.initialRegion || props.regions[0]}>
      <StorefrontClientContent {...props} />
    </CartProvider>
  );
};
