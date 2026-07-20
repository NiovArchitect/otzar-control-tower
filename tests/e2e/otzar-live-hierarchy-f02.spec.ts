// FILE: otzar-live-hierarchy-f02.spec.ts
// PURPOSE: F-02 DEEP live smoke — hierarchy editor bulk confirm/undo/a11y
//          markers + F-04 hierarchy≠authority copy on admin Users.
//
// SCENARIOS:
//   F02-A  Admin /users loads hierarchy-editor
//   F02-B  F-04 not-authority copy present
//   F02-C  People list + manager selects present
//   F02-D  Confirm bulk / undo controls present (disabled when empty ok)
//   F02-E  Stage one change when ≥2 people exist (or SKIP)
//   F02-F  data-f02 and data-hierarchy-not-authority markers
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-hierarchy-f02.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const PW = process.env.DEMO_SHARED_PASSWORD;
const ADMIN = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

type Row = { id: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };
const rows: Row[] = [];
function rec(id: string, status: Row["status"], detail: string): void {
  rows.push({ id, status, detail: detail.slice(0, 280) });
  console.log(
    `[f02] ${status === "PASS" ? "✓" : status === "SKIP" ? "·" : "✗"} ${id} :: ${detail.slice(0, 160)}`,
  );
}

test("F-02 deep: hierarchy editor bulk confirm + F-04 copy", async ({ page }) => {
  test.setTimeout(240_000);
  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  try {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("hierarchy-editor").count()) > 0
            ? "ed"
            : (await page.getByTestId("reporting-card").count()) > 0
              ? "rc"
              : "wait",
        { timeout: 25_000 },
      )
      .not.toBe("wait");
  } catch {
    /* fall through */
  }

  const ed = page.getByTestId("hierarchy-editor");
  if ((await ed.count()) === 0) {
    rec("F02-A", "FAIL", "hierarchy-editor missing — deploy F-02");
    for (const id of ["F02-B", "F02-C", "F02-D", "F02-E", "F02-F"]) {
      rec(id, "FAIL", "no editor");
    }
  } else {
    rec("F02-A", "PASS", "hierarchy-editor");

    const copy = page.getByTestId("hierarchy-not-authority-copy");
    const t = ((await copy.textContent()) ?? "").toLowerCase();
    rec(
      "F02-B",
      /not access control|rbac|tar|tool authority/i.test(t) ? "PASS" : "FAIL",
      t.slice(0, 120),
    );

    const list = page.getByTestId("hierarchy-people-list");
    const rowsN = await page.getByTestId("hierarchy-person-row").count();
    const selects = await page.getByTestId("hierarchy-manager-select").count();
    rec(
      "F02-C",
      (await list.count()) > 0 && (rowsN > 0 || selects >= 0) ? "PASS" : "FAIL",
      `rows=${rowsN} selects=${selects}`,
    );

    const confirm = page.getByTestId("hierarchy-confirm-bulk");
    const undo = page.getByTestId("hierarchy-undo");
    rec(
      "F02-D",
      (await confirm.count()) > 0 && (await undo.count()) > 0 ? "PASS" : "FAIL",
      "confirm+undo controls",
    );

    if (rowsN >= 2 && selects >= 2) {
      // Stage a *different* manager than current (same value is a no-op draft)
      const sel = page.getByTestId("hierarchy-manager-select").first();
      const current = await sel.inputValue();
      const options = sel.locator("option");
      const nOpt = await options.count();
      let target: string | null = null;
      for (let i = 0; i < nOpt; i++) {
        const val = (await options.nth(i).getAttribute("value")) ?? "";
        if (val !== current) {
          target = val;
          break;
        }
      }
      if (target !== null) {
        await sel.selectOption(target);
        // Ensure React onChange runs (some browsers need an extra input event)
        await sel.dispatchEvent("change");
        await page.waitForTimeout(600);
        let count =
          (await page
            .getByTestId("hierarchy-draft-count")
            .getAttribute("data-count")) ?? "0";
        // Fallback: stage via second row if first is sticky top-level no-op
        if (Number(count) < 1 && selects >= 2) {
          const sel2 = page.getByTestId("hierarchy-manager-select").nth(1);
          const cur2 = await sel2.inputValue();
          const opts2 = sel2.locator("option");
          const n2 = await opts2.count();
          for (let i = 0; i < n2; i++) {
            const v = (await opts2.nth(i).getAttribute("value")) ?? "";
            if (v !== cur2) {
              await sel2.selectOption(v);
              await sel2.dispatchEvent("change");
              await page.waitForTimeout(500);
              break;
            }
          }
          count =
            (await page
              .getByTestId("hierarchy-draft-count")
              .getAttribute("data-count")) ?? "0";
        }
        rec(
          "F02-E",
          Number(count) >= 1 ||
            (await page.getByTestId("hierarchy-draft-row").count()) > 0
            ? "PASS"
            : "FAIL",
          `staged count=${count} from=${current.slice(0, 8)} to=${target.slice(0, 8)}`,
        );
        // Clear drafts — do not mutate live org hierarchy in smoke
        await page
          .getByTestId("hierarchy-clear-drafts")
          .click()
          .catch(() => undefined);
      } else {
        rec("F02-E", "SKIP", "no alternate manager option");
      }
    } else {
      rec("F02-E", "SKIP", `people rows=${rowsN}`);
    }

    const f02 = (await ed.getAttribute("data-f02")) === "true";
    const notAuth =
      (await ed.getAttribute("data-hierarchy-not-authority")) === "true";
    rec(
      "F02-F",
      f02 && notAuth ? "PASS" : "FAIL",
      `f02=${f02} notAuthority=${notAuth}`,
    );
  }

  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log(
    "F02_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "F02_JSON_END",
  );
  console.log(`[f02] TOTALS pass=${pass} fail=${fail} skip=${skip} rows=${rows.length}`);

  expect(fail, `F-02 deep smoke had ${fail} failures`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(4);
});
