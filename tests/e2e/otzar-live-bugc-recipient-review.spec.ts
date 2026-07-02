// FILE: otzar-live-bugc-recipient-review.spec.ts
// PURPOSE: [PROD-UX-BUGC] LIVE verification on app.otzar.ai that a blocked
//          recipient review can be COMPLETED and that the decision is durable:
//          an out_of_scope follow-up shows "Confirm recipient"; confirming
//          records the caller-confirmed decision on the WorkLedger row (visible
//          after leaving Comms and returning) and unlocks Send; an approval-
//          boundary card (cross_team_needs_approval) shows honest copy with NO
//          override affordance and the API rejects the override (403). Fixtures
//          are created through the product API (POST /work-os/ledger,
//          caller-owned) and cleaned up. Env-gated; skips without creds.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-bugc-recipient-review.spec.ts

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

// Mutates live data (fixtures + review decisions); never retry on top of a
// partial prior attempt.
test.describe.configure({ retries: 0 });

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "bugc";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
// Live demo-org member (David Odie) — the out_of_scope fixture's target.
const DAVID = "6a49a936-cd60-4bde-b08c-2e31b11c4230";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email: EMAIL, password: PW, requested_operations: ["read", "write"] },
  });
  return (await lr.json()).token as string;
}

async function cleanupPending(request: APIRequestContext, token: string): Promise<void> {
  for (let round = 0; round < 6; round++) {
    const res = await request.get(`${API}/work-os/comms/follow-ups`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const fus = ((await res.json()).follow_ups ?? []) as Array<{ ledger_entry_id: string }>;
    if (fus.length === 0) return;
    for (const f of fus) {
      await request.patch(`${API}/work-os/ledger/${f.ledger_entry_id}`, {
        headers: { authorization: `Bearer ${token}` },
        data: { status: "CANCELLED" },
      });
    }
  }
}

// A follow-up payload in a given blocked governance state — the same shape
// ingest persists. Created through the product API as the caller's own row.
function fixturePayload(safety: "out_of_scope" | "cross_team_needs_approval") {
  return {
    ledger_type: "FOLLOW_UP",
    source_type: "TRANSCRIPT",
    target_entity_id: DAVID,
    title: "Follow-up to David Odie",
    summary: "David — please confirm the rollout timeline. (BUG C live smoke)",
    status: "DRAFT",
    next_action: "Review and send this follow-up.",
    details: {
      source: "conversation",
      follow_up: {
        local_id: `bugc-smoke-${safety}`,
        action_type: "SEND_INTERNAL_NOTIFICATION",
        target: { entity_id: DAVID, display_name: "David Odie", email: "david@niovlabs.com" },
        draft_text: "David — please confirm the rollout timeline. (BUG C live smoke)",
        reason: "Named in the conversation.",
        source_excerpt: "please confirm the rollout timeline",
        confidence: "MEDIUM",
        resolution_status: "RESTRICTED",
        recipient_governance: {
          entity_id: DAVID,
          display_name: "David Odie",
          email: "david@niovlabs.com",
          role: null,
          participantStatus: "unknown",
          mentionStatus: "explicitly_mentioned",
          workConnectionType: "none",
          evidence: { quote: null, source: "fuzzy_only", matchedToken: "david", alternativeCandidates: [] },
          roleMatch: "unknown",
          hierarchyConnection: "unknown",
          projectConnection: "unknown",
          policyStatus: "allowed",
          sensitivity: "internal",
          confidence: "low",
          recipientSafety: safety,
          autonomyEligibility: safety === "out_of_scope" ? "blocked" : "approval_required",
        },
        autonomy: {
          futureAutoEligible: false,
          reasons: ["recipient review pending"],
          requiresApprovalReason: "Recipient has no proof path to this work.",
          actionRisk: "low",
          minimizedContextScope: "draft_only",
          ledgerState: "needs_review",
        },
      },
    },
  };
}

async function login(p: Page): Promise<void> {
  await p.goto("/login");
  await p.getByLabel("Email").fill(EMAIL);
  await p.getByLabel("Password").fill(PW as string);
  await p.getByRole("button", { name: /sign in/i }).click();
  await p.waitForURL(/\/app/, { timeout: 25_000 });
}

async function gotoComms(p: Page): Promise<void> {
  await p.getByTestId("ambient-nav").getByRole("link", { name: /^Comms$/ }).first().click();
  await p.getByTestId("comms-page").waitFor({ state: "visible", timeout: 15_000 });
}

async function leaveAndReturn(p: Page): Promise<void> {
  const nav = p.getByTestId("ambient-nav");
  for (const name of [/^My Day$/, /^Today$/, /^Action Center$/, /^Needs me$/]) {
    const link = nav.getByRole("link", { name }).first();
    if (await link.count().then((c) => c > 0).catch(() => false)) {
      await link.click().catch(() => undefined);
      await p.waitForTimeout(900);
      if ((await p.getByTestId("comms-page").count().catch(() => 0)) === 0) break;
    }
  }
  await gotoComms(p);
}

test("live: blocked recipient review completes durably; approval boundary is not overridable", async ({ page, request }) => {
  test.setTimeout(180_000);
  const token = await apiLogin(request);
  await cleanupPending(request, token); // known-clean baseline

  // ── Fixtures via the product API (caller-owned durable rows).
  const mk = async (safety: "out_of_scope" | "cross_team_needs_approval") => {
    const res = await request.post(`${API}/work-os/ledger`, {
      headers: { authorization: `Bearer ${token}` },
      data: fixturePayload(safety),
    });
    const body = await res.json();
    expect(body.ok).toBe(true);
    return body.entry.ledger_entry_id as string;
  };
  const oosId = await mk("out_of_scope");
  const xteamId = await mk("cross_team_needs_approval");

  // ── API-level boundary proof: the approval boundary REJECTS the override.
  const xr = await request.post(`${API}/work-os/comms/follow-ups/${xteamId}/resolve-recipient`, {
    headers: { authorization: `Bearer ${token}` },
    data: { decision: "confirm" },
  });
  expect(xr.status()).toBe(403);
  const xb = await xr.json();
  expect(xb.code).toBe("APPROVAL_REQUIRED");
  expect(xb.message).toMatch(/approver/i);

  // ── UI: both cards render from the durable feed with the right affordances.
  await login(page);
  await gotoComms(page);
  await page.getByTestId("comms-pending-follow-ups").waitFor({ state: "visible", timeout: 20_000 });
  await expect(page.getByTestId("comms-review-confirm")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("comms-review-approval-boundary")).toBeVisible();
  // The approval-boundary card has NO override affordance (exactly one confirm
  // button on the page — the out_of_scope card's).
  expect(await page.getByTestId("comms-review-confirm").count()).toBe(1);
  await page.screenshot({ path: `screenshots/${TAG}-1-blocked.png`, fullPage: true });

  // ── Complete the review: Confirm recipient on the out_of_scope card.
  await page.getByTestId("comms-review-confirm").click();
  await expect(page.getByTestId("comms-review-you-confirmed")).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: `screenshots/${TAG}-2-confirmed.png`, fullPage: true });

  // ── THE BUG C PROOF: the decision is durable — leave Comms and come back.
  await leaveAndReturn(page);
  await page.getByTestId("comms-pending-follow-ups").waitFor({ state: "visible", timeout: 20_000 });
  await expect(page.getByTestId("comms-review-you-confirmed")).toBeVisible({ timeout: 15_000 });
  // Send is unlocked on the confirmed card (this org's separate no-approver
  // policy applies only at actual send time — BUG B verified that honestly).
  const sendButtons = page.getByTestId("ctx-send-button");
  const labels: string[] = [];
  for (let i = 0; i < (await sendButtons.count()); i++) {
    labels.push(((await sendButtons.nth(i).textContent()) ?? "").trim());
  }
  expect(labels.some((l) => /send/i.test(l) && !/review|clarify|approval/i.test(l))).toBe(true);
  await page.screenshot({ path: `screenshots/${TAG}-3-after-nav-still-confirmed.png`, fullPage: true });

  // ── Server-side durability proof: the row itself carries the decision.
  const fus = await request.get(`${API}/work-os/comms/follow-ups`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const rows = ((await fus.json()).follow_ups ?? []) as Array<{
    ledger_entry_id: string;
    action: { recipient_governance: { recipientSafety: string; evidence: { source: string } } };
  }>;
  const oos = rows.find((r) => r.ledger_entry_id === oosId);
  expect(oos?.action.recipient_governance.recipientSafety).toBe("confirmed");
  expect(oos?.action.recipient_governance.evidence.source).toBe("caller_confirmed");
  // The approval-boundary card is untouched.
  const xteam = rows.find((r) => r.ledger_entry_id === xteamId);
  expect(xteam?.action.recipient_governance.recipientSafety).toBe("cross_team_needs_approval");

  // ── Cleanup: cancel both smoke fixtures (org left clean).
  await cleanupPending(request, token);
  const after = await request.get(`${API}/work-os/comms/follow-ups`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect((((await after.json()).follow_ups ?? []) as unknown[]).length).toBe(0);
});
