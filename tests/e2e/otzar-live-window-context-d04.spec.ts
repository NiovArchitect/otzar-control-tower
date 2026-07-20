// FILE: otzar-live-window-context-d04.spec.ts
// PURPOSE: D-04 — Memory surfaces selected-window share with explicit CTA.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-window-context-d04.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("D-04 Memory shows window-context share; no silent active indicator", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app/my-memory", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const card = page.getByTestId("window-context-share");
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("window-context-promise")).toBeVisible();
  await expect(page.getByTestId("window-context-never")).toBeVisible();

  // Idle: start CTA present; live indicator must NOT be on without user share
  await expect(page.getByTestId("window-context-start")).toBeVisible();
  await expect(page.getByTestId("window-context-active-indicator")).toHaveCount(0);

  // Talk / primary rail integrity smoke while we're in product shell
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ambient-work-surface")).toBeVisible({
    timeout: 15_000,
  });
  const rail = page.getByTestId("ambient-nav");
  if ((await rail.count()) > 0) {
    await expect(rail.getByText("Talk")).toBeVisible();
    await expect(rail.getByText("Today")).toBeVisible();
  }
});
