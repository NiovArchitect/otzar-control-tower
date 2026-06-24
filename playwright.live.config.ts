// FILE: playwright.live.config.ts
// PURPOSE: Phase 4D — credentialed live smoke against the DEPLOYED app
//          (app.otzar.ai), not a local dev server. Used by
//          `npm run test:e2e:live`. The spec itself is env-gated and skips when
//          credentials are absent, so this config never mutates production
//          without explicit env opt-in.
// CONNECTS TO: tests/e2e/otzar-employee-flow-live.spec.ts.

import { defineConfig, devices } from "@playwright/test";

const BASE = process.env.OTZAR_SMOKE_BASE_URL ?? "https://app.otzar.ai";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /otzar-employee-flow-live\.spec\.ts/,
  fullyParallel: false,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // No webServer — we exercise the deployed app, not a local build.
});
