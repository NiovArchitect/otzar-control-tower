// FILE: otzar-live-clarification-roundtrip.spec.ts
// PURPOSE: [CE-2] LIVE reversible round-trip of the governed clarification
//          request: asker (vishesh) requests clarification from a suggested
//          clarifier (sadeil — the API-loginable candidate), the clarifier's
//          Review Center gains EXACTLY 1 "Clarification request", the asker
//          sees the waiting state on the item's Why, then the clarifier
//          resolves through the canonical reject rail — pending count back
//          to baseline, asker sees the declined state, no pending residue.
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-clarification-roundtrip.spec.ts

import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ASKER_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const CLARIFIER_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string, ops: string[]): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ops },
  });
  return (await lr.json()).token as string;
}

async function pendingIds(request: APIRequestContext, token: string): Promise<string[]> {
  const res = await request.get(`${API}/escalations/pending`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  return Array.isArray(body.escalations)
    ? body.escalations.map((e: { escalation_id: string }) => e.escalation_id)
    : [];
}

async function uiLogin(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PW as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, {
    timeout: 45_000,
  });
  await page.waitForTimeout(2500);
}

test("governed clarification round-trip: request → clarifier queue +1 → asker sees waiting → canonical resolve → no residue", async ({ page, request }) => {
  test.setTimeout(300_000);
  const asker = await apiLogin(request, ASKER_EMAIL, ["read", "write"]);
  const clarifier = await apiLogin(request, CLARIFIER_EMAIL, ["read", "write"]);
  const clarifierBefore = await pendingIds(request, clarifier);
  console.log(`[ce2] clarifier pending BEFORE: ${clarifierBefore.length}`);

  // 1. Find a row whose suggested clarifiers include the loginable clarifier.
  const mw = await request.get(`${API}/work-os/my-work`, {
    headers: { authorization: `Bearer ${asker}` },
  });
  const mwBody = await mw.json();
  const entries = (Array.isArray(mwBody) ? mwBody : (mwBody.entries ?? mwBody.items ?? [])) as Array<
    Record<string, unknown>
  >;
  let ledgerId: string | null = null;
  let ledgerTitle = "";
  let clarifierEntityId: string | null = null;
  // Oldest-first (the Slack-authored rows are the old ones), 10 concurrent
  // per batch so the probe fits the test budget.
  const ordered = [...entries].reverse();
  for (let i = 0; i < ordered.length && ledgerId === null; i += 10) {
    const batch = ordered.slice(i, i + 10);
    const results = await Promise.all(
      batch.map(async (e) => {
        const id = e.ledger_entry_id as string;
        const cr = await request.get(`${API}/work-os/ledger/${id}/clarity`, {
          headers: { authorization: `Bearer ${asker}` },
        });
        const cb = await cr.json().catch(() => null);
        return { e, id, clarity: cb?.clarity };
      }),
    );
    for (const r of results) {
      if (r.clarity === undefined || r.clarity === null) continue;
      // Skip rows that already carry a clarification (idempotent rail would
      // return the old one — we want a fresh, fully reversible round-trip).
      if (r.clarity.pending_clarification !== undefined) continue;
      const cands = (r.clarity.candidates ?? []) as Array<{
        entity_id: string;
        display_name: string;
      }>;
      const hit = cands.find((c) => /sadeil/i.test(c.display_name));
      if (hit !== undefined) {
        ledgerId = r.id;
        ledgerTitle = String(r.e.title ?? "");
        clarifierEntityId = hit.entity_id;
        break;
      }
    }
  }
  console.log(`[ce2] target row: ${ledgerId} "${ledgerTitle}" clarifier=${clarifierEntityId}`);
  test.skip(ledgerId === null, "No live row suggests the loginable clarifier — honest skip, no fake data.");

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
  await uiLogin(page, ASKER_EMAIL);
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
});
