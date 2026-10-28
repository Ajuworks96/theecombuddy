import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Ecom Buddy",
  description: "Production-oriented white-label e-commerce platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}

