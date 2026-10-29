"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLinkIcon, RefreshIcon } from "./icons";
import { merchantConfig } from "../config/merchant.config";

interface HeaderProps {
  title?: string;
  storeName?: string;
}

const pageTitles: Record<string, string> = {
  "/": "Overview & Business Pulse",
  "/products": "Catalog & Product Matrix",
  "/categories": "Taxonomy & Categories",
  "/collections": "Curated Collections",
  "/inventory": "Stock & Inventory Control",
  "/orders": "Orders & Fulfillment",
  "/customers": "Customer Directory",
  "/discounts": "Promotions & Discounts",
  "/global-selling": "International Markets & Multi-Currency",
  "/appearance": "Storefront Theme & Layout",
  "/analytics": "Revenue & Traffic Analytics",
  "/settings": "Platform & White-Label Settings",
};

export function Header({ title, storeName = "Medusa Store" }: HeaderProps) {
  const pathname = usePathname();
  const currentTitle = title || pageTitles[pathname] || "Merchant Console";

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-2xs">
      {/* Title & Context */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-slate-900 tracking-tight">
          {currentTitle}
        </h1>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Medusa v2 Connected
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Active Market Pill */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Primary Market:
          </span>
          <span className="font-semibold text-slate-900">
            India ({merchantConfig.localization.defaultCurrency})
          </span>
        </div>

        {/* Payment Guard Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Razorpay: Sandbox (Zero-Mock)</span>
        </div>

        {/* View Storefront Link */}
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
        >
          <span>Storefront</span>
          <ExternalLinkIcon size={13} className="text-slate-400" />
        </a>
      </div>
    </header>
  );
}

