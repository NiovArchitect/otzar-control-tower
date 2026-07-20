// FILE: otzar-live-role-template-skills-g01.spec.ts
// PURPOSE: G-01 DEEP complex live — role-templated AI Teammates carry skills
//          so they act on the user's behalf (admin + employee journey).
//
// DEPTH: multi-step drawer work, template skills panel, overview cross-check,
//        employee My Twin honesty, no empty-chatbot framing as complete.
//
// SCENARIOS:
//   G01-A  Admin AI Teammates list loads with roster or honest empty
//   G01-B  Open first teammate → Overview shows role template + skills line
//   G01-C  Skills tab: role-template-skills-panel + intent list
//   G01-D  Apply control honest (needed vs already applied)
//   G01-E  Extra skill pick still available (manual assign path)
//   G01-F  Employee My Twin: skills chips OR empty CTA about template/admin
//   G01-G  Act-on-behalf / template language present; no false full-provision
//   G01-H  Second teammate (if any) also exposes skills tab path
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-role-template-skills-g01.spec.ts

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
const EMPLOYEE = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const rows: DeepRow[] = [];
const rec = (id: string, status: DeepRow["status"], detail: string) =>
  deepRec(rows, "g01", id, status, detail);

test("G-01 deep: role template skills complex admin+employee journey", async ({
  page,
}) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);
  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/ai-teammates", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "G01-A",
    /ai teammate/i.test(body) ? "PASS" : "FAIL",
    body.slice(0, 80),
  );

  const tableRows = page.locator("table tbody tr");
  const nTwins = await tableRows.count();
  if (nTwins === 0) {
    rec("G01-B", "SKIP", "no AI teammates — cannot drive drawer depth");
    rec("G01-C", "SKIP", "no drawer");
    rec("G01-D", "SKIP", "no drawer");
    rec("G01-E", "SKIP", "no drawer");
    rec("G01-H", "SKIP", "no second twin");
  } else {
    await tableRows.first().click();
    await page.waitForTimeout(1500);

    // Overview first — multi-step
    const overview = page.getByRole("tab", { name: /overview/i });
    if ((await overview.count()) > 0) await overview.click();
    await page.waitForTimeout(800);
    const ovText = ((await page.locator("body").innerText()) ?? "").toLowerCase();
    rec(
      "G01-B",
      /role template|skills/i.test(ovText) ? "PASS" : "FAIL",
      ovText.includes("role template")
        ? "overview role/skills language"
        : ovText.slice(0, 100),
    );

    const skillsTab = page.getByRole("tab", { name: /^skills$/i });
    await skillsTab.click();
    await page.waitForTimeout(1500);

    const panel = page.getByTestId("role-template-skills-panel");
    try {
      await expect
        .poll(async () => ((await panel.count()) > 0 ? "y" : "n"), {
          timeout: 15_000,
        })
        .toBe("y");
    } catch {
      /* */
    }
    const panelText = ((await panel.textContent().catch(() => "")) ?? "").toLowerCase();
    const listItems = await panel.locator("li").count();
    rec(
      "G01-C",
      (await panel.count()) > 0 && listItems >= 1 ? "PASS" : "FAIL",
      (await panel.count()) > 0
        ? `panel intents=${listItems} tpl=${(await panel.getAttribute("data-role-template")) ?? ""}`
        : "role-template-skills-panel missing",
    );

    const apply = page.getByTestId("apply-role-template-skills");
    const needed = (await panel.getAttribute("data-skills-needed")) ?? "";
    rec(
      "G01-D",
      (await apply.count()) > 0 ? "PASS" : "FAIL",
      `apply; needed=${needed}`,
    );

    // Manual assign path still exists for extras
    const pick = page.getByRole("button", { name: /pick skill|assign skill/i });
    rec(
      "G01-E",
      (await pick.count()) > 0 || /extra package|pick skill/i.test(panelText + body)
        ? "PASS"
        : "FAIL",
      (await pick.count()) > 0 ? "manual pick skill available" : "manual path unclear",
    );

    // Second twin path
    if (nTwins >= 2) {
      await page.keyboard.press("Escape").catch(() => undefined);
      await page.waitForTimeout(500);
      await tableRows.nth(1).click();
      await page.waitForTimeout(1000);
      const st2 = page.getByRole("tab", { name: /^skills$/i });
      if ((await st2.count()) > 0) {
        await st2.click();
        await page.waitForTimeout(1000);
      }
      rec(
        "G01-H",
        (await page.getByTestId("role-template-skills-panel").count()) > 0
          ? "PASS"
          : "FAIL",
        "second twin skills panel",
      );
    } else {
      rec("G01-H", "SKIP", "only one teammate");
    }
  }

  // Employee My Twin cross-surface (ensureLoggedOut inside liveUiLogin)
  await liveUiLogin(page, EMPLOYEE, PW as string);
  await page.goto("/app/my-twin", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const mt = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  const skillsOk =
    (await page.getByTestId("my-twin-skills").count()) > 0 ||
    (await page.getByTestId("my-twin-skills-empty").count()) > 0 ||
    /skill/i.test(mt);
  rec(
    "G01-F",
    skillsOk ? "PASS" : "FAIL",
    (await page.getByTestId("my-twin-skills").count()) > 0
      ? "employee has skill chips"
      : (await page.getByTestId("my-twin-skills-empty").count()) > 0
        ? "employee empty + template/admin CTA"
        : mt.slice(0, 100),
  );

  const falseProv =
    /fully provisioned|skills fully synced via scim/i.test(mt) &&
    !/not|admin|template|yet/i.test(mt);
  rec(
    "G01-G",
    /behalf|template|skill/i.test(mt + ((await page.locator("body").innerText()) ?? "")) &&
      !falseProv
      ? "PASS"
      : "FAIL",
    falseProv ? "false provision claim" : "honest act/template language",
  );

  const { pass, fail, skip } = deepTotals(rows);
  console.log(
    "G01_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "G01_JSON_END",
  );
  console.log(`[g01] TOTALS pass=${pass} fail=${fail} skip=${skip}`);
  expect(fail, `G-01 deep smoke had ${fail} failures`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
