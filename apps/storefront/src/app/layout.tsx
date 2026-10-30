import React from "react";
import type { Metadata } from "next";
import { getPublishedTheme } from "@/lib/medusa-client";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getPublishedTheme();
  const storeName = theme?.identity?.storeName || "The Ecom Buddy";
  const tagline = theme?.identity?.tagline || "Independently Self-Hosted Direct-to-Consumer Platform";
  const description = `${storeName} — ${tagline}. Shop curated authentic products with pan-India express air shipping, cash on delivery, and seamless multi-currency checkout.`;

  return {
    title: {
      default: `${storeName} | ${tagline}`,
      template: `%s | ${storeName}`,
    },
    description,
    icons: {
      icon: theme?.identity?.faviconUrl || "/favicon.ico",
    },
    openGraph: {
      title: storeName,
      description,
      siteName: storeName,
      locale: "en_IN",
      type: "website",
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
