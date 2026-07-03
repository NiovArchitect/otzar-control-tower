// FILE: otzar-live-wallet-boundary.spec.ts
// PURPOSE: [GAP-S S-1] LIVE read-only proof of the ownership boundary:
//          the employee's Digital Work Wallet states what is theirs vs the
//          company's (calm, no export control, no shipped-portability
//          claim); admin Data & Knowledge states company ownership. Zero
//          mutation.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-wallet-boundary.spec.ts

import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function login(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2500);
}

async function navigate(page: Page, path: string): Promise<void> {
  await page.evaluate((p) => {
    history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

test("T1 employee: Digital Work Wallet states the boundary calmly — no export, no shipped-portability claim", async ({ page }) => {
  test.setTimeout(150_000);
  await login(page, EMPLOYEE_EMAIL);
  await navigate(page, "/app/my-memory");
  await page.getByTestId("my-memory-boundary").waitFor({ state: "visible", timeout: 30_000 });

  const boundary = (await page.getByTestId("my-memory-boundary").textContent()) ?? "";
  expect(boundary).toContain("Personal wallet — yours, not the company's");
  expect(boundary).toContain("Your personal work memory");
  expect(boundary).toContain("Company-owned work data");

  const main = (await page.locator("main, body").first().textContent()) ?? "";
  // No shipped-portability claim, no export/import affordance anywhere.
  expect(main).not.toMatch(/export your twin|take this with you|portable today/i);
  expect(await page.getByRole("button", { name: /export|import/i }).count()).toBe(0);
  // No backend enums as copy.
  for (const banned of ["MemoryCapsule", "COSMP", "wallet_id", "ENTERPRISE", "capsule_type"]) {
    expect(main, `no raw token "${banned}"`).not.toContain(banned);
  }
  await page.screenshot({ path: "screenshots/wallet-boundary-employee.png", fullPage: true });
});

test("T2 admin: Data & Knowledge states company ownership explicitly", async ({ page }) => {
  test.setTimeout(150_000);
  await login(page, ADMIN_EMAIL);
  await navigate(page, "/data-knowledge");
  await page.getByTestId("data-ownership-boundary").waitFor({ state: "visible", timeout: 30_000 });

  const boundary = (await page.getByTestId("data-ownership-boundary").textContent()) ?? "";
  expect(boundary).toContain("Enterprise wallet — stays with company");
  expect(boundary).toContain("This stays with the company");

  const main = (await page.locator("main, body").first().textContent()) ?? "";
  // The ambiguous pronoun form is gone from this surface.
  expect(main).not.toContain("your data, your control");
  expect(await page.getByRole("button", { name: /export|import/i }).count()).toBe(0);
  await page.screenshot({ path: "screenshots/wallet-boundary-admin-data.png", fullPage: true });
});
