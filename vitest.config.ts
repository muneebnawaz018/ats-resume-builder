import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Tests run in plain Node, not jsdom. The extractors are deliberately
 * DOM-free so that a document reader can be tested without a browser
 * standing in the way — pdf.js is the one exception, and it is handed its
 * Node build explicitly by the test that uses it.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
