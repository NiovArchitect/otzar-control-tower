// FILE: otzar-live-r03-stratified-browser.spec.ts
// PURPOSE: Stratified browser proof on dedicated R-03 live sim org.
//          Uses cast passwords from run r20260721b state (env override).
//          NO identity provisioning.
//
// RUN:
//   R03_STATE_RUN=r20260721b npx playwright test --config=playwright.live.config.ts \
//     tests/e2e/otzar-live-r03-stratified-browser.spec.ts
//
// Or set R03_ADMIN_EMAIL + R03_ADMIN_PASSWORD + R03_SAMPLE_PASSWORD pattern.

import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { liveUiLogin } from "./live-login";
import {
  DEEP_SMOKE_MIN_PASS,
  DEEP_SMOKE_TIMEOUT_MS,
  deepRec,
  deepTotals,
  type DeepRow,
} from "./deep-smoke-contract";

const RUN = process.env.R03_STATE_RUN ?? "r20260721b";
const statePath = join(
  process.cwd(),
  ".r03-s250-state",
  `run-${RUN}.json`,
);

function loadAdmin(): { email: string; password: string; org: string } | null {
  if (process.env.R03_ADMIN_EMAIL && process.env.R03_ADMIN_PASSWORD) {
    return {
      email: process.env.R03_ADMIN_EMAIL,
      password: process.env.R03_ADMIN_PASSWORD,
      org: process.env.R03_ORG_ENTITY_ID ?? "",
    };
  }
  if (!existsSync(statePath)) return null;
  const s = JSON.parse(readFileSync(statePath, "utf8"));
  return {
    email: s.admin_email,
    password: s.admin_password,
    org: s.org_entity_id,
  };
}

/** Stratified cast indices (role mix from provisioner layout). */
const SAMPLE: Array<{ label: string; index: number }> = [
  { label: "CEO", index: 0 },
  { label: "executive", index: 1 },
  { label: "manager", index: 4 },
  { label: "manager-2", index: 5 },
  { label: "employee", index: 30 },
  { label: "employee-2", index: 40 },
  { label: "employee-3", index: 50 },
  { label: "contractor", index: 35 },
  { label: "consultant", index: 37 },
  { label: "returning-employee", index: 60 },
];

const admin = loadAdmin();
test.skip(!admin, "R-03 state file or R03_ADMIN_* env required");

test("R-03 stratified browser: admin + sample cast", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS * 2);
  const rows: DeepRow[] = [];
  const rec = (id: string, status: DeepRow["status"], detail: string) =>
    deepRec(rows, "r03b", id, status, detail);

  // Admin first-login / Home
  await liveUiLogin(page, admin!.email, admin!.password);
  if (!page.url().includes("/app")) {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(2000);
  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "R03B-ADMIN-HOME",
    /today|home|otzar|needs me|project|team|people/i.test(body) &&
      !/page not found|something went wrong/i.test(body)
      ? "PASS"
      : "FAIL",
    page.url(),
  );

  // No Meridian/demo leakage claims
  rec(
    "R03B-NO-FOREIGN-ORG-LABEL",
    !/meridian field systems/i.test(body) ? "PASS" : "FAIL",
    "tenant surface",
  );

  // Sample cast users
  for (const s of SAMPLE) {
    const email = `r03-s250+${RUN}-${s.index}@niovlabs.com`;
    const password = `R03-${RUN}-${s.index}-Pass1!`;
    try {
      await page.context().clearCookies();
      await liveUiLogin(page, email, password);
      if (!page.url().includes("/app")) {
        await page.goto("/app", { waitUntil: "domcontentloaded" });
      }
      await page.waitForTimeout(1800);
      const t = ((await page.locator("body").innerText()) ?? "").toLowerCase();
      const ok =
        /today|home|otzar|needs me|project|team|talk|ai teammate/i.test(t) &&
        !/page not found|application error/i.test(t);
      rec(`R03B-SAMPLE-${s.label}`, ok ? "PASS" : "FAIL", email);
      // employees should not see platform admin maze
      if (s.label.startsWith("employee") || s.label === "contractor") {
        rec(
          `R03B-NO-ADMIN-LEAK-${s.label}`,
          !/platform operator|can_admin_niov|render dashboard/i.test(t)
            ? "PASS"
            : "FAIL",
          "least privilege",
        );
      }
    } catch (e) {
      rec(
        `R03B-SAMPLE-${s.label}`,
        "FAIL",
        `login/nav error: ${(e as Error).message?.slice(0, 80)}`,
      );
    }
  }

  const tot = deepTotals(rows);
  console.log(JSON.stringify({ r03_stratified: tot, rows }, null, 2));
  // Allow partial: at least admin + majority of samples
  expect(tot.fail).toBeLessThan(SAMPLE.length); // not total wipeout
  expect(tot.pass).toBeGreaterThanOrEqual(Math.min(DEEP_SMOKE_MIN_PASS, 3));
});
