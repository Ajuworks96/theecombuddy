"use client";

import React, { useEffect } from "react";
import type { PublicPublishedTheme } from "@the-ecom-buddy/types";
import type { StoreRegion } from "./types";

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: PublicPublishedTheme;
  regions?: StoreRegion[];
  currentRegion?: StoreRegion;
  onSelectRegion?: (region: StoreRegion) => void;
  onOpenSearch?: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  theme,
  regions = [],
  currentRegion,
  onSelectRegion,
  onOpenSearch,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xs bg-[var(--surface-base)] border-r border-[var(--border-subtle)] p-6 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div>
              <span className="font-[var(--font-display)] text-lg font-bold text-[var(--text-primary)]">
                {theme.identity.storeName}
              </span>
              {theme.identity.tagline && (
                <p className="text-xs text-[var(--text-muted)] line-clamp-1">{theme.identity.tagline}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-[var(--theme-radius)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Trigger */}
          {theme.navigation?.showSearch && onOpenSearch && (
            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSearch();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--theme-radius)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)] transition-all"
              >
                <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search catalog...</span>
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="mt-6 flex flex-col space-y-1">
            {(theme.navigation?.menuItems || []).map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between px-3 py-2.5 rounded-[var(--theme-radius)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--brand-primary)] transition-colors"
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[var(--brand-accent)] text-white">
                    {item.badge}
                  </span>
                )}
              </a>
            ))}
          </nav>

          {/* Region / Currency Switcher */}
          {theme.navigation?.showCurrencyPicker && regions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Region / Currency
              </label>
              <div className="grid grid-cols-2 gap-2">
                {regions.map((reg) => {
                  const isSelected = currentRegion?.id === reg.id;
                  return (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => {
                        onSelectRegion?.(reg);
                        onClose();
                      }}
                      className={`px-3 py-2 text-xs font-medium rounded-[var(--theme-radius)] border transition-all text-left flex items-center justify-between ${
                        isSelected
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-semibold"
                          : "border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span>{reg.name}</span>
                      <span className="uppercase text-[10px] opacity-75">{reg.currency_code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info in drawer */}
        <div className="pt-6 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] space-y-2">
          {theme.identity.contactPhone && (
            <p className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{theme.identity.contactPhone}</span>
            </p>
          )}
          {theme.identity.contactEmail && (
            <p className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{theme.identity.contactEmail}</span>
            </p>
          )}
          <p className="text-[11px] pt-2 text-[var(--text-muted)] opacity-75">
            Self-Hosted White-Label Store
          </p>
        </div>
      </div>
    </div>
  );
};

