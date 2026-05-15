import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  esbuild: {
    // Allow .tsx dependencies (e.g. pdfReport.tsx) to be imported from .ts test files
    jsx: "automatic",
    jsxImportSource: "react",
  },
});
