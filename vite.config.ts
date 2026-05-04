// FILE: vite.config.ts
// PURPOSE: Vite dev server + build config for the Otzar Control
//          Tower frontend. Proxies /api requests to the local
//          niov-foundation server during dev so CORS issues do not
//          surface in dev. Production deploys serve the built dist/
//          from a static host that calls Foundation directly with
//          CORS handled at the Foundation layer.
// CONNECTS TO: Foundation API (default http://localhost:3000),
//              vitest config (test block below), all src/ files.

/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
