// FILE: otzar-live-clarity-answer.spec.ts
// PURPOSE: [CE-3] LIVE read-only proof of the ambient clarity answer: asking
//          "Where did this come from?" and "Who can clarify this?" on a real
//          work item returns human truth copy (source label, real candidate,
//          or honest unknown), creates NOTHING (Review Center count
//          unchanged), and leaks no raw tokens. Zero mutation.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-clarity-answer.spec.ts

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

async function pendingCount(request: APIRequestContext, token: string): Promise<number> {
  const res = await request.get(`${API}/escalations/pending`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  return Array.isArray(body.escalations) ? body.escalations.length : -1;
}

test("asking answers from truth in the Why detail; nothing is created (screenshot)", async ({ page, request }) => {
  test.setTimeout(180_000);
  const token = await apiLogin(request, EMPLOYEE_EMAIL);
  const escBefore = await pendingCount(request, token);
  console.log(`[ce3] escalations pending BEFORE: ${escBefore}`);

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

  // Prefer a lineage-bearing item (Gap J card fragment).
  const withSource = page
    .getByTestId("work-ledger-item")
    .filter({ has: page.getByTestId("work-ledger-item-source") });
  const item = (await withSource.count()) > 0 ? withSource.first() : page.getByTestId("work-ledger-item").first();
  await item.scrollIntoViewIfNeeded();
  await item.getByTestId("work-ledger-item-view").click();
  await item.getByTestId("work-ledger-item-ask-input").waitFor({ state: "visible", timeout: 20_000 });

  // Q1: where did this come from?
  await item.getByTestId("work-ledger-item-ask-input").fill("Where did this come from?");
  await item.getByTestId("work-ledger-item-ask").click();
  await item.getByTestId("work-ledger-item-ask-answer").waitFor({ state: "visible", timeout: 15_000 });
  const a1 = (await item.getByTestId("work-ledger-item-ask-answer").textContent()) ?? "";
  console.log(`[ce3] Q1 answer: "${a1.slice(0, 140)}"`);
  expect(
    /This came from (a Slack message|a Zoom recording|a Comms transcript|a meeting)/.test(a1) ||
      a1.includes("was not recorded"),
  ).toBe(true);

  // Q2: who can clarify?
  await item.getByTestId("work-ledger-item-ask-input").fill("Who can clarify this?");
  await item.getByTestId("work-ledger-item-ask").click();
  await expect
    .poll(async () => (await item.getByTestId("work-ledger-item-ask-answer").textContent()) ?? "", {
      timeout: 15_000,
    })
    .not.toBe(a1);
  const a2 = (await item.getByTestId("work-ledger-item-ask-answer").textContent()) ?? "";
  console.log(`[ce3] Q2 answer: "${a2.slice(0, 140)}"`);
  expect(/can clarify — /.test(a2) || a2.includes("No clarifier is known yet")).toBe(true);

  // No raw tokens anywhere in the answers.
  for (const banned of ["SLACK:", "source_system", "HUMAN_REVIEW", "ledger_entry_id", "CONNECTOR"]) {
    expect(`${a1} ${a2}`).not.toContain(banned);
  }

  await page.screenshot({ path: "screenshots/clarity-answer-ask.png", fullPage: true });

  // Read-only proof: asking created nothing.
  const escAfter = await pendingCount(request, token);
  console.log(`[ce3] escalations pending AFTER: ${escAfter}`);
  expect(escAfter).toBe(escBefore);
});
