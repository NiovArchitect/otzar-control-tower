// FILE: otzar-live-defect-regression-r02.spec.ts
// PURPOSE: R-02 DEEP complex live — defect→regression catalog + process
//          (not marker tourism). Ties R-01 pressure repair to regression
//          coverage discipline on admin Users.
//
// DEPTH:
//   - Drive Users: pressure card + defect catalog
//   - Multi-step: open catalog rows, verify P0 coverage attrs
//   - Cross-surface: re-open after hierarchy surface interaction
//   - Honesty: process residual + open Meet defect not claimed covered
//
// SCENARIOS:
//   R02-A  Users shows defect-regression-card
//   R02-B  Doctrine + 5 process steps
//   R02-C  Coverage summary: covered ≥6, catalog rows ≥8
//   R02-D  P0 covered includes cycle + non-admin + no-staged-fakes
//   R02-E  Meet defect present as open (honest external)
//   R02-F  Scale L2/L3 partial residual present
//   R02-G  Enterprise pressure card coexists (R-01 → R-02 regress step)
//   R02-H  Drive hierarchy editor visible then re-prove catalog
//   R02-I  Process residual honest (automation not fully shipped)
//   R02-J  No false "all defects auto-filed" language
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-defect-regression-r02.spec.ts

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
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const rows: DeepRow[] = [];
const rec = (id: string, status: DeepRow["status"], detail: string) =>
  deepRec(rows, "r02", id, status, detail);

const REQUIRED_P0 = [
  "hier-cycle-refuse",
  "hier-nonadmin-deny",
  "no-staged-fakes",
  "memory-redaction-corpus",
] as const;

async function openUsers(page: Page): Promise<void> {
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  if ((await page.getByTestId("defect-regression-card").count()) === 0) {
    const ct = page.getByRole("link", {
      name: /open control tower|control tower/i,
    });
    if ((await ct.count()) > 0) {
      await ct.first().click();
      await page.waitForTimeout(1200);
    }
    await page.goto("/users", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
  }
}

test("R-02 deep: defect→regression catalog", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  await liveUiLogin(page, ADMIN, PW as string);
  await openUsers(page);

  const card = page.getByTestId("defect-regression-card");
  rec(
    "R02-A",
    (await card.count()) > 0 && (await card.getAttribute("data-r02")) === "true"
      ? "PASS"
      : "FAIL",
    (await card.count()) > 0
      ? "defect-regression-card"
      : "missing — deploy R-02 product",
  );

  if ((await card.count()) === 0) {
    for (const id of [
      "R02-B",
      "R02-C",
      "R02-D",
      "R02-E",
      "R02-F",
      "R02-G",
      "R02-H",
      "R02-I",
      "R02-J",
    ]) {
      rec(id, "FAIL", "no catalog card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ r02: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("r02-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  const steps = await page.getByTestId("r02-process-step").count();
  rec(
    "R02-B",
    /regression coverage|defect/i.test(doctrine) && steps >= 5
      ? "PASS"
      : "FAIL",
    `steps=${steps} doctrine=${doctrine.slice(0, 60)}`,
  );

  const covered = Number((await card.getAttribute("data-covered")) ?? "0");
  const total = Number((await card.getAttribute("data-total")) ?? "0");
  const catalogN = await page.getByTestId("r02-defect-row").count();
  rec(
    "R02-C",
    covered >= 7 && total >= 10 && catalogN >= 10 ? "PASS" : "FAIL",
    `covered=${covered} total=${total} rows=${catalogN}`,
  );

  const defectRows = page.getByTestId("r02-defect-row");
  const found: Record<string, string> = {};
  const n = await defectRows.count();
  for (let i = 0; i < n; i++) {
    const id = (await defectRows.nth(i).getAttribute("data-defect-id")) ?? "";
    const cov = (await defectRows.nth(i).getAttribute("data-coverage")) ?? "";
    if (id) found[id] = cov;
  }
  const p0Ok = REQUIRED_P0.every((id) => found[id] === "covered");
  rec(
    "R02-D",
    p0Ok ? "PASS" : "FAIL",
    `required=${REQUIRED_P0.map((id) => `${id}:${found[id] ?? "missing"}`).join(",")}`,
  );

  rec(
    "R02-E",
    found["meet-provider-oauth"] === "open" ? "PASS" : "FAIL",
    `meet=${found["meet-provider-oauth"] ?? "missing"}`,
  );

  rec(
    "R02-F",
    found["scale-l2-l3-continuous"] === "partial" ||
      found["scale-l2-l3-continuous"] === "open"
      ? "PASS"
      : "FAIL",
    `scale=${found["scale-l2-l3-continuous"] ?? "missing"}`,
  );

  const pressure = page.getByTestId("enterprise-pressure-card");
  rec(
    "R02-G",
    (await pressure.count()) > 0 ? "PASS" : "FAIL",
    `pressure=${await pressure.count()}`,
  );

  // Multi-step: touch hierarchy surface, re-open catalog
  const hier = page.getByTestId("hierarchy-editor");
  if ((await hier.count()) > 0) {
    await hier.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(600);
  }
  await openUsers(page);
  const card2 = page.getByTestId("defect-regression-card");
  const covered2 = Number((await card2.getAttribute("data-covered")) ?? "0");
  rec(
    "R02-H",
    (await card2.count()) > 0 && covered2 >= 6 ? "PASS" : "FAIL",
    `reprove covered=${covered2}`,
  );

  const residual = (
    (await page.getByTestId("r02-process-residual").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  const autoAttr =
    (await page
      .getByTestId("r02-process-residual")
      .getAttribute("data-process-automation")
      .catch(() => null)) ?? "";
  rec(
    "R02-I",
    /not shipped|automation|residual|discipline/i.test(residual) &&
      autoAttr === "residual"
      ? "PASS"
      : "FAIL",
    `residual=${residual.slice(0, 70)} attr=${autoAttr}`,
  );

  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  const falseClaim =
    /all defects auto-filed|fully automated defect pipeline|zero open defects forever/i.test(
      body,
    );
  rec(
    "R02-J",
    !falseClaim ? "PASS" : "FAIL",
    `falseClaim=${falseClaim}`,
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ r02: t, rows }, null, 2));
  expect(t.fail, `R-02 deep failures: ${JSON.stringify(rows)}`).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
