// FILE: otzar-live-project-context.spec.ts
// PURPOSE: Open project context lands in viewport with mission heart visible.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-project-context.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("open project context shows mission heart in viewport", async ({ page }) => {
  test.setTimeout(150_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app/work-projects", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const toggles = page.locator('[data-testid^="project-toggle-"]');
  const n = await toggles.count();
  test.skip(n === 0, "No projects on this account to open.");

  await toggles.first().click();
  const panel = page.getByTestId("project-context-panel");
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("project-context-name")).toBeVisible();
  await expect(page.getByTestId("project-context-pulse")).toBeVisible();

  const inView = await panel.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.85 && r.bottom > 80;
  });
  expect(inView).toBeTruthy();

  // Header chrome stays in visual viewport
  const header = page.getByTestId("employee-shell-header");
  if ((await header.count()) > 0) {
    const h = await header.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, visible: r.top >= -1 && r.bottom > 0 };
    });
    expect(h.visible).toBeTruthy();
    expect(h.top).toBeGreaterThanOrEqual(-1);
  }
});
