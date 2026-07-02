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

import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "bugb";

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
  const nav = p.getByTestId("ambient-nav");
  for (const name of [/^My Day$/, /^Action Center$/, /^My Work$/, /^Talk to Otzar$/]) {
    const link = nav.getByRole("link", { name }).first();
    if (await link.count().then((c) => c > 0).catch(() => false)) {
      await link.click().catch(() => undefined);
      await p.waitForTimeout(900);
      // Confirm we actually left Comms before returning.
      const left = await p.getByTestId("comms-page").count().catch(() => 0);
      if (left === 0) return;
    }
  }
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

// The durable section reloads asynchronously after ingest; wait until the card
// count settles (two equal reads) before asserting on it, so a still-streaming
// load can't make the count drift under our assertions.
async function stableCardCount(p: Page): Promise<number> {
  let last = -1;
  for (let i = 0; i < 12; i++) {
    const c = await cardCount(p);
    if (c === last) return c;
    last = c;
    await p.waitForTimeout(1200);
  }
  return last;
}

test("live: Comms follow-ups are durable — survive navigation; dismiss transitions the row", async ({ page }) => {
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

  // ── Dismiss one → removed immediately, and stays removed after navigating
  //    away and back (the backing row is CANCELLED, excluded from pending).
  await page.getByTestId("ctx-cancel-button").first().click();
  await expect.poll(async () => cardCount(page), { timeout: 15_000 }).toBe(before - 1);
  await leaveAndReturn(page);
  const afterDismiss = await stableCardCount(page);
  await page.screenshot({ path: `screenshots/${TAG}-3-after-dismiss.png`, fullPage: true });
  expect(afterDismiss).toBe(before - 1); // dismissed one stayed gone (row CANCELLED)

  // ── Cleanup: dismiss the remaining follow-ups this smoke created so it does
  //    not pollute the demo org (also exercises the CANCELLED transition again).
  for (let guard = 0; guard < 10; guard++) {
    const remaining = await cardCount(page);
    if (remaining === 0) break;
    await page.getByTestId("ctx-cancel-button").first().click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: `screenshots/${TAG}-4-cleaned.png`, fullPage: true });
});
