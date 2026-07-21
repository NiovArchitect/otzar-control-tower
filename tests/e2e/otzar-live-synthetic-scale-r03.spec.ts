// FILE: otzar-live-synthetic-scale-r03.spec.ts
// PURPOSE: R-03 DEEP — internal synthetic scale harness product (no YC creds).
//          Proves doctrine + levels + checklist + no external-cred requirement.
//
// SCENARIOS:
//   R03-A  Users shows synthetic-scale-harness-card
//   R03-B  Doctrine: internal synthetic, no YC wait
//   R03-C  Three levels S25/S250/S2500; all requires-external-creds=false
//   R03-D  Checklist ≥5 checks
//   R03-E  S25 partial; S250/S2500 planned
//   R03-F  Virtualization advice present
//   R03-G  Coexists with R-01 pressure card
//   R03-H  Hierarchy pressure surface still present (shared repair path)
//   R03-I  Residual honest continuous wire
//   R03-J  No claim that 2500 synthetic is already proven
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-synthetic-scale-r03.spec.ts

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
  deepRec(rows, "r03", id, status, detail);

async function openUsers(page: Page): Promise<void> {
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  if ((await page.getByTestId("synthetic-scale-harness-card").count()) === 0) {
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

test("R-03 deep: internal synthetic scale harness", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);
  await liveUiLogin(page, ADMIN, PW as string);
  await openUsers(page);

  const card = page.getByTestId("synthetic-scale-harness-card");
  rec(
    "R03-A",
    (await card.count()) > 0 && (await card.getAttribute("data-r03")) === "true"
      ? "PASS"
      : "FAIL",
    (await card.count()) > 0
      ? "synthetic-scale-harness-card"
      : "missing — deploy R-03",
  );

  if ((await card.count()) === 0) {
    for (const id of [
      "R03-B",
      "R03-C",
      "R03-D",
      "R03-E",
      "R03-F",
      "R03-G",
      "R03-H",
      "R03-I",
      "R03-J",
    ]) {
      rec(id, "FAIL", "no card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ r03: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("r03-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  rec(
    "R03-B",
    /synthetic|without waiting on yc|no.*credential|25|250|2500/i.test(doctrine)
      ? "PASS"
      : "FAIL",
    doctrine.slice(0, 80),
  );

  const levels = page.getByTestId("r03-level-row");
  const n = await levels.count();
  let extOk = true;
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    ids.push((await levels.nth(i).getAttribute("data-level-id")) ?? "");
    if ((await levels.nth(i).getAttribute("data-requires-external-creds")) !== "false") {
      extOk = false;
    }
  }
  rec(
    "R03-C",
    n >= 3 &&
      extOk &&
      ids.includes("S25") &&
      ids.includes("S250") &&
      ids.includes("S2500") &&
      (await card.getAttribute("data-requires-external-creds")) === "false"
      ? "PASS"
      : "FAIL",
    `levels=${ids.join(",")} extOk=${extOk}`,
  );

  const checks = await page.getByTestId("r03-check-row").count();
  rec("R03-D", checks >= 5 ? "PASS" : "FAIL", `checks=${checks}`);

  const s25 = (await card.getAttribute("data-s25-status")) ?? "";
  const s250 = (await card.getAttribute("data-s250-status")) ?? "";
  const s2500 = (await card.getAttribute("data-s2500-status")) ?? "";
  rec(
    "R03-E",
    s25 === "partial" && s250 === "planned" && s2500 === "planned"
      ? "PASS"
      : "FAIL",
    `S25=${s25} S250=${s250} S2500=${s2500}`,
  );

  const virt = (
    (await page.getByTestId("r03-virt-advice").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  rec(
    "R03-F",
    /virtualization|window|full_list|must_window|windowed/i.test(virt)
      ? "PASS"
      : "FAIL",
    virt.slice(0, 60),
  );

  rec(
    "R03-G",
    (await page.getByTestId("enterprise-pressure-card").count()) > 0
      ? "PASS"
      : "FAIL",
    "R-01 coexist",
  );

  const hier =
    (await page.getByTestId("hierarchy-editor").count()) +
    (await page.getByTestId("reporting-card").count());
  rec("R03-H", hier > 0 ? "PASS" : "FAIL", `hierSurfaces=${hier}`);

  const residual = (
    (await page.getByTestId("r03-residual").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  rec(
    "R03-I",
    /s250|s2500|do not block on yc|continuous/i.test(residual) ? "PASS" : "FAIL",
    residual.slice(0, 70),
  );

  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  const falseClaim =
    /2500 synthetic fully proven|scale proven at 2500|all synthetic levels proven/i.test(
      body,
    );
  rec(
    "R03-J",
    !falseClaim ? "PASS" : "FAIL",
    `falseClaim=${falseClaim}`,
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ r03: t, rows }, null, 2));
  expect(t.fail, `R-03 failures: ${JSON.stringify(rows)}`).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
