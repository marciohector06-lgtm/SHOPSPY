import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        opportunity: "#22c55e",
        saturating: "#ef4444",
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
