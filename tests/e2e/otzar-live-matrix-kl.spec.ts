// FILE: otzar-live-matrix-kl.spec.ts
// PURPOSE: Matrix K/L follow-up — approvals queue, authority grants route,
//          non-admin Control Tower isolation.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-matrix-kl.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const EMPLOYEE = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("K: Approvals deep-link lands on Needs me queue", async ({ page }) => {
  test.setTimeout(120_000);
  await liveUiLogin(page, EMPLOYEE, PW as string);
  // Alias route consolidates to action-center
  await page.goto("/app/approvals", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  // Cookie restore or SPA redirect
  if (/\/login/.test(page.url())) {
    await liveUiLogin(page, EMPLOYEE, PW as string);
    await page.goto("/app/approvals", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
  }
  await expect(page).toHaveURL(/action-center|approvals/);
  const path = new URL(page.url()).pathname;
  expect(path).toMatch(/action-center|approvals/);
  // Needs me surface
  const hasCenter =
    (await page.getByTestId("action-center").count()) > 0 ||
    (await page.getByTestId("action-center-list").count()) > 0 ||
    (await page.getByTestId("action-center-empty").count()) > 0 ||
    (await page.getByRole("heading", { name: /needs me/i }).count()) > 0;
  expect(hasCenter).toBeTruthy();
});

test("L: Authority grants route loads for employee", async ({ page }) => {
  test.setTimeout(120_000);
  await liveUiLogin(page, EMPLOYEE, PW as string);
  await page.goto("/app/authority-grants", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  if (/\/login/.test(page.url())) {
    await liveUiLogin(page, EMPLOYEE, PW as string);
    await page.goto("/app/authority-grants", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
  }
  expect(new URL(page.url()).pathname).toContain("authority-grants");
  // Page root testid ships with this PR; heading is stable on older deploys too.
  const root = page.getByTestId("authority-grants");
  if ((await root.count()) > 0) {
    await expect(root).toBeVisible({ timeout: 15_000 });
  }
  await expect(
    page.getByRole("heading", { name: /authority you have granted/i }),
  ).toBeVisible({ timeout: 20_000 });
});

test("L: non-admin cannot open Control Tower chrome", async ({ page }) => {
  test.setTimeout(120_000);
  await liveUiLogin(page, EMPLOYEE, PW as string);
  for (const probe of ["/admin/users", "/users"]) {
    await page.goto(probe, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    const path = new URL(page.url()).pathname;
    const adminChrome =
      (await page.getByTestId("admin-nav-group").count()) > 0 ||
      (await page.getByTestId("admin-sidebar").count()) > 0;
    expect(adminChrome, `admin chrome at ${probe} → ${path}`).toBeFalsy();
    const ok =
      path.startsWith("/app") ||
      path === "/login" ||
      (await page.getByRole("heading", { name: /access denied/i }).count()) > 0;
    expect(ok, `isolation fail at ${probe} → ${path}`).toBeTruthy();
  }
});
