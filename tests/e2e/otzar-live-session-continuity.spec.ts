// FILE: otzar-live-session-continuity.spec.ts
// PURPOSE: [SECTION-16] Prove on the deployed app.otzar.ai, in a real browser,
//          enterprise session continuity:
//            1. a logged-in HARD RELOAD restores the session (no /login bounce);
//            2. a protected DEEP LINK opened cold restores to that page;
//            3. LOGOUT then reload correctly bounces to /login;
//            4. no auth token is in localStorage/sessionStorage (the restore
//               credential is the HttpOnly cookie, invisible to JS).
//          These use FULL page reloads / gotos — the exact path that lost auth
//          before Section 16. Read-only; no Meridian mutation.
// RUN: OTZAR_CUSTSIM_ADMIN_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts \
//        tests/e2e/otzar-live-session-continuity.spec.ts

import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ retries: 0 });

const APP = process.env.OTZAR_SMOKE_BASE_URL ?? "https://app.otzar.ai";
const ADMIN_EMAIL =
  process.env.OTZAR_CUSTSIM_ADMIN_EMAIL ?? "meridian-admin@niovlabs.com";
const ADMIN_PW = process.env.OTZAR_CUSTSIM_ADMIN_PASSWORD;
const DIR = "test-results/session-continuity";

test.skip(!ADMIN_PW, "Set OTZAR_CUSTSIM_ADMIN_PASSWORD (Meridian sim org only).");

async function uiLogin(page: Page): Promise<void> {
  await page.goto(`${APP}/login`);
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PW!);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !/\/login$/.test(window.location.pathname), null, {
    timeout: 45_000,
  });
  await page.waitForTimeout(1500);
}

async function pathname(page: Page): Promise<string> {
  return new URL(page.url()).pathname;
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });
}

test("hard reload + deep link restore the session; logout bounces to login", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await uiLogin(page);
  await shot(page, "01-logged-in");

  // (1) HARD RELOAD on a protected page → session restores, no /login bounce.
  await page.goto(`${APP}/security-audit`);
  await page.waitForTimeout(1500);
  expect(await pathname(page)).not.toMatch(/\/login$/);
  await page.reload();
  // The SessionBootstrap splash resolves via /auth/me, then the guard admits.
  await page.waitForFunction(() => !/Restoring your session/.test(document.body.innerText), null, {
    timeout: 20_000,
  });
  await page.waitForTimeout(1500);
  expect(await pathname(page)).toBe("/security-audit");
  expect(await pathname(page)).not.toMatch(/\/login$/);
  await shot(page, "02-hard-reload-restored");

  // (4) No auth token in web storage — the restore credential is the HttpOnly
  // cookie, which JS cannot read.
  const storage = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
  }));
  for (const [k, v] of [...storage.local, ...storage.session]) {
    expect(/token|jwt|bearer|authorization|password/i.test(k)).toBe(false);
    expect(/^ey[A-Za-z0-9_-]+\.ey[A-Za-z0-9_-]+\./.test(v)).toBe(false); // no JWT
  }
  // The HttpOnly cookie must NOT be visible to document.cookie.
  const jsCookies = await page.evaluate(() => document.cookie);
  expect(jsCookies).not.toMatch(/otzar_session/);

  // (2) DEEP LINK opened cold (fresh context still holds the cookie) → restores
  // straight to the protected page, not /login.
  await page.goto(`${APP}/app/action-center`);
  await page.waitForFunction(() => !/Restoring your session/.test(document.body.innerText), null, {
    timeout: 20_000,
  });
  await page.waitForTimeout(1500);
  expect(await pathname(page)).toBe("/app/action-center");
  await shot(page, "03-deep-link-restored");

  // (3) LOGOUT clears server session + Redis nonce + cookie, and CT memory.
  // handleLogout awaits api.auth.logout() BEFORE store.logout(), and only the
  // store clear triggers the guard's client-side redirect to /login — so waiting
  // for /login guarantees the server session is already terminated and the
  // cookie cleared. (Reloading before that would abort the in-flight logout.)
  await page.getByRole("button", { name: /log out/i }).first().click();
  await page.waitForFunction(() => /\/login/.test(window.location.pathname), null, {
    timeout: 20_000,
  });
  // A fresh cold load of a protected deep link must now NOT restore.
  await page.goto(`${APP}/app/action-center`);
  await page.waitForFunction(() => !/Restoring your session/.test(document.body.innerText), null, {
    timeout: 20_000,
  });
  await page.waitForTimeout(1200);
  expect(await pathname(page)).toMatch(/\/login$/);
  await shot(page, "04-logout-then-reload-bounces");

  console.log("[session-continuity] hard-reload + deep-link restore verified; logout bounces");
});
