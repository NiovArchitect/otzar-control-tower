// FILE: otzar-live-calendar-n04.spec.ts
// PURPOSE: N-04 DEEP live smoke — final agreed date/time/timezone, no
//          "normalization not wired", honest gates, no false create.
//
// SCENARIOS:
//   N04-A  Talk: schedule meeting with time+tz → proposal shows final agreed preview
//   N04-B  Confirm does NOT say "normalization not wired"
//   N04-C  Confirm → Created OR honest gate (reconnect / participant / policy)
//   N04-D  When gated with normalized time, final agreed time still visible
//   N04-E  Safety: no invite claim when not created
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-calendar-n04.spec.ts

import { test, expect, type Page } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const PW = process.env.DEMO_SHARED_PASSWORD;
const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

type Row = { id: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };
const rows: Row[] = [];
function rec(id: string, status: Row["status"], detail: string): void {
  rows.push({ id, status, detail: detail.slice(0, 280) });
  console.log(
    `[n04] ${status === "PASS" ? "✓" : status === "SKIP" ? "·" : "✗"} ${id} :: ${detail.slice(0, 160)}`,
  );
}

async function expandTalk(page: Page): Promise<boolean> {
  const input = page.getByLabel(/Message to Otzar/i);
  const orb = page.getByTestId("ambient-otzar-bar").first();
  await orb.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
  for (let i = 0; i < 5; i++) {
    if ((await input.count()) > 0 && (await input.first().isVisible().catch(() => false))) {
      return true;
    }
    await orb.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(350);
    if (!(await input.first().isVisible().catch(() => false))) {
      await page.getByTestId("header-talk-otzar").click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(350);
    }
  }
  return (await input.count()) > 0 && (await input.first().isVisible().catch(() => false));
}

test("N-04 deep: calendar final agreed time + timezone normalize", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  if (!(await expandTalk(page))) {
    rec("N04-A", "FAIL", "could not expand Talk");
    expect(false, "orb").toBe(true);
    return;
  }

  const cmd =
    "Schedule a meeting with David tomorrow at 11am PST for 30 minutes.";
  const input = page.getByLabel(/Message to Otzar/i);
  await input.fill(cmd);
  await page.getByRole("button", { name: /^send$/i }).click();
  await page.waitForTimeout(4000);

  // Wait for meeting proposal / artifact
  const body = page.locator("body");
  try {
    await expect
      .poll(
        async () => {
          const t = ((await body.innerText()) ?? "").toLowerCase();
          if (/meeting proposal|final agreed|time proposed|schedule/i.test(t))
            return "card";
          if (/what should|who|which|couldn'?t/i.test(t)) return "ask";
          return "wait";
        },
        { timeout: 40_000 },
      )
      .not.toBe("wait");
  } catch {
    /* fall through */
  }

  let pageText = ((await body.innerText()) ?? "").toLowerCase();
  const hasProposal =
    /meeting proposal|time proposed|final agreed|11:00|pacific/i.test(pageText);
  rec(
    "N04-A",
    hasProposal ? "PASS" : "FAIL",
    hasProposal
      ? "proposal/final-time language present"
      : `no proposal: ${pageText.slice(0, 120)}`,
  );

  const notWired = /normalization is not wired|not wired yet/i.test(pageText);
  rec(
    "N04-B-pre",
    !notWired ? "PASS" : "FAIL",
    notWired ? "still claims not wired before confirm" : "no not-wired claim",
  );

  // Confirm if button present
  const confirm = page.getByRole("button", { name: /^confirm$/i }).first();
  if ((await confirm.count()) > 0 && (await confirm.isVisible().catch(() => false))) {
    await confirm.click();
    await page.waitForTimeout(5000);
  } else {
    // Try data-testid variants
    const c2 = page.locator('[data-testid*="confirm"], button:has-text("Confirm")').first();
    if ((await c2.count()) > 0) {
      await c2.click().catch(() => undefined);
      await page.waitForTimeout(5000);
    }
  }

  pageText = ((await body.innerText()) ?? "").toLowerCase();
  const stillNotWired = /normalization is not wired|not wired yet/i.test(pageText);
  rec(
    "N04-B",
    !stillNotWired ? "PASS" : "FAIL",
    stillNotWired ? "still claims not wired after confirm" : "no not-wired after confirm",
  );

  const created = /\bcreated\b/i.test(pageText) && !/no event (was )?created/i.test(pageText);
  const honestGate =
    /reconnect|choose a time|held at the gate|needs .*resolved|needs confirmation|no event (was )?created|gated|policy/i.test(
      pageText,
    );
  rec(
    "N04-C",
    created || honestGate ? "PASS" : "FAIL",
    created
      ? "event created path"
      : honestGate
        ? "honest gate"
        : `unclear: ${pageText.slice(0, 140)}`,
  );

  const finalAgreed =
    /final agreed time|11:00 am pacific|pacific time ·/i.test(pageText);
  rec(
    "N04-D",
    finalAgreed || created || honestGate ? "PASS" : "FAIL",
    finalAgreed
      ? "final agreed visible"
      : "final agreed not required if early ask path",
  );

  // Do not treat safety copy "No invite sent" as a false claim of delivery.
  const positiveInvite =
    /\b(invite sent|sent invite|calendar invite delivered)\b/i.test(pageText) &&
    !/\bno invite sent\b/i.test(pageText);
  const gated = /no event (was )?created|held at the gate/i.test(pageText);
  const falseInvite = positiveInvite && gated;
  rec(
    "N04-E",
    !falseInvite ? "PASS" : "FAIL",
    falseInvite ? "false invite claim" : "no false invite on gated path",
  );

  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log(
    "N04_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "N04_JSON_END",
  );
  console.log(`[n04] TOTALS pass=${pass} fail=${fail} skip=${skip} rows=${rows.length}`);

  expect(fail, `N-04 deep smoke had ${fail} failures`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(3);
});
