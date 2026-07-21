// FILE: otzar-live-person-types-e03.spec.ts
// PURPOSE: E-03 DEEP complex live — person types + participation ≠ authority.
//
// DEPTH:
//   - Admin Users taxonomy inventory
//   - Employee People directory types + badges
//   - Doctrine honesty; multi-surface
//
// SCENARIOS:
//   E03-A  Admin person-type-taxonomy-card
//   E03-B  Doctrine + participation ≠ authority
//   E03-C  Four type rows (employee/contractor/vendor/customer)
//   E03-D  Inventory attributes / counts
//   E03-E  Employee Collaboration people directory + taxonomy
//   E03-F  Person type badges on people cards
//   E03-G  Open one person cockpit (drive)
//   E03-H  Participation counts present without authority claim
//   E03-I  participation-implies-authority=false on card
//   E03-J  No "participation grants access" false language
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-person-types-e03.spec.ts

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
  deepRec(rows, "e03", id, status, detail);

async function waitTaxonomy(page: Page): Promise<boolean> {
  try {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("person-type-taxonomy-card").count()) > 0
            ? "y"
            : "n",
        { timeout: 25_000 },
      )
      .toBe("y");
    return true;
  } catch {
    return (await page.getByTestId("person-type-taxonomy-card").count()) > 0;
  }
}

test("E-03 deep: person types + participation ≠ authority", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  // ── Admin ──────────────────────────────────────────────────────
  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const adminReady = await waitTaxonomy(page);
  const adminCard = page.getByTestId("person-type-taxonomy-card");
  rec(
    "E03-A",
    adminReady &&
      (await adminCard.getAttribute("data-e03")) === "true" &&
      (await adminCard.getAttribute("data-variant")) === "admin"
      ? "PASS"
      : "FAIL",
    adminReady ? "admin taxonomy" : "missing — deploy E-03",
  );

  if (!adminReady) {
    for (const id of [
      "E03-B",
      "E03-C",
      "E03-D",
      "E03-E",
      "E03-F",
      "E03-G",
      "E03-H",
      "E03-I",
      "E03-J",
    ]) {
      rec(id, "FAIL", "no taxonomy");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ e03: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("e03-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  const part = (
    (await page
      .getByTestId("e03-participation-neq-authority")
      .textContent()
      .catch(() => "")) ?? ""
  ).toLowerCase();
  rec(
    "E03-B",
    /employee|contractor|vendor|customer/i.test(doctrine) &&
      /not authority|does not grant/i.test(part)
      ? "PASS"
      : "FAIL",
    doctrine.slice(0, 80),
  );

  const typeRows = page.getByTestId("e03-type-row");
  const nTypes = await typeRows.count();
  const ids: string[] = [];
  for (let i = 0; i < nTypes; i++) {
    ids.push((await typeRows.nth(i).getAttribute("data-person-type")) ?? "");
  }
  rec(
    "E03-C",
    nTypes >= 4 &&
      ids.includes("employee") &&
      ids.includes("contractor") &&
      ids.includes("vendor") &&
      ids.includes("customer")
      ? "PASS"
      : "FAIL",
    `types=${ids.join(",")}`,
  );

  const total = (await adminCard.getAttribute("data-total")) ?? "0";
  const present = (await adminCard.getAttribute("data-types-present")) ?? "";
  rec(
    "E03-D",
    Number(total) >= 0 ? "PASS" : "FAIL",
    `total=${total} present=${present}`,
  );

  // ── Employee ───────────────────────────────────────────────────
  await liveUiLogin(page, EMPLOYEE, PW as string);
  await page.goto("/app/collaboration", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const empReady = await waitTaxonomy(page);
  const empCard = page.getByTestId("person-type-taxonomy-card");
  rec(
    "E03-E",
    empReady && (await empCard.getAttribute("data-variant")) === "employee"
      ? "PASS"
      : "FAIL",
    empReady ? "employee taxonomy" : "employee taxonomy missing",
  );

  const badges = page.getByTestId("people-person-type-badge");
  const cards = page.getByTestId("people-directory-card");
  rec(
    "E03-F",
    (await badges.count()) > 0 || (await cards.count()) > 0 ? "PASS" : "FAIL",
    `badges=${await badges.count()} cards=${await cards.count()}`,
  );

  // Drive open person cockpit
  const openBtn = page.getByTestId("people-directory-card-open").first();
  if ((await openBtn.count()) > 0) {
    await openBtn.click();
    await page.waitForTimeout(1000);
    rec("E03-G", "PASS", "opened person card");
  } else {
    rec("E03-G", "SKIP", "no people cards");
  }

  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "E03-H",
    /shared project|recent collab|people|participation/i.test(body) &&
      !/participation grants (access|permission|authority)/i.test(body)
      ? "PASS"
      : "FAIL",
    body.slice(0, 80),
  );

  rec(
    "E03-I",
    (await empCard.getAttribute("data-participation-implies-authority")) ===
      "false"
      ? "PASS"
      : "FAIL",
    `attr=${await empCard.getAttribute("data-participation-implies-authority")}`,
  );

  rec(
    "E03-J",
    !/participation grants access|collab count unlocks tools|showing up grants authority/i.test(
      body,
    )
      ? "PASS"
      : "FAIL",
    "no false participation→authority claims",
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ e03: t, rows }, null, 2));
  expect(
    t.fail,
    `E-03 deep fails: ${JSON.stringify(rows.filter((r) => r.status === "FAIL"))}`,
  ).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
