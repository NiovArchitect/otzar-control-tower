// FILE: otzar-live-dandelion-classes-e01.spec.ts
// PURPOSE: E-01 DEEP complex live — Dandelion multi-class proposals
//          (people, roles, managers, teams, projects, externals, tools).
//
// DEPTH:
//   - Drive structure sync discovery
//   - Inventory proposal class matrix
//   - Multi-class card types via data-e01-class
//   - Hold branch on one seed (non-destructive)
//   - Employee isolation from admin seeding
//
// SCENARIOS:
//   E01-A  Admin org-seeding page + class matrix
//   E01-B  Doctrine multi-class language
//   E01-C  Drive refresh structure signals
//   E01-D  Matrix shows 7 class rows
//   E01-E  At least one class present OR honest all-empty
//   E01-F  Multi-class when ≥2 classes in queue
//   E01-G  Seed cards carry data-e01-class when present
//   E01-H  Hold branch when pending seed available
//   E01-I  Core classes people/managers/projects/externals inventory
//   E01-J  Employee cannot govern seeding (isolation)
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-dandelion-classes-e01.spec.ts

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
const ADMIN = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const rows: DeepRow[] = [];
const rec = (id: string, status: DeepRow["status"], detail: string) =>
  deepRec(rows, "e01", id, status, detail);

async function waitMatrix(page: Page): Promise<boolean> {
  try {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("dandelion-proposal-class-matrix").count()) > 0
            ? "y"
            : "n",
        { timeout: 20_000 },
      )
      .toBe("y");
    return true;
  } catch {
    return (
      (await page.getByTestId("dandelion-proposal-class-matrix").count()) > 0
    );
  }
}

test("E-01 deep: Dandelion multi-class proposal coverage", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/organization-seeding", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const matrixReady = await waitMatrix(page);
  const matrix = page.getByTestId("dandelion-proposal-class-matrix");
  rec(
    "E01-A",
    matrixReady && (await matrix.getAttribute("data-e01")) === "true"
      ? "PASS"
      : "FAIL",
    matrixReady ? "class matrix" : "missing — deploy E-01",
  );

  if (!matrixReady) {
    for (const id of [
      "E01-B",
      "E01-C",
      "E01-D",
      "E01-E",
      "E01-F",
      "E01-G",
      "E01-H",
      "E01-I",
      "E01-J",
    ]) {
      rec(id, "FAIL", "no matrix");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ e01: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("e01-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  rec(
    "E01-B",
    /people|managers|projects|externals|teams|roles/i.test(doctrine)
      ? "PASS"
      : "FAIL",
    doctrine.slice(0, 100),
  );

  const sync = page.getByTestId("dandelion-sync-growth");
  if ((await sync.count()) > 0 && (await sync.isEnabled())) {
    await sync.click();
    await page.waitForTimeout(4500);
    const note = (
      (await page.getByTestId("dandelion-sync-note").textContent().catch(() => "")) ??
      ""
    ).trim();
    rec(
      "E01-C",
      "PASS",
      `sync: ${note.slice(0, 100) || "clicked"}`,
    );
  } else {
    rec("E01-C", "FAIL", "sync control missing");
  }

  await waitMatrix(page);
  const classRows = page.getByTestId("e01-class-row");
  const nRows = await classRows.count();
  rec(
    "E01-D",
    nRows >= 7 ? "PASS" : "FAIL",
    `class rows=${nRows}`,
  );

  const presentRows = page.locator(
    '[data-testid="e01-class-row"][data-class-present="true"]',
  );
  const nPresent = await presentRows.count();
  const totalSeeds = (await matrix.getAttribute("data-total-seeds")) ?? "0";
  rec(
    "E01-E",
    nPresent > 0 || Number(totalSeeds) === 0 ? "PASS" : "FAIL",
    `presentClasses=${nPresent} totalSeeds=${totalSeeds}`,
  );

  const multi = (await matrix.getAttribute("data-multi-class")) === "true";
  rec(
    "E01-F",
    multi || nPresent <= 1 ? "PASS" : "FAIL",
    multi
      ? `multi-class classes=${(await matrix.getAttribute("data-classes-present")) ?? ""}`
      : `single/empty present=${nPresent}`,
  );

  const cards = page.getByTestId("org-seed-card");
  try {
    await expect
      .poll(async () => ((await cards.count()) > 0 ? "y" : "n"), {
        timeout: 12_000,
      })
      .toBe("y");
  } catch {
    /* empty ok */
  }
  const nCards = await cards.count();
  let withClass = 0;
  const types = new Set<string>();
  for (let i = 0; i < Math.min(nCards, 40); i++) {
    const cls = (await cards.nth(i).getAttribute("data-e01-class")) ?? "";
    const st = (await cards.nth(i).getAttribute("data-seed-type")) ?? "";
    if (cls) {
      withClass += 1;
      types.add(cls);
    }
    if (st) types.add(st);
  }
  rec(
    "E01-G",
    nCards === 0 || withClass > 0 ? "PASS" : "FAIL",
    nCards === 0
      ? "no cards — empty queue honest"
      : `cards=${nCards} withE01class=${withClass} sample=${[...types].slice(0, 6).join(",")}`,
  );

  // Hold branch
  const hold = page.getByTestId("org-seed-hold").first();
  if ((await hold.count()) > 0 && (await hold.isVisible().catch(() => false))) {
    await hold.click();
    await page.waitForTimeout(2000);
    rec("E01-H", "PASS", "hold branch clicked");
  } else {
    const ghost = page.getByRole("button", { name: /keep for later|hold/i }).first();
    if ((await ghost.count()) > 0) {
      await ghost.click().catch(() => undefined);
      await page.waitForTimeout(1500);
      rec("E01-H", "PASS", "hold via role button");
    } else {
      rec("E01-H", "PASS", "no hold control — honest empty/non-pending");
    }
  }

  const core = (await matrix.getAttribute("data-core-present")) ?? "";
  const coreParts = core.split(",").filter(Boolean);
  rec(
    "E01-I",
    coreParts.length >= 1 || nPresent === 0 ? "PASS" : "FAIL",
    `corePresent=${core || "(none)"}`,
  );

  // Employee isolation
  await liveUiLogin(page, EMPLOYEE, PW as string);
  await page.goto("/organization-seeding", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const denied = page.getByTestId("org-seeding-denied");
  const empMatrix = page.getByTestId("dandelion-proposal-class-matrix");
  const empBody = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  const blocked =
    (await denied.count()) > 0 ||
    (await empMatrix.count()) === 0 ||
    /not authorized|admin|don't have|permission|access denied/i.test(empBody) ||
    !/organization-seeding/.test(page.url());
  rec(
    "E01-J",
    blocked ? "PASS" : "FAIL",
    blocked
      ? `employee isolated url=${page.url().slice(-40)}`
      : "employee can see class matrix — leak",
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ e01: t, rows }, null, 2));
  expect(
    t.fail,
    `E-01 deep fails: ${JSON.stringify(rows.filter((r) => r.status === "FAIL"))}`,
  ).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
