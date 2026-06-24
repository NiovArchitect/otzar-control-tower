// FILE: tests/e2e/otzar-live-response-reconciliation.spec.ts
// PURPOSE: [OTZAR-LIVE-6] Live regression for the founder-exposed broken ambient
//          loop: a user sends a governed message and later asks "Did David
//          respond?". Before the fix, Otzar fell to generic chat ("I don't see
//          any thread … in the context available"). After the frontend fix the
//          query is CLASSIFIED and answered from the real A↔B governed thread —
//          a grounded response-status answer (the reply, or an honest "no reply
//          yet"), never the old hallucination.
//          NOTE: the FULL "Yes — David replied: …" requires the niov-foundation
//          reply-ledger fix (PR #488) to be merged + the otzar-api redeployed so
//          the reply lands in the thread; the exact end-to-end answer is proven
//          deterministically in tests/unit/thread-query.test.ts.
//          ENV-GATED; sends one demo-scoped governed message (writes). No secrets.
// RUN: OTZAR_SMOKE_EMAIL=… DEMO_SHARED_PASSWORD=… npm run test:e2e:live:response-reconciliation
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
// Use the capitalized given name as a person types it ("David"), matching the
// founder's real phrasing — the org resolver matches on the display name.
const rawPartner = (process.env.OTZAR_SMOKE_PARTNER_EMAIL ?? "david@niovlabs.com").split("@")[0]!;
const PARTNER = rawPartner.charAt(0).toUpperCase() + rawPartner.slice(1);
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");
test.describe.configure({ timeout: 300_000 });

const REPLY_SEL = '[data-testid="otzar-conversation-entry"]:not([data-role="user"])';
async function login(p: Page): Promise<void> {
  await p.goto("/login");
  await p.getByLabel("Email").fill(EMAIL);
  await p.getByLabel("Password").fill(PW as string);
  await p.getByRole("button", { name: /sign in/i }).click();
  await p.waitForURL(/\/app/, { timeout: 25_000 }).catch(() => undefined);
  await p.getByRole("button", { name: /log out/i }).first().waitFor({ state: "visible", timeout: 9000 }).catch(() => undefined);
}
async function ask(p: Page, text: string): Promise<string> {
  const region = p.getByRole("region", { name: /Talk to Otzar/i });
  const input = p.getByLabel(/Message to Otzar/i);
  if (!(await input.first().isVisible().catch(() => false))) await region.first().click().catch(() => undefined);
  const before = await p.locator(REPLY_SEL).count().catch(() => 0);
  await input.fill(text).catch(() => undefined);
  await p.getByRole("button", { name: /^send$/i }).click().catch(() => undefined);
  await expect.poll(async () => await p.locator(REPLY_SEL).count().catch(() => before), { timeout: 28_000 }).toBeGreaterThan(before);
  return ((await p.getByTestId("voice-action-outcome").textContent().catch(() => "")) ?? "").trim();
}

test("[OTZAR-LIVE-6] 'Did David respond?' is a grounded thread query, not a chat hallucination", async ({ page }) => {
  await login(page);
  // 1. Send a governed message (writes a thread + notification to the teammate).
  const sent = await ask(page, `Tell ${PARTNER} to get ready for today's meetings.`);
  expect(sent, "send should route through the governed rail").toMatch(/i sent|message|needs approval|couldn'?t|on your behalf/i);

  // 2. Ask whether they responded — must be answered FROM the governed thread.
  const answer = await ask(page, `Did ${PARTNER} respond?`);
  console.log(`[response-recon] "Did ${PARTNER} respond?" => ${answer}`);

  // Grounded response-status answer: either the reply itself, or an honest
  // "no reply yet" — NEVER the old generic-chat deflection.
  expect(answer).toMatch(/replied|don'?t see a reply from|review|ready|validate|confirmed|update from|i'?ll track/i);
  // The exact bug: do NOT regress to "I don't see any … thread … context available".
  expect(answer).not.toMatch(/don'?t see any (?:recent )?(?:message or )?thread/i);
  expect(answer).not.toMatch(/context available to me right now/i);
  // No raw backend machinery in the answer.
  expect(answer).not.toMatch(/\b(?:ent|led|cor|wkr)_[0-9a-z]{6,}\b|\/work-os\//);
});
