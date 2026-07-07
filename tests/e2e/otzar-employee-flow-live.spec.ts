// FILE: tests/e2e/otzar-employee-flow-live.spec.ts
// PURPOSE: Phase 4D — credentialed live smoke of the employee-visible loop
//          (Communication → Governed Work Movement) against the DEPLOYED app.
//          ENV-GATED: skips cleanly when credentials are absent, so it never
//          fails CI/local runs and never touches production without opt-in.
//          READ-MOSTLY by default: mutating steps (correction persistence) run
//          only when OTZAR_SMOKE_ALLOW_WRITES=1. Asserts HONEST outcomes (it
//          does not assume specific demo data exists). Secrets are never logged.
// RUN: OTZAR_SMOKE_EMAIL=… DEMO_SHARED_PASSWORD=… npm run test:e2e:live
// CONNECTS TO: playwright.live.config.ts, AmbientOtzarBar, Login.

import { test, expect } from "@playwright/test";
import { SMOKE_ORG_ENTITY_ID, resolveOrgEntityId } from "./live-tenancy";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL;
const PASSWORD = process.env.DEMO_SHARED_PASSWORD;
// [SMOKE-TENANCY 2026-07-07] The demo org is READ-ONLY: the correction
// write arms ONLY when the flag is set AND the account structurally
// resolves to the NIOV Smoke Org (resolved in beforeAll).
const ALLOW_WRITES_FLAG = process.env.OTZAR_SMOKE_ALLOW_WRITES === "1";
let ALLOW_WRITES = false;
const haveCreds = Boolean(EMAIL && PASSWORD);

test.beforeAll(async ({ request }) => {
  if (!ALLOW_WRITES_FLAG || !haveCreds) return;
  const orgId = await resolveOrgEntityId(request, EMAIL as string, PASSWORD as string);
  ALLOW_WRITES = orgId === SMOKE_ORG_ENTITY_ID;
  if (!ALLOW_WRITES) {
    console.log(
      "[tenancy] OTZAR_SMOKE_ALLOW_WRITES=1 ignored: account does not resolve to the NIOV Smoke Org (demo org is read-only).",
    );
  }
});

test.describe("Otzar employee flow — credentialed live smoke", () => {
  test.skip(
    !haveCreds,
    "Set OTZAR_SMOKE_EMAIL + DEMO_SHARED_PASSWORD to run the credentialed live smoke.",
  );

  test("Communication → Governed Work Movement (live, read-mostly)", async ({
    page,
  }) => {
    // A. Login / session.
    await page.goto("/login");
    await page.getByLabel("Email").fill(EMAIL as string);
    await page.getByLabel("Password").fill(PASSWORD as string);
    await page.getByRole("button", { name: /sign in/i }).click();
    // No auth error surfaced; the app shell loads.
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.waitForLoadState("networkidle");

    // Open the ambient orb and grab the calm-outcome surface.
    await page.getByRole("region", { name: /Talk to Otzar/i }).click();
    const input = page.getByLabel(/Message to Otzar/i);
    const send = page.getByRole("button", { name: /^send$/i });
    const outcome = page.getByTestId("voice-action-outcome");

    // Send a command and wait for the outcome to actually CHANGE (the live
    // governed rails are async). Logs the real outcome for the evidence report.
    let prev = "";
    const ask = async (text: string): Promise<string> => {
      await input.click();
      await input.fill("");
      await input.fill(text);
      await send.click();
      const captured = prev;
      await expect
        .poll(async () => (await outcome.textContent().catch(() => "")) ?? "", {
          timeout: 15_000,
        })
        .not.toBe(captured);
      const got = ((await outcome.textContent()) ?? "").trim();
      prev = got;
      console.log(`[live-smoke] "${text}" => ${got}`);
      return got;
    };

    // C. Transcript ingestion — one HONEST outcome regardless of demo data.
    const ingest = await ask("Use the latest transcript.");
    expect(ingest).toMatch(
      /Using the latest transcript|don't have transcript text yet|Paste or select the transcript|Which transcript should I use/i,
    );

    // I. Missing context → a governed resolve / one focused question.
    const missing = await ask("Ask David to review this.");
    expect(missing).toMatch(
      /What should I use as the current context\?|do you mean|couldn't find|sent David|review request/i,
    );

    // F. Tracking — honest answer (no faked completion/stale).
    const blocked = await ask("What is blocked?");
    expect(blocked).toMatch(
      /blocker|Nothing is blocked|Which meeting or transcript should I track/i,
    );

    // G/H. Correction (a write to the user's own scoped memory) — gated.
    if (ALLOW_WRITES) {
      const pref = await ask("Don't interrupt me for that.");
      expect(pref).toMatch(/preference for this workflow/i);
      await expect(page.getByTestId("correction-history")).toBeVisible();
    }

    // H. Saved corrections readback (read-only) — loads, empty, or calm error.
    const saved = page.getByTestId("saved-corrections");
    await saved.click();
    await expect(saved).toContainText(
      /No saved corrections yet|Saved as|Preference|Meaning clarification|Loading|couldn't load saved corrections/i,
      { timeout: 15_000 },
    );

    // No raw backend machinery in the employee-facing DOM.
    const body = await page.locator("body").innerHTML();
    expect(body).not.toMatch(/CROSS_ORG_DENIED|correction_capsule_id|meeting_capture_id/);
  });
});
