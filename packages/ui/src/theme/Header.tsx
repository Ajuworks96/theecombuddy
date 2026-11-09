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
    <header className="w-full relative z-40">
      {/* 1. Luxury Editorial Announcement Bar */}
      {showAnnouncement && (
        <div className="relative bg-[#181615] text-[#E6E1D9] px-4 py-2 text-[11px] sm:text-xs font-medium tracking-[0.12em] uppercase text-center flex items-center justify-center transition-all border-b border-stone-800">
          <div className="flex-1 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C28E5C] animate-pulse shrink-0" />
            {announcement.linkUrl ? (
              <a
                href={announcement.linkUrl}
                className="hover:text-white hover:underline flex items-center gap-1.5 focus:outline-none transition-colors"
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
              className="absolute right-3 p-1 rounded text-stone-400 hover:text-white hover:bg-white/10 focus:outline-none transition-colors"
              aria-label="Dismiss announcement"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* 2. Floating Frosted Luxury Navigation Bar */}
      <div className="w-full px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
        <div className="max-w-7xl mx-auto rounded-2xl bg-white/95 backdrop-blur-xl border border-stone-200/90 shadow-[0_10px_35px_-5px_rgba(28,25,23,0.06)] px-4 sm:px-6 py-2.5 sm:py-3 transition-all">
          <div className="flex items-center justify-between gap-4 h-12 sm:h-14">
            
            {/* Left: Mobile Drawer Toggle & Brand Identity */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* Mobile Drawer Toggle (Visible on screens below lg) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-[#C28E5C] transition-colors"
                aria-label="Open navigation menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Brand Link */}
              <a href="/" className="flex items-center gap-3 group focus:outline-none select-none">
                {/* Brand Monogram Badge */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1C1917] text-[#C28E5C] border border-stone-800 flex items-center justify-center p-1.5 shrink-0 shadow-xs group-hover:scale-[1.02] transition-transform">
                  {identity.logoUrl ? (
                    <img
                      src={identity.logoUrl}
                      alt={identity.storeName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="font-serif font-bold text-base sm:text-lg tracking-wider">
                      {identity.storeName ? identity.storeName.charAt(0) : "T"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-950 group-hover:text-[#C28E5C] transition-colors leading-tight">
                    {identity.storeName || "The Ecom Buddy"}
                  </span>
                  {identity.tagline && (
                    <span className="hidden sm:block text-[10px] tracking-[0.06em] text-stone-500 line-clamp-1">
                      {identity.tagline}
                    </span>
                  )}
                </div>
              </a>
            </div>

            {/* Middle: Desktop Nav Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {(navigation?.menuItems || []).map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className="px-3.5 py-2 text-[13px] font-semibold tracking-[0.03em] text-stone-700 hover:text-stone-950 hover:bg-stone-100/80 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-[#C28E5C] text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </a>
              ))}
            </nav>

            {/* Right: Actions Toolbar */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* Currency Picker */}
              {navigation?.showCurrencyPicker && regions.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-200/90 bg-stone-50/80 text-stone-800 hover:border-[#C28E5C] hover:bg-white transition-all focus:outline-none"
                    aria-label="Select currency and region"
                    aria-expanded={isCurrencyDropdownOpen}
                  >
                    <span className="uppercase font-mono text-[11px]">{currentRegion?.currency_code || "INR"}</span>
                    <svg
                      className={`w-3.5 h-3.5 text-stone-500 transition-transform ${isCurrencyDropdownOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isCurrencyDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-52 rounded-xl bg-white border border-stone-200 shadow-xl py-1.5 z-50 text-xs"
                      onMouseLeave={() => setIsCurrencyDropdownOpen(false)}
                    >
                      <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100">
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
                          className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-stone-50 transition-colors ${
                            currentRegion?.id === reg.id
                              ? "text-[#C28E5C] font-semibold bg-stone-50"
                              : "text-stone-700"
                          }`}
                        >
                          <span className="truncate pr-2">{reg.name}</span>
                          <span className="uppercase font-mono text-[11px] text-stone-400">{reg.currency_code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search Button */}
              {navigation?.showSearch && (
                <button
                  type="button"
                  onClick={onOpenSearch || (() => { window.location.href = "/search"; })}
                  className="p-2 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-stone-100 focus:outline-none transition-colors shrink-0"
                  aria-label="Search catalog"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}

              {/* Account Profile Button */}
              {navigation?.showAccount && (
                <a
                  href="/account"
                  className="p-2 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-stone-100 focus:outline-none transition-colors shrink-0"
                  aria-label="Customer account"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </a>
              )}

              {/* Cart Button with Luxury Badge */}
              {navigation?.showCart && (
                <a
                  href="/cart"
                  onClick={(e) => {
                    if (onOpenCartDrawer) {
                      e.preventDefault();
                      onOpenCartDrawer();
                    }
                  }}
                  className="relative p-2 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-stone-100 focus:outline-none transition-colors shrink-0"
                  aria-label={`Shopping bag (${cartItemCount} items)`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span
                    className={`absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-[#C28E5C] text-white text-[10px] font-bold flex items-center justify-center transition-all shadow-xs ${
                      cartItemCount > 0 ? "scale-100 ring-2 ring-white" : "scale-90 opacity-75"
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
