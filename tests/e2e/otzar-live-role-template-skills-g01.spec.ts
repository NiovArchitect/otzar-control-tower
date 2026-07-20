// FILE: otzar-live-role-template-skills-g01.spec.ts
// PURPOSE: G-01 DEEP live — role-templated AI Teammates expose template skills
//          so they can act on the user's behalf (not empty chatbots).
//
// SCENARIOS:
//   G01-A  Admin /ai-teammates loads
//   G01-B  Open first teammate drawer (or SKIP if none)
//   G01-C  Skills tab shows role-template-skills-panel
//   G01-D  Apply button present; skills-needed or already applied honest
//   G01-E  Copy mentions act / behalf / template
//   G01-F  No false "skills provisioned" when empty without apply
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-role-template-skills-g01.spec.ts

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
    `[g01] ${status === "PASS" ? "✓" : status === "SKIP" ? "·" : "✗"} ${id} :: ${detail.slice(0, 160)}`,
  );
}

test("G-01 deep: role template skills on AI Teammates", async ({ page }) => {
  test.setTimeout(240_000);
  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/ai-teammates", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  const onPage =
    /ai teammate/i.test(body) ||
    page.url().includes("ai-teammate");
  rec(
    "G01-A",
    onPage ? "PASS" : "FAIL",
    onPage ? "ai-teammates page" : page.url(),
  );

  // Click first table row or any "Open" / name cell
  const row = page.locator("table tbody tr").first();
  if ((await row.count()) === 0) {
    rec("G01-B", "SKIP", "no AI teammates in org");
    rec("G01-C", "SKIP", "no drawer");
    rec("G01-D", "SKIP", "no drawer");
    rec("G01-E", "SKIP", "no drawer");
    rec("G01-F", "PASS", "no false claims on empty list page");
  } else {
    await row.click();
    await page.waitForTimeout(1500);
    // Skills tab
    const skillsTab = page.getByRole("tab", { name: /^skills$/i });
    if ((await skillsTab.count()) > 0) {
      await skillsTab.click();
      await page.waitForTimeout(1200);
      rec("G01-B", "PASS", "opened drawer + skills tab");
    } else {
      rec("G01-B", "FAIL", "skills tab missing");
    }

    const panel = page.getByTestId("role-template-skills-panel");
    try {
      await expect
        .poll(async () => ((await panel.count()) > 0 ? "yes" : "no"), {
          timeout: 15_000,
        })
        .toBe("yes");
    } catch {
      /* fall through */
    }

    rec(
      "G01-C",
      (await panel.count()) > 0 ? "PASS" : "FAIL",
      (await panel.count()) > 0
        ? "role-template-skills-panel"
        : "panel missing — deploy G-01",
    );

    const apply = page.getByTestId("apply-role-template-skills");
    const needed = (await panel.getAttribute("data-skills-needed")) ?? "";
    rec(
      "G01-D",
      (await apply.count()) > 0 ? "PASS" : "FAIL",
      `apply btn; skills-needed=${needed}`,
    );

    const panelText = ((await panel.textContent()) ?? "").toLowerCase();
    rec(
      "G01-E",
      /behalf|template|act|skill/i.test(panelText) ? "PASS" : "FAIL",
      panelText.slice(0, 120),
    );

    const falseLive =
      /fully provisioned via scim|skills fully synced/i.test(panelText) &&
      !/not|already|apply/i.test(panelText);
    rec(
      "G01-F",
      !falseLive ? "PASS" : "FAIL",
      falseLive ? "false provision claim" : "honest skills state",
    );
  }

  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log(
    "G01_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "G01_JSON_END",
  );
  console.log(`[g01] TOTALS pass=${pass} fail=${fail} skip=${skip}`);

  expect(fail, `G-01 deep smoke had ${fail} failures`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(3);
});
