"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { StoreCart, StoreVariant, StoreRegion } from "@the-ecom-buddy/ui";

interface CartContextValue {
  cart: StoreCart | null;
  itemCount: number;
  isAdding: boolean;
  isMutating: boolean;
  cartError: string | null;
  successToast: string | null;
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  addToCart: (variant: StoreVariant, quantity: number) => Promise<boolean>;
  updateItemQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  applyPromotion: (code: string) => Promise<boolean>;
  removePromotion: (code: string) => Promise<boolean>;
  updateCartRegion: (newRegionId: string) => Promise<void>;
  clearCart: () => void;
  clearCartError: () => void;
  clearSuccessToast: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CART_STORAGE_KEY = "teb_cart_id";

export const CartProvider: React.FC<{
  children: React.ReactNode;
  currentRegion?: StoreRegion;
}> = ({ children, currentRegion }) => {
  const [cart, setCart] = useState<StoreCart | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const regionId = currentRegion?.id;

  // Initialize or hydrate cart from localStorage
  useEffect(() => {
    let isMounted = true;

    async function initCart() {
      if (typeof window === "undefined") return;

      const urlParams = new URLSearchParams(window.location.search);
      const urlCartId = urlParams.get("cart_id");
      if (urlCartId) {
        localStorage.setItem(CART_STORAGE_KEY, urlCartId);
      }

      const storedCartId = urlCartId || localStorage.getItem(CART_STORAGE_KEY);
      if (storedCartId) {
        try {
          const res = await fetch(`/api/cart?cart_id=${encodeURIComponent(storedCartId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.cart) {
              // If cart is already completed, clear storage and initialize fresh
              if (data.cart.completed_at) {
                localStorage.removeItem(CART_STORAGE_KEY);
                return;
              }

              // Check region consistency: preserve cart by updating region on server
              if (regionId && data.cart.region_id !== regionId) {
                const updateRes = await fetch("/api/cart", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ cart_id: storedCartId, region_id: regionId }),
                });

                if (updateRes.ok) {
                  const updateData = await updateRes.json();
                  if (isMounted && updateData.cart) {
                    setCart(updateData.cart);
                    return;
                  }
                }
              }

              if (isMounted) {
                setCart(data.cart);
                return;
              }
            }
          } else if (res.status === 404) {
            // Expired or invalid cart in storage
            localStorage.removeItem(CART_STORAGE_KEY);
          }
        } catch {
          // Fall through
        }
      }
    }

    initCart();

    return () => {
      isMounted = false;
    };
  }, [regionId]);

  // Market switching: update cart region safely without losing items
  const updateCartRegion = useCallback(
    async (newRegionId: string) => {
      if (!newRegionId) return;
      const activeCartId = cart?.id || (typeof window !== "undefined" ? localStorage.getItem(CART_STORAGE_KEY) : null);
      if (!activeCartId) return;

      setIsMutating(true);
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cart_id: activeCartId, region_id: newRegionId }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.cart) {
            setCart(data.cart);
          }
        }
      } catch (err: any) {
        console.warn("[CartContext] updateCartRegion error:", err.message);
      } finally {
        setIsMutating(false);
      }
    },
    [cart]
  );

  const addToCart = useCallback(
    async (variant: StoreVariant, quantity: number): Promise<boolean> => {
      if (!variant?.id || quantity < 1) return false;

      setIsAdding(true);
      setCartError(null);

      try {
        let activeCartId = cart?.id || (typeof window !== "undefined" ? localStorage.getItem(CART_STORAGE_KEY) : null);

        // If no active cart, initialize new cart
        if (!activeCartId) {
          const createRes = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ region_id: regionId }),
          });

          if (!createRes.ok) {
            throw new Error("Unable to create cart for current market");
          }

          const createData = await createRes.json();
          if (!createData.cart?.id) {
            throw new Error("Failed to initialize shopping bag");
          }

          activeCartId = createData.cart.id;
          localStorage.setItem(CART_STORAGE_KEY, activeCartId!);
          setCart(createData.cart);
        }

        // Add line item
        const addRes = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart_id: activeCartId,
            variant_id: variant.id,
            quantity,
          }),
        });

        const addData = await addRes.json();

        if (!addRes.ok) {
          const errMsg = addData.error || "Item cannot be added to bag due to stock limitations";
          setCartError(errMsg);
          setTimeout(() => setCartError(null), 4000);
          return false;
        }

        if (addData.cart) {
          setCart(addData.cart);
          setSuccessToast(`Added ${quantity} × ${variant.title} to your bag`);
          setTimeout(() => setSuccessToast(null), 3000);
          return true;
        }

        return false;
      } catch (err: any) {
        const msg = err.message || "Failed to add item to bag";
        setCartError(msg);
        setTimeout(() => setCartError(null), 4000);
        return false;
      } finally {
        setIsAdding(false);
      }
    },
    [cart, regionId]
  );

  const updateItemQuantity = useCallback(
    async (lineId: string, quantity: number) => {
      const activeCartId = cart?.id || (typeof window !== "undefined" ? localStorage.getItem(CART_STORAGE_KEY) : null);
      if (!activeCartId || !lineId || quantity < 1) return;

      setIsMutating(true);
      setCartError(null);

      try {
        const res = await fetch("/api/cart/items", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart_id: activeCartId,
            line_id: lineId,
            quantity,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update item quantity");
        }

        if (data.cart) {
          setCart(data.cart);
        }
      } catch (err: any) {
        setCartError(err.message || "Failed to update quantity");
        setTimeout(() => setCartError(null), 4000);
      } finally {
        setIsMutating(false);
      }
    },
    [cart]
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      const activeCartId = cart?.id || (typeof window !== "undefined" ? localStorage.getItem(CART_STORAGE_KEY) : null);
      if (!activeCartId || !lineId) return;

      setIsMutating(true);
      setCartError(null);

      try {
        const res = await fetch("/api/cart/items", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart_id: activeCartId,
            line_id: lineId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to remove item");
        }

        if (data.cart) {
          setCart(data.cart);
        }
      } catch (err: any) {
        setCartError(err.message || "Failed to remove item");
        setTimeout(() => setCartError(null), 4000);
      } finally {
        setIsMutating(false);
      }
    },
    [cart]
  );

  const applyPromotion = useCallback(
    async (code: string): Promise<boolean> => {
      const activeCartId = cart?.id || (typeof window !== "undefined" ? localStorage.getItem(CART_STORAGE_KEY) : null);
      if (!activeCartId || !code.trim()) return false;

      setIsMutating(true);
      try {
        const res = await fetch("/api/cart/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart_id: activeCartId,
            promo_code: code.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          return false;
        }

        if (data.cart) {
          setCart(data.cart);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [cart]
  );

  const removePromotion = useCallback(
    async (code: string): Promise<boolean> => {
      const activeCartId = cart?.id || (typeof window !== "undefined" ? localStorage.getItem(CART_STORAGE_KEY) : null);
      if (!activeCartId || !code.trim()) return false;

      setIsMutating(true);
      try {
        const res = await fetch("/api/cart/promotions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart_id: activeCartId,
            promo_code: code.trim(),
          }),
        });

        const data = await res.json();
        if (data.cart) {
          setCart(data.cart);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [cart]
  );

  const clearCart = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
    setCart(null);
  }, []);

  const itemCount = (cart?.items || []).reduce((acc, item) => acc + (item.quantity || 1), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        isAdding,
        isMutating,
        cartError,
        successToast,
        isCartDrawerOpen,
        openCartDrawer: () => setIsCartDrawerOpen(true),
        closeCartDrawer: () => setIsCartDrawerOpen(false),
        addToCart,
        updateItemQuantity,
        removeItem,
        applyPromotion,
        removePromotion,
        updateCartRegion,
        clearCart,
        clearCartError: () => setCartError(null),
        clearSuccessToast: () => setSuccessToast(null),
      }}
    >
      {children}

      {/* Global Toast Notifications */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-[var(--theme-radius)] bg-emerald-600 text-white shadow-2xl flex items-center gap-3 animate-slide-up text-xs font-semibold">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successToast}</span>
        </div>
      )}

      {cartError && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-[var(--theme-radius)] bg-red-600 text-white shadow-2xl flex items-center gap-3 animate-slide-up text-xs font-semibold">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{cartError}</span>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
};
