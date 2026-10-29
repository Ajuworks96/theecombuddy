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
        brand: {
          50: "var(--brand-50, #f8fafc)",
          100: "var(--brand-100, #f1f5f9)",
          200: "var(--brand-200, #e2e8f0)",
          300: "var(--brand-300, #cbd5e1)",
          400: "var(--brand-400, #94a3b8)",
          500: "var(--brand-500, #64748b)",
          600: "var(--brand-600, #475569)",
          700: "var(--brand-700, #334155)",
          800: "var(--brand-800, #1e293b)",
          900: "var(--brand-900, #0f172a)",
          950: "var(--brand-950, #020617)",
        },
        sidebar: {
          bg: "var(--sidebar-bg, #0B0F19)",
          hover: "var(--sidebar-hover, #151C2C)",
          active: "var(--sidebar-active, #1E293B)",
          border: "var(--sidebar-border, #1E293B)",
          text: "var(--sidebar-text, #94A3B8)",
          textActive: "var(--sidebar-text-active, #FFFFFF)",
        },
        accent: {
          DEFAULT: "var(--brand-accent, #2563EB)",
          gold: "var(--brand-gold, #C28E5C)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans, 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)"],
        mono: ["var(--font-mono, 'JetBrains Mono', monospace)"],
      },
    },
  },
  plugins: [],
};

