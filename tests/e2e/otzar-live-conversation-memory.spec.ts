// FILE: tests/e2e/otzar-live-conversation-memory.spec.ts
// PURPOSE: [OTZAR-LIVE-6] Live regression for conversational working memory /
//          pending-action continuity — the founder's catastrophic 4-turn
//          failure. Otzar must (1) treat "did X send me anything" as an INBOUND
//          lookup (not an outbound draft), (2) keep that intent on "Im asking if
//          X messaged me", (3) remember the pending update request, and (4)
//          RESUME and route it when the user supplies the recipients — never the
//          "what would you like me to do regarding X and Y?" dead end.
//          The deterministic proof lives in tests/unit (component 4-turn
//          transcript + pending-clarification + thread-query); this verifies the
//          loop against the deployed app.
//          ENV-GATED; demo-scoped writes only; no secrets.
// RUN: OTZAR_SMOKE_EMAIL=… DEMO_SHARED_PASSWORD=… [OTZAR_SMOKE_PARTNER_EMAIL=…]
//        [OTZAR_SMOKE_PARTNER2_EMAIL=…] npm run test:e2e:live:conversation-memory
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const P1 = cap((process.env.OTZAR_SMOKE_PARTNER_EMAIL ?? "david@niovlabs.com").split("@")[0]!);
const P2 = cap((process.env.OTZAR_SMOKE_PARTNER2_EMAIL ?? "samiksha@niovlabs.com").split("@")[0]!);
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

test("[OTZAR-LIVE-6] inbound lookup + pending-recipient slot-fill survive the turns", async ({ page }) => {
  await login(page);

  // Turn 1 — inbound lookup must NOT become an outbound draft.
  const t1 = await ask(page, `did ${P1.toLowerCase()} send me anything`);
  console.log(`[conv-memory] T1 "did ${P1} send me anything" => ${t1}`);
  expect(t1).not.toMatch(/pick the recipient|draft created/i);

  // Turn 2 — the awkward founder rephrase keeps the lookup intent.
  const t2 = await ask(page, `Im asking if ${P1.toLowerCase()} messaged me`);
  console.log(`[conv-memory] T2 => ${t2}`);
  expect(t2).not.toMatch(/pick the recipient|draft created/i);

  // Turn 3 — a recipient-less update request arms the pending clarification.
  const t3 = await ask(page, `I need ${P1} and ${P2} to send me their updates`);
  console.log(`[conv-memory] T3 => ${t3}`);

  // Turn 4 — the recipient answer RESUMES the request. Acceptable grounded
  // outcomes: it sent / is tracking, OR it asks one focused question about an
  // unresolved teammate. The ONE thing it must never do is the founder dead end.
  const t4 = await ask(page, `${P1} and ${P2} are the recipients`);
  console.log(`[conv-memory] T4 "${P1} and ${P2} are the recipients" => ${t4}`);
  expect(t4).not.toMatch(/what would you like me to do/i);
  expect(t4).not.toMatch(/i need more context to help you/i);
  expect(t4).toMatch(/sent|i'?ll track|who do you mean|couldn'?t find|on your behalf|route/i);
  // No raw backend machinery in any answer.
  for (const a of [t1, t2, t3, t4]) {
    expect(a).not.toMatch(/\b(?:ent|led|cor|wkr)_[0-9a-z]{6,}\b|\/work-os\//);
  }
});
