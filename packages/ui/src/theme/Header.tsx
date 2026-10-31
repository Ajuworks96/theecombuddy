"use client";

import React, { useState } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import { MobileNavDrawer } from "./MobileNavDrawer";
import type { StoreRegion } from "./types";

interface HeaderProps {
  theme: PublicPublishedTheme;
  regions?: StoreRegion[];
  currentRegion?: StoreRegion;
  cartItemCount?: number;
  onSelectRegion?: (region: StoreRegion) => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  regions = [],
  currentRegion,
  cartItemCount = 0,
  onSelectRegion,
  onOpenSearch,
}) => {
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  const { announcement, identity, navigation, styling } = theme;
  const showAnnouncement = announcement?.enabled && !announcementDismissed && announcement?.text;

  // Header style classes
  const headerStyle = styling?.headerStyle || "sticky";
  const headerContainerClass =
    headerStyle === "floating"
      ? "mx-auto max-w-7xl mt-3 px-4 sm:px-6 rounded-[var(--theme-radius)] shadow-lg border border-[var(--border-subtle)]"
      : headerStyle === "minimal"
      ? "border-b border-[var(--border-subtle)]"
      : headerStyle === "stacked"
      ? "border-b border-[var(--border-subtle)]"
      : "sticky top-0 z-40 border-b border-[var(--border-subtle)] shadow-sm backdrop-blur-md";

  return (
    <header className="w-full relative z-40">
      {/* 1. Announcement Bar */}
      {showAnnouncement && (
        <div
          style={{
            backgroundColor: announcement.bgColor || "var(--brand-primary)",
            color: announcement.textColor || "#FFFFFF",
          }}
          className="relative px-4 py-2.5 text-xs sm:text-sm font-medium text-center flex items-center justify-center transition-all"
        >
          <div className="flex-1 flex items-center justify-center gap-2">
            {announcement.linkUrl ? (
              <a
                href={announcement.linkUrl}
                className="hover:underline flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-white"
              >
                <span>{announcement.text}</span>
                <span aria-hidden="true">&rarr;</span>
              </a>
            ) : (
              <span>{announcement.text}</span>
            )}
          </div>
          {announcement.closeable && (
            <button
              type="button"
              onClick={() => setAnnouncementDismissed(true)}
              className="absolute right-3 p-1 rounded hover:bg-black/10 focus:outline-none transition-colors"
              aria-label="Dismiss announcement"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* 2. Main Navigation Bar */}
      <div
        style={{
          backgroundColor: "var(--header-bg)",
          color: "var(--header-text)",
        }}
        className={`${headerContainerClass} transition-colors`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Mobile Menu Button & Brand */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-[var(--theme-radius)] text-[var(--header-text)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                aria-label="Open mobile menu"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Store Brand / Logo */}
              <a href="/" className="flex items-center gap-3 group focus:outline-none">
                {identity.logoUrl && (
                  <div className="w-9 h-9 rounded-[var(--theme-radius)] bg-[var(--brand-primary)]/10 flex items-center justify-center p-1.5 border border-[var(--brand-primary)]/20">
                    <img
                      src={identity.logoUrl}
                      alt={identity.storeName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-[var(--font-display)] text-lg sm:text-xl font-bold tracking-tight text-[var(--header-text)] group-hover:text-[var(--brand-primary)] transition-colors">
                    {identity.storeName}
                  </span>
                  {identity.tagline && (
                    <span className="hidden sm:block text-[11px] text-[var(--text-muted)] tracking-wide line-clamp-1">
                      {identity.tagline}
                    </span>
                  )}
                </div>
              </a>
            </div>

            {/* Middle: Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {(navigation?.menuItems || []).map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-[var(--header-text)]/85 hover:text-[var(--brand-primary)] hover:bg-[var(--surface-subtle)] rounded-[var(--theme-radius)] transition-colors flex items-center gap-1.5"
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-[var(--brand-accent)] text-white">
                      {item.badge}
                    </span>
                  )}
                </a>
              ))}
            </nav>

            {/* Right: Actions Toolbar */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Currency Picker */}
              {navigation?.showCurrencyPicker && regions.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-[var(--theme-radius)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--header-text)] hover:border-[var(--brand-primary)] transition-all focus:outline-none"
                    aria-label="Select currency and region"
                    aria-expanded={isCurrencyDropdownOpen}
                  >
                    <span className="uppercase">{currentRegion?.currency_code || "INR"}</span>
                    <svg className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${isCurrencyDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isCurrencyDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-48 rounded-[var(--theme-radius)] bg-[var(--surface-base)] border border-[var(--border-subtle)] shadow-xl py-1 z-50 text-xs"
                      onMouseLeave={() => setIsCurrencyDropdownOpen(false)}
                    >
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                        Select Region & Currency
                      </div>
                      {regions.map((reg) => (
                        <button
                          key={reg.id}
                          type="button"
                          onClick={() => {
                            onSelectRegion?.(reg);
                            setIsCurrencyDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[var(--surface-subtle)] transition-colors ${
                            currentRegion?.id === reg.id
                              ? "text-[var(--brand-primary)] font-semibold bg-[var(--brand-primary)]/5"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          <span>{reg.name}</span>
                          <span className="uppercase font-mono text-[11px]">{reg.currency_code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search Icon */}
              {navigation?.showSearch && onOpenSearch && (
                <button
                  type="button"
                  onClick={onOpenSearch}
                  className="p-2 rounded-[var(--theme-radius)] text-[var(--header-text)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-colors"
                  aria-label="Search catalog"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}

              {/* Account Icon */}
              {navigation?.showAccount && (
                <a
                  href="/account"
                  className="p-2 rounded-[var(--theme-radius)] text-[var(--header-text)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-colors"
                  aria-label="Customer account"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </a>
              )}

              {/* Cart Button */}
              {navigation?.showCart && (
                <a
                  href="/cart"
                  className="relative p-2 rounded-[var(--theme-radius)] text-[var(--header-text)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-colors"
                  aria-label={`Shopping bag (${cartItemCount} items)`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span
                    className={`absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-bold flex items-center justify-center transition-all ${
                      cartItemCount > 0 ? "scale-100 ring-2 ring-[var(--surface-base)]" : "scale-90 opacity-60"
                    }`}
                  >
                    {cartItemCount}
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        theme={theme}
        regions={regions}
        currentRegion={currentRegion}
        cartItemCount={cartItemCount}
        onSelectRegion={onSelectRegion}
        onOpenSearch={onOpenSearch}
      />
    </header>
  );
};

