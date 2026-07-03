// FILE: otzar-live-clarity.spec.ts
// PURPOSE: [CE-1] LIVE read-only proof of the clarity projection: opening a
//          work item's View/Why surfaces "Who can clarify" (real candidates
//          or the honest empty state), creates NO action/escalation (Review
//          Center pending count unchanged), and leaks no raw ids. Zero
//          mutation.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-clarity.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

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

async function pendingEscalations(request: APIRequestContext, token: string): Promise<number> {
  const res = await request.get(`${API}/escalations/pending`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  return Array.isArray(body.escalations) ? body.escalations.length : -1;
}

test("clarity is read-only: Why shows Who-can-clarify; Review Center count unchanged (screenshot)", async ({ page, request }) => {
  test.setTimeout(180_000);
  const token = await apiLogin(request, EMPLOYEE_EMAIL);
  const escBefore = await pendingEscalations(request, token);
  console.log(`[clarity] escalations pending BEFORE: ${escBefore}`);

  await page.goto("/login");
  await page.getByLabel("Email").fill(EMPLOYEE_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    history.pushState({}, "", "/app/my-work");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect
    .poll(async () => await page.getByTestId("work-ledger-item").count(), { timeout: 45_000 })
    .toBeGreaterThan(0);

  // Prefer an item whose card face shows real source lineage (Gap J label).
  const withSource = page
    .getByTestId("work-ledger-item")
    .filter({ has: page.getByTestId("work-ledger-item-source") });
  const target = (await withSource.count()) > 0 ? withSource.first() : page.getByTestId("work-ledger-item").first();

  await target.getByTestId("work-ledger-item-view").click();
  await target.getByTestId("work-ledger-item-clarity").waitFor({ state: "visible", timeout: 20_000 });
  const block = (await target.getByTestId("work-ledger-item-clarity").textContent()) ?? "";
  console.log(`[clarity] block: "${block.slice(0, 160)}"`);
  // Real candidates OR the honest empty state — both are truth; an invented
  // candidate or raw token is the only failure.
  const honest =
    /Ask .+ — .+/.test(block) ||
    block.includes("Otzar does not have enough context to suggest a clarifier yet.");
  expect(honest, "clarity block answers honestly").toBe(true);
  expect(block).not.toMatch(/source_author|entity_id|[0-9a-f]{8}-[0-9a-f]{4}/);

  await page.screenshot({ path: "screenshots/clarity-who-can-clarify.png", fullPage: true });

  // Read-only proof: nothing was created by viewing clarity.
  const escAfter = await pendingEscalations(request, token);
  console.log(`[clarity] escalations pending AFTER: ${escAfter}`);
  expect(escAfter).toBe(escBefore);
});
