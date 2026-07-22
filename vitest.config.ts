import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "packages/*/tests/**/*.test.ts",
      "apps/*/tests/**/*.test.ts",
      "apps/*/tests/**/*.test.tsx",
    ],
    exclude: ["node_modules", "**/node_modules/**", "tests/stress/**"],
  },
});
