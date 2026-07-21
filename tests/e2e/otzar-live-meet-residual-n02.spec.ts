// FILE: otzar-live-meet-residual-n02.spec.ts
// PURPOSE: N-02 DEEP complex live — Meet operational residual honesty while
//          EXTERNALLY_BLOCKED (not marker tourism). Never false provider-proven.
//
// DEPTH:
//   - Drive Comms residual card + operator steps
//   - Multi-step: Comms → Tools reconnect path → Comms rebind
//   - Honesty: status EXTERNALLY_BLOCKED; no false complete Meet copy
//   - Cross-surface: Tools page also shows residual
//
// SCENARIOS:
//   N02-A  Comms shows meet-operational-residual-card
//   N02-B  Doctrine: OAuth / never claim / paste
//   N02-C  Status EXTERNALLY_BLOCKED; provider-proven false by default
//   N02-D  Four operator steps present
//   N02-E  Open Tools reconnect CTA navigates connector-health
//   N02-F  Tools page residual card coexists with capability-first
//   N02-G  Ambient sync or reconnect path still available on Comms
//   N02-H  Multi-step return to Comms; residual still honest
//   N02-I  Residual copy externally-blocked attribute
//   N02-J  No false "Meet fully operational" language
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-meet-residual-n02.spec.ts

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
const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const rows: DeepRow[] = [];
const rec = (id: string, status: DeepRow["status"], detail: string) =>
  deepRec(rows, "n02", id, status, detail);

const STEP_IDS = [
  "open_tools",
  "reauth_scopes",
  "verify_ambient",
  "paste_fallback",
] as const;

function falseComplete(text: string): boolean {
  return /meet transcripts fully operational|all meetings pulling automatically with no reconnect|google meet provider proven|transcripts always available without oauth|n-02 closed without operator/i.test(
    text,
  );
}

async function openComms(page: Page): Promise<void> {
  await page.goto("/app/comms", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
}

test("N-02 deep: Meet residual honesty while externally blocked", async ({
  page,
}) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  await liveUiLogin(page, EMAIL, PW as string);
  await openComms(page);

  const card = page.getByTestId("meet-operational-residual-card");
  rec(
    "N02-A",
    (await card.count()) > 0 && (await card.getAttribute("data-n02")) === "true"
      ? "PASS"
      : "FAIL",
    (await card.count()) > 0
      ? "meet-operational-residual-card"
      : "missing — deploy N-02 residual product",
  );

  if ((await card.count()) === 0) {
    for (const id of [
      "N02-B",
      "N02-C",
      "N02-D",
      "N02-E",
      "N02-F",
      "N02-G",
      "N02-H",
      "N02-I",
      "N02-J",
    ]) {
      rec(id, "FAIL", "no residual card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ n02: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("n02-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  rec(
    "N02-B",
    /oauth|never claim|paste|reconnect/i.test(doctrine) ? "PASS" : "FAIL",
    doctrine.slice(0, 80),
  );

  const status = (await card.getAttribute("data-n02-status")) ?? "";
  const proven = (await card.getAttribute("data-provider-proven")) ?? "";
  const mode = (await card.getAttribute("data-meet-mode")) ?? "";
  rec(
    "N02-C",
    status === "EXTERNALLY_BLOCKED" &&
      proven === "false" &&
      (mode === "externally_blocked" || mode === "reconnect_needed")
      ? "PASS"
      : "FAIL",
    `status=${status} proven=${proven} mode=${mode}`,
  );

  const steps = page.getByTestId("n02-operator-step");
  const ids: string[] = [];
  for (let i = 0; i < (await steps.count()); i++) {
    ids.push((await steps.nth(i).getAttribute("data-step-id")) ?? "");
  }
  rec(
    "N02-D",
    STEP_IDS.every((id) => ids.includes(id)) ? "PASS" : "FAIL",
    `steps=${ids.join(",")}`,
  );

  const toolsCta = page.getByTestId("n02-open-tools");
  await toolsCta.click();
  await page.waitForTimeout(2000);
  const onTools =
    page.url().includes("connector-health") ||
    (await page.getByTestId("connector-health-page").count()) > 0;
  rec(
    "N02-E",
    onTools ? "PASS" : "FAIL",
    `url=${page.url()}`,
  );

  const toolsCard = page.getByTestId("meet-operational-residual-card");
  const cap = page.getByTestId("tools-capability-first-banner");
  rec(
    "N02-F",
    (await toolsCard.count()) > 0 && (await cap.count()) > 0 ? "PASS" : "FAIL",
    `toolsCard=${await toolsCard.count()} capability=${await cap.count()}`,
  );

  await openComms(page);
  const ambient =
    (await page.getByTestId("comms-ambient-sync").count()) +
    (await page.getByTestId("comms-reconnect-tools").count()) +
    (await page.getByTestId("comms-fallback-hero").count()) +
    (await page.getByTestId("comms-start").count());
  rec(
    "N02-G",
    ambient > 0 ? "PASS" : "FAIL",
    `ambientPaths=${ambient}`,
  );

  const card2 = page.getByTestId("meet-operational-residual-card");
  rec(
    "N02-H",
    (await card2.count()) > 0 &&
      (await card2.getAttribute("data-n02-status")) === "EXTERNALLY_BLOCKED"
      ? "PASS"
      : "FAIL",
    `rebind status=${await card2.getAttribute("data-n02-status")}`,
  );

  const residual = page.getByTestId("n02-residual-copy");
  rec(
    "N02-I",
    (await residual.count()) > 0 &&
      (await residual.getAttribute("data-externally-blocked")) === "true"
      ? "PASS"
      : "FAIL",
    `residual attr=${await residual.getAttribute("data-externally-blocked")}`,
  );

  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "N02-J",
    !falseComplete(body) ? "PASS" : "FAIL",
    `falseComplete=${falseComplete(body)}`,
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ n02: t, rows }, null, 2));
  expect(t.fail, `N-02 deep failures: ${JSON.stringify(rows)}`).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
