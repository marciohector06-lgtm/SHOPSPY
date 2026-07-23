import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        opportunity: "#22c55e",
        saturating: "#ef4444",
        // Tokens da marca ShopSpy (redesign do app autenticado) — "spy-*"
        // de propósito, pra não colidir com "brand-*"/"ink-*" (login/register).
        spy: {
          base: "#08090C",
          card: "#0F1117",
          surface: "#161820",
          hover: "#1C1F2E",
          indigo: "#6366F1",
          "indigo-light": "#818CF8",
          "indigo-dim": "rgba(99,102,241,0.12)",
          max: "#F43F5E",
          high: "#10B981",
          medium: "#F59E0B",
          sat: "#F97316",
          avoid: "#475569",
          text: "#F1F5F9",
          muted: "#94A3B8",
          faint: "#475569",
          border: "#1E2130",
          "border-active": "rgba(99,102,241,0.4)",
        },
        brand: {
          bg: "#08090C",
          card: "#0F1117",
          surface: "#161820",
          primary: "#6366F1",
          glow: "#818CF8",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          border: "#1E2130",
        },
        ink: {
          primary: "#F1F5F9",
          secondary: "#94A3B8",
          muted: "#475569",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        data: ["var(--font-data)", "monospace"],
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.8" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
