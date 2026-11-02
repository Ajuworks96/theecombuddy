"use client";

import React, { useState } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import {
  ThemeRoot,
  Header,
  Footer,
  CartDrawer,
  type StoreRegion,
} from "@the-ecom-buddy/ui";
import { useCustomer } from "../context/CustomerContext";
import { useCart } from "../context/CartContext";

export interface AccountLayoutProps {
  theme: PublicPublishedTheme;
  regions?: StoreRegion[];
  initialRegion?: StoreRegion;
  activeTab?: "dashboard" | "orders" | "addresses" | "profile";
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const AccountLayout: React.FC<AccountLayoutProps> = ({
  theme,
  regions = [],
  initialRegion,
  activeTab = "dashboard",
  title,
  subtitle,
  children,
}) => {
  const [currentRegion, setCurrentRegion] = useState<StoreRegion | undefined>(
    initialRegion || regions[0]
  );

  const { customer, isAuthenticated, isLoading, logout } = useCustomer();
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

  const navItems = [
    {
      id: "dashboard",
      label: "Account Overview",
      href: "/account",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "orders",
      label: "Order History",
      href: "/account/orders",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      id: "addresses",
      label: "Saved Addresses",
      href: "/account/addresses",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: "profile",
      label: "Profile & Security",
      href: "/account/profile",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <ThemeRoot theme={theme}>
      <div className="min-h-screen flex flex-col bg-[var(--surface-base)] text-[var(--text-primary)]">
        <Header
          theme={theme}
          regions={regions}
          currentRegion={currentRegion}
          cartItemCount={itemCount}
          onOpenCartDrawer={openCartDrawer}
          onSelectRegion={handleSelectRegion}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header Banner */}
          <div className="mb-8 border-b border-[var(--border-subtle)] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2 font-medium">
                <a href="/" className="hover:text-[var(--brand-primary)] transition-colors">Home</a>
                <span>/</span>
                <span className="text-[var(--text-primary)]">My Account</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {title || (customer ? `Hello, ${customer.first_name || customer.email.split("@")[0]}` : "My Account")}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {subtitle}
                </p>
              )}
            </div>

            {isAuthenticated && (
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  window.location.href = "/login";
                }}
                className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-red-600 hover:border-red-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            )}
          </div>

          {/* Account Body Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar Navigation */}
            <nav className="lg:col-span-1" aria-label="Account Navigation">
              {/* Desktop Nav Sidebar */}
              <div className="hidden lg:flex flex-col gap-1.5 p-3 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--theme-radius)] text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[var(--brand-primary)] text-white shadow-sm font-semibold"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-base)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className={isActive ? "text-white" : "text-[var(--text-muted)]"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </a>
                  );
                })}

                <div className="my-2 border-t border-[var(--border-subtle)]" />

                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    window.location.href = "/login";
                  }}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--theme-radius)] text-sm font-medium text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-600 transition-all text-left"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Mobile Navigation Tabs Pills */}
              <div className="flex lg:hidden overflow-x-auto gap-2 pb-2 scrollbar-none" role="tablist">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      role="tab"
                      aria-selected={isActive}
                      className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                        isActive
                          ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm"
                          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                      }`}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </div>
            </nav>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {children}
            </div>
          </div>
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
