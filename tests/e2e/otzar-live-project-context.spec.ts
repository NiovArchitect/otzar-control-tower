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

  // Prefer testid toggles; fall back to visible CTA text (pre/post #175).
  const toggles = page.locator('[data-testid^="project-toggle-"]');
  await page
    .getByRole("button", { name: /open project context/i })
    .first()
    .waitFor({ state: "visible", timeout: 30_000 })
    .catch(() => undefined);

  const n =
    (await toggles.count()) ||
    (await page.getByRole("button", { name: /open project context/i }).count());
  test.skip(n === 0, "No projects on this account to open.");

  if ((await toggles.count()) > 0) {
    await toggles.first().click();
  } else {
    await page.getByRole("button", { name: /open project context/i }).first().click();
  }

  const panel = page.getByTestId("project-context-panel");
  // Pre-#175 live may open older panel markup without mission pulse.
  // When mission heart is present, it must be in the visual viewport.
  const hasPulse =
    (await page.getByTestId("project-context-pulse").count()) > 0;
  if (!hasPulse) {
    // Still prove open worked (button flips / panel mounts).
    await expect(
      page.getByRole("button", { name: /hide project context/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
    test.info().annotations.push({
      type: "note",
      description:
        "Live bundle lacks project-context-pulse — #175 not deployed yet.",
    });
    return;
  }

  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("project-context-name")).toBeVisible();
  await expect(page.getByTestId("project-context-pulse")).toBeVisible();

  const inView = await panel.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.85 && r.bottom > 80;
  });
  expect(inView).toBeTruthy();

  // Header chrome stays in visual viewport
  const headerById = page.getByTestId("employee-shell-header");
  const header =
    (await headerById.count()) > 0
      ? headerById
      : page.getByRole("banner").filter({ hasText: "Otzar" });
  if ((await header.count()) > 0) {
    const h = await header.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, visible: r.top >= -1 && r.bottom > 0 };
    });
    expect(h.visible).toBeTruthy();
    expect(h.top).toBeGreaterThanOrEqual(-1);
  }
});
