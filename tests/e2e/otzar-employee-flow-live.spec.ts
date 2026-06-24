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

const EMAIL = process.env.OTZAR_SMOKE_EMAIL;
const PASSWORD = process.env.DEMO_SHARED_PASSWORD;
const ALLOW_WRITES = process.env.OTZAR_SMOKE_ALLOW_WRITES === "1";
const haveCreds = Boolean(EMAIL && PASSWORD);

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

    const ask = async (text: string): Promise<void> => {
      await input.fill(text);
      await send.click();
    };

    // C. Transcript ingestion — one HONEST outcome regardless of demo data.
    await ask("Use the latest transcript.");
    await expect(outcome).toContainText(
      /Using the latest transcript|don't have transcript text yet|Paste or select the transcript|Which transcript should I use/i,
    );

    // I. Missing context → one focused question (or a governed resolve).
    await ask("Ask David to review this.");
    await expect(outcome).toContainText(
      /What should I use as the current context\?|do you mean|couldn't find David|review request/i,
    );

    // F. Tracking — honest answer (no faked completion/stale).
    await ask("What is blocked?");
    await expect(outcome).toContainText(
      /blocker|Nothing is blocked|Which meeting or transcript should I track/i,
    );

    // G/H. Correction (a write to the user's own scoped memory) — gated.
    if (ALLOW_WRITES) {
      await ask("Don't interrupt me for that.");
      await expect(outcome).toContainText(/preference for this workflow/i);
      await expect(page.getByTestId("correction-history")).toBeVisible();
    }

    // H. Saved corrections readback (read-only) — loads, empty, or calm error.
    const saved = page.getByTestId("saved-corrections");
    await saved.click();
    await expect(saved).toContainText(
      /No saved corrections yet|Saved as|Preference|Meaning clarification|Loading|couldn't load saved corrections/i,
    );

    // No raw backend machinery in the employee-facing DOM.
    const body = await page.locator("body").innerHTML();
    expect(body).not.toMatch(/CROSS_ORG_DENIED|correction_capsule_id|meeting_capture_id/);
  });
});
