// FILE: otzar-live-ambient-clarity.spec.ts
// PURPOSE: [CE-AMBIENT] LIVE read-only proof: with a work item's View/Why
//          open, asking the AMBIENT BAR "Where did this come from?" answers
//          from the same clarity-answer truth (human source label), creates
//          nothing (Review Center count unchanged), and with no selection
//          the same phrase gets the honest "open or select" copy.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-ambient-clarity.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";
import { liveUiLogin } from "./live-login";

test.describe.configure({ retries: 0 });

const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read"] },
  });
  return (await lr.json()).token as string;
}

async function pendingCount(request: APIRequestContext, token: string): Promise<number> {
  const res = await request.get(`${API}/escalations/pending`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return (((await res.json()).escalations ?? []) as unknown[]).length;
}

test("ambient bar answers about the opened work item; honest copy without a selection (screenshot)", async ({ page, request }) => {
  test.setTimeout(240_000);
  const token = await apiLogin(request, EMPLOYEE_EMAIL);
  const escBefore = await pendingCount(request, token);
  console.log(`[amb] escalations pending BEFORE: ${escBefore}`);

  const cta = await liveUiLogin(page, EMPLOYEE_EMAIL, PW as string);
  console.log(`[amb] login CTA=${cta}`);
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    history.pushState({}, "", "/app/my-work");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect
    .poll(async () => await page.getByTestId("work-ledger-item").count(), { timeout: 45_000 })
    .toBeGreaterThan(0);

  // 1. No selection: the deictic phrase gets the honest copy.
  await page.getByRole("region", { name: /Talk to Otzar/i }).click();
  const composer = page.getByLabel(/Message to Otzar/i);
  await composer.fill("Where did this come from?");
  await page.getByRole("button", { name: /^send$/i }).click();
  await expect(
    page.getByText(/Open or select a work item first so Otzar knows what/i).first(),
  ).toBeVisible({ timeout: 20_000 });
  console.log("[amb] no-selection honest copy verified");

  // 2. Open a lineage-bearing item's View/Why (this selects it), ask again.
  const withSource = page
    .getByTestId("work-ledger-item")
    .filter({ has: page.getByTestId("work-ledger-item-source") });
  const item = (await withSource.count()) > 0 ? withSource.first() : page.getByTestId("work-ledger-item").first();
  await item.scrollIntoViewIfNeeded();
  await item.getByTestId("work-ledger-item-view").click();
  await item.getByTestId("work-ledger-item-clarity").waitFor({ state: "visible", timeout: 20_000 });

  await composer.fill("Where did this come from?");
  await page.getByRole("button", { name: /^send$/i }).click();
  await expect(
    page
      .getByText(/This came from (a Slack message|a Zoom recording|a Comms transcript|a meeting)|was not recorded/)
      .first(),
  ).toBeVisible({ timeout: 20_000 });
  const bodyText = (await page.locator("body").textContent()) ?? "";
  const answer = /This came from [^.]+\./.exec(bodyText)?.[0] ?? "(honest unknown)";
  console.log(`[amb] selected-item answer: "${answer}"`);
  for (const banned of ["SLACK:", "source_system", "HUMAN_REVIEW", "ledger_entry_id"]) {
    expect(bodyText).not.toContain(banned);
  }
  await page.screenshot({ path: "screenshots/ambient-clarity-ask.png", fullPage: true });

  // 3. Read-only proof.
  const escAfter = await pendingCount(request, token);
  console.log(`[amb] escalations pending AFTER: ${escAfter}`);
  expect(escAfter).toBe(escBefore);
});
