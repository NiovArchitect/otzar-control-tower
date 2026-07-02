// FILE: otzar-live-approval-loop.spec.ts
// PURPOSE: [PROD-UX-APPROVAL-LOOP] LIVE two-leg verification of the closed
//          governed-send loop on app.otzar.ai:
//          APPROVE leg — sender sends → UI says "Submitted for approval"
//          (never "Sent") → escalation reaches the approver's queue → approver
//          approves in the Review Center UI → paired Action reconciles →
//          scheduler/executor DELIVERS the note (SUCCEEDED) → sender's Action
//          Center shows "Sent". Founder-authorized: this delivers ONE real,
//          clearly-labeled verification note to Samiksha.
//          REJECT leg — second send → approver rejects WITH a reason via the
//          new reason field → escalation REJECTED → paired Action REJECTED →
//          sender's Action Center shows "Not approved".
//          Fixtures via product APIs; org left clean. Env-gated.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-approval-loop.spec.ts

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 }); // live mutations — never retry over a partial run

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "loop";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const SAMIKSHA = "a378367c-5baf-43f6-9b0d-675dc74cb9a6";

const APPROVE_NOTE =
  "Verification note from Otzar smoke test: confirming governed approval delivery path. No action needed.";
const REJECT_NOTE =
  "Verification note from Otzar smoke test (reject leg): this note is expected to be rejected. No action needed.";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read", "write"] },
  });
  return (await lr.json()).token as string;
}
const authed = (t: string) => ({ authorization: `Bearer ${t}` });

async function uiLogin(p: Page, email: string): Promise<void> {
  await p.goto("/login");
  await p.getByLabel("Email").fill(email);
  await p.getByLabel("Password").fill(PW as string);
  await p.getByRole("button", { name: /sign in/i }).click();
  await p.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 45_000 });
  await p.waitForTimeout(2000);
}

// Client-side route change (React Router popstate) — a page.goto reload drops
// the in-memory session.
async function clientRoute(p: Page, path: string): Promise<void> {
  await p.evaluate((to) => {
    history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await p.waitForTimeout(2000);
}

// A confirmed-recipient FOLLOW_UP fixture (deterministic sendable card).
async function mkSendableCard(
  request: APIRequestContext,
  token: string,
  draft: string,
  localId: string,
): Promise<string> {
  const res = await request.post(`${API}/work-os/ledger`, {
    headers: authed(token),
    data: {
      ledger_type: "FOLLOW_UP",
      source_type: "TRANSCRIPT",
      target_entity_id: SAMIKSHA,
      title: "Follow-up to Samiksha Sharma",
      summary: draft,
      status: "DRAFT",
      next_action: "Review and send this follow-up.",
      details: {
        follow_up: {
          local_id: localId,
          action_type: "SEND_INTERNAL_NOTIFICATION",
          target: { entity_id: SAMIKSHA, display_name: "Samiksha Sharma", email: null },
          draft_text: draft,
          reason: "Verification smoke.",
          source_excerpt: null,
          confidence: "HIGH",
          resolution_status: "RESOLVED",
          recipient_governance: {
            entity_id: SAMIKSHA, display_name: "Samiksha Sharma", email: null, role: null,
            participantStatus: "unknown", mentionStatus: "explicitly_mentioned",
            workConnectionType: "transcript_assignee",
            evidence: { quote: null, source: "explicit_mention", matchedToken: "samiksha", alternativeCandidates: [] },
            roleMatch: "unknown", hierarchyConnection: "unknown", projectConnection: "unknown",
            policyStatus: "allowed", sensitivity: "internal", confidence: "high",
            recipientSafety: "confirmed", autonomyEligibility: "draft_only",
          },
          autonomy: {
            futureAutoEligible: false, reasons: [], requiresApprovalReason: null,
            actionRisk: "low", minimizedContextScope: "draft_only", ledgerState: "needs_review",
          },
        },
      },
    },
  });
  return ((await res.json()).entry.ledger_entry_id as string);
}

async function cleanupPendingFollowUps(request: APIRequestContext, token: string): Promise<void> {
  for (let round = 0; round < 4; round++) {
    const r = await request.get(`${API}/work-os/comms/follow-ups`, { headers: authed(token) });
    const fus = ((await r.json()).follow_ups ?? []) as Array<{ ledger_entry_id: string }>;
    if (fus.length === 0) return;
    for (const f of fus) {
      await request.patch(`${API}/work-os/ledger/${f.ledger_entry_id}`, {
        headers: authed(token),
        data: { status: "CANCELLED" },
      });
    }
  }
}

// Sender sends the (single) pending card in Comms; asserts the truthful
// submitted state; returns the created action_id + escalation_id via the API.
async function senderSendsCard(
  page: Page,
  request: APIRequestContext,
  empToken: string,
  screenshotName: string,
): Promise<{ actionId: string; escalationId: string }> {
  await uiLogin(page, EMPLOYEE_EMAIL);
  await page.getByTestId("ambient-nav").getByRole("link", { name: /^Comms/ }).first().click();
  await page.getByTestId("comms-pending-follow-ups").waitFor({ state: "visible", timeout: 25_000 });
  const send = page.getByTestId("ctx-send-button").first();
  await expect(send).toBeEnabled();
  const actionsBefore = await request.get(`${API}/actions?page_size=50`, { headers: authed(empToken) });
  const beforeIds = new Set(
    (((await actionsBefore.json()).items ?? []) as Array<{ action_id: string }>).map((a) => a.action_id),
  );
  await send.click();
  // THE TRUTH COPY: submitted, never "Sent", while approval is pending.
  const submitted = page.getByTestId("proposed-action-card-submitted");
  await submitted.waitFor({ state: "visible", timeout: 45_000 });
  await expect(submitted).toContainText("Submitted for approval");
  expect(await page.getByTestId("proposed-action-card-sent").count()).toBe(0);
  await page.screenshot({ path: `screenshots/${TAG}-${screenshotName}.png`, fullPage: true });
  // Resolve the new action via the API (id-based, no scraping).
  const actionsAfter = await request.get(`${API}/actions?page_size=50`, { headers: authed(empToken) });
  const created = (((await actionsAfter.json()).items ?? []) as Array<{
    action_id: string; status: string; escalation_id?: string | null;
  }>).find((a) => !beforeIds.has(a.action_id));
  expect(created).toBeDefined();
  expect(created!.status).toBe("PROPOSED");
  expect(created!.escalation_id ?? null).not.toBeNull();
  return { actionId: created!.action_id, escalationId: created!.escalation_id as string };
}

// ── APPROVE leg ──────────────────────────────────────────────────────────────
test("approve leg: submitted → approver queue → approve in Review Center → delivered → sender sees Sent", async ({ page, request }) => {
  test.setTimeout(420_000);
  const emp = await apiLogin(request, EMPLOYEE_EMAIL);
  await cleanupPendingFollowUps(request, emp);
  await mkSendableCard(request, emp, APPROVE_NOTE, "loop-approve-1");

  const { actionId, escalationId } = await senderSendsCard(page, request, emp, "1-sender-submitted");

  // NUANCE — mid-flight sender coherence: the sender's own Action Center
  // carries the action as pending (never "Sent") while the approver decides.
  await clientRoute(page, "/app/action-center");
  await page.getByTestId("action-center-list").waitFor({ state: "visible", timeout: 25_000 });
  const midFlight = page.locator(`[data-action-id="${actionId}"]`);
  await midFlight.waitFor({ state: "visible", timeout: 15_000 });
  expect(((await midFlight.textContent()) ?? "")).not.toMatch(/sent/i);

  // NUANCE — two-person invariant, live: the SENDER cannot resolve their own
  // escalation (403), and it never appears in their own pending-approvals queue.
  const selfApprove = await request.post(`${API}/escalations/${escalationId}/approve`, {
    headers: authed(emp),
    data: {},
  });
  expect(selfApprove.status()).toBe(403);
  const senderQueue = await request.get(`${API}/escalations/pending`, { headers: authed(emp) });
  expect(
    (((await senderQueue.json()).escalations ?? []) as Array<{ escalation_id: string }>).some(
      (e) => e.escalation_id === escalationId,
    ),
  ).toBe(false);

  // The escalation is in the approver's pending queue (API truth).
  const adm = await apiLogin(request, ADMIN_EMAIL);
  const pq = await request.get(`${API}/escalations/pending`, { headers: authed(adm) });
  expect(
    (((await pq.json()).escalations ?? []) as Array<{ escalation_id: string }>).some(
      (e) => e.escalation_id === escalationId,
    ),
  ).toBe(true);

  // Approver UI: Review Center pending queue → detail → two-step approve.
  await page.getByRole("button", { name: /log out/i }).first().click().catch(() => undefined);
  await uiLogin(page, ADMIN_EMAIL);
  await clientRoute(page, "/approvals");
  await page.getByTestId("approval-list").waitFor({ state: "visible", timeout: 25_000 });
  await page.screenshot({ path: `screenshots/${TAG}-2-approver-queue.png`, fullPage: true });
  await page.getByTestId(`approval-row-button-${escalationId}`).click();
  await page.getByTestId("approval-detail-panel").waitFor({ state: "visible", timeout: 15_000 });
  // NUANCE — the approver reads human context, never machine codes: what
  // needs approval + who requested it (a name, not a bare UUID).
  const desc = (await page.getByTestId("detail-escalation-description").textContent()) ?? "";
  expect(desc).toContain("Second approval for:");
  expect(desc).not.toContain("DUAL_CONTROL");
  const requester = (await page.getByTestId("detail-escalation-requester").textContent()) ?? "";
  expect(requester).not.toMatch(/^[0-9a-f-]{36}$/i); // resolved name, not a bare id
  await page.screenshot({ path: `screenshots/${TAG}-3-approver-controls.png`, fullPage: true });
  await page.getByTestId("approval-approve-button").click();
  await page.getByTestId("approval-confirm-dialog").waitFor({ state: "visible", timeout: 10_000 });
  await page.getByTestId("approval-confirm-submit").click();
  await page.waitForTimeout(2500);

  // Reconciliation + delivery: PROPOSED → APPROVED → SCHEDULED → RUNNING →
  // SUCCEEDED (admission ticks every ~30s live).
  await expect
    .poll(
      async () => {
        const r = await request.get(`${API}/actions?page_size=50`, { headers: authed(emp) });
        const a = (((await r.json()).items ?? []) as Array<{ action_id: string; status: string }>).find(
          (x) => x.action_id === actionId,
        );
        return a?.status ?? "MISSING";
      },
      { timeout: 180_000, intervals: [10_000] },
    )
    .toBe("SUCCEEDED");

  // The approver's queue no longer shows it.
  const pq2 = await request.get(`${API}/escalations/pending`, { headers: authed(adm) });
  expect(
    (((await pq2.json()).escalations ?? []) as Array<{ escalation_id: string }>).some(
      (e) => e.escalation_id === escalationId,
    ),
  ).toBe(false);

  // NUANCE — verdicts are final: a second resolution attempt on the already-
  // approved escalation is refused (no flip-flopping).
  const reResolve = await request.post(`${API}/escalations/${escalationId}/reject`, {
    headers: authed(adm),
    data: { reason: "should never apply" },
  });
  expect(reResolve.ok()).toBe(false);

  // NUANCE — audit proof: ACTION_APPROVED recorded for this exact action.
  const audit = await request.get(`${API}/org/audit?take=100&event_type=ACTION_APPROVED`, { headers: authed(adm) });
  expect(
    (((await audit.json()).items ?? []) as Array<{ details?: { action_id?: string } }>).some(
      (e) => e.details?.action_id === actionId,
    ),
  ).toBe(true);

  // Sender's Action Center shows the delivered truth: "Sent" under Completed.
  await page.getByRole("button", { name: /log out/i }).first().click().catch(() => undefined);
  await uiLogin(page, EMPLOYEE_EMAIL);
  await page.getByTestId("ambient-nav").getByRole("link", { name: /^Needs me/ }).first().click();
  await page.getByTestId("action-center-list").waitFor({ state: "visible", timeout: 25_000 });
  await page.getByTestId("action-tab-completed").click();
  await page.waitForTimeout(1500);
  const completed = (await page.getByTestId("action-center-list").textContent()) ?? "";
  expect(completed).toContain("Sent");
  await page.screenshot({ path: `screenshots/${TAG}-4-sender-sent-truth.png`, fullPage: true });
});

// ── REJECT leg ───────────────────────────────────────────────────────────────
test("reject leg: submitted → approver rejects with reason → Action REJECTED → sender sees Not approved", async ({ page, request }) => {
  test.setTimeout(300_000);
  const emp = await apiLogin(request, EMPLOYEE_EMAIL);
  await cleanupPendingFollowUps(request, emp);
  await mkSendableCard(request, emp, REJECT_NOTE, "loop-reject-1");

  const { actionId, escalationId } = await senderSendsCard(page, request, emp, "5-sender-submitted-reject-leg");

  // Approver UI: reject WITH the reason via the new reason field.
  await page.getByRole("button", { name: /log out/i }).first().click().catch(() => undefined);
  await uiLogin(page, ADMIN_EMAIL);
  await clientRoute(page, "/approvals");
  await page.getByTestId("approval-list").waitFor({ state: "visible", timeout: 25_000 });
  await page.getByTestId(`approval-row-button-${escalationId}`).click();
  await page.getByTestId("approval-detail-panel").waitFor({ state: "visible", timeout: 15_000 });
  await page.getByTestId("approval-reject-button").click();
  await page.getByTestId("approval-confirm-dialog").waitFor({ state: "visible", timeout: 10_000 });
  await page
    .getByTestId("approval-reject-reason")
    .fill("Verification smoke — rejecting this test note.");
  await page.screenshot({ path: `screenshots/${TAG}-6-approver-reject-reason.png`, fullPage: true });
  await page.getByTestId("approval-confirm-submit").click();
  await page.waitForTimeout(2500);

  // Both records tell the same truth: escalation REJECTED, Action REJECTED —
  // and the approver's reason is DURABLE on the escalation.
  const adm = await apiLogin(request, ADMIN_EMAIL);
  const esc = await request.get(`${API}/escalations/${escalationId}`, { headers: authed(adm) });
  const escBody = await esc.json();
  const escRow = escBody.escalation ?? escBody;
  expect(escRow.status).toBe("REJECTED");
  expect(JSON.stringify(escRow.resolution_metadata ?? {})).toContain(
    "Verification smoke — rejecting this test note.",
  );

  // NUANCE — audit proof: ACTION_REJECTED for this exact action, carrying the
  // approver's human reason as a safe scalar.
  const audit = await request.get(`${API}/org/audit?take=100&event_type=ACTION_REJECTED`, { headers: authed(adm) });
  const rejectedRow = (((await audit.json()).items ?? []) as Array<{
    details?: { action_id?: string; approver_reason?: string; decision_reason?: string };
  }>).find((e) => e.details?.action_id === actionId);
  expect(rejectedRow).toBeDefined();
  expect(rejectedRow?.details?.decision_reason).toBe("dual-control-escalation-rejected");
  expect(rejectedRow?.details?.approver_reason).toBe("Verification smoke — rejecting this test note.");

  // NUANCE — verdicts are final: approving after rejection is refused.
  const flipFlop = await request.post(`${API}/escalations/${escalationId}/approve`, {
    headers: authed(adm),
    data: {},
  });
  expect(flipFlop.ok()).toBe(false);
  await expect
    .poll(
      async () => {
        const r = await request.get(`${API}/actions?page_size=50`, { headers: authed(emp) });
        const a = (((await r.json()).items ?? []) as Array<{ action_id: string; status: string }>).find(
          (x) => x.action_id === actionId,
        );
        return a?.status ?? "MISSING";
      },
      { timeout: 30_000, intervals: [3_000] },
    )
    .toBe("REJECTED");

  // Sender's Action Center shows the honest verdict — no eternal "pending".
  await page.getByRole("button", { name: /log out/i }).first().click().catch(() => undefined);
  await uiLogin(page, EMPLOYEE_EMAIL);
  await page.getByTestId("ambient-nav").getByRole("link", { name: /^Needs me/ }).first().click();
  await page.getByTestId("action-center-list").waitFor({ state: "visible", timeout: 25_000 });
  await page.getByTestId("action-tab-blocked").click();
  await page.waitForTimeout(1500);
  const blocked = (await page.getByTestId("action-center-list").textContent()) ?? "";
  expect(blocked).toContain("Not approved");
  expect(blocked).not.toContain("REJECTED"); // never a raw status code
  await page.screenshot({ path: `screenshots/${TAG}-7-sender-not-approved.png`, fullPage: true });

  await cleanupPendingFollowUps(request, emp);
});

// ── NUANCE — idempotency: a retried send never duplicates the approval ───────
test("idempotency: replaying the same send key returns the SAME action — no duplicate approvals pile up", async ({ request }) => {
  test.setTimeout(120_000);
  const emp = await apiLogin(request, EMPLOYEE_EMAIL);
  const adm = await apiLogin(request, ADMIN_EMAIL);
  const key = `loop-idem-${Date.now()}`;
  const body = {
    action_type: "SEND_INTERNAL_NOTIFICATION",
    idempotency_key: key,
    payload_summary: "Idempotency verification (smoke)",
    payload_redacted: {
      recipient_entity_id: SAMIKSHA,
      notification_class: "OTZAR_INTERNAL_NOTE",
      body_summary:
        "Verification note from Otzar smoke test (idempotency): duplicate-protection check — will be rejected. No action needed.",
    },
  };
  const first = await (await request.post(`${API}/actions`, { headers: authed(emp), data: body })).json();
  const second = await (await request.post(`${API}/actions`, { headers: authed(emp), data: body })).json();
  expect(first.action.action_id).toBe(second.action.action_id); // same action, not a new one
  // Exactly ONE pending escalation exists for it in the approver's queue.
  const pq = await request.get(`${API}/escalations/pending`, { headers: authed(adm) });
  const matches = (((await pq.json()).escalations ?? []) as Array<{ escalation_id: string }>).filter(
    (e) => e.escalation_id === first.action.escalation_id,
  );
  expect(matches.length).toBe(1);
  // Governed cleanup: reject it (reconciles the action too — the loop's fix).
  const rej = await request.post(`${API}/escalations/${first.action.escalation_id}/reject`, {
    headers: authed(adm),
    data: { reason: "Verification smoke — idempotency check cleanup." },
  });
  expect((await rej.json()).ok).toBe(true);
});
