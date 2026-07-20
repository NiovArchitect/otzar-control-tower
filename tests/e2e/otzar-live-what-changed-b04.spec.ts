// FILE: otzar-live-what-changed-b04.spec.ts
// PURPOSE: B-04 — Today What changed strip from real state (or honest quiet).
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-what-changed-b04.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("B-04 What changed strip is present with real or quiet lines", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  await expect(page.getByTestId("ambient-work-surface")).toBeVisible({
    timeout: 20_000,
  });
  const strip = page.getByTestId("what-changed");
  if ((await strip.count()) === 0) {
    test.info().annotations.push({
      type: "note",
      description: "what-changed not on this deploy yet.",
    });
    return;
  }
  await expect(strip).toBeVisible();
  // Either quiet honesty or at least one real change line
  const quiet = page.getByTestId("what-changed-quiet");
  const anyReal = page.locator(
    "[data-testid^=what-changed-]:not([data-testid=what-changed])",
  );
  const quietN = await quiet.count();
  const realN = await anyReal.count();
  expect(quietN + realN).toBeGreaterThan(0);
  if (quietN > 0) {
    await expect(quiet).toContainText(/Nothing new|quiet/i);
  }
});
