// FILE: tests/e2e/live-login.ts
// PURPOSE: Shared UI login for live smokes. Accepts both "Sign in" (post-#171)
//          and "Continue" (pre-#171 live lag) so the investor journey can run
//          while recording which CTA the deployed bundle still exposes.
// SAFETY: Never logs the password.

import type { Page } from "@playwright/test";

/** Login submit: exact primary CTA. Prefers Sign in; falls back to Continue. */
export async function clickLoginSubmit(page: Page): Promise<"Sign in" | "Continue"> {
  const signIn = page.getByRole("button", { name: /^sign in$/i });
  if (await signIn.count()) {
    await signIn.click();
    return "Sign in";
  }
  const continueBtn = page.getByRole("button", { name: /^continue$/i });
  await continueBtn.click();
  return "Continue";
}

/**
 * Ensure we are on a logged-out login form. Handles already-authenticated
 * sessions (common when chaining admin → employee deep smokes).
 */
export async function ensureLoggedOut(page: Page): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const email = page.getByLabel(/^email$/i);
  if ((await email.count()) > 0 && (await email.first().isVisible().catch(() => false))) {
    return;
  }
  // Still authenticated — use header log out
  const logout = page.getByRole("button", { name: /log out/i });
  if ((await logout.count()) > 0) {
    await logout.first().click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(1200);
  }
  // Some shells use a menu
  const more = page.getByRole("button", { name: /^more$/i });
  if ((await more.count()) > 0 && (await email.count()) === 0) {
    await more.first().click().catch(() => undefined);
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /log out/i }).click().catch(() => undefined);
    await page.waitForTimeout(1000);
  }
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^email$/i).waitFor({ state: "visible", timeout: 20_000 });
}

export async function liveUiLogin(
  page: Page,
  email: string,
  password: string,
): Promise<"Sign in" | "Continue"> {
  await ensureLoggedOut(page);
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  const cta = await clickLoginSubmit(page);
  await page.waitForFunction(
    () => !window.location.pathname.startsWith("/login"),
    undefined,
    { timeout: 45_000 },
  );
  return cta;
}
