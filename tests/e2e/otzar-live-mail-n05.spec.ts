// FILE: otzar-live-mail-n05.spec.ts
// PURPOSE: N-05 DEEP live smoke — Gmail/external email draft vs sent vs
//          delivered honesty. Never false-complete on external email.
//
// SCENARIOS:
//   N05-A  "Email X …" / "Send email to X" produces draft artifact
//   N05-B  Status is draft / not wired — not "sent" or "delivered"
//   N05-C  mailLifecycle attribute is not_wired or local_draft
//   N05-D  Outcome copy denies delivery
//   N05-E  Confirm does not upgrade to delivered
//   N05-F  No false completion language on page
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-mail-n05.spec.ts

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
    `[n05] ${status === "PASS" ? "✓" : status === "SKIP" ? "·" : "✗"} ${id} :: ${detail.slice(0, 160)}`,
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
      await page
        .getByTestId("header-talk-otzar")
        .click({ force: true })
        .catch(() => undefined);
      await page.waitForTimeout(350);
    }
  }
  return (await input.count()) > 0 && (await input.first().isVisible().catch(() => false));
}

test("N-05 deep: Gmail/email draft vs sent honesty", async ({ page }) => {
  test.setTimeout(240_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  if (!(await expandTalk(page))) {
    rec("N05-A", "FAIL", "orb not expanded");
    expect(false, "orb").toBe(true);
    return;
  }

  const cmd =
    "Email David that the launch is Friday and ask him to confirm the deck.";
  await page.getByLabel(/Message to Otzar/i).fill(cmd);
  await page.getByRole("button", { name: /^send$/i }).click();

  // Wait for draft outcome / card (not internal one-shot send)
  try {
    await expect
      .poll(
        async () => {
          const t = (
            (await page.getByTestId("voice-action-outcome").textContent().catch(() => "")) ??
            (await page.locator("body").innerText()) ??
            ""
          ).toLowerCase();
          if ((await page.getByTestId("work-artifact-card").count()) > 0)
            return "card";
          if (/draft|not sent|not wired|not delivered|external email/i.test(t))
            return "draft";
          if (/i sent .+ on your behalf/i.test(t)) return "false_internal";
          return "wait";
        },
        { timeout: 25_000 },
      )
      .not.toBe("wait");
  } catch {
    /* fall through */
  }

  const body = page.locator("body");
  let text = ((await body.innerText()) ?? "").toLowerCase();
  const outcomeOnly = (
    (await page.getByTestId("voice-action-outcome").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();

  const card = page.getByTestId("work-artifact-card");
  const hasCard = (await card.count()) > 0;
  const draftLang =
    /draft|not sent|not wired|nothing (was )?(sent|delivered)|local draft|external email/i.test(
      outcomeOnly || text,
    );
  const falseInternal = /i sent .+ on your behalf/i.test(outcomeOnly || text);
  rec(
    "N05-A",
    (hasCard || draftLang) && !falseInternal ? "PASS" : "FAIL",
    falseInternal
      ? `false internal send: ${(outcomeOnly || text).slice(0, 120)}`
      : hasCard
        ? "artifact card"
        : draftLang
          ? "draft language"
          : text.slice(0, 120),
  );

  // Status honesty
  const statusEl = page.getByTestId("work-artifact-status");
  const status =
    (await statusEl.count()) > 0
      ? ((await statusEl.first().textContent()) ?? "").toLowerCase()
      : text;
  const statusOk =
    /draft|not wired|not sent/i.test(status) &&
    !/\b(delivered|sent to)\b/i.test(status.replace(/not sent/g, ""));
  rec(
    "N05-B",
    statusOk || draftLang ? "PASS" : "FAIL",
    `status=${status.slice(0, 100)}`,
  );

  // Lifecycle attribute
  if (hasCard) {
    const life = (await card.first().getAttribute("data-mail-lifecycle")) ?? "";
    const ext = await card.first().getAttribute("data-external-channel");
    const ok =
      life === "not_wired" ||
      life === "local_draft" ||
      life === "" ||
      ext === "true";
    rec(
      "N05-C",
      ok ? "PASS" : "FAIL",
      `lifecycle=${life || "(empty)"} external=${ext}`,
    );
  } else {
    rec("N05-C", "SKIP", "no card — check outcome only");
  }

  const outcome = page.getByTestId("voice-action-outcome");
  const out =
    (await outcome.count()) > 0
      ? ((await outcome.textContent()) ?? "").toLowerCase()
      : text;
  const denies =
    /not sent|not delivered|nothing (was )?(sent|delivered)|local draft|not wired/i.test(
      out,
    );
  const falseComplete =
    /\b(delivered to|email delivered|message sent|sent successfully)\b/i.test(
      out,
    ) && !/not (sent|delivered)/i.test(out);
  rec(
    "N05-D",
    denies && !falseComplete ? "PASS" : "FAIL",
    falseComplete ? `false complete: ${out.slice(0, 100)}` : out.slice(0, 120),
  );

  // Confirm must not claim delivery
  const confirm = page.getByRole("button", { name: /^confirm$/i }).first();
  if ((await confirm.count()) > 0 && (await confirm.isVisible().catch(() => false))) {
    await confirm.click();
    await page.waitForTimeout(3000);
    text = ((await body.innerText()) ?? "").toLowerCase();
    const afterLife =
      (await page
        .getByTestId("work-artifact-card")
        .first()
        .getAttribute("data-mail-lifecycle")
        .catch(() => "")) ?? "";
    const stillHonest =
      /not sent|not delivered|not wired|local draft|provider rejected/i.test(
        text,
      ) ||
      afterLife === "not_wired" ||
      afterLife === "local_draft";
    const nowDelivered =
      afterLife === "delivered" ||
      (/\bdelivered\b/i.test(text) && !/not delivered/i.test(text));
    rec(
      "N05-E",
      stillHonest && !nowDelivered ? "PASS" : "FAIL",
      `after confirm lifecycle=${afterLife} honest=${stillHonest}`,
    );
  } else {
    rec("N05-E", "SKIP", "no confirm button (still ok if draft-only)");
  }

  text = ((await body.innerText()) ?? "").toLowerCase();
  // Scope false-completion to email path: "I sent David a review request" is internal OK
  const emailFalse =
    /\b(email (was )?delivered|gmail (was )?sent|message delivered via email)\b/i.test(
      text,
    );
  rec(
    "N05-F",
    !emailFalse ? "PASS" : "FAIL",
    emailFalse ? "false email completion on page" : "no false email completion",
  );

  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log(
    "N05_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "N05_JSON_END",
  );
  console.log(`[n05] TOTALS pass=${pass} fail=${fail} skip=${skip} rows=${rows.length}`);

  expect(fail, `N-05 deep smoke had ${fail} failures`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(3);
});
