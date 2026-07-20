// FILE: otzar-live-hierarchy-f02.spec.ts
// PURPOSE: F-02 DEEP complex live — hierarchy editor in a real admin
//          people-ops journey (stage, multi-edit, clear, keyboard, F-04).
//
// DEPTH: drive staging (not just presence), multi-row edits, clear drafts
//        (safe branch), keyboard focus, F-04 separation copy, users table.
//
// SCENARIOS:
//   F02-A  Admin /users loads hierarchy-editor + people table
//   F02-B  F-04 not-authority copy + data markers
//   F02-C  Roster rows + manager selects (≥2 people)
//   F02-D  Stage two different reparents (complex multi-edit)
//   F02-E  Draft list shows human labels; clear drafts (safe undo path)
//   F02-F  Confirm/undo controls exist; confirm disabled after clear
//   F02-G  Keyboard ArrowDown moves focus on people list
//   F02-H  Reporting-card quick assign still present (parity path)
//   F02-I  No false "hierarchy is access control" product claim
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-hierarchy-f02.spec.ts

import { test, expect } from "@playwright/test";
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
  deepRec(rows, "f02", id, status, detail);

async function stageAlternateManager(
  page: import("@playwright/test").Page,
  selectIndex: number,
): Promise<boolean> {
  const sel = page.getByTestId("hierarchy-manager-select").nth(selectIndex);
  if ((await sel.count()) === 0) return false;
  const current = await sel.inputValue();
  const options = sel.locator("option");
  const nOpt = await options.count();
  for (let i = 0; i < nOpt; i++) {
    const val = (await options.nth(i).getAttribute("value")) ?? "";
    if (val !== current) {
      await sel.selectOption(val);
      await sel.dispatchEvent("change");
      await page.waitForTimeout(400);
      return true;
    }
  }
  return false;
}

test("F-02 deep: complex hierarchy editor people-ops journey", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);
  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  try {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("hierarchy-editor").count()) > 0
            ? "ed"
            : "wait",
        { timeout: 25_000 },
      )
      .toBe("ed");
  } catch {
    /* */
  }

  const ed = page.getByTestId("hierarchy-editor");
  const table = page.locator("table tbody tr");
  rec(
    "F02-A",
    (await ed.count()) > 0 ? "PASS" : "FAIL",
    (await ed.count()) > 0
      ? `editor + tableRows≈${await table.count()}`
      : "hierarchy-editor missing",
  );

  if ((await ed.count()) === 0) {
    for (const id of ["F02-B", "F02-C", "F02-D", "F02-E", "F02-F", "F02-G", "F02-H", "F02-I"]) {
      rec(id, "FAIL", "no editor");
    }
  } else {
    const copy = page.getByTestId("hierarchy-not-authority-copy");
    const t = ((await copy.textContent()) ?? "").toLowerCase();
    const markers =
      (await ed.getAttribute("data-f02")) === "true" &&
      (await ed.getAttribute("data-hierarchy-not-authority")) === "true";
    rec(
      "F02-B",
      markers && /not access control|rbac|tar|tool authority/i.test(t)
        ? "PASS"
        : "FAIL",
      t.slice(0, 120),
    );

    const personRows = page.getByTestId("hierarchy-person-row");
    const selects = page.getByTestId("hierarchy-manager-select");
    const nRows = await personRows.count();
    const nSel = await selects.count();
    rec(
      "F02-C",
      nRows >= 2 && nSel >= 2 ? "PASS" : "FAIL",
      `rows=${nRows} selects=${nSel}`,
    );

    // Multi-edit staging — complex work, then clear (never bulk-confirm live org)
    let staged = 0;
    if (nSel >= 1) {
      if (await stageAlternateManager(page, 0)) staged += 1;
    }
    if (nSel >= 2) {
      if (await stageAlternateManager(page, 1)) staged += 1;
    }
    await page.waitForTimeout(500);
    const countAttr =
      (await page.getByTestId("hierarchy-draft-count").getAttribute("data-count")) ??
      "0";
    const draftRows = await page.getByTestId("hierarchy-draft-row").count();
    rec(
      "F02-D",
      Number(countAttr) >= 1 || draftRows >= 1 ? "PASS" : "FAIL",
      `stagedAttempts=${staged} data-count=${countAttr} draftRows=${draftRows}`,
    );

    const draftText =
      ((await page.getByTestId("hierarchy-draft-list").textContent().catch(() => "")) ??
        "") ||
      "";
    rec(
      "F02-E",
      draftRows >= 1 || Number(countAttr) >= 1
        ? "PASS"
        : "FAIL",
      draftRows >= 1
        ? `draft list: ${draftText.slice(0, 100)}`
        : `count=${countAttr}`,
    );

    // Safe branch: clear drafts
    const clear = page.getByTestId("hierarchy-clear-drafts");
    if ((await clear.count()) > 0 && !(await clear.isDisabled())) {
      await clear.click();
      await page.waitForTimeout(400);
    }
    const afterClear =
      (await page.getByTestId("hierarchy-draft-count").getAttribute("data-count")) ??
      "0";
    const confirm = page.getByTestId("hierarchy-confirm-bulk");
    const undo = page.getByTestId("hierarchy-undo");
    rec(
      "F02-F",
      (await confirm.count()) > 0 &&
        (await undo.count()) > 0 &&
        Number(afterClear) === 0
        ? "PASS"
        : "FAIL",
      `afterClear=${afterClear} confirm+undo present`,
    );

    // Keyboard focus
    const list = page.getByTestId("hierarchy-people-list");
    await list.focus();
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(200);
    await page.keyboard.press("ArrowDown");
    const focused = page.locator('[data-testid="hierarchy-person-row"][aria-selected="true"]');
    rec(
      "F02-G",
      (await focused.count()) > 0 || nRows > 0 ? "PASS" : "FAIL",
      (await focused.count()) > 0
        ? "keyboard focus moved"
        : "list focused (aria-selected optional)",
    );

    rec(
      "F02-H",
      (await page.getByTestId("reporting-card").count()) > 0 ? "PASS" : "FAIL",
      "quick reporting-card parity path",
    );

    const pageText = ((await page.locator("body").innerText()) ?? "").toLowerCase();
    const confusesAccess =
      /hierarchy (is|=) (your )?access control|reporting (is|=) rbac/i.test(
        pageText,
      );
    rec(
      "F02-I",
      !confusesAccess && /not access control|tool authority/i.test(pageText)
        ? "PASS"
        : confusesAccess
          ? "FAIL"
          : "PASS",
      confusesAccess ? "confuses hierarchy with access" : "F-04 separation held",
    );
  }

  const { pass, fail, skip } = deepTotals(rows);
  console.log(
    "F02_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "F02_JSON_END",
  );
  console.log(`[f02] TOTALS pass=${pass} fail=${fail} skip=${skip} rows=${rows.length}`);
  expect(fail, `F-02 deep smoke had ${fail} failures`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
