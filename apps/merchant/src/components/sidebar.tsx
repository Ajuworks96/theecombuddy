"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DashboardIcon,
  ProductsIcon,
  CategoriesIcon,
  CollectionsIcon,
  InventoryIcon,
  OrdersIcon,
  CustomersIcon,
  DiscountsIcon,
  GlobeIcon,
  AppearanceIcon,
  AnalyticsIcon,
  SettingsIcon,
  LogOutIcon,
  PackageIcon,
} from "./icons";
import { merchantConfig } from "../config/merchant.config";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
  isImplemented?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Core Commerce",
    items: [
      { label: "Overview", href: "/", icon: DashboardIcon, isImplemented: true },
      { label: "Products", href: "/products", icon: ProductsIcon, badge: 520, isImplemented: true },
      { label: "Categories", href: "/categories", icon: CategoriesIcon },
      { label: "Collections", href: "/collections", icon: CollectionsIcon },
      { label: "Inventory", href: "/inventory", icon: InventoryIcon, badge: "1.2k" },
      { label: "Orders", href: "/orders", icon: OrdersIcon, badge: 3 },
      { label: "Customers", href: "/customers", icon: CustomersIcon },
    ],
  },
  {
    title: "Marketing & Growth",
    items: [
      { label: "Discounts", href: "/discounts", icon: DiscountsIcon },
      { label: "Global Selling", href: "/global-selling", icon: GlobeIcon, badge: "5 Reg" },
    ],
  },
  {
    title: "Store Management",
    items: [
      { label: "Store Appearance", href: "/appearance", icon: AppearanceIcon },
      { label: "Analytics", href: "/analytics", icon: AnalyticsIcon },
      { label: "Settings", href: "/settings", icon: SettingsIcon, isImplemented: true },
    ],
  },
];

interface SidebarProps {
  userEmail?: string;
}

export function Sidebar({ userEmail = "admin@theecombuddy.local" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside className="w-64 bg-[#0B0F19] border-r border-slate-800/80 flex flex-col shrink-0 select-none min-h-screen text-slate-300">
      {/* Brand & Store Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/60 bg-[#090D16]">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0">
            {merchantConfig.shortName.slice(0, 2)}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-bold text-white tracking-tight truncate">
              {merchantConfig.name}
            </span>
            <span className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">
              Admin Backoffice
            </span>
          </div>
        </Link>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 uppercase">
          v1.0
        </span>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section, sIdx) => (
          <div key={sIdx}>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {section.title}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white font-semibold shadow-xs"
                          : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={16}
                          className={`shrink-0 ${
                            isActive
                              ? "text-white"
                              : "text-slate-500 group-hover:text-slate-300"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                            isActive
                              ? "bg-blue-700 text-white"
                              : "bg-slate-800 text-slate-400 group-hover:text-slate-300"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer / User Profile & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-[#090D16]">
        <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
              {userEmail.slice(0, 1).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="text-[11px] font-medium text-white truncate">
                {userEmail}
              </div>
              <div className="text-[9px] text-emerald-400 font-medium">
                Self-Hosted Active
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Log out of merchant console"
            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOutIcon size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

