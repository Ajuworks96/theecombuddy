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
  onOpenCartDrawer?: () => void;
  onSelectRegion?: (region: StoreRegion) => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  regions = [],
  currentRegion,
  cartItemCount = 0,
  onOpenCartDrawer,
  onSelectRegion,
  onOpenSearch,
}) => {
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  const { announcement, identity, navigation } = theme;
  const showAnnouncement = announcement?.enabled && !announcementDismissed && announcement?.text;

  return (
    <header className="w-full sticky top-0 z-50 bg-[#FAF9F5]/95 backdrop-blur-md border-b border-stone-200/80 transition-colors">
      {/* 1. Micro Editorial Announcement Bar */}
      {showAnnouncement && (
        <div className="relative bg-[#141312] text-[#E0DBD3] px-4 py-2 text-[10px] sm:text-[11px] font-medium tracking-[0.22em] uppercase text-center flex items-center justify-center transition-all border-b border-stone-800">
          <div className="flex-1 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C28E5C] shrink-0" />
            {announcement.linkUrl ? (
              <a
                href={announcement.linkUrl}
                className="hover:text-white transition-colors"
              >
                <span>{announcement.text}</span>
              </a>
            ) : (
              <span>{announcement.text}</span>
            )}
          </div>
          {announcement.closeable && (
            <button
              type="button"
              onClick={() => setAnnouncementDismissed(true)}
              className="absolute right-4 p-1 rounded text-stone-400 hover:text-white transition-colors"
              aria-label="Dismiss announcement"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* 2. Full-Width Clean Luxury Navigation Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto flex items-center justify-between h-16 sm:h-20 gap-4 lg:gap-8">
          
          {/* Left: Mobile Menu Trigger & Brand Identity */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            {/* Mobile Menu Button - Visible below lg (1024px) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-stone-900 hover:text-[#C28E5C] transition-colors focus:outline-none"
              aria-label="Open navigation menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Pure Typographic Wordmark */}
            <a href="/" className="group flex flex-col focus:outline-none select-none shrink-0">
              <span className="font-serif text-lg sm:text-xl lg:text-2xl font-normal tracking-[0.14em] sm:tracking-[0.16em] uppercase text-stone-950 group-hover:text-[#C28E5C] transition-colors leading-none whitespace-nowrap">
                {identity.storeName || "The Ecom Buddy"}
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.26em] text-stone-400 font-medium mt-1">
                Studio Editions
              </span>
            </a>
          </div>

          {/* Center: Desktop Navigation Links (Single-line, luxury tracking, never wraps) */}
          <nav className="hidden lg:flex items-center justify-center gap-4 xl:gap-7 2xl:gap-9 min-w-0">
            {(navigation?.menuItems || []).map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="relative py-2 text-[11px] xl:text-xs font-medium tracking-[0.15em] xl:tracking-[0.2em] uppercase text-stone-700 hover:text-stone-950 transition-colors whitespace-nowrap flex items-center gap-1.5 group shrink-0"
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] rounded bg-stone-900 text-white">
                    {item.badge}
                  </span>
                )}
                {/* Understated animated underline on hover */}
                <span className="absolute bottom-0 left-0 w-0 h-px bg-stone-950 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          {/* Right: Refined Action Suite (Safe right padding, never clips against scrollbar) */}
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-5 shrink-0 pl-2">
            
            {/* Currency Selector (Minimalist clean pill) */}
            {navigation?.showCurrencyPicker && regions.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                  className="flex items-center gap-1 text-[11px] font-mono tracking-widest uppercase text-stone-700 hover:text-stone-950 py-1 transition-colors focus:outline-none"
                  aria-label="Select currency"
                  aria-expanded={isCurrencyDropdownOpen}
                >
                  <span>{currentRegion?.currency_code || "INR"}</span>
                  <svg
                    className={`w-3 h-3 text-stone-400 transition-transform ${isCurrencyDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isCurrencyDropdownOpen && (
                  <div
                    className="absolute right-0 mt-3 w-48 rounded-xl bg-white border border-stone-200 shadow-xl py-2 z-50 text-xs"
                    onMouseLeave={() => setIsCurrencyDropdownOpen(false)}
                  >
                    <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-stone-400 border-b border-stone-100">
                      Region & Currency
                    </div>
                    {regions.map((reg) => (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => {
                          onSelectRegion?.(reg);
                          setIsCurrencyDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-stone-50 transition-colors ${
                          currentRegion?.id === reg.id
                            ? "text-stone-950 font-semibold bg-stone-50"
                            : "text-stone-600"
                        }`}
                      >
                        <span className="truncate pr-2">{reg.name}</span>
                        <span className="uppercase font-mono text-[10px] text-stone-400">{reg.currency_code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Icon */}
            {navigation?.showSearch && (
              <button
                type="button"
                onClick={onOpenSearch || (() => { window.location.href = "/search"; })}
                className="p-1.5 text-stone-800 hover:text-[#C28E5C] transition-colors focus:outline-none"
                aria-label="Search collection"
              >
                <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            {/* Account Profile */}
            {navigation?.showAccount && (
              <a
                href="/account"
                className="p-1.5 text-stone-800 hover:text-[#C28E5C] transition-colors focus:outline-none"
                aria-label="Client account"
              >
                <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </a>
            )}

            {/* Shopping Bag Button (Editorial Luxury Style: BAG (0)) */}
            {navigation?.showCart && (
              <a
                href="/cart"
                onClick={(e) => {
                  if (onOpenCartDrawer) {
                    e.preventDefault();
                    onOpenCartDrawer();
                  }
                }}
                className="flex items-center gap-2 p-1.5 text-stone-900 hover:text-[#C28E5C] transition-colors focus:outline-none group"
                aria-label={`Shopping bag containing ${cartItemCount} items`}
              >
                <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="text-[11px] font-mono tracking-widest font-semibold uppercase text-stone-900 group-hover:text-[#C28E5C] transition-colors">
                  ({cartItemCount})
                </span>
              </a>
            )}

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
