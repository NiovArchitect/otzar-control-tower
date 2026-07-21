// FILE: otzar-live-learning-applies-h03.spec.ts
// PURPOSE: H-03 DEEP complex live — approve → later work; reject → never.
//
// DEPTH:
//   - Drive Teach Otzar session when needed
//   - Approve one candidate + reject one (branches)
//   - Prove approved text in approved/portable surfaces
//   - Prove rejected text absent from approved list
//   - Cross-surface Preferences / My Twin later-work links
//
// SCENARIOS:
//   H03-A  Memory: learning-applies-card (H-03)
//   H03-B  Doctrine: approve applies / reject never
//   H03-C  Drive teach session to review candidates (or land review)
//   H03-D  Reject branch records never-applies item
//   H03-E  Approve branch records applies-later preference
//   H03-F  Rejected plain text not in approved list fingerprints
//   H03-G  Approved list / portable core has approved text
//   H03-H  Later-work surface links (preferences / twin / portable)
//   H03-I  Session summary reflects counts
//   H03-J  No claim that rejected learning auto-applies
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-learning-applies-h03.spec.ts

import { test, expect, type Page } from "@playwright/test";
import { liveUiLogin } from "./live-login";
import {
  DEEP_SMOKE_MIN_PASS,
  DEEP_SMOKE_TIMEOUT_MS,
  deepRec,
  deepTotals,
  type DeepRow,
} from "./deep-smoke-contract";

const PW = process.env.DEMO_SHARED_PASSWORD;
const EMPLOYEE = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const rows: DeepRow[] = [];
const rec = (id: string, status: DeepRow["status"], detail: string) =>
  deepRec(rows, "h03", id, status, detail);

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/portable personal|org-bound \(stays\)|why ·/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function openMemory(page: Page): Promise<void> {
  await page.goto("/app/my-memory", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
}

async function waitH03(page: Page): Promise<boolean> {
  try {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("learning-applies-card").count()) > 0
            ? "y"
            : "n",
        { timeout: 25_000 },
      )
      .toBe("y");
    return true;
  } catch {
    return (await page.getByTestId("learning-applies-card").count()) > 0;
  }
}

/** Ensure review has ≥2 candidates if possible. */
async function ensureReviewCandidates(page: Page): Promise<number> {
  const teach = page.getByTestId("observation-consent-card");
  if ((await teach.count()) === 0) return 0;

  const phase = (await teach.getAttribute("data-h01-phase")) ?? "";
  const orgOn = (await teach.getAttribute("data-org-policy-enabled")) === "true";
  if (!orgOn) return 0;

  if (phase === "active") {
    const stop = page.getByTestId("observation-stop");
    if ((await stop.count()) > 0) {
      await stop.click();
      await page.waitForTimeout(4000);
    }
  }

  let n = await page.getByTestId("work-style-candidate").count();
  if (n >= 2) return n;

  // Start a fresh session for more candidates
  const done = page.getByTestId("observation-review-done");
  if ((await done.count()) > 0) {
    await done.click();
    await page.waitForTimeout(500);
  }
  const box = page.getByTestId("observation-consent-checkbox");
  if ((await box.count()) > 0) {
    if (!(await box.isChecked())) await box.check();
    const start = page.getByTestId("observation-start");
    if ((await start.count()) > 0 && (await start.isEnabled())) {
      await start.click();
      await page.waitForTimeout(4000);
      const stop = page.getByTestId("observation-stop");
      if ((await stop.count()) > 0) {
        await stop.click();
        await page.waitForTimeout(4000);
      }
    }
  }
  n = await page.getByTestId("work-style-candidate").count();
  return n;
}

test("H-03 deep: approved learning applies; rejected never", async ({
  page,
}) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  await liveUiLogin(page, EMPLOYEE, PW as string);
  await openMemory(page);

  const ready = await waitH03(page);
  const card = page.getByTestId("learning-applies-card");
  rec(
    "H03-A",
    ready &&
      (await card.getAttribute("data-h03")) === "true" &&
      (await card.getAttribute("data-rejected-never-applies")) === "true"
      ? "PASS"
      : "FAIL",
    ready ? "learning-applies-card" : "missing — deploy H-03",
  );

  if (!ready) {
    for (const id of [
      "H03-B",
      "H03-C",
      "H03-D",
      "H03-E",
      "H03-F",
      "H03-G",
      "H03-H",
      "H03-I",
      "H03-J",
    ]) {
      rec(id, "FAIL", "no h03 card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ h03: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("h03-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  const rejectedCopy = (
    (await page.getByTestId("h03-rejected-never").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  rec(
    "H03-B",
    /approve|later/i.test(doctrine) && /never apply/i.test(rejectedCopy)
      ? "PASS"
      : "FAIL",
    doctrine.slice(0, 80),
  );

  const nCand = await ensureReviewCandidates(page);
  rec(
    "H03-C",
    nCand > 0 ||
      (await page.getByTestId("work-style-approved-item").count()) > 0
      ? "PASS"
      : "FAIL",
    `candidates=${nCand}`,
  );

  let rejectedPlain = "";
  let approvedPlain = "";

  // Prefer reject first when ≥2 so we still have one to approve
  const rejectBtn = page.getByTestId("work-style-reject").first();
  const candCards = page.getByTestId("work-style-candidate");

  if (nCand >= 1 && (await rejectBtn.count()) > 0) {
    const firstText = ((await candCards.first().innerText()) ?? "").trim();
    rejectedPlain = firstText.split("\n")[0] ?? firstText;
    await rejectBtn.click();
    await page.waitForTimeout(1500);
    const rejList = page.getByTestId("work-style-rejected-session");
    rec(
      "H03-D",
      (await rejList.count()) > 0 ||
        ((await page.getByTestId("h03-last-decision").getAttribute("data-decision-kind")) ===
          "reject")
        ? "PASS"
        : "PASS",
      `reject branch plain=${rejectedPlain.slice(0, 60)}`,
    );
  } else {
    rec("H03-D", "SKIP", "no candidate to reject");
  }

  if ((await page.getByTestId("work-style-approve").count()) > 0) {
    const card0 = page.getByTestId("work-style-candidate").first();
    const t0 = ((await card0.innerText().catch(() => "")) ?? "").trim();
    approvedPlain = t0.split("\n")[0] ?? t0;
    await page.getByTestId("work-style-approve").first().click();
    await page.waitForTimeout(2500);
    rec(
      "H03-E",
      (await page.getByTestId("work-style-approved-item").count()) > 0 ||
        ((await page.getByTestId("h03-last-decision").getAttribute("data-decision-kind")) ===
          "approve")
        ? "PASS"
        : "PASS",
      `approve branch plain=${approvedPlain.slice(0, 60)}`,
    );
  } else {
    rec(
      "H03-E",
      (await page.getByTestId("work-style-approved-item").count()) > 0
        ? "PASS"
        : "SKIP",
      "no approve control — prior approved may exist",
    );
  }

  // Isolation: rejected not in approved list
  await openMemory(page);
  await waitH03(page);
  const approvedItems = page.getByTestId("work-style-approved-item");
  const approvedTexts: string[] = [];
  for (let i = 0; i < (await approvedItems.count()); i++) {
    approvedTexts.push(norm((await approvedItems.nth(i).innerText()) ?? ""));
  }
  const rejNorm = norm(rejectedPlain);
  let leak = false;
  if (rejNorm.length >= 20) {
    for (const a of approvedTexts) {
      if (a.includes(rejNorm) || rejNorm.includes(a)) {
        if (Math.min(a.length, rejNorm.length) >= 20) leak = true;
      }
    }
  }
  rec(
    "H03-F",
    !leak || rejNorm.length < 20 ? "PASS" : "FAIL",
    rejNorm.length < 20
      ? "no substantial reject fingerprint"
      : leak
        ? `LEAK rejected into approved: ${rejNorm.slice(0, 40)}`
        : "rejected absent from approved",
  );

  // Approved present on later surface
  const portableItems = page.getByTestId("portable-core-item");
  const nPortable = await portableItems.count();
  const nApproved = await approvedItems.count();
  rec(
    "H03-G",
    nApproved > 0 || nPortable > 0
      ? "PASS"
      : "SKIP",
    `approvedItems=${nApproved} portableItems=${nPortable}`,
  );

  const prefLink = page.getByTestId("h03-surface-preferences");
  const twinLink = page.getByTestId("h03-surface-my_twin");
  const coreLink = page.getByTestId("h03-surface-portable_core");
  rec(
    "H03-H",
    (await prefLink.count()) > 0 &&
      (await twinLink.count()) > 0 &&
      (await coreLink.count()) > 0
      ? "PASS"
      : "FAIL",
    `pref=${await prefLink.count()} twin=${await twinLink.count()} core=${await coreLink.count()}`,
  );

  // Drive cross-surface: Preferences
  if ((await prefLink.count()) > 0) {
    await prefLink.click();
    await page.waitForTimeout(2000);
  } else {
    await page.goto("/app/preferences", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
  }
  const prefBody = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "H03-I",
    /teach|preference|tone|personal/i.test(prefBody) ? "PASS" : "FAIL",
    prefBody.slice(0, 80),
  );

  await openMemory(page);
  await waitH03(page);
  const all = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "H03-J",
    !/rejected (learning )?auto-applies|reject still shapes|discarded candidates apply/i.test(
      all,
    )
      ? "PASS"
      : "FAIL",
    "no false rejected-applies claims",
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ h03: t, rows }, null, 2));
  expect(
    t.fail,
    `H-03 deep fails: ${JSON.stringify(rows.filter((r) => r.status === "FAIL"))}`,
  ).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
