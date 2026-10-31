"use client";

import React, { useState } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import {
  ThemeRoot,
  Header,
  Footer,
  CartPageLayout,
  CartDrawer,
  type StoreRegion,
} from "@the-ecom-buddy/ui";
import { CartProvider, useCart } from "../context/CartContext";

interface CartClientProps {
  theme: PublicPublishedTheme;
  regions: StoreRegion[];
  initialRegion?: StoreRegion;
}

const CartClientContent: React.FC<CartClientProps> = ({
  theme,
  regions,
  initialRegion,
}) => {
  const [currentRegion, setCurrentRegion] = useState<StoreRegion | undefined>(
    initialRegion || regions[0]
  );

  const {
    cart,
    itemCount,
    isCartDrawerOpen,
    openCartDrawer,
    closeCartDrawer,
    updateItemQuantity,
    removeItem,
    applyPromotion,
    removePromotion,
    updateCartRegion,
    isMutating,
  } = useCart();

  const handleSelectRegion = async (region: StoreRegion) => {
    setCurrentRegion(region);
    await updateCartRegion(region.id);
  };

  return (
    <ThemeRoot theme={theme}>
      <Header
        theme={theme}
        regions={regions}
        currentRegion={currentRegion}
        cartItemCount={itemCount}
        onOpenCartDrawer={openCartDrawer}
        onSelectRegion={handleSelectRegion}
      />

      <main className="w-full">
        <CartPageLayout
          theme={theme}
          cart={cart}
          currentRegion={currentRegion}
          onUpdateQuantity={updateItemQuantity}
          onRemoveItem={removeItem}
          onApplyPromotion={applyPromotion}
          onRemovePromotion={removePromotion}
          isMutating={isMutating}
        />
      </main>

      <Footer theme={theme} />

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

export const CartClient: React.FC<CartClientProps> = (props) => {
  return (
    <CartProvider currentRegion={props.initialRegion || props.regions[0]}>
      <CartClientContent {...props} />
    </CartProvider>
  );
};
