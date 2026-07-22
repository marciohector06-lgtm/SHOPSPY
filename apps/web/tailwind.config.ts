import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        opportunity: "#22c55e",
        saturating: "#ef4444",
      },
    },
  },
  plugins: [],
} satisfies Config;
