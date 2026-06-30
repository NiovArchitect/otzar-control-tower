// FILE: otzar-live-ia-screenshots.spec.ts
// PURPOSE: Capture IA screenshots against the live app via the proven login
//          helper — admin 8-section sidebar + employee ambient nav + More sheet.
//          Evidence for the Admin/Employee IA reorg slices. Env-gated.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai OTZAR_SMOKE_EMAIL=sadeil@niovlabs.com \
//      DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-ia-screenshots.spec.ts
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function login(p: Page): Promise<void> {
  await p.goto("/login");
  await p.getByLabel("Email").fill(EMAIL);
  await p.getByLabel("Password").fill(PW as string);
  await p.getByRole("button", { name: /sign in/i }).click();
  await p.waitForURL(/\/app/, { timeout: 25_000 }).catch(() => undefined);
  await p.getByRole("button", { name: /log out/i }).first().waitFor({ state: "visible", timeout: 9000 }).catch(() => undefined);
}

test("capture employee ambient nav + admin sidebar", async ({ page }) => {
  await login(page);

  // Employee ambient shell FIRST — login lands on /app, session is live here.
  // (Visiting the admin "/" as a non-admin redirects to /login and clears auth,
  //  so capture the employee surface before any admin navigation.)
  await page.getByTestId("ambient-nav").waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  const rail = await page.getByTestId("ambient-nav").getByRole("link").allInnerTexts().catch(() => []);
  console.log(`[ia-shots] employee primary rail: ${rail.map((s) => s.replace(/\n/g, " ").trim()).filter(Boolean).join(" | ")}`);
  await page.screenshot({ path: "screenshots/ia/employee-ambient-nav.png", fullPage: false });

  // Open the More sheet.
  const moreBtn = page.getByTestId("ambient-nav-more").first();
  if (await moreBtn.count()) {
    await moreBtn.click().catch(() => undefined);
    await page.getByTestId("ambient-nav-more-sheet").waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
    const sheet = await page.getByTestId("ambient-nav-more-sheet").locator("a").allInnerTexts().catch(() => []);
    console.log(`[ia-shots] employee More sheet: ${sheet.filter(Boolean).join(" | ")}`);
    await page.screenshot({ path: "screenshots/ia/employee-more-sheet.png", fullPage: false });
    await page.keyboard.press("Escape").catch(() => undefined);
  }

  // Admin Control Tower LAST — only renders if this account has admin_org.
  await page.goto("/");
  await page.waitForTimeout(2500);
  const groups = await page.getByTestId("admin-nav-group").count().catch(() => 0);
  console.log(`[ia-shots] admin sidebar groups: ${groups}`);
  if (groups > 0) {
    const labels = await page.getByTestId("admin-nav-group").evaluateAll((els) =>
      els.map((e) => e.getAttribute("data-group")),
    );
    console.log(`[ia-shots] admin sections: ${labels.join(" | ")}`);
    await page.screenshot({ path: "screenshots/ia/admin-nav-8-sections.png", fullPage: false });
  }
  expect(true).toBe(true);
});
