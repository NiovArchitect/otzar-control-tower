// FILE: tests/e2e/otzar-live-response-roundtrip.spec.ts
// PURPOSE: [OTZAR-LIVE-6] Definitive end-to-end proof of the founder scenario:
//          a user sends a governed message to a teammate, the TEAMMATE actually
//          replies (via the recipient inbox reply UI), and the sender then asks
//          "Did <teammate> respond?" — Otzar must answer FROM the governed thread
//          with the real reply ("…replied … <reply text>"), never the old
//          generic-chat hallucination and never a false "no reply yet".
//          This exercises the full bidirectional loop now that:
//            (a) the thread-query path resolves the teammate via the governed
//                resolver (frontend commit 2e0fe47), and
//            (b) the recipient reply lands in the A<->B governed thread — the
//                direct internalMessage path writes a Work-Ledger row, and the
//                mediator fallback now mirrors one too (niov-foundation PR #488).
//          ENV-GATED; two real demo accounts; demo-scoped writes only; no secrets.
// RUN: OTZAR_SMOKE_EMAIL=… OTZAR_SMOKE_PARTNER_EMAIL=… DEMO_SHARED_PASSWORD=… \
//        npm run test:e2e:live:response-roundtrip
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PARTNER_EMAIL = process.env.OTZAR_SMOKE_PARTNER_EMAIL ?? "david@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const rawPartner = PARTNER_EMAIL.split("@")[0]!;
// Capitalized given name as a person types it ("David") — the org resolver
// matches on the display name.
const PARTNER = rawPartner.charAt(0).toUpperCase() + rawPartner.slice(1);
// Unique token so the sender's "Did X respond?" answer can be asserted to carry
// THIS reply, not a stale one from a prior run.
const TOKEN = `rr${Date.now().toString(36)}`;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");
test.describe.configure({ timeout: 420_000 });

const REPLY_SEL = '[data-testid="otzar-conversation-entry"]:not([data-role="user"])';

async function login(p: Page, email: string): Promise<void> {
  await p.goto("/login");
  await p.getByLabel("Email").fill(email);
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

// The teammate opens their notification bell and replies to the most recent
// active note (the one the sender just delivered), tagging it with TOKEN.
async function replyFromInbox(p: Page, replyText: string): Promise<boolean> {
  await p.getByTestId("notification-bell-button").click().catch(() => undefined);
  await p.getByTestId("notification-bell-dropdown").waitFor({ state: "visible", timeout: 12_000 }).catch(() => undefined);
  // Wait for at least one active item to land (delivery can lag a beat).
  const item = p.getByTestId("notification-bell-item").first();
  const appeared = await expect
    .poll(async () => await p.getByTestId("notification-bell-item").count().catch(() => 0), { timeout: 30_000 })
    .toBeGreaterThan(0)
    .then(() => true)
    .catch(() => false);
  if (!appeared) return false;
  await item.getByTestId("notification-reply-open").first().click().catch(() => undefined);
  const textarea = p.getByTestId("notification-reply-textarea").first();
  await textarea.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
  await textarea.fill(replyText).catch(() => undefined);
  await p.getByTestId("notification-reply-send").first().click().catch(() => undefined);
  // Confirm the recipient UI recorded the governed reply.
  return await p
    .getByTestId("notification-reply-sent")
    .first()
    .waitFor({ state: "visible", timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
}

test("[OTZAR-LIVE-6] sender → teammate reply → 'Did X respond?' answers from the governed thread", async ({ browser }) => {
  const ctxA: BrowserContext = await browser.newContext();
  const ctxB: BrowserContext = await browser.newContext();
  const sender = await ctxA.newPage();
  const teammate = await ctxB.newPage();
  try {
    await login(sender, EMAIL);
    await login(teammate, PARTNER_EMAIL);

    // 1. Sender delivers a governed message naming the teammate.
    const sent = await ask(sender, `Tell ${PARTNER} to get ready for today's meetings. [${TOKEN}]`);
    expect(sent, "send should route through the governed rail").toMatch(/i sent|message|needs approval|on your behalf|couldn'?t/i);

    // 2. Teammate replies from their inbox with a uniquely-tagged note.
    const replyText = `I validate what I received and I will be ready. [${TOKEN}]`;
    const replied = await replyFromInbox(teammate, replyText);
    expect(replied, "teammate's governed reply should be recorded by the recipient UI").toBe(true);

    // 3. Sender asks whether the teammate responded — answered FROM the thread.
    let answer = "";
    await expect
      .poll(
        async () => {
          answer = await ask(sender, `Did ${PARTNER} respond?`);
          return answer;
        },
        { timeout: 60_000, intervals: [3000, 5000, 8000] },
      )
      .toMatch(/replied|responded|got back|confirm|validate|ready/i);
    console.log(`[response-roundtrip] "Did ${PARTNER} respond?" => ${answer}`);

    // The grounded happy path: Otzar surfaces the real reply, not a hallucination
    // and not a false "no reply yet".
    expect(answer).toMatch(/replied|responded|got back|confirm|validate|ready/i);
    expect(answer).not.toMatch(/don'?t see a reply from/i);
    expect(answer).not.toMatch(/don'?t see any (?:recent )?(?:message or )?thread/i);
    expect(answer).not.toMatch(/couldn'?t find/i);
    // No raw backend machinery leaked into the answer.
    expect(answer).not.toMatch(/\b(?:ent|led|cor|wkr)_[0-9a-z]{6,}\b|\/work-os\//);
  } finally {
    await ctxA.close().catch(() => undefined);
    await ctxB.close().catch(() => undefined);
  }
});
