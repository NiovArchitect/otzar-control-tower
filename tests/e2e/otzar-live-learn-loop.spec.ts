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
//          TENANCY (migrated 2026-07-07): SMOKE ORG ONLY — the caller is
//          smoke-admin via OTZAR_SMOKE_ADMIN_PASSWORD with the structural
//          tenancy guard before the L2 ingest. Demo org is read-only.
// RUN: OTZAR_SMOKE_ADMIN_PASSWORD=… [OTZAR_LEARN_SMOKE_MUTATE=1] \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-learn-loop.spec.ts

import { test, expect } from "@playwright/test";
import {
  SMOKE_ADMIN_PASSWORD,
  SMOKE_GATE_MESSAGE,
  smokeAdminLogin,
} from "./live-tenancy";

test.describe.configure({ mode: "serial", retries: 0 });

const ARMED = process.env.OTZAR_LEARN_SMOKE_MUTATE === "1";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!SMOKE_ADMIN_PASSWORD, SMOKE_GATE_MESSAGE);

const authed = (t: string) => ({ authorization: `Bearer ${t}` });

test("L1 read-only: ingest + follow-ups routes refuse unauth; projection loads safe fields", async ({ request }) => {
  const unauthIngest = await request.post(`${API}/otzar/comms/ingest`, {
    data: { captured_text: "x" },
  });
  expect(unauthIngest.status()).toBe(401);
  const unauthList = await request.get(`${API}/work-os/comms/follow-ups`);
  expect(unauthList.status()).toBe(401);

  const tok = await smokeAdminLogin(request, ["read", "write"]);
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
  const tok = await smokeAdminLogin(request, ["read", "write"]);

  // Names nobody — no ambiguity, no vouch, no correction is created.
  // Reading prior corrections is side-effect-free; this proves the deployed
  // ingest (which now loads/derives them on every call) completes cleanly.
  const res = await request.post(`${API}/otzar/comms/ingest`, {
    headers: authed(tok),
    data: {
      title: "Otzar Smoke — Learn Loop read-path",
      captured_text:
        "Smoke check for the learn-loop read path (safe to cancel). " +
        "The caller will review the smoke checklist tomorrow morning.",
    },
    timeout: 180_000,
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  // Route envelope: { ok, result: <IngestTranscriptResult> }.
  const captureId = body.result?.conversation?.meeting_capture_id as string | undefined;
  expect(typeof captureId).toBe("string");

  // Cleanup: cancel any follow-up cards the smoke capture drafted (canonical
  // caller-owned PATCH -> CANCELLED, a done-status excluded from pending).
  // Also catches stale cards from earlier smoke runs by the labeled draft text.
  const list = await request.get(`${API}/work-os/comms/follow-ups`, { headers: authed(tok) });
  const followUps = ((await list.json()).follow_ups ?? []) as Array<{
    ledger_entry_id: string;
    meeting_capture_id: string | null;
    action?: { draft_text?: string; source_excerpt?: string | null };
  }>;
  const isSmoke = (f: (typeof followUps)[number]) =>
    f.meeting_capture_id === captureId ||
    /smoke checklist|learn.?loop/i.test(`${f.action?.draft_text ?? ""} ${f.action?.source_excerpt ?? ""}`);
  const smokeCards = followUps.filter(isSmoke);
  for (const card of smokeCards) {
    const patched = await request.patch(`${API}/work-os/ledger/${card.ledger_entry_id}`, {
      headers: authed(tok),
      data: { status: "CANCELLED" },
    });
    expect(patched.status()).toBe(200);
  }
  // No pending smoke residue.
  const after = await request.get(`${API}/work-os/comms/follow-ups`, { headers: authed(tok) });
  const remaining = (((await after.json()).follow_ups ?? []) as Array<{
    ledger_entry_id: string;
    meeting_capture_id: string | null;
    action?: { draft_text?: string; source_excerpt?: string | null };
  }>).filter(isSmoke);
  expect(remaining.length).toBe(0);
});
