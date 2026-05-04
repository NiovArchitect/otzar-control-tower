// FILE: playwright.config.ts
// PURPOSE: E2E test configuration. Auto-starts the Vite dev server
//          when running locally. Reuses an existing dev server in
//          local development; CI gets a fresh server every run for
//          determinism.
// CONNECTS TO: tests/e2e/*.spec.ts.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
