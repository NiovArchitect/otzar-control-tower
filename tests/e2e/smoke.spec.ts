// FILE: tests/e2e/smoke.spec.ts
// PURPOSE: Placeholder Playwright smoke test. Real E2E coverage of
//          the login flow + sidebar navigation lands in Section 12F
//          once the Foundation API is mockable end-to-end.
// CONNECTS TO: playwright.config.ts (auto-starts the dev server).

import { test, expect } from "@playwright/test";

test.skip("login screen renders (placeholder for Section 12F)", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /control tower/i })).toBeVisible();
});
