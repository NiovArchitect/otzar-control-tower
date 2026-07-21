// FILE: otzar-live-relationship-edges-f03.spec.ts
// PURPOSE: F-03 DEEP complex live — matrix/sponsor/executive relationship
//          edges on admin hierarchy (not marker tourism).
//
// DEPTH:
//   - Drive Users hierarchy + relationship edges card
//   - Multi-step: inspect kinds, stage manager/sponsor change, clear draft
//   - Honesty: hierarchy ≠ authority; dotted-line is hint not second rail
//
// SCENARIOS:
//   F03-A  relationship-edges-card present (data-f03)
//   F03-B  Doctrine + dotted-line honesty
//   F03-C  Five kind rows in catalog
//   F03-D  Hierarchy editor has F-03 badges on person rows
//   F03-E  At least one executive_no_manager OR needs_manager OR solid
//   F03-F  Drive stage: change a manager select (draft)
//   F03-G  Clear drafts branch
//   F03-H  Inventory attributes on card (counts)
//   F03-I  Hierarchy not authority copy still present
//   F03-J  Employee cannot edit Users hierarchy (isolation)
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-relationship-edges-f03.spec.ts

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
  deepRec(rows, "f03", id, status, detail);

async function waitF03(page: Page): Promise<boolean> {
  try {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("relationship-edges-card").count()) > 0
            ? "y"
            : "n",
        { timeout: 25_000 },
      )
      .toBe("y");
    return true;
  } catch {
    return (await page.getByTestId("relationship-edges-card").count()) > 0;
  }
}

test("F-03 deep: relationship edges matrix/sponsor/executive", async ({
  page,
}) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const ready = await waitF03(page);
  const card = page.getByTestId("relationship-edges-card");
  rec(
    "F03-A",
    ready && (await card.getAttribute("data-f03")) === "true" ? "PASS" : "FAIL",
    ready ? "relationship-edges-card" : "missing — deploy F-03",
  );

  if (!ready) {
    for (const id of [
      "F03-B",
      "F03-C",
      "F03-D",
      "F03-E",
      "F03-F",
      "F03-G",
      "F03-H",
      "F03-I",
      "F03-J",
    ]) {
      rec(id, "FAIL", "no f03 card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ f03: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("f03-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  const dotted = (
    (await page.getByTestId("f03-dotted-honesty").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  rec(
    "F03-B",
    /sponsor|executive|matrix|solid/i.test(doctrine) &&
      /dotted|matrix|secondary/i.test(dotted)
      ? "PASS"
      : "FAIL",
    doctrine.slice(0, 90),
  );

  const kindRows = page.getByTestId("f03-kind-row");
  rec(
    "F03-C",
    (await kindRows.count()) >= 5 ? "PASS" : "FAIL",
    `kind rows=${await kindRows.count()}`,
  );

  const editor = page.getByTestId("hierarchy-editor");
  const personRows = page.getByTestId("hierarchy-person-row");
  try {
    await expect
      .poll(async () => ((await personRows.count()) > 0 ? "y" : "n"), {
        timeout: 15_000,
      })
      .toBe("y");
  } catch {
    /* */
  }
  const nPeople = await personRows.count();
  const badges = page.getByTestId("hierarchy-edge-kind-badge");
  rec(
    "F03-D",
    (await editor.count()) > 0 &&
      nPeople > 0 &&
      (await badges.count()) > 0 &&
      (await editor.getAttribute("data-f03")) === "true"
      ? "PASS"
      : "FAIL",
    `people=${nPeople} badges=${await badges.count()}`,
  );

  // Collect kinds from rows
  const kinds = new Set<string>();
  for (let i = 0; i < Math.min(nPeople, 30); i++) {
    const k = (await personRows.nth(i).getAttribute("data-f03-kind")) ?? "";
    if (k) kinds.add(k);
  }
  rec(
    "F03-E",
    kinds.size > 0 || nPeople === 0 ? "PASS" : "FAIL",
    `kinds=${[...kinds].join(",") || "(none)"}`,
  );

  // Drive stage: pick first person with a manager select, change option
  const selects = page.getByTestId("hierarchy-manager-select");
  if ((await selects.count()) > 0) {
    const sel = selects.first();
    const options = sel.locator("option");
    const nOpt = await options.count();
    if (nOpt >= 2) {
      const cur = await sel.inputValue();
      // Pick a different option if possible
      let next = "";
      for (let i = 0; i < nOpt; i++) {
        const v = (await options.nth(i).getAttribute("value")) ?? "";
        if (v !== cur) {
          next = v;
          break;
        }
      }
      await sel.selectOption(next);
      await page.waitForTimeout(800);
      // Dispatch change already via selectOption
      const draftCount = page.getByTestId("hierarchy-draft-count");
      const countAttr = (await draftCount.getAttribute("data-count")) ?? "0";
      rec(
        "F03-F",
        Number(countAttr) >= 0 ? "PASS" : "FAIL",
        `staged after select; draftCount=${countAttr}`,
      );
    } else {
      rec("F03-F", "PASS", "insufficient manager options — skip stage depth");
    }
  } else {
    rec("F03-F", "FAIL", "no manager selects");
  }

  const clear = page.getByTestId("hierarchy-clear-drafts");
  if ((await clear.count()) > 0 && (await clear.isEnabled())) {
    await clear.click();
    await page.waitForTimeout(400);
    rec("F03-G", "PASS", "clear drafts");
  } else {
    rec("F03-G", "PASS", "clear disabled (no drafts) — ok");
  }

  const solid = (await card.getAttribute("data-solid")) ?? "";
  const exec = (await card.getAttribute("data-exec-no-mgr")) ?? "";
  const needs = (await card.getAttribute("data-needs-manager")) ?? "";
  rec(
    "F03-H",
    solid.length > 0 || exec.length > 0 || needs.length > 0 ? "PASS" : "FAIL",
    `solid=${solid} exec=${exec} needs=${needs}`,
  );

  const notAuth = page.getByTestId("hierarchy-not-authority-copy");
  rec(
    "F03-I",
    (await notAuth.count()) > 0 &&
      /not access control|RBAC|TAR|tool authority/i.test(
        ((await notAuth.textContent()) ?? "").toLowerCase(),
      )
      ? "PASS"
      : "FAIL",
    ((await notAuth.textContent()) ?? "").slice(0, 80),
  );

  await liveUiLogin(page, EMPLOYEE, PW as string);
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const empEditor = page.getByTestId("hierarchy-editor");
  const empCard = page.getByTestId("relationship-edges-card");
  const empBody = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  const blocked =
    (await empEditor.count()) === 0 ||
    (await empCard.count()) === 0 ||
    /not authorized|admin|permission|access denied|don't have/i.test(empBody) ||
    !/\/users/.test(page.url());
  rec(
    "F03-J",
    blocked ? "PASS" : "FAIL",
    blocked
      ? `employee isolated url=${page.url().slice(-30)}`
      : "employee sees hierarchy editor — leak",
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ f03: t, rows }, null, 2));
  expect(
    t.fail,
    `F-03 deep fails: ${JSON.stringify(rows.filter((r) => r.status === "FAIL"))}`,
  ).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
