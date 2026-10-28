import React from "react";

export default function HomePage() {
  return (
    <main style={{ padding: "40px 24px", maxWidth: "800px", margin: "0 auto" }}>
      <header style={{ marginBottom: "32px", borderBottom: "1px solid #E5E7EB", paddingBottom: "16px" }}>
        <h1 style={{ fontSize: "2rem", color: "#18181B", margin: "0 0 8px 0" }}>
          The Ecom Buddy
        </h1>
        <p style={{ color: "#4B5563", margin: 0 }}>
          White-Label Headless Commerce Storefront
        </p>
      </header>

      <section style={{ backgroundColor: "#F9FAFB", padding: "24px", borderRadius: "8px", border: "1px solid #E5E7EB" }}>
        <h2 style={{ fontSize: "1.25rem", color: "#18181B", marginTop: 0 }}>
          Milestone 02A Verification Status
        </h2>
        <ul style={{ color: "#374151", lineHeight: "1.8" }}>
          <li><strong>Architecture:</strong> Next.js 15 App Router + Medusa v2</li>
          <li><strong>Storefront Service:</strong> Active (Port 3000)</li>
          <li><strong>Backend Service:</strong> Connected to Medusa v2 (Port 9000)</li>
          <li><strong>Health Check Endpoint:</strong> <code>/api/health</code></li>
        </ul>
      </section>
    </main>
  );
}

