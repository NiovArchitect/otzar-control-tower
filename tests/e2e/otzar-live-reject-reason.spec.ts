// FILE: otzar-live-reject-reason.spec.ts
// PURPOSE: [GAP-E] LIVE proof that a declined request carries the approver's
//          own words back to the SENDER: employee queues a clearly-labeled
//          smoke send (dual-control -> pending approval) → admin approver
//          rejects WITH a human reason → the sender's action list serves
//          not_approved_reason → the sender's Action Center shows
//          "From your approver: …" (screenshot). A rejected action never
//          executes, so nothing is delivered — the residue is terminal
//          REJECTED history only (append-only doctrine). Armed by
//          OTZAR_REJECT_SMOKE_MUTATE=1; L1 read-only always runs.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      OTZAR_REJECT_SMOKE_MUTATE=1 \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-reject-reason.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ mode: "serial", retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const ARMED = process.env.OTZAR_REJECT_SMOKE_MUTATE === "1";
const TAG = process.env.OTZAR_SHOT_TAG ?? "reject-reason";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const SAMIKSHA = "a378367c-5baf-43f6-9b0d-675dc74cb9a6";

const REASON =
  "Otzar smoke (Gap E): declining to verify the reason loop — nothing to change. Safe to ignore.";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read", "write"] },
  });
  return (await lr.json()).token as string;
}
const authed = (t: string) => ({ authorization: `Bearer ${t}` });

test("R1 read-only: the sender's action list serves safe fields only", async ({ request }) => {
  const emp = await apiLogin(request, EMPLOYEE_EMAIL);
  const res = await request.get(`${API}/actions?page_size=50`, { headers: authed(emp) });
  expect(res.status()).toBe(200);
  const raw = await res.text();
  for (const banned of [
    "payload_redacted",
    "policy_envelope",
    "source_entity_id",
    "target_entity_id",
    "password_hash",
    "resolution_metadata",
  ]) {
    expect(raw).not.toContain(banned);
  }
});

test("R2 armed: reject with a reason → the sender sees the approver's words (screenshot)", async ({ page, request }) => {
  test.skip(!ARMED, "Set OTZAR_REJECT_SMOKE_MUTATE=1 to run the reject-loop smoke.");
  test.setTimeout(240_000);
  const emp = await apiLogin(request, EMPLOYEE_EMAIL);
  const adm = await apiLogin(request, ADMIN_EMAIL);

  // 1) The employee queues a clearly-labeled smoke send (never delivered —
  //    it will be rejected, and rejected actions never execute).
  const created = await request.post(`${API}/actions`, {
    headers: authed(emp),
    data: {
      action_type: "SEND_INTERNAL_NOTIFICATION",
      idempotency_key: `gap-e-reason-${Date.now()}`,
      payload_summary: "Reason-loop verification (smoke)",
      payload_redacted: {
        recipient_entity_id: SAMIKSHA,
        notification_class: "OTZAR_INTERNAL_NOTE",
        body_summary:
          "Verification note from Otzar smoke test (Gap E reject leg): expected to be rejected. No action needed.",
      },
    },
  });
  const createdBody = await created.json();
  expect(createdBody.ok).toBe(true);
  const actionId = createdBody.action.action_id as string;
  const escalationId = createdBody.action.escalation_id as string | undefined;
  expect(typeof escalationId).toBe("string");

  // 2) The approver declines WITH a human reason.
  const rej = await request.post(`${API}/escalations/${escalationId}/reject`, {
    headers: authed(adm),
    data: { reason: REASON },
  });
  expect((await rej.json()).ok).toBe(true);

  // 3) Server truth: the SENDER's own list carries the approver's words.
  const list = await request.get(`${API}/actions?page_size=50`, { headers: authed(emp) });
  const items = ((await list.json()).items ?? []) as Array<{
    action_id: string;
    status: string;
    not_approved_reason?: string | null;
  }>;
  const mine = items.find((i) => i.action_id === actionId);
  expect(mine?.status).toBe("REJECTED");
  expect(mine?.not_approved_reason).toBe(REASON);

  // 4) The customer surface: sender's Action Center → Blocked tab shows
  //    "Not approved" + the approver's words. No raw codes.
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMPLOYEE_EMAIL);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 45_000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    history.pushState({}, "", "/app/actions");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.getByTestId("action-tab-blocked").waitFor({ state: "visible", timeout: 30_000 });
  await page.getByTestId("action-tab-blocked").click();
  const reasonLine = page
    .locator('[data-testid="action-not-approved-reason"]')
    .filter({ hasText: "Gap E" })
    .first();
  await reasonLine.waitFor({ state: "visible", timeout: 20_000 });
  await expect(reasonLine).toContainText("From your approver:");
  const pageText = (await page.locator("main, body").first().textContent()) ?? "";
  expect(pageText).not.toContain("resolution_metadata");
  expect(pageText).not.toContain("REJECTED");
  await page.screenshot({ path: `screenshots/${TAG}-1-sender-sees-reason.png`, fullPage: true });
});
