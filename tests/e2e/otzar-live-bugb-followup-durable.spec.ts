// FILE: otzar-live-bugb-followup-durable.spec.ts
// PURPOSE: [PROD-UX-BUGB] LIVE verification on app.otzar.ai that Comms follow-up
//          send-cards are DURABLE — backed by FOLLOW_UP ledger rows via
//          GET /work-os/comms/follow-ups — so they survive leaving Comms and
//          coming back (the reported bug), and that dismiss transitions the
//          backing row to CANCELLED so it stays gone. Resilient to the live LLM
//          (asserts on whatever cards extraction produces). Cleans up the rows
//          it creates. Env-gated (DEMO_SHARED_PASSWORD); skips without creds.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-bugb-followup-durable.spec.ts

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

// This smoke mutates live data (ingest creates rows; send/dismiss transition
// them). Retries would re-ingest on top of a partial prior attempt and make
// counts drift — run it exactly once and start from a known-clean baseline.
test.describe.configure({ retries: 0 });

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "bugb";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

// [SMOKE-TENANCY 2026-07-07] DEMO ORG IS READ-ONLY: this arc's live
// mutation is demo-fixture-bound (named demo people / approver edges)
// and stays disabled until its smoke-org cast port (gap ledger P1).
// Write coverage remains in integration tests.
test.skip(true, "Demo org is read-only (2026-07-07); mutating arc awaits the smoke-org cast port (gap ledger P1).");
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function login(p: Page): Promise<void> {
  await p.goto("/login");
  await p.getByLabel("Email").fill(EMAIL);
  await p.getByLabel("Password").fill(PW as string);
  await p.getByRole("button", { name: /sign in/i }).click();
  await p.waitForURL(/\/app/, { timeout: 25_000 });
  await p.getByRole("button", { name: /log out/i }).first().waitFor({ state: "visible", timeout: 9000 }).catch(() => undefined);
}

async function gotoComms(p: Page): Promise<void> {
  await p.getByTestId("ambient-nav").getByRole("link", { name: /^Comms$/ }).first().click();
  await p.getByTestId("comms-page").waitFor({ state: "visible", timeout: 15_000 });
}

// Navigate to another primary rail and back — an in-app navigation (in-memory
// auth survives client-side clicks). This is the exact "leave Comms and come
// back" motion that used to drop the follow-up cards. Anchored exact names
// (mirroring the proven Comms selector); tries a few primary rails so the smoke
// doesn't hinge on one label being present for this viewer.
async function leaveComms(p: Page): Promise<void> {
  // The ambient rail's REAL labels (Today / Needs me / People / Memory) — the
  // earlier list used page titles that don't exist on the rail, so the
  // navigation silently no-oped and Comms never remounted (vacuous "survived
  // navigation" reads + stale counts). Verify we actually left; throw if not —
  // a smoke that can't navigate must fail loudly, not pass vacuously.
  const nav = p.getByTestId("ambient-nav");
  // Clear any stacked live toasts first (each suite's sends queue approvals →
  // toast pileup can sit over the rail); Escape + explicit closes are both
  // best-effort.
  await p.keyboard.press("Escape").catch(() => undefined);
  const closes = p.locator('[role="status"] button, [data-sonner-toast] button').filter({ hasText: /×|✕|close/i });
  const nClose = await closes.count().catch(() => 0);
  for (let i = 0; i < Math.min(nClose, 6); i++) {
    await closes.nth(0).click({ force: true }).catch(() => undefined);
    await p.waitForTimeout(150);
  }
  // Two passes; forced clicks — live notification toasts can overlay the rail
  // and intercept the first hit-test.
  for (let pass = 0; pass < 2; pass++) {
    for (const name of [/^Today/, /^Needs me/, /^People/, /^Memory/]) { // prefix-match: rail badges append counts to accessible names
      const link = nav.getByRole("link", { name }).first();
      if (await link.count().then((c) => c > 0).catch(() => false)) {
        await link.click({ force: true }).catch(() => undefined);
        // Wait for Comms to actually UNMOUNT — under post-send refetch load the
        // route swap can take several seconds; a fixed short wait misreads
        // "still swapping" as "didn't navigate".
        const gone = await p
          .getByTestId("comms-page")
          .waitFor({ state: "detached", timeout: 10_000 })
          .then(() => true)
          .catch(() => false);
        if (gone) return;
      }
    }
  }
  // HARNESS NOTE (P0-ARC-FINAL): intermittent under 4-suite sequence load —
  // the route swap occasionally doesn't complete despite forced clicks +
  // detach-waits (suspected toast/render contention). Product behavior is
  // unaffected (server-truth checks pass); the durable fix is a product test
  // hook (stable rail testids), out of scope for a verification pass.
  await p.screenshot({ path: "screenshots/harness-leavecomms-stuck.png", fullPage: true }).catch(() => undefined);
  throw new Error("leaveComms: no rail link navigated away from Comms — navigation would be vacuous");
}

async function leaveAndReturn(p: Page): Promise<void> {
  await leaveComms(p);
  await gotoComms(p);
}

const TRANSCRIPT =
  "Launch sync. David will lead this push. Please follow up with David about the UI review, " +
  "and ask Samiksha to confirm the auth refresh status before Friday.";

async function cardCount(p: Page): Promise<number> {
  return p.getByTestId("comms-follow-up-row").count();
}

// Start from a known-clean baseline: cancel any pending FOLLOW_UP rows left by a
// prior run so this smoke's counts reflect only what it creates.
async function cleanupPending(request: APIRequestContext): Promise<void> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email: EMAIL, password: PW, requested_operations: ["read", "write"] },
  });
  const token = (await lr.json()).token as string;
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

// The durable section reloads asynchronously after ingest; wait until the card
// count settles (two equal reads) before asserting on it, so a still-streaming
// load can't make the count drift under our assertions.
async function stableCardCount(p: Page): Promise<number> {
  let last = -1;
  for (let i = 0; i < 8; i++) {
    const c = await cardCount(p);
    if (c === last) return c;
    last = c;
    await p.waitForTimeout(800);
  }
  return last;
}

test("live: Comms follow-ups are durable — survive nav; send + dismiss transition the row; My Work shows it", async ({ page, request }) => {
  test.setTimeout(300_000); // live: cleanup + ingest + multi-step nav/transition
  await cleanupPending(request); // known-clean baseline (no leftover rows)
  await login(page);
  await gotoComms(page);

  // Ingest a conversation via Import notes.
  await page.getByTestId("comms-import-toggle").click();
  await page.getByTestId("comms-import-textarea").fill(TRANSCRIPT);
  await page.getByTestId("comms-import-submit").click();
  await page.getByTestId("comms-review").waitFor({ state: "visible", timeout: 40_000 }).catch(() => undefined);

  // The durable "Follow-ups waiting for you" section should appear with cards
  // (rendered from FOLLOW_UP ledger rows, reloaded after ingest). Wait for the
  // async reload to settle before capturing the baseline count.
  const section = page.getByTestId("comms-pending-follow-ups");
  await section.waitFor({ state: "visible", timeout: 25_000 }).catch(() => undefined);
  const before = await stableCardCount(page);
  await page.screenshot({ path: `screenshots/${TAG}-1-ingested.png`, fullPage: true });

  if (before === 0) {
    // The live LLM returned an empty/fallback extraction (no follow-ups). The
    // durability path is still verified by the FND integration + CT unit tests;
    // record the live state honestly rather than assert a card that isn't there.
    test.info().annotations.push({ type: "note", description: "Live extraction produced no follow-up cards this run; durability verified in unit/integration." });
    return;
  }

  // ── THE BUG B PROOF: leave Comms and come back — the cards must still be here.
  await leaveAndReturn(page);
  await page.getByTestId("comms-pending-follow-ups").waitFor({ state: "visible", timeout: 20_000 });
  const afterNav = await stableCardCount(page);
  await page.screenshot({ path: `screenshots/${TAG}-2-after-nav.png`, fullPage: true });
  expect(afterNav).toBe(before); // survived navigation (previously they vanished)

  // ── My Work shows the caller-owned FOLLOW_UP. ('My Work' lives under the
  //    ambient 'More' menu; assert against the exact route My Work renders from,
  //    via the authed API, rather than a fragile menu walk.)
  const lr = await request.post(`${API}/auth/login`, {
    data: { email: EMAIL, password: PW, requested_operations: ["read"] },
  });
  const token = (await lr.json()).token as string;
  const mwRes = await request.get(`${API}/work-os/my-work`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const myWork = ((await mwRes.json()).items ?? []) as Array<{ ledger_type?: string }>;
  expect(myWork.some((i) => i.ledger_type === "FOLLOW_UP")).toBe(true);

  // ── SEND one — the recipients on these cards are governance-confirmed (see the
  //    "Recipient confirmed" chips), so Send is enabled. The sent card drops from
  //    pending on the next load (row -> EXECUTED); the unsent ones remain.
  //    NOTE: a send dispatches a REAL governed internal note and cannot be undone
  //    — this leaves one EXECUTED FOLLOW_UP in the demo org (the founder asked to
  //    "send one").
  const sends = page.getByTestId("ctx-send-button");
  const sc = await sends.count();
  let sentIdx = -1;
  for (let i = 0; i < sc; i++) {
    const b = sends.nth(i);
    const label = ((await b.textContent()) ?? "").trim();
    if (!(await b.isDisabled()) && /send/i.test(label) && !/review|clarify|approval/i.test(label)) {
      sentIdx = i;
      break;
    }
  }
  let expectedRemaining = before;
  if (sentIdx >= 0) {
    await sends.nth(sentIdx).click();
    // The governed send resolves to ONE of: "Sent to …" (auto-approved),
    // "Submitted for approval" ([PROD-UX-APPROVAL-LOOP] the truthful dual-
    // control state — the draft is handed to governance, the row transitions,
    // approval continues in Action Center), or an inline error (rejection).
    // The first two both mean the draft left the pending set.
    const sentMarker = page.getByTestId("proposed-action-card-sent").first();
    const submittedMarker = page.getByTestId("proposed-action-card-submitted").first();
    const errMarker = page.getByTestId("ctx-error").first();
    await Promise.race([
      sentMarker.waitFor({ state: "visible", timeout: 45_000 }).catch(() => undefined),
      submittedMarker.waitFor({ state: "visible", timeout: 45_000 }).catch(() => undefined),
      errMarker.waitFor({ state: "visible", timeout: 45_000 }).catch(() => undefined),
    ]);
    const wasSent =
      (await sentMarker.isVisible().catch(() => false)) ||
      (await submittedMarker.isVisible().catch(() => false));
    await page.screenshot({ path: `screenshots/${TAG}-3-send-outcome.png`, fullPage: true });
    if (wasSent) {
      // Happy path: the sent row transitions to EXECUTED and drops from
      // pending. The live PATCH can land seconds AFTER the "Sent" confirmation
      // — poll by re-entering Comms until the pending set reflects it (a
      // fixed wait raced and flaked here; verified: the transition always
      // lands, just late).
      expectedRemaining = before - 1;
      await expect
        .poll(
          async () => {
            await leaveAndReturn(page);
            // The durable feed loads asynchronously (live API ~4-8s) and the
            // section is hidden while empty — an instant count reads a false
            // "stable 0". Wait for the section to appear before counting.
            const appeared = await page
              .getByTestId("comms-pending-follow-ups")
              .waitFor({ state: "visible", timeout: 15_000 })
              .then(() => true)
              .catch(() => false);
            return appeared ? stableCardCount(page) : 0;
          },
          { timeout: 150_000, intervals: [2_000] },
        )
        .toBe(expectedRemaining); // sent gone, unsent remain
      test.info().annotations.push({ type: "note", description: "Live send queued/executed (approver available); the sent card dropped from pending, unsent remained." });
    } else {
      await leaveAndReturn(page);
      // Governed rejection (this org has no eligible dual-control approver): the
      // send does NOT transition the row — it stays DRAFT and recoverable. This
      // is exactly criterion 5 ("failed sends remain recoverable"), verified live.
      expectedRemaining = before;
      expect(await stableCardCount(page)).toBe(before); // rejected send stayed recoverable
      test.info().annotations.push({ type: "note", description: "Live send governance-rejected (dual-control / no eligible approver); the card stayed DRAFT and recoverable (criterion 5). The send->EXECUTED happy path is unit-verified." });
    }
  } else {
    test.info().annotations.push({ type: "note", description: "No governance-confirmed sendable card this run; send path unit-verified." });
  }

  // ── Dismiss one → removed immediately, and stays removed after navigating
  //    away and back (the backing row is CANCELLED, excluded from pending).
  if (expectedRemaining >= 1) {
    await page.getByTestId("ctx-cancel-button").first().click();
    await expect.poll(async () => cardCount(page), { timeout: 15_000 }).toBe(expectedRemaining - 1);
    const expectAfterDismiss = expectedRemaining - 1;
    await expect
      .poll(
        async () => {
          await leaveAndReturn(page);
          const appeared = await page
            .getByTestId("comms-pending-follow-ups")
            .waitFor({ state: "visible", timeout: 15_000 })
            .then(() => true)
            .catch(() => false);
          return appeared ? stableCardCount(page) : 0;
        },
        { timeout: 90_000, intervals: [2_000] },
      )
      .toBe(expectAfterDismiss); // dismissed one stayed gone
    await page.screenshot({ path: `screenshots/${TAG}-4-after-dismiss.png`, fullPage: true });
  }

  // ── Cleanup: dismiss the remaining follow-ups this smoke created so it does
  //    not pollute the demo org (also exercises the CANCELLED transition again).
  for (let guard = 0; guard < 10; guard++) {
    const remaining = await cardCount(page);
    if (remaining === 0) break;
    // A just-sent card renders its confirmation (no cancel button) until the
    // next reload — clean via the UI when possible, else fall back to the API
    // cleanup below.
    const cancel = page.getByTestId("ctx-cancel-button").first();
    if ((await cancel.count().catch(() => 0)) === 0) break;
    await cancel.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(600);
  }
  await cleanupPending(request); // authoritative API cleanup — org left clean
  await page.screenshot({ path: `screenshots/${TAG}-5-cleaned.png`, fullPage: true });
});
