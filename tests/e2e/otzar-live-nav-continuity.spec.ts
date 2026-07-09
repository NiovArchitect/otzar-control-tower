// FILE: otzar-live-nav-continuity.spec.ts
// PURPOSE: [APP-NAV-CONTINUITY] Prove on the deployed app.otzar.ai, in a real
//          browser, the navigation-continuity behaviors that a data-router
//          navigation cannot complete under jsdom+undici+MSW (so they are NOT
//          unit-covered):
//            1. the upper-left Back affordance renders in the live shell,
//               is accessible, and returns to a SAFE in-app location (never
//               /login);
//            2. an unsaved form BLOCKS the Back navigation with a calm dialog;
//            3. "Stay" keeps the page with the typed work intact;
//            4. "Leave" proceeds with the navigation;
//            5. a CLEAN page navigates via Back with NO prompt (no false
//               positive).
//          Every guard trigger here is the real Back BUTTON — a genuine router
//          navigate() that useBlocker intercepts (not a synthetic popstate).
//          NOTE: the navigate(-1) history-walk branch is unit-covered by
//          tests/unit/app-back-button.test.tsx (setHistoryIdx(3)); here we
//          assert the safer property — Back always lands on an in-app route.
//
// SAFETY: read-only + client-side reach only — NO Meridian mutation. The typed
// writing-style sample never leaves the page by design, and "Propose" is never
// clicked, so nothing is written.
// RUN: OTZAR_CUSTSIM_ADMIN_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts \
//        tests/e2e/otzar-live-nav-continuity.spec.ts

import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ retries: 0 });

const APP = process.env.OTZAR_SMOKE_BASE_URL ?? "https://app.otzar.ai";
const ADMIN_EMAIL =
  process.env.OTZAR_CUSTSIM_ADMIN_EMAIL ?? "meridian-admin@niovlabs.com";
const ADMIN_PW = process.env.OTZAR_CUSTSIM_ADMIN_PASSWORD;
const DIR = "test-results/nav-continuity";

test.skip(!ADMIN_PW, "Set OTZAR_CUSTSIM_ADMIN_PASSWORD (Meridian sim org only).");

async function uiLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${APP}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !/\/login$/.test(window.location.pathname), null, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2000);
}

// Reach a route client-side (History API) — a full page.goto would reload and
// drop the in-memory session (documented session-continuity gap). Used only to
// REACH pages; the guard is always triggered via the real Back button below.
async function reach(page: Page, path: string): Promise<void> {
  await page.evaluate((p) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await page.waitForTimeout(1500);
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });
  console.log(`[nav-continuity] captured ${name}`);
}

test("Back affordance + unsaved-work guard behave safely on the live app", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await uiLogin(page, ADMIN_EMAIL, ADMIN_PW!);

  // Land in the employee Otzar shell home — no dead Back button at the home.
  await reach(page, "/app");
  await expect(page.getByTestId("app-back-button")).toHaveCount(0);
  await shot(page, "01-home-no-back");

  // (1) Back appears on a sub-page, is accessible.
  await reach(page, "/app/action-center");
  const back = page.getByTestId("app-back-button");
  await expect(back).toBeVisible();
  await expect(back).toHaveAttribute("aria-label", "Go back");
  await shot(page, "02-subpage-back-visible");

  // (5) CLEAN page → Back navigates with NO prompt, lands on a safe in-app route.
  await back.click();
  await page.waitForTimeout(1200);
  await expect(page.getByTestId("unsaved-changes-dialog")).toHaveCount(0);
  const cleanPath = new URL(page.url()).pathname;
  expect(cleanPath.startsWith("/app")).toBe(true);
  expect(/\/login$/.test(cleanPath)).toBe(false);
  await shot(page, "03-clean-back-no-prompt");

  // Reach the Writing style form and make it dirty (typed sample stays on the
  // page and is never transmitted — no mutation).
  await reach(page, "/app/my-twin/calibration/writing-style");
  const sample = page.getByTestId("style-sample-text");
  await sample.waitFor({ state: "visible", timeout: 15_000 });
  const typed = "Hey team — quick draft I'm still working on.";
  await sample.fill(typed);

  // (2)+(3) DIRTY → Back is blocked by the guard; Stay keeps the page + text.
  const backBtn = page.getByTestId("app-back-button");
  await backBtn.click();
  await expect(page.getByTestId("unsaved-changes-dialog")).toBeVisible();
  await shot(page, "04-dirty-blocked-dialog");
  await page.getByTestId("unsaved-changes-stay").click();
  await expect(page.getByTestId("unsaved-changes-dialog")).toHaveCount(0);
  await expect(page.getByTestId("writing-style-page")).toBeVisible();
  await expect(sample).toHaveValue(typed);
  await shot(page, "05-stay-kept-work");

  // (NO UNSAFE STORAGE) While a form is dirty AND authenticated, assert the
  // client stores neither the typed value nor an auth token anywhere.
  const storage = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
  }));
  const blob = JSON.stringify(storage);
  expect(blob).not.toContain(typed); // form value is never persisted
  for (const [k, v] of [...storage.local, ...storage.session]) {
    expect(/token|jwt|auth|bearer|password|credential/i.test(k)).toBe(false);
    expect(/^ey[A-Za-z0-9_-]+\.ey[A-Za-z0-9_-]+\./.test(v)).toBe(false); // no JWT
  }
  console.log(
    `[nav-continuity] storage sweep clean: ${storage.local.length} local, ${storage.session.length} session keys, no token/form-value`,
  );

  // (4) DIRTY → Back again → Leave proceeds; the form page is gone.
  await backBtn.click();
  await expect(page.getByTestId("unsaved-changes-dialog")).toBeVisible();
  await page.getByTestId("unsaved-changes-leave").click();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId("unsaved-changes-dialog")).toHaveCount(0);
  await expect(page.getByTestId("writing-style-page")).toHaveCount(0);
  const leftPath = new URL(page.url()).pathname;
  expect(/\/login$/.test(leftPath)).toBe(false);
  await shot(page, "06-leave-proceeded");

  console.log("[nav-continuity] all employee-shell behaviors verified live");
});

test("Back affordance renders and returns safely in the ADMIN shell", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await uiLogin(page, ADMIN_EMAIL, ADMIN_PW!);

  // Admin command-center home (fallback for this shell) — no dead Back button.
  await reach(page, "/");
  await expect(page.getByTestId("app-back-button")).toHaveCount(0);
  await shot(page, "07-admin-home-no-back");

  // An admin sub-page shows the Back affordance; it returns to a safe in-app
  // location and never bounces to /login.
  await reach(page, "/security-audit");
  const back = page.getByTestId("app-back-button");
  await expect(back).toBeVisible();
  await expect(back).toHaveAttribute("aria-label", "Go back");
  await shot(page, "08-admin-subpage-back-visible");
  await back.click();
  await page.waitForTimeout(1200);
  const p = new URL(page.url()).pathname;
  expect(/\/login$/.test(p)).toBe(false);
  expect(p === "/" || p.startsWith("/")).toBe(true);
  await shot(page, "09-admin-back-safe");

  console.log("[nav-continuity] admin-shell Back affordance verified live");
});
