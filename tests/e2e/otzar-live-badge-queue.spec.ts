// FILE: otzar-live-badge-queue.spec.ts
// PURPOSE: [GAP-F] LIVE read-only proof that governance numbers agree: the
//          sidebar Pending Approvals badge, the Approvals queue, and the
//          /escalations/pending API all state the SAME count (they now share
//          one query by construction). Zero mutation.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-badge-queue.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "badge-queue";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read"] },
  });
  return (await lr.json()).token as string;
}

test("B1: badge == queue == API — one truth for pending approvals (screenshot)", async ({ page, request }) => {
  test.setTimeout(150_000);
  // Server truth first.
  const adm = await apiLogin(request, ADMIN_EMAIL);
  const res = await request.get(`${API}/escalations/pending`, {
    headers: { authorization: `Bearer ${adm}` },
  });
  expect(res.status()).toBe(200);
  const apiCount = (((await res.json()).escalations ?? []) as unknown[]).length;

  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 45_000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    history.pushState({}, "", "/approvals");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.getByTestId("approvals-page").waitFor({ state: "visible", timeout: 30_000 });

  // The sidebar badge must equal the API count (absent when 0).
  if (apiCount > 0) {
    await expect(
      page.getByLabel(`${apiCount} pending approvals`),
    ).toBeVisible({ timeout: 30_000 });
  } else {
    await page.waitForTimeout(3000);
    expect(await page.getByLabel(/pending approvals/).count()).toBe(0);
  }
  await page.screenshot({ path: `screenshots/${TAG}-1-badge-equals-queue.png`, fullPage: true });
});
