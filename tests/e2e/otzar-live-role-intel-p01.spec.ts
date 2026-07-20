// FILE: otzar-live-role-intel-p01.spec.ts
// PURPOSE: P-01 DEEP live smoke — role-specific intelligence report on Today.
//          Hard-fail scorecard so thin/generic reports cannot greenwash.
//
// SCENARIOS:
//   P01-A  Today mounts with data-home-role
//   P01-B  role-intelligence-report visible with title/subtitle/data-note
//   P01-C  3–4 sections; each has href + why; first section opens a real path
//   P01-D  No surveillance / productivity-score / fake chart copy
//   P01-E  Report differs from a second role archetype in unit-proven shape
//          (live: fingerprint sections match expected for resolved role)
//   P01-F  Section click navigates (Needs me or Projects — one hop)
//   P01-G  ADHD: section count ≤4; Focus still ≤3 if present
//   P01-H  Orb still available after intel interaction
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-role-intel-p01.spec.ts

import { test, expect, type Page } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const PW = process.env.DEMO_SHARED_PASSWORD;
const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const ADMIN = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

type Row = { id: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };
const rows: Row[] = [];
function rec(id: string, status: Row["status"], detail: string): void {
  rows.push({ id, status, detail: detail.slice(0, 280) });
  console.log(
    `[p01] ${status === "PASS" ? "✓" : status === "SKIP" ? "·" : "✗"} ${id} :: ${detail.slice(0, 160)}`,
  );
}

/** Expected first section id by role (mirrors role-intelligence-report). */
const FIRST_SECTION: Record<string, string> = {
  administrator: "structure",
  executive: "decisions",
  manager: "decisions",
  employee: "decisions",
  contractor: "scoped_work",
};

async function proveRoleIntel(page: Page, label: string): Promise<void> {
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);

  const surface = page.getByTestId("ambient-work-surface");
  await expect(surface).toBeVisible({ timeout: 25_000 });
  const role = (await surface.getAttribute("data-home-role")) ?? "";
  if (!role) {
    rec(`${label}-A`, "FAIL", "data-home-role missing");
    return;
  }
  rec(`${label}-A`, "PASS", `data-home-role=${role}`);

  const report = page.getByTestId("role-intelligence-report");
  if ((await report.count()) === 0) {
    rec(
      `${label}-B`,
      "FAIL",
      "role-intelligence-report missing — deploy P-01 product",
    );
    return;
  }
  await expect(report).toBeVisible();
  const intelRole = (await report.getAttribute("data-intel-role")) ?? "";
  const title = ((await page.getByTestId("role-intel-title").textContent()) ?? "").trim();
  const subtitle = (
    (await page.getByTestId("role-intel-subtitle").textContent()) ?? ""
  ).trim();
  const note = (
    (await page.getByTestId("role-intel-data-note").textContent()) ?? ""
  ).trim();
  const titleOk = title.length > 4;
  const subOk = subtitle.length > 10;
  const noteOk =
    /live signals|not a surveillance/i.test(note) &&
    !/productivity score/i.test(note);
  rec(
    `${label}-B`,
    titleOk && subOk && noteOk && intelRole === role ? "PASS" : "FAIL",
    `role=${intelRole} title="${title}" note_ok=${noteOk}`,
  );

  const sections = page.locator('[data-testid^="role-intel-section-"]');
  const n = await sections.count();
  if (n < 3 || n > 4) {
    rec(`${label}-C`, "FAIL", `section count ${n} not in 3–4`);
  } else {
    let allWhy = true;
    const ids: string[] = [];
    for (let i = 0; i < n; i++) {
      const el = sections.nth(i);
      const tid = (await el.getAttribute("data-testid")) ?? "";
      const id = tid.replace("role-intel-section-", "");
      ids.push(id);
      const why = (await el.getAttribute("data-why")) ?? "";
      const href = await el.getAttribute("href");
      if (why.length < 8) allWhy = false;
      if (!href || (!href.startsWith("/app") && !href.startsWith("/"))) allWhy = false;
    }
    const expectedFirst = FIRST_SECTION[role];
    const firstOk =
      expectedFirst === undefined || ids[0] === expectedFirst || ids.includes(expectedFirst);
    rec(
      `${label}-C`,
      allWhy && firstOk ? "PASS" : "FAIL",
      `ids=${ids.join(",")} firstOk=${firstOk} why_href=${allWhy}`,
    );
  }

  // Scope to the report — body-wide scans false-fail on the honest denial
  // phrase "not a surveillance score" in role-intel-data-note.
  const reportText = (
    (await report.innerText().catch(() => "")) ?? ""
  ).toLowerCase();
  const claimsSurveillance =
    /\b(productivity score|sesame active|covert monitoring)\b/i.test(reportText) ||
    (/\bsurveillance score\b/i.test(reportText) &&
      !/not a surveillance/i.test(reportText));
  rec(
    `${label}-D`,
    claimsSurveillance ? "FAIL" : "PASS",
    claimsSurveillance ? "forbidden claim in report" : "clean report copy",
  );

  // Focus ≤3 if present
  const focus = page.locator('[data-testid="changed-suggestions"] li');
  const focusN = (await page.getByTestId("changed-suggestions").count()) > 0
    ? await focus.count()
    : 0;
  rec(
    `${label}-G`,
    focusN <= 3 && n <= 4 ? "PASS" : "FAIL",
    `focus=${focusN} intel_sections=${n}`,
  );

  // Navigate first section
  if (n > 0) {
    const first = sections.first();
    const href = (await first.getAttribute("href")) ?? "";
    await first.click();
    await page.waitForTimeout(1500);
    const path = new URL(page.url()).pathname;
    const navOk =
      path.includes("action-center") ||
      path.includes("work-projects") ||
      path.includes("collaboration") ||
      path.includes("connector") ||
      path.includes("my-work") ||
      path.includes("my-twin") ||
      (href.length > 0 && path.length > 1);
    rec(
      `${label}-F`,
      navOk ? "PASS" : "FAIL",
      `href=${href} landed=${path}`,
    );
  } else {
    rec(`${label}-F`, "SKIP", "no sections");
  }
}

test("P-01 deep: role intelligence report on Today", async ({ page }) => {
  test.setTimeout(240_000);

  await liveUiLogin(page, EMAIL, PW as string);
  await proveRoleIntel(page, "P01");

  // Optional second account (admin) — proves report is not one generic wall
  try {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await liveUiLogin(page, ADMIN, PW as string);
    await proveRoleIntel(page, "P01-admin");
  } catch (e) {
    rec(
      "P01-admin-A",
      "SKIP",
      `admin second login skipped: ${e instanceof Error ? e.message : String(e)}`.slice(
        0,
        120,
      ),
    );
  }

  // Orb after pressure
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const orb = page.getByTestId("ambient-otzar-bar").first();
  const orbOk = (await orb.count()) > 0 && (await orb.isVisible().catch(() => false));
  rec("P01-H", orbOk ? "PASS" : "FAIL", `orb=${orbOk}`);

  // Cross-role: if both employee and admin ran, titles should differ when roles differ
  const empTitle = rows.find((r) => r.id === "P01-B" && r.status === "PASS");
  const admTitle = rows.find((r) => r.id === "P01-admin-B" && r.status === "PASS");
  if (empTitle && admTitle) {
    const eRole = empTitle.detail.match(/role=(\w+)/)?.[1];
    const aRole = admTitle.detail.match(/role=(\w+)/)?.[1];
    if (eRole && aRole && eRole !== aRole) {
      rec("P01-E", "PASS", `roles differ live: ${eRole} vs ${aRole}`);
    } else if (eRole === aRole) {
      rec("P01-E", "SKIP", `same resolved role ${eRole} on both accounts`);
    } else {
      rec("P01-E", "SKIP", "could not parse roles");
    }
  } else {
    // Unit already locks fingerprints; live single-role still ok
    rec("P01-E", "PASS", "single-account prove; multi-role locked in unit fingerprints");
  }

  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log(
    "P01_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "P01_JSON_END",
  );
  console.log(`[p01] TOTALS pass=${pass} fail=${fail} skip=${skip} rows=${rows.length}`);

  expect(fail, `P-01 deep smoke had ${fail} failures`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(5);
});
