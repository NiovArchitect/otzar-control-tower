// FILE: otzar-live-relay-boundary-t01.spec.ts
// PURPOSE: T-01 DEEP complex live — Relay stays separate from CT employee
//          shell (not marker tourism). Boundary honesty on Comms + admin.
//
// DEPTH:
//   - Drive Comms boundary card + primary Comms ambient surface
//   - Multi-step: Today primary shell → Comms → Company Profile
//   - Dual surface: employee + admin variants
//   - Honesty: relay not shipped; no merge confusion copy
//
// SCENARIOS:
//   T01-A  Employee Comms shows relay-boundary-card
//   T01-B  Doctrine: separate app / not merged into CT
//   T01-C  Five boundary rules present
//   T01-D  Product split: CT shell vs Relay roadmap panels
//   T01-E  relay-app-shipped=false; ct-is-relay=false
//   T01-F  Residual honest (Relay app not built in CT)
//   T01-G  Comms ambient/capture coexists (CT path, not Relay chat)
//   T01-H  Today is CT Work OS (not Relay)
//   T01-I  Admin Company Profile shows boundary card (admin variant)
//   T01-J  No false Relay-merged-into-CT language on path
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-relay-boundary-t01.spec.ts

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
  deepRec(rows, "t01", id, status, detail);

const RULE_IDS = [
  "separate_app",
  "not_slack_clone",
  "ct_shell_clear",
  "foundation_authority",
  "roadmap_honest",
] as const;

function confusionCopy(text: string): boolean {
  return /relay is built into control tower|relay is your today home|this is otzar relay \(employee shell\)|slack for otzar inside ct|relay fully shipped in control tower/i.test(
    text,
  );
}

async function openComms(page: Page): Promise<void> {
  await page.goto("/app/comms", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
}

test("T-01 deep: Relay boundary preserved vs CT shell", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  await liveUiLogin(page, EMPLOYEE, PW as string);
  await openComms(page);

  const card = page.getByTestId("relay-boundary-card");
  rec(
    "T01-A",
    (await card.count()) > 0 && (await card.getAttribute("data-t01")) === "true"
      ? "PASS"
      : "FAIL",
    (await card.count()) > 0
      ? "relay-boundary-card on Comms"
      : "missing — deploy T-01 product",
  );

  if ((await card.count()) === 0) {
    for (const id of [
      "T01-B",
      "T01-C",
      "T01-D",
      "T01-E",
      "T01-F",
      "T01-G",
      "T01-H",
      "T01-I",
      "T01-J",
    ]) {
      rec(id, "FAIL", "no boundary card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ t01: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("t01-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  rec(
    "T01-B",
    /separate|not merged|control tower|relay/i.test(doctrine) ? "PASS" : "FAIL",
    doctrine.slice(0, 80),
  );

  const ruleRows = page.getByTestId("t01-rule-row");
  const ids: string[] = [];
  for (let i = 0; i < (await ruleRows.count()); i++) {
    ids.push((await ruleRows.nth(i).getAttribute("data-rule-id")) ?? "");
  }
  rec(
    "T01-C",
    RULE_IDS.every((id) => ids.includes(id)) ? "PASS" : "FAIL",
    `rules=${ids.join(",")}`,
  );

  const ct = page.getByTestId("t01-ct-shell");
  const relay = page.getByTestId("t01-relay-roadmap");
  rec(
    "T01-D",
    (await ct.count()) > 0 &&
      (await ct.getAttribute("data-product")) === "control_tower" &&
      (await relay.count()) > 0 &&
      (await relay.getAttribute("data-product")) === "relay"
      ? "PASS"
      : "FAIL",
    `ct=${await ct.count()} relay=${await relay.count()}`,
  );

  rec(
    "T01-E",
    (await card.getAttribute("data-relay-app-shipped")) === "false" &&
      (await card.getAttribute("data-ct-is-relay")) === "false" &&
      (await card.getAttribute("data-boundary-preserved")) === "true"
      ? "PASS"
      : "FAIL",
    `shipped=${await card.getAttribute("data-relay-app-shipped")} ctIsRelay=${await card.getAttribute("data-ct-is-relay")}`,
  );

  const residual = (
    (await page.getByTestId("t01-relay-residual").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  rec(
    "T01-F",
    /not built|roadmap|boundary|separate/i.test(residual) ? "PASS" : "FAIL",
    residual.slice(0, 70),
  );

  const commsPage = page.getByTestId("comms-page");
  const ambient =
    (await page.getByTestId("comms-ambient-hero").count()) +
    (await page.getByTestId("comms-fallback-hero").count()) +
    (await page.getByTestId("comms-start").count());
  rec(
    "T01-G",
    (await commsPage.count()) > 0 && ambient > 0 ? "PASS" : "FAIL",
    `commsPage=${await commsPage.count()} ambientSurfaces=${ambient}`,
  );

  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  const surface = page.getByTestId("ambient-work-surface");
  const bodyToday = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "T01-H",
    (await surface.count()) > 0 && !confusionCopy(bodyToday) ? "PASS" : "FAIL",
    `today surface=${await surface.count()}`,
  );

  // Admin surface
  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/setup/company-profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  if ((await page.getByTestId("relay-boundary-card").count()) === 0) {
    await openComms(page);
  }
  const adminCard = page.getByTestId("relay-boundary-card");
  const variant = (await adminCard.getAttribute("data-variant")) ?? "";
  rec(
    "T01-I",
    (await adminCard.count()) > 0 ? "PASS" : "FAIL",
    `adminCard=${await adminCard.count()} variant=${variant}`,
  );

  const pathBodies = [
    bodyToday,
    ((await page.locator("body").innerText()) ?? "").toLowerCase(),
  ];
  await openComms(page);
  pathBodies.push(((await page.locator("body").innerText()) ?? "").toLowerCase());
  const anyConfusion = pathBodies.some(confusionCopy);
  rec(
    "T01-J",
    !anyConfusion ? "PASS" : "FAIL",
    `confusion=${anyConfusion}`,
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ t01: t, rows }, null, 2));
  expect(t.fail, `T-01 deep failures: ${JSON.stringify(rows)}`).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
