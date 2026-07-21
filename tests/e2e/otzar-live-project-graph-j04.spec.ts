// FILE: otzar-live-project-graph-j04.spec.ts
// PURPOSE: J-04 DEEP — project graph coherence card on project heart.
//
// SCENARIOS:
//   J04-A  Projects page loads
//   J04-B  Open first project context panel
//   J04-C  project-graph-coherence-card visible
//   J04-D  Doctrine present
//   J04-E  Facet rows ≥8
//   J04-F  Score attribute present
//   J04-G  Spine still present (J-02 coexist)
//   J04-H  Disconnect list or no-disconnect honesty
//   J04-I  Close and reopen still coherent
//   J04-J  No claim of full multi-object graph provisioned if empty heart
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-project-graph-j04.spec.ts

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
  deepRec(rows, "j04", id, status, detail);

test("J-04 deep: project graph coherence", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app/work-projects", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  rec(
    "J04-A",
    page.url().includes("work-projects") ? "PASS" : "FAIL",
    page.url(),
  );

  // Open first project if list exists
  const listItem = page.locator("[data-testid=projects-list] button, [data-testid=projects-list] a, [data-testid=project-row]").first();
  const empty = page.getByTestId("projects-empty");
  if ((await empty.count()) > 0 && (await listItem.count()) === 0) {
    // Try create quick project
    const name = page.getByTestId("project-name");
    if ((await name.count()) > 0) {
      await name.fill(`J04 Graph ${Date.now()}`);
      await page.getByTestId("project-submit").click();
      await page.waitForTimeout(2500);
    }
  }
  if ((await listItem.count()) > 0) {
    await listItem.click();
    await page.waitForTimeout(2000);
  }

  const panel = page.getByTestId("project-context-panel");
  rec(
    "J04-B",
    (await panel.count()) > 0 ? "PASS" : "FAIL",
    `panel=${await panel.count()}`,
  );

  const card = page.getByTestId("project-graph-coherence-card");
  rec(
    "J04-C",
    (await card.count()) > 0 && (await card.getAttribute("data-j04")) === "true"
      ? "PASS"
      : "FAIL",
    (await card.count()) > 0 ? "card" : "missing — deploy J-04",
  );

  if ((await card.count()) === 0) {
    for (const id of ["J04-D", "J04-E", "J04-F", "J04-G", "J04-H", "J04-I", "J04-J"]) {
      rec(id, "FAIL", "no card");
    }
  } else {
    const doctrine = (
      (await page.getByTestId("j04-doctrine").textContent().catch(() => "")) ?? ""
    ).toLowerCase();
    rec(
      "J04-D",
      /project_id|mission heart|connected/i.test(doctrine) ? "PASS" : "FAIL",
      doctrine.slice(0, 60),
    );

    const facets = await page.getByTestId("j04-facet-row").count();
    rec("J04-E", facets >= 8 ? "PASS" : "FAIL", `facets=${facets}`);

    const score = (await card.getAttribute("data-score")) ?? "";
    rec("J04-F", score.length > 0 ? "PASS" : "FAIL", `score=${score}`);

    rec(
      "J04-G",
      (await page.getByTestId("project-spine").count()) > 0 ? "PASS" : "FAIL",
      "spine",
    );

    const disc =
      (await page.getByTestId("j04-disconnect-list").count()) +
      (await page.getByTestId("j04-no-disconnects").count());
    rec("J04-H", disc > 0 ? "PASS" : "FAIL", `honesty panels=${disc}`);

    await page.getByTestId("project-context-close").click().catch(() => undefined);
    await page.waitForTimeout(800);
    if ((await listItem.count()) > 0) {
      await listItem.click();
      await page.waitForTimeout(1500);
    }
    rec(
      "J04-I",
      (await page.getByTestId("project-graph-coherence-card").count()) > 0
        ? "PASS"
        : "FAIL",
      "reopen",
    );

    const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
    rec(
      "J04-J",
      !/full multi-object graph fully provisioned for all tenants/i.test(body)
        ? "PASS"
        : "FAIL",
      "no overclaim",
    );
  }

  const t = deepTotals(rows);
  console.log(JSON.stringify({ j04: t, rows }, null, 2));
  expect(t.fail).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
