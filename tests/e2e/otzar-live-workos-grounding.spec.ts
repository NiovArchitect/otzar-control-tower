// FILE: otzar-live-workos-grounding.spec.ts
// PURPOSE: Slice E live smoke — DATA-GROUNDED ANSWERING. With OTZAR_WORK_GROUNDING=on,
//          after the caller ingests a distinctive work item, asking Otzar about it
//          returns an answer that CITES the real WorkLedger fact (not a generic
//          hallucination). Also: asking about something with no record does NOT
//          get a fabricated answer. This proves the Slice B grounding is wired into
//          conductSession. REQUIRES the flag enabled in the target env — the spec
//          skips clearly if grounding isn't active (so an OFF deploy doesn't fail).
// RUN: OTZAR_WORK_GROUNDING_LIVE=on OTZAR_SMOKE_EMAIL=vishesh@niovlabs.com \
//      DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-workos-grounding.spec.ts
import { test, expect, request as pwRequest, type APIRequestContext } from "@playwright/test";
import { BASE, PW, SKIP_NO_PW, apiLogin, ingest, conversationMessage, ev, runMarker } from "./workos-helpers";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
// Only assert ON-mode behaviour when the deploy has grounding enabled.
const GROUNDING_ON = process.env.OTZAR_WORK_GROUNDING_LIVE === "on";

test.describe.configure({ mode: "serial" });

test.describe("live workos grounding: data-grounded answering", () => {
  test.skip(!PW, SKIP_NO_PW);
  test.skip(!GROUNDING_ON, "SKIPPED: set OTZAR_WORK_GROUNDING_LIVE=on once the deploy has the flag enabled");

  let ctx: APIRequestContext;
  let token: string | null = null;
  const marker = runMarker();
  const codeword = `orionflux${marker.replace(/[^a-z0-9]/gi, "")}`;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    ctx = await pwRequest.newContext({ baseURL: BASE });
    const login = await apiLogin(ctx, EMAIL, ["read", "write", "share"]);
    token = login.token;
    expect(token, `login failed for ${EMAIL}`).toBeTruthy();
    // A distinctive work item in the caller's OWN record.
    await ingest(ctx, token as string, {
      text: `Vishesh owns the ${codeword} telemetry calibration and will finish it before launch.`,
      title: `Grounding smoke ${marker}`,
    });
  });
  test.afterAll(async () => {
    await ctx?.dispose();
  });

  test("Otzar answers from the caller's real work record (grounded, not hallucinated)", async () => {
    const r = await conversationMessage(ctx, token as string, `What is the status of the ${codeword} telemetry work I own?`);
    console.log(`[grounding] Q: status of ${codeword} telemetry work =>`, r.answer);
    expect(r.status, "conversation HTTP").toBe(200);
    expect(r.answer.length, "got an answer").toBeGreaterThan(0);
    // GROUNDED-ONLY proof: the question already contains the codeword AND "telemetry",
    // so echoing those proves nothing. The ledger fact — and ONLY the ledger fact —
    // adds "calibration / will finish / before launch". Requiring one of those tokens
    // means the answer could only have come from the injected WorkLedger row, not from
    // parroting the prompt. (A question-echo or an "I don't have that" would NOT match.)
    expect(
      /calibrat|before launch|will finish|finish it/i.test(r.answer),
      "answer contains grounded-only content the caller's ledger fact supplied (not a question echo)",
    ).toBe(true);
    ev(test.info(), `grounded answer cites ledger-only content (calibration/launch) ✓`);
  });

  test("Otzar does not fabricate work it has no record of", async () => {
    const r = await conversationMessage(ctx, token as string, "What is the status of the Zephyr-9 quantum ledger migration I own?");
    expect(r.status).toBe(200);
    // It must NOT claim a specific status for work that doesn't exist — the
    // grounding block is empty for this query, so it should decline / not invent.
    expect(
      /don't have|no record|not aware|couldn't find|no information|don't see|no such|not sure/i.test(r.answer) ||
        !/in progress|completed|blocked|on track|status is/i.test(r.answer),
      "does not fabricate a status for non-existent work",
    ).toBe(true);
    ev(test.info(), `no fabrication for work with no record ✓`);
  });
});
