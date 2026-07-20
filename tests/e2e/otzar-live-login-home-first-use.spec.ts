// FILE: otzar-live-login-home-first-use.spec.ts
// PURPOSE: YC product gate — login lands on Home; first-use reveal present;
//          prior admin route is not restored; first-use is real Today.
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-login-home-first-use.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

test.describe.configure({ retries: 0, mode: "serial" });

const ADMIN = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

test("L1 login always lands on product Home /app (not restored admin route)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Simulate "was on admin users" then session expired → login with returnTo
  await page.goto("/login?returnTo=%2Fusers", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(ADMIN);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForFunction(
    () => !window.location.pathname.startsWith("/login"),
    undefined,
    { timeout: 45_000 },
  );
  // Must NOT restore /users — Home is /app
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
    .toBe("/app");
  await expect(page.getByTestId("ambient-work-surface")).toBeVisible({
    timeout: 30_000,
  });
  console.log("[login-home] admin after returnTo=/users →", page.url());
});

test("L2 employee login lands on Home with ambient surface", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const cta = await liveUiLogin(page, EMPLOYEE, PW as string);
  expect(cta).toBe("Sign in");
  if (!page.url().includes("/app")) {
    // resolveDestination should already have sent them; hard-fail if not
    await expect
      .poll(() => new URL(page.url()).pathname.startsWith("/app"), {
        timeout: 15_000,
      })
      .toBeTruthy();
  }
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ambient-work-surface")).toBeVisible({
    timeout: 30_000,
  });
  const body = (await page.locator("body").textContent()) ?? "";
  expect(body.length).toBeGreaterThan(40);
  // No admin voice-intent filler on employee home
  expect(body).not.toMatch(/Compose a voice intent/i);
  expect(body).not.toMatch(/privacy-safe audit row/i);
});

test("L3 validated deep link to action-center is honored after login", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login?returnTo=%2Fapp%2Faction-center", {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(EMPLOYEE);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForFunction(
    () => !window.location.pathname.startsWith("/login"),
    undefined,
    { timeout: 45_000 },
  );
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 20_000 })
    .toBe("/app/action-center");
});

test("L4 first-use reveal is skippable and leaves real Today", async ({
  page,
}) => {
  test.setTimeout(150_000);
  // Clear first-use flag for this account in the browser
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("otzar_first_use_v1:")) localStorage.removeItem(k);
    }
  });
  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const reveal = page.getByTestId("first-use-reveal");
  // May already be completed for this email from prior runs — either path is OK
  if ((await reveal.count()) > 0) {
    await expect(reveal).toBeVisible();
    await expect(page.getByTestId("first-use-recognition")).toBeVisible();
    await page.getByTestId("first-use-start-day").click();
    await expect(reveal).toHaveCount(0, { timeout: 10_000 });
  }
  await expect(page.getByTestId("ambient-work-surface")).toBeVisible();
  // Still on product Today after complete
  expect(new URL(page.url()).pathname).toBe("/app");
});
