// FILE: otzar-live-ai-collab-load-l02.spec.ts
// PURPOSE: L-02 DEEP — AI collab load/storm surface on Collaboration.
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-ai-collab-load-l02.spec.ts

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
const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const rows: DeepRow[] = [];
const rec = (id: string, status: DeepRow["status"], detail: string) =>
  deepRec(rows, "l02", id, status, detail);

test("L-02 deep: AI collab load pressure surface", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app/collaboration", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  rec(
    "L02-A",
    page.url().includes("collaboration") ? "PASS" : "FAIL",
    page.url(),
  );

  const l01 = page.getByTestId("ai-collab-envelope-card");
  rec("L02-B", (await l01.count()) > 0 ? "PASS" : "FAIL", "L-01 card present");

  const card = page.getByTestId("ai-collab-load-card");
  rec(
    "L02-C",
    (await card.count()) > 0 && (await card.getAttribute("data-l02")) === "true"
      ? "PASS"
      : "FAIL",
    (await card.count()) > 0 ? "card" : "missing — deploy L-02",
  );

  if ((await card.count()) === 0) {
    for (const id of ["L02-D", "L02-E", "L02-F", "L02-G", "L02-H", "L02-I", "L02-J"]) {
      rec(id, "FAIL", "no card");
    }
  } else {
    const doctrine = (
      (await page.getByTestId("l02-doctrine").textContent().catch(() => "")) ?? ""
    ).toLowerCase();
    rec(
      "L02-D",
      /storm|loop|principal|load/i.test(doctrine) ? "PASS" : "FAIL",
      doctrine.slice(0, 50),
    );

    const budgets = await page.getByTestId("l02-budget-row").count();
    rec("L02-E", budgets >= 4 ? "PASS" : "FAIL", `budgets=${budgets}`);

    const refused = (await card.getAttribute("data-refused")) ?? "0";
    const loops = (await card.getAttribute("data-loop-blocks")) ?? "0";
    rec(
      "L02-F",
      Number(refused) > 0 && Number(loops) > 0 ? "PASS" : "FAIL",
      `refused=${refused} loops=${loops}`,
    );

    const summary = (
      (await page.getByTestId("l02-pressure-summary").textContent()) ?? ""
    ).toLowerCase();
    rec(
      "L02-G",
      /admitted|refused|loop|storm/i.test(summary) ? "PASS" : "FAIL",
      summary.slice(0, 60),
    );

    rec(
      "L02-H",
      (await page.getByTestId("l02-advancement").count()) > 0 ? "PASS" : "FAIL",
      "advancement",
    );

    rec(
      "L02-I",
      (await page.getByTestId("l02-residual").count()) > 0 ? "PASS" : "FAIL",
      "residual honesty",
    );

    const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
    rec(
      "L02-J",
      !/unlimited multi-tenant ai storm capacity proven/i.test(body)
        ? "PASS"
        : "FAIL",
      "no overclaim",
    );
  }

  const t = deepTotals(rows);
  console.log(JSON.stringify({ l02: t, rows }, null, 2));
  expect(t.fail).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
