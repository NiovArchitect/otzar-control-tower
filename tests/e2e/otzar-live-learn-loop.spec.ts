// FILE: otzar-live-learn-loop.spec.ts
// PURPOSE: [LEARN-LOOP] LIVE verification for the recipient-correction
//          read-path slice. The correction INFLUENCE itself is deliberately
//          NOT exercised live: a live confirm/select writes a PERMANENT org
//          correction (no revoke path exists), so per the approved rule the
//          influence is proven by integration tests. Live coverage here:
//          L1 (read-only, always): ingest + follow-ups routes refuse unauth;
//             the follow-ups projection loads with safe fields for a member.
//          L2 (armed by OTZAR_LEARN_SMOKE_MUTATE=1): one clearly-labeled
//             smoke ingest naming ONLY the caller — every live ingest now
//             executes the prior-corrections load/derivation, so a clean 200
//             proves the deployed read-path runs without error. Any follow-up
//             cards created by the smoke capture are cancelled (canonical
//             PATCH), leaving no pending smoke residue.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      [OTZAR_LEARN_SMOKE_MUTATE=1] \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-learn-loop.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ mode: "serial", retries: 0 });

const CALLER_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const ARMED = process.env.OTZAR_LEARN_SMOKE_MUTATE === "1";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read", "write"] },
  });
  return (await lr.json()).token as string;
}
const authed = (t: string) => ({ authorization: `Bearer ${t}` });

test("L1 read-only: ingest + follow-ups routes refuse unauth; projection loads safe fields", async ({ request }) => {
  const unauthIngest = await request.post(`${API}/otzar/comms/ingest`, {
    data: { captured_text: "x" },
  });
  expect(unauthIngest.status()).toBe(401);
  const unauthList = await request.get(`${API}/work-os/comms/follow-ups`);
  expect(unauthList.status()).toBe(401);

  const tok = await apiLogin(request, CALLER_EMAIL);
  const list = await request.get(`${API}/work-os/comms/follow-ups`, { headers: authed(tok) });
  expect(list.status()).toBe(200);
  const raw = await list.text();
  for (const banned of ["password_hash", "secret", "public_key", "payload_redacted"]) {
    expect(raw).not.toContain(banned);
  }
});

test("L2 armed: a labeled smoke ingest exercises the deployed read-path; cards cancelled after", async ({ request }) => {
  test.skip(!ARMED, "Set OTZAR_LEARN_SMOKE_MUTATE=1 to run the labeled smoke ingest.");
  test.setTimeout(240_000);
  const tok = await apiLogin(request, CALLER_EMAIL);

  // Names only the caller — no ambiguity, no vouch, no correction is created.
  // Reading prior corrections is side-effect-free; this proves the deployed
  // ingest (which now loads/derives them on every call) completes cleanly.
  const res = await request.post(`${API}/otzar/comms/ingest`, {
    headers: authed(tok),
    data: {
      title: "Otzar Smoke — Learn Loop read-path",
      captured_text:
        "Smoke check for the learn-loop read path (safe to cancel). " +
        "Sadeil will review the smoke checklist tomorrow morning.",
    },
    timeout: 180_000,
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  const captureId = body.conversation?.meeting_capture_id as string | undefined;
  expect(typeof captureId).toBe("string");

  // Cleanup: cancel any follow-up cards the smoke capture drafted (canonical
  // caller-owned PATCH -> CANCELLED, a done-status excluded from pending).
  const list = await request.get(`${API}/work-os/comms/follow-ups`, { headers: authed(tok) });
  const followUps = ((await list.json()).follow_ups ?? []) as Array<{
    ledger_entry_id: string;
    meeting_capture_id: string | null;
  }>;
  const smokeCards = followUps.filter((f) => f.meeting_capture_id === captureId);
  for (const card of smokeCards) {
    const patched = await request.patch(`${API}/work-os/ledger/${card.ledger_entry_id}`, {
      headers: authed(tok),
      data: { status: "CANCELLED" },
    });
    expect(patched.status()).toBe(200);
  }
  // No pending smoke residue.
  const after = await request.get(`${API}/work-os/comms/follow-ups`, { headers: authed(tok) });
  const remaining = (((await after.json()).follow_ups ?? []) as Array<{ meeting_capture_id: string | null }>).filter(
    (f) => f.meeting_capture_id === captureId,
  );
  expect(remaining.length).toBe(0);
});
