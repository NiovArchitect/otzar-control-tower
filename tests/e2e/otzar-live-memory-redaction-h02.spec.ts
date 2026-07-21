// FILE: otzar-live-memory-redaction-h02.spec.ts
// PURPOSE: H-02 residual DEEP — redaction stress corpus + live portable scan
//          (not marker tourism). Confidential samples never portable-safe.
//
// SCENARIOS:
//   H02R-A  Memory shows memory-redaction-card
//   H02R-B  Doctrine: never raw confidential in reusable memory
//   H02R-C  Corpus size ≥10; corpus-ok true
//   H02R-D  Safe samples ok; live scan present
//   H02R-E  Corpus list rows ≥10
//   H02R-F  Portable core coexists
//   H02R-G  Multi-step leave Memory and return — card rebinds
//   H02R-H  Residual honest continuous expansion
//   H02R-I  Admin Memory also shows redaction card
//   H02R-J  No false "secrets stored in portable core" claim
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-memory-redaction-h02.spec.ts

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
  deepRec(rows, "h02r", id, status, detail);

async function openMemory(page: Page): Promise<void> {
  await page.goto("/app/my-memory", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
}

test("H-02 residual deep: memory redaction stress corpus", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  await liveUiLogin(page, EMPLOYEE, PW as string);
  await openMemory(page);

  const card = page.getByTestId("memory-redaction-card");
  rec(
    "H02R-A",
    (await card.count()) > 0 &&
      (await card.getAttribute("data-h02-redaction")) === "true"
      ? "PASS"
      : "FAIL",
    (await card.count()) > 0
      ? "memory-redaction-card"
      : "missing — deploy H-02 redaction residual",
  );

  if ((await card.count()) === 0) {
    for (const id of [
      "H02R-B",
      "H02R-C",
      "H02R-D",
      "H02R-E",
      "H02R-F",
      "H02R-G",
      "H02R-H",
      "H02R-I",
      "H02R-J",
    ]) {
      rec(id, "FAIL", "no redaction card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ h02r: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("h02-redaction-doctrine").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  rec(
    "H02R-B",
    /never raw confidential|reusable memory|secrets/i.test(doctrine)
      ? "PASS"
      : "FAIL",
    doctrine.slice(0, 80),
  );

  const corpusSize = Number((await card.getAttribute("data-corpus-size")) ?? "0");
  const corpusOk = (await card.getAttribute("data-corpus-ok")) ?? "";
  rec(
    "H02R-C",
    corpusSize >= 10 && corpusOk === "true" ? "PASS" : "FAIL",
    `size=${corpusSize} ok=${corpusOk}`,
  );

  // Wait live scan
  try {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("h02-live-scan").getAttribute("data-load")) ??
          "",
        { timeout: 15_000 },
      )
      .not.toBe("loading");
  } catch {
    /* */
  }
  const safeOk = (await card.getAttribute("data-safe-samples-ok")) ?? "";
  const scanClean = (await card.getAttribute("data-live-scan-clean")) ?? "";
  const load =
    (await page.getByTestId("h02-live-scan").getAttribute("data-load")) ?? "";
  rec(
    "H02R-D",
    safeOk === "true" && (load === "ok" || load === "error") && scanClean !== ""
      ? "PASS"
      : "FAIL",
    `safe=${safeOk} load=${load} clean=${scanClean}`,
  );

  const listN = await page.getByTestId("h02-corpus-row").count();
  rec(
    "H02R-E",
    listN >= 10 ? "PASS" : "FAIL",
    `rows=${listN}`,
  );

  const portable = page.getByTestId("portable-core-card");
  rec(
    "H02R-F",
    (await portable.count()) > 0 ? "PASS" : "FAIL",
    `portable=${await portable.count()}`,
  );

  await page.goto("/app/action-center", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await openMemory(page);
  rec(
    "H02R-G",
    (await page.getByTestId("memory-redaction-card").count()) > 0
      ? "PASS"
      : "FAIL",
    "rebind",
  );

  const residual = (
    (await page.getByTestId("h02-redaction-residual").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  rec(
    "H02R-H",
    /continuous|expand|pressure|r-02/i.test(residual) ? "PASS" : "FAIL",
    residual.slice(0, 70),
  );

  await liveUiLogin(page, ADMIN, PW as string);
  await openMemory(page);
  rec(
    "H02R-I",
    (await page.getByTestId("memory-redaction-card").count()) > 0
      ? "PASS"
      : "FAIL",
    "admin card",
  );

  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  const falseClaim =
    /secrets stored in portable core|raw confidential is portable|ssn saved to personal twin/i.test(
      body,
    );
  rec(
    "H02R-J",
    !falseClaim ? "PASS" : "FAIL",
    `falseClaim=${falseClaim}`,
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ h02r: t, rows }, null, 2));
  expect(t.fail, `H-02 redaction failures: ${JSON.stringify(rows)}`).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
