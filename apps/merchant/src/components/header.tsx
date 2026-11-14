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

export function Header({ title, storeName = "The Ecom Buddy" }: HeaderProps) {
  const pathname = usePathname();
  const currentTitle = title || pageTitles[pathname] || "Merchant Console";
  const storefrontUrl =
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    "https://the-ecom-buddy-storefront.vercel.app";

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-2xs">
      {/* Title & Context */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-slate-900 tracking-tight">
          {currentTitle}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* View Storefront Link */}
        <a
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
        >
          <span>View Storefront</span>
          <ExternalLinkIcon size={13} className="text-slate-400" />
        </a>
      </div>
    </header>
  );
}

