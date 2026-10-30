/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          primary: "var(--brand-primary, #10B981)",
          "primary-hover": "var(--brand-primary-hover, #059669)",
          accent: "var(--brand-accent, #3B82F6)",
          "accent-hover": "var(--brand-accent-hover, #2563EB)",
          base: "var(--surface-base, #0B0F19)",
          subtle: "var(--surface-subtle, #111827)",
          muted: "var(--surface-muted, #1F2937)",
          inverted: "var(--surface-inverted, #FFFFFF)",
          "text-primary": "var(--text-primary, #F9FAFB)",
          "text-secondary": "var(--text-secondary, #9CA3AF)",
          "text-muted": "var(--text-muted, #6B7280)",
          "text-inverted": "var(--text-inverted, #111827)",
          "border-subtle": "var(--border-subtle, #1F2937)",
          "border-strong": "var(--border-strong, #374151)",
          "header-bg": "var(--header-bg, #0B0F19)",
          "header-text": "var(--header-text, #F9FAFB)",
          "footer-bg": "var(--footer-bg, #060911)",
          "footer-text": "var(--footer-text, #9CA3AF)",
        },
      },
      fontFamily: {
        display: ["var(--font-display, 'Plus Jakarta Sans', sans-serif)"],
        body: ["var(--font-body, 'Inter', sans-serif)"],
        mono: ["var(--font-mono, 'JetBrains Mono', monospace)"],
      },
      borderRadius: {
        theme: "var(--theme-radius, 0.375rem)",
      },
    },
  },
  plugins: [],
};

