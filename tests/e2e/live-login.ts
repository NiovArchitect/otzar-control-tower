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

export async function liveUiLogin(
  page: Page,
  email: string,
  password: string,
): Promise<"Sign in" | "Continue"> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const cta = await clickLoginSubmit(page);
  await page.waitForFunction(
    () => !window.location.pathname.startsWith("/login"),
    undefined,
    { timeout: 45_000 },
  );
  return cta;
}
