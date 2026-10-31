"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import {
  ThemeRoot,
  Header,
  Footer,
  CheckoutLayout,
  type StoreRegion,
  type StoreShippingOption,
  type StoreCartAddress,
} from "@the-ecom-buddy/ui";
import { CartProvider, useCart } from "../context/CartContext";

interface CheckoutClientProps {
  theme: PublicPublishedTheme;
  regions: StoreRegion[];
  initialRegion?: StoreRegion;
}

const CheckoutClientContent: React.FC<CheckoutClientProps> = ({
  theme,
  regions,
  initialRegion,
}) => {
  const [currentRegion, setCurrentRegion] = useState<StoreRegion | undefined>(
    initialRegion || regions[0]
  );
  const [shippingOptions, setShippingOptions] = useState<StoreShippingOption[]>([]);

  const {
    cart,
    itemCount,
    applyPromotion,
    removePromotion,
    updateCartRegion,
    clearCart,
  } = useCart();

  // Load shipping options whenever cart is available
  const loadShippingOptions = useCallback(async (cartId: string) => {
    if (!cartId) return;
    try {
      const res = await fetch(`/api/cart/shipping-options?cart_id=${encodeURIComponent(cartId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.shipping_options)) {
          setShippingOptions(data.shipping_options);
        }
      }
    } catch (err) {
      console.warn("[CheckoutClient] Failed to load shipping options:", err);
    }
  }, []);

  useEffect(() => {
    if (cart?.id) {
      loadShippingOptions(cart.id);
    }
  }, [cart?.id, loadShippingOptions]);

  const handleSelectRegion = async (region: StoreRegion) => {
    setCurrentRegion(region);
    await updateCartRegion(region.id);
  };

  const handleUpdateAddress = async (data: {
    email: string;
    shipping_address: StoreCartAddress;
    billing_address: StoreCartAddress;
  }): Promise<boolean> => {
    if (!cart?.id) return false;
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_id: cart.id,
          email: data.email,
          shipping_address: data.shipping_address,
          billing_address: data.billing_address,
        }),
      });

      if (!res.ok) return false;
      const json = await res.json();
      if (json.cart) {
        // Refresh shipping options for newly set address
        await loadShippingOptions(cart.id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleSelectShippingOption = async (optionId: string): Promise<boolean> => {
    if (!cart?.id || !optionId) return false;
    try {
      const res = await fetch("/api/cart/shipping-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_id: cart.id,
          option_id: optionId,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleSubmitOrder = async (data: {
    paymentProviderId: string;
    deliveryInstructions?: string;
  }): Promise<{ success: boolean; orderId?: string; displayId?: number; error?: string }> => {
    if (!cart?.id) {
      return { success: false, error: "Shopping bag has expired. Please return to bag." };
    }

    try {
      // 1. Initialize payment collection & payment session
      const payRes = await fetch("/api/cart/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_id: cart.id,
          provider_id: data.paymentProviderId,
        }),
      });

      const payData = await payRes.json();
      if (!payRes.ok) {
        return {
          success: false,
          error: payData.error || "Failed to initialize payment gateway.",
        };
      }

      // 2. Complete cart to create order
      const compRes = await fetch("/api/cart/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart_id: cart.id,
        }),
      });

      const compData = await compRes.json();
      if (!compRes.ok || compData.type !== "order" || !compData.order?.id) {
        return {
          success: false,
          error: compData.error || "Order completion could not be finalized.",
        };
      }

      // Order placed successfully! Clear active bag
      clearCart();

      return {
        success: true,
        orderId: compData.order.id,
        displayId: compData.order.display_id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "An unexpected error occurred during order completion.",
      };
    }
  };

  return (
    <ThemeRoot theme={theme}>
      <Header
        theme={theme}
        regions={regions}
        currentRegion={currentRegion}
        cartItemCount={itemCount}
        onSelectRegion={handleSelectRegion}
      />

      <main className="w-full">
        {(!cart || (cart.items || []).length === 0) ? (
          <div className="max-w-xl mx-auto my-16 p-8 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-center space-y-4">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Your Shopping Bag Is Empty</h2>
            <p className="text-xs text-[var(--text-muted)]">
              You must have at least one item in your shopping bag to proceed through checkout.
            </p>
            <div className="pt-2">
              <a
                href="/"
                className="inline-block py-2.5 px-6 rounded-[var(--theme-radius)] bg-[var(--brand-primary)] text-white text-xs font-bold hover:opacity-95"
              >
                Return to Shop
              </a>
            </div>
          </div>
        ) : (
          <CheckoutLayout
            theme={theme}
            cart={cart}
            regions={regions}
            currentRegion={currentRegion}
            shippingOptions={shippingOptions}
            onSelectShippingOption={handleSelectShippingOption}
            onUpdateCartAddress={handleUpdateAddress}
            onApplyPromotion={applyPromotion}
            onRemovePromotion={removePromotion}
            onSubmitOrder={handleSubmitOrder}
          />
        )}
      </main>

      <Footer theme={theme} />
    </ThemeRoot>
  );
};

export const CheckoutClient: React.FC<CheckoutClientProps> = (props) => {
  return (
    <CartProvider currentRegion={props.initialRegion || props.regions[0]}>
      <CheckoutClientContent {...props} />
    </CartProvider>
  );
};
