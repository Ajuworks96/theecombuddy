"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import {
  ThemeRoot,
  Header,
  Footer,
  CartDrawer,
  type StoreRegion,
} from "@the-ecom-buddy/ui";
import { useCart } from "../context/CartContext";

export interface PolicyPageLayoutProps {
  theme: PublicPublishedTheme;
  regions?: StoreRegion[];
  initialRegion?: StoreRegion;
  title: string;
  content: string;
  updatedAt?: string;
}

export const PolicyPageLayout: React.FC<PolicyPageLayoutProps> = ({
  theme,
  regions = [],
  initialRegion,
  title,
  content,
  updatedAt,
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
    isMutating,
  } = useCart();

  const handleSelectRegion = (region: StoreRegion) => {
    setCurrentRegion(region);
  };

  // Convert simple markdown headings and paragraphs into JSX
  const renderFormattedContent = (rawText: string) => {
    const lines = rawText.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="h-4" />;
      }
      if (trimmed.startsWith("### ")) {
        return (
          <h3
            key={idx}
            className="text-lg font-bold text-[var(--text-primary)] mt-6 mb-2 tracking-tight"
          >
            {trimmed.substring(4)}
          </h3>
        );
      }
      if (trimmed.startsWith("## ")) {
        return (
          <h2
            key={idx}
            className="text-xl font-bold text-[var(--text-primary)] mt-8 mb-3 tracking-tight"
          >
            {trimmed.substring(3)}
          </h2>
        );
      }
      if (trimmed.startsWith("# ")) {
        return (
          <h1
            key={idx}
            className="text-2xl font-bold text-[var(--text-primary)] mt-8 mb-4 tracking-tight"
          >
            {trimmed.substring(2)}
          </h1>
        );
      }
      return (
        <p
          key={idx}
          className="text-sm leading-relaxed text-[var(--text-secondary)] mb-3"
        >
          {trimmed}
        </p>
      );
    });
  };

  return (
    <ThemeRoot theme={theme}>
      <div className="min-h-screen flex flex-col bg-[var(--surface-base)] text-[var(--text-primary)] antialiased font-[family-name:var(--font-body)]">
        <Header
          theme={theme}
          cartItemCount={itemCount}
          onOpenCartDrawer={openCartDrawer}
          regions={regions}
          currentRegion={currentRegion}
          onSelectRegion={handleSelectRegion}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-6 font-medium">
            <Link href="/" className="hover:text-[var(--brand-primary)] transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-[var(--text-primary)]">{title}</span>
          </nav>

          {/* Policy Article Container */}
          <article className="bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--theme-radius)] p-6 sm:p-10 shadow-sm">
            <header className="border-b border-[var(--border-subtle)] pb-6 mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-[family-name:var(--font-display)] tracking-tight">
                {title}
              </h1>
              {updatedAt && (
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Last updated:{" "}
                  {new Date(updatedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </header>

            <div className="prose prose-slate max-w-none">
              {renderFormattedContent(content)}
            </div>
          </article>
        </main>

        <Footer theme={theme} />

        <CartDrawer
          theme={theme}
          isOpen={isCartDrawerOpen}
          onClose={closeCartDrawer}
          cart={cart}
          onUpdateQuantity={updateItemQuantity}
          onRemoveItem={removeItem}
          isMutating={isMutating}
        />
      </div>
    </ThemeRoot>
  );
};
