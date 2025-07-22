import path from "path";
import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    environment: "jsdom", // for React component tests
    include: ["test/**/*.test.{ts,tsx}"],
    globals: true, // for describe/it/expect without import
    setupFiles: [], // add setup files if needed
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

export default config;
