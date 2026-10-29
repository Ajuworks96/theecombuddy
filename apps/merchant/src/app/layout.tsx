import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { merchantConfig } from "@/config/merchant.config";

export const metadata: Metadata = {
  title: {
    default: `${merchantConfig.name} — Merchant Console`,
    template: `%s | ${merchantConfig.name} Console`,
  },
  description: merchantConfig.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="h-full font-sans text-slate-900 bg-slate-50 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
