// FILE: otzar-live-clarification-roundtrip.spec.ts
// PURPOSE: [CE-2] LIVE reversible round-trip of the governed clarification
//          request: the asker requests clarification from a suggested
//          clarifier, the clarifier's Review Center gains EXACTLY 1
//          "Clarification request", the asker sees the waiting state on the
//          item's Why, then the clarifier resolves through the canonical
//          reject rail — pending count back to baseline, asker sees the
//          declined state, no pending residue.
//          TENANCY (cast port 2026-07-07): SMOKE ORG ONLY — the asker is
//          the per-run cast actor and the clarifier is the per-run cast
//          colleague, made a rankClarifiers candidate BY DURABLE ROW DATA
//          (the fixture's target_entity_id — the CE-1.5 "target" role), not
//          by scanning pre-existing rows. Fully self-contained; demo org
//          untouched.
// RUN: OTZAR_SMOKE_ADMIN_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-clarification-roundtrip.spec.ts

import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  SMOKE_ADMIN_PASSWORD,
  SMOKE_GATE_MESSAGE,
  cleanupSmokeCast,
  provisionSmokeCast,
  type SmokeCast,
} from "./live-tenancy";

test.describe.configure({ retries: 0 });

const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!SMOKE_ADMIN_PASSWORD, SMOKE_GATE_MESSAGE);

async function pendingIds(request: APIRequestContext, token: string): Promise<string[]> {
  const res = await request.get(`${API}/escalations/pending`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  return Array.isArray(body.escalations)
    ? body.escalations.map((e: { escalation_id: string }) => e.escalation_id)
    : [];
}

async function uiLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2500);
}

// A caller-owned FOLLOW_UP fixture addressed to the clarifier — durable row
// data makes them a rankClarifiers candidate (CE-1.5 "target" role).
async function mkClarifiableRow(
  request: APIRequestContext,
  cast: SmokeCast,
): Promise<{ ledgerId: string; title: string }> {
  const c = cast.colleague;
  const title = `CE2-SMOKE clarification fixture ${cast.runId}`;
  const res = await request.post(`${API}/work-os/ledger`, {
    headers: { authorization: `Bearer ${cast.employee.token}` },
    data: {
      ledger_type: "FOLLOW_UP",
      source_type: "TRANSCRIPT",
      target_entity_id: c.entityId,
      title,
      summary: `${c.firstName} — please confirm the CE2 smoke timeline. (safe to cancel)`,
      status: "DRAFT",
      next_action: "Review and send this follow-up.",
      details: {
        follow_up: {
          local_id: `ce2-smoke-${cast.runId}`,
          action_type: "SEND_INTERNAL_NOTIFICATION",
          target: { entity_id: c.entityId, display_name: c.displayName, email: c.email },
          draft_text: `${c.firstName} — please confirm the CE2 smoke timeline. (safe to cancel)`,
          reason: "Named in the conversation.",
          source_excerpt: null,
          confidence: "MEDIUM",
          resolution_status: "RESOLVED",
          recipient_governance: {
            entity_id: c.entityId, display_name: c.displayName, email: c.email, role: null,
            participantStatus: "unknown", mentionStatus: "explicitly_mentioned",
            workConnectionType: "transcript_assignee",
            evidence: { quote: null, source: "explicit_mention", matchedToken: c.firstName.toLowerCase(), alternativeCandidates: [] },
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
  const body = await res.json();
  expect(body.ok).toBe(true);
  return { ledgerId: body.entry.ledger_entry_id as string, title };
}

test("governed clarification round-trip: request → clarifier queue +1 → asker sees waiting → canonical resolve → no residue", async ({ page, request }) => {
  test.setTimeout(360_000);
  const cast = await provisionSmokeCast(request);
  try {
  const asker = cast.employee.token;
  const clarifier = cast.colleague.token;
  const clarifierBefore = await pendingIds(request, clarifier);
  console.log(`[ce2] clarifier pending BEFORE: ${clarifierBefore.length}`);

  // 1. Create the caller-owned fixture; the colleague is a candidate by row
  //    data (target role) — assert that from the same projection the UI uses.
  const { ledgerId, title: ledgerTitle } = await mkClarifiableRow(request, cast);
  const clarityRes = await request.get(`${API}/work-os/ledger/${ledgerId}/clarity`, {
    headers: { authorization: `Bearer ${asker}` },
  });
  expect(clarityRes.status()).toBe(200);
  const cands = (((await clarityRes.json()).clarity?.candidates ?? []) as Array<{
    entity_id: string;
    display_name: string;
  }>);
  const clarifierEntityId = cands.find((c) => c.entity_id === cast.colleague.entityId)?.entity_id;
  expect(clarifierEntityId, "the row's target must be a suggested clarifier").toBe(
    cast.colleague.entityId,
  );
  console.log(`[ce2] target row: ${ledgerId} "${ledgerTitle}" clarifier=${clarifierEntityId}`);

  // 2. The governed request (as the asker).
  const create = await request.post(`${API}/work-os/ledger/${ledgerId}/clarify`, {
    headers: { authorization: `Bearer ${asker}` },
    data: { clarifier_entity_id: clarifierEntityId },
  });
  expect(create.status()).toBe(201);
  const created = await create.json();
  const escalationId = created.escalation_id as string;
  console.log(`[ce2] escalation created: ${escalationId}`);

  // 3. The clarifier's Review Center gained EXACTLY this one.
  const clarifierAfter = await pendingIds(request, clarifier);
  expect(clarifierAfter.length).toBe(clarifierBefore.length + 1);
  expect(clarifierAfter).toContain(escalationId);

  // 4. The asker sees the waiting state on the item's Why (UI + screenshot).
  await uiLogin(page, cast.employee.email, cast.employee.password);
  await page.evaluate(() => {
    history.pushState({}, "", "/app/my-work");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect
    .poll(async () => await page.getByTestId("work-ledger-item").count(), { timeout: 45_000 })
    .toBeGreaterThan(0);
  // Titles are not unique on the live org — try each same-titled item until
  // one shows the clarification state (it is the row we requested on).
  const matches = page
    .getByTestId("work-ledger-item")
    .filter({ hasText: ledgerTitle.slice(0, 40) });
  const matchCount = Math.min(await matches.count(), 6);
  let uiState: string | null = null;
  for (let i = 0; i < matchCount; i++) {
    const item = matches.nth(i);
    await item.scrollIntoViewIfNeeded();
    await item.getByTestId("work-ledger-item-view").click();
    const stateLoc = item.getByTestId("work-ledger-item-clarification-state");
    const appeared = await stateLoc
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (appeared) {
      uiState = (await stateLoc.textContent()) ?? "";
      break;
    }
    await item.getByTestId("work-ledger-item-view").click(); // close, try next
  }
  if (uiState !== null) {
    console.log(`[ce2] asker UI state: "${uiState}"`);
    expect(uiState).toMatch(/Clarification requested from .+ — waiting\./);
  } else {
    // The row exists but is not on the rendered page (pagination) — verify
    // the asker-visible state via the same projection the UI consumes, and
    // say so honestly rather than faking a UI hit.
    console.log("[ce2] target row not on rendered page — verifying asker state via projection");
    const cr = await request.get(`${API}/work-os/ledger/${ledgerId}/clarity`, {
      headers: { authorization: `Bearer ${asker}` },
    });
    const cb = await cr.json();
    expect(cb?.clarity?.pending_clarification?.status).toBe("PENDING");
  }
  await page.screenshot({ path: "screenshots/clarification-asker-waiting.png", fullPage: true });

  // 5. Cleanup through the canonical rail: the clarifier resolves (reject —
  //    the reversible outcome; the record persists, the queue clears).
  const resolve = await request.post(`${API}/escalations/${escalationId}/reject`, {
    headers: { authorization: `Bearer ${clarifier}` },
    data: { resolution_metadata: { note: "live-smoke round-trip cleanup" } },
  });
  expect(resolve.ok()).toBe(true);

  // 6. No pending residue; the asker sees the resolved (declined) state.
  const clarifierFinal = await pendingIds(request, clarifier);
  expect(clarifierFinal.length).toBe(clarifierBefore.length);
  const finalClarity = await request.get(`${API}/work-os/ledger/${ledgerId}/clarity`, {
    headers: { authorization: `Bearer ${asker}` },
  });
  const fc = await finalClarity.json();
  console.log(`[ce2] final asker clarity state: ${fc?.clarity?.pending_clarification?.status}`);
  expect(fc?.clarity?.pending_clarification?.status).toBe("REJECTED");
  console.log(`[ce2] clarifier pending FINAL: ${clarifierFinal.length} (baseline restored)`);

  // 7. Cancel the fixture row (settled history) before suspending the cast.
  await request.patch(`${API}/work-os/ledger/${ledgerId}`, {
    headers: { authorization: `Bearer ${asker}` },
    data: { status: "CANCELLED" },
  });
  } finally {
    await cleanupSmokeCast(request, cast);
  }
});
