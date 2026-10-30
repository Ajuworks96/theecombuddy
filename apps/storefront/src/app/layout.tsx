import React from "react";
import type { Metadata } from "next";
import { getPublishedTheme } from "@/lib/medusa-client";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getPublishedTheme();
  const storeName = theme?.identity?.storeName || "The Ecom Buddy";
  const tagline = theme?.identity?.tagline || "Independently Self-Hosted Direct-to-Consumer Platform";
  const description = `${storeName} — ${tagline}. Shop curated authentic catalog items with multi-currency pricing, direct order tracking, and cash on delivery.`;
  const siteUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${storeName} | ${tagline}`,
      template: `%s | ${storeName}`,
    },
    description,
    alternates: {
      canonical: "/",
    },
    icons: {
      icon: theme?.identity?.faviconUrl || "/favicon.ico",
    },
    openGraph: {
      title: `${storeName} | ${tagline}`,
      description,
      siteName: storeName,
      url: "/",
      locale: "en_IN",
      type: "website",
      images: theme?.identity?.logoUrl
        ? [{ url: theme.identity.logoUrl, width: 800, height: 600, alt: storeName }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${storeName} | ${tagline}`,
      description,
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
