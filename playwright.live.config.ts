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
  // Matches the employee-flow smoke, the collaboration matrix, and the
  // account/capability probe — all live, deployed-app specs.
  testMatch: /otzar-.*live.*\.spec\.ts/,
  fullyParallel: false,
  retries: 1,
  reporter: [["list"]],
  // Bounded action/navigation timeouts are ESSENTIAL for the live matrix: the
  // Playwright default is 0 (unbounded), so a momentarily-non-actionable element
  // (e.g. the orb input disabled mid-processing) would hang a click until the
  // whole-test timeout instead of failing fast. With these, a flaky interaction
  // throws quickly and the diagnostic harness records it and moves on.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
    actionTimeout: 15_000,
    navigationTimeout: 25_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // No webServer — we exercise the deployed app, not a local build.
});
