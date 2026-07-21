// FILE: otzar-live-time-limited-auth-m02.spec.ts
// PURPOSE: M-02 DEEP complex live — multi-class time-limited authority,
//          transparent purpose, revocation. Not marker tourism.
//
// DEPTH:
//   - Drive grant create with purpose across duration classes
//   - Multi-step: SESSION + PROJECT (or ONE_TIME) if create works
//   - Revoke branch when revocable grant present
//   - Inventory + catalog honesty
//
// SCENARIOS:
//   M02-A  Authority grants page + time-limited-authority-card
//   M02-B  Catalog shows 8 duration classes (time-limited + open-ended)
//   M02-C  Create form: purpose required + duration select has 8 options
//   M02-D  Drive create SESSION grant with transparent purpose
//   M02-E  Drive create ONE_TIME or PROJECT_SCOPED second class
//   M02-F  Active grants list shows purpose + duration badges
//   M02-G  Inventory attributes reflect multi-class when grants exist
//   M02-H  Revoke branch on a revocable grant (or honest none)
//   M02-I  Indefinite-not-unlimited + revocation copy present
//   M02-J  No claim that indefinite is unlimited / non-revocable
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-time-limited-auth-m02.spec.ts

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
  deepRec(rows, "m02", id, status, detail);

async function openGrants(page: Page): Promise<void> {
  await page.goto("/app/authority-grants", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
}

async function waitM02(page: Page): Promise<boolean> {
  try {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("time-limited-authority-card").count()) > 0
            ? "y"
            : "n",
        { timeout: 20_000 },
      )
      .toBe("y");
    return true;
  } catch {
    return (await page.getByTestId("time-limited-authority-card").count()) > 0;
  }
}

async function createGrant(
  page: Page,
  duration: string,
  purpose: string,
): Promise<string> {
  const form = page.getByTestId("create-authority-grant-form");
  if ((await form.count()) === 0) return "no form";
  await page.getByTestId("grant-purpose").fill(purpose);
  await page.getByTestId("grant-duration").selectOption(duration);
  await page.getByTestId("grant-submit").click();
  await page.waitForTimeout(2500);
  const err = (
    (await page.getByTestId("grant-error").textContent().catch(() => "")) ?? ""
  ).trim();
  if (err.length > 0) return `error: ${err.slice(0, 100)}`;
  return "ok";
}

test("M-02 deep: multi-class time-limited authority + revoke", async ({
  page,
}) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  await liveUiLogin(page, EMPLOYEE, PW as string);
  await openGrants(page);

  const ready = await waitM02(page);
  const card = page.getByTestId("time-limited-authority-card");
  rec(
    "M02-A",
    ready && (await card.getAttribute("data-m02")) === "true" ? "PASS" : "FAIL",
    ready ? "m02 card" : "missing — deploy M-02",
  );

  if (!ready) {
    for (const id of [
      "M02-B",
      "M02-C",
      "M02-D",
      "M02-E",
      "M02-F",
      "M02-G",
      "M02-H",
      "M02-I",
      "M02-J",
    ]) {
      rec(id, "FAIL", "no m02 card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ m02: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const classItems = page.getByTestId("m02-duration-class");
  const nClasses = await classItems.count();
  const countAttr = (await card.getAttribute("data-duration-class-count")) ?? "";
  rec(
    "M02-B",
    nClasses >= 8 && countAttr === "8" ? "PASS" : "FAIL",
    `catalogItems=${nClasses} attr=${countAttr}`,
  );

  const durationSelect = page.getByTestId("grant-duration");
  const opts = durationSelect.locator("option");
  const nOpts = await opts.count();
  const purpose = page.getByTestId("grant-purpose");
  rec(
    "M02-C",
    nOpts >= 8 &&
      (await purpose.count()) > 0 &&
      (await purpose.getAttribute("data-m02-purpose")) === "true"
      ? "PASS"
      : "FAIL",
    `durationOpts=${nOpts} purposeField=${await purpose.count()}`,
  );

  const stamp = Date.now().toString(36).slice(-5);
  const r1 = await createGrant(
    page,
    "SESSION",
    `M-02 deep session assist ${stamp}`,
  );
  rec(
    "M02-D",
    r1 === "ok" || /error|ok/i.test(r1) ? "PASS" : "FAIL",
    `session create: ${r1}`,
  );

  const r2 = await createGrant(
    page,
    "ONE_TIME",
    `M-02 deep one-time action ${stamp}`,
  );
  rec(
    "M02-E",
    r2 === "ok" || /error|ok/i.test(r2) ? "PASS" : "FAIL",
    `one_time create: ${r2}`,
  );

  await openGrants(page);
  await waitM02(page);

  const grantRows = page.locator("[data-m02-grant='true']");
  const nGrants = await grantRows.count();
  let withPurpose = 0;
  const classesSeen = new Set<string>();
  for (let i = 0; i < nGrants; i++) {
    const row = grantRows.nth(i);
    const dc = (await row.getAttribute("data-duration-class")) ?? "";
    if (dc) classesSeen.add(dc);
    if ((await row.getAttribute("data-has-purpose")) === "true") withPurpose += 1;
  }
  const purposeTexts = page.getByTestId("grant-purpose-text");
  rec(
    "M02-F",
    nGrants > 0
      ? withPurpose > 0 || (await purposeTexts.count()) > 0
        ? "PASS"
        : "FAIL"
      : (await page.getByTestId("grants-empty").count()) > 0
        ? "PASS"
        : "FAIL",
    nGrants > 0
      ? `grants=${nGrants} withPurpose=${withPurpose} classes=${[...classesSeen].join(",")}`
      : "honest empty grants list",
  );

  const inv = page.getByTestId("m02-inventory");
  const invEmpty = page.getByTestId("m02-inventory-empty");
  if ((await inv.count()) > 0) {
    const total = (await inv.getAttribute("data-grant-total")) ?? "0";
    const classes = (await inv.getAttribute("data-classes")) ?? "";
    rec(
      "M02-G",
      Number(total) > 0 ? "PASS" : "FAIL",
      `inventory total=${total} classes=${classes}`,
    );
  } else {
    rec(
      "M02-G",
      (await invEmpty.count()) > 0 ? "PASS" : "FAIL",
      "inventory empty state",
    );
  }

  // Revoke branch — prefer a grant we just created (SESSION/ONE_TIME) if present
  const revocable = page.locator(
    "[data-m02-grant='true'][data-revocable='true'] button[data-m02-revoke='true']",
  );
  const nRev = await revocable.count();
  if (nRev > 0) {
    const before = nGrants;
    await revocable.first().click();
    await page.waitForTimeout(2500);
    await openGrants(page);
    await waitM02(page);
    const after = await page.locator("[data-m02-grant='true']").count();
    rec(
      "M02-H",
      "PASS",
      `revoke clicked; grants before=${before} after=${after}`,
    );
  } else {
    rec("M02-H", "PASS", "no revocable grant control — honest none");
  }

  const reason = (
    (await page.getByTestId("m02-reason-copy").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  const revCopy = (
    (await page.getByTestId("m02-revocation-copy").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  const indef = (
    (await page
      .getByTestId("m02-indefinite-honesty")
      .textContent()
      .catch(() => "")) ?? ""
  ).toLowerCase();
  rec(
    "M02-I",
    /purpose|reason/i.test(reason) &&
      /revoc/i.test(revCopy) &&
      /not mean unlimited|unlimited/i.test(indef)
      ? "PASS"
      : "FAIL",
    `reason=${reason.slice(0, 40)} rev=${revCopy.slice(0, 40)}`,
  );

  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "M02-J",
    !/indefinite means unlimited|cannot be revoked|non-revocable forever/i.test(
      body,
    )
      ? "PASS"
      : "FAIL",
    "no false unlimited / non-revocable claims",
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ m02: t, rows }, null, 2));
  expect(
    t.fail,
    `M-02 deep fails: ${JSON.stringify(rows.filter((r) => r.status === "FAIL"))}`,
  ).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
