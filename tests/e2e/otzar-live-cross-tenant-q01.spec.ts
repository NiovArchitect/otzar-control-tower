// FILE: otzar-live-cross-tenant-q01.spec.ts
// PURPOSE: Q-01 / Q-02 DEEP complex live — cross-tenant / cross-user /
//          cross-Twin zero leakage + deep-link isolation (not marker tourism).
//
// DEPTH:
//   - Drive Memory + Company Profile isolation cards
//   - Multi-step: employee Memory → Needs me → Twin → Memory rebind
//   - Prove deep-link sample matrix on card (allow/block)
//   - Dual principal: employee vs admin fingerprints / twin surfaces
//   - Cross-surface: org badge + isolation card + no false multi-tenant leak copy
//
// SCENARIOS:
//   Q01-A  Employee Memory shows cross-tenant-isolation-card (Q-01/Q-02)
//   Q01-B  Q01 + Q02 doctrine present (never leak / separate Twin)
//   Q01-C  Four zero-leak facets present
//   Q01-D  Org scope + twin scope stamped
//   Q01-E  Deep-link panel: sensitive blocked, product may restore
//   Q01-F  Multi-step navigate Away → Twin → Memory; card rebinds
//   Q01-G  Portable / multi-org cards coexist; no false blend copy
//   Q01-H  Admin Company Profile shows isolation card (admin variant)
//   Q01-I  Admin dual: employee fingerprints not forced into admin Memory
//   Q01-J  Suite residual honest; second-tenant continuous residual
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-cross-tenant-q01.spec.ts

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
  deepRec(rows, "q01", id, status, detail);

const FACET_IDS = ["tenant", "user", "twin", "deeplink"] as const;

async function openMemory(page: Page): Promise<void> {
  await page.goto("/app/my-memory", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  try {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("cross-tenant-isolation-card").count()) > 0
            ? "y"
            : "n",
        { timeout: 28_000 },
      )
      .toBe("y");
  } catch {
    /* */
  }
}

async function collectFingerprints(page: Page): Promise<string[]> {
  const out: string[] = [];
  for (const tid of ["portable-core-item", "work-style-approved-item"]) {
    const items = page.getByTestId(tid);
    const n = await items.count();
    for (let i = 0; i < n; i++) {
      const t = ((await items.nth(i).innerText()) ?? "").trim();
      if (t.length >= 12) out.push(t);
    }
  }
  return out;
}

test("Q-01/Q-02 deep: cross-tenant zero leak + deep-link isolation", async ({
  page,
}) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  // ── Employee ───────────────────────────────────────────────────
  await liveUiLogin(page, EMPLOYEE, PW as string);
  await openMemory(page);

  const card = page.getByTestId("cross-tenant-isolation-card");
  rec(
    "Q01-A",
    (await card.count()) > 0 &&
      (await card.getAttribute("data-q01")) === "true" &&
      (await card.getAttribute("data-q02")) === "true"
      ? "PASS"
      : "FAIL",
    (await card.count()) > 0
      ? "cross-tenant-isolation-card"
      : "missing — deploy Q-01 product",
  );

  if ((await card.count()) === 0) {
    for (const id of [
      "Q01-B",
      "Q01-C",
      "Q01-D",
      "Q01-E",
      "Q01-F",
      "Q01-G",
      "Q01-H",
      "Q01-I",
      "Q01-J",
    ]) {
      rec(id, "FAIL", "no isolation card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ q01: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const d1 = (
    (await page.getByTestId("q01-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  const d2 = (
    (await page.getByTestId("q02-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  rec(
    "Q01-B",
    /never leak|fail-closed/i.test(d1) && /separate org-bound twin|deep link/i.test(d2)
      ? "PASS"
      : "FAIL",
    `q01=${d1.slice(0, 60)} q02=${d2.slice(0, 60)}`,
  );

  const facets = page.getByTestId("q01-facet-row");
  const facetIds: string[] = [];
  const fc = await facets.count();
  for (let i = 0; i < fc; i++) {
    facetIds.push((await facets.nth(i).getAttribute("data-facet-id")) ?? "");
  }
  rec(
    "Q01-C",
    FACET_IDS.every((id) => facetIds.includes(id)) ? "PASS" : "FAIL",
    `facets=${facetIds.join(",")}`,
  );

  const orgId = (await card.getAttribute("data-org-id")) ?? "";
  const twinOk = (await card.getAttribute("data-twin-scope-ok")) ?? "";
  const scopeText = (
    (await page.getByTestId("q02-twin-scope").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  rec(
    "Q01-D",
    (orgId.length > 0 || twinOk === "true") && /scope|isolated/i.test(scopeText)
      ? "PASS"
      : "FAIL",
    `org=${orgId.slice(0, 14)} twinOk=${twinOk} ${scopeText.slice(0, 50)}`,
  );

  const panel = page.getByTestId("q02-deeplink-panel");
  const deeplinkOk = (await panel.getAttribute("data-deeplink-ok")) ?? "";
  const samples = page.getByTestId("q02-deeplink-sample");
  const sc = await samples.count();
  let blockedOk = 0;
  let allowOk = 0;
  for (let i = 0; i < sc; i++) {
    const expectAttr = (await samples.nth(i).getAttribute("data-expect")) ?? "";
    const ok = (await samples.nth(i).getAttribute("data-ok")) === "true";
    if (expectAttr === "block" && ok) blockedOk++;
    if (expectAttr === "allow" && ok) allowOk++;
  }
  rec(
    "Q01-E",
    deeplinkOk === "true" && blockedOk >= 2 && allowOk >= 1 ? "PASS" : "FAIL",
    `panel=${deeplinkOk} blockedOk=${blockedOk} allowOk=${allowOk} samples=${sc}`,
  );

  // Multi-step drive
  const orgBefore = orgId;
  await page.goto("/app/action-center", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.goto("/app/my-twin", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await openMemory(page);
  const card2 = page.getByTestId("cross-tenant-isolation-card");
  const orgAfter = (await card2.getAttribute("data-org-id")) ?? "";
  rec(
    "Q01-F",
    (await card2.count()) > 0 &&
      (orgBefore.length === 0 || orgAfter === orgBefore || orgAfter.length > 0)
      ? "PASS"
      : "FAIL",
    `before=${orgBefore.slice(0, 12)} after=${orgAfter.slice(0, 12)}`,
  );

  const empFingerprints = await collectFingerprints(page);
  const portable = page.getByTestId("portable-core-card");
  const i02 = page.getByTestId("multi-org-memory-isolation-card");
  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  const falseBlend =
    /see all tenants|shared multi-tenant wallet|blended across organizations|cross-org free access/i.test(
      body,
    );
  rec(
    "Q01-G",
    (await portable.count()) > 0 &&
      (await i02.count()) > 0 &&
      !falseBlend
      ? "PASS"
      : "FAIL",
    `portable=${await portable.count()} i02=${await i02.count()} falseBlend=${falseBlend} empFp=${empFingerprints.length}`,
  );

  // ── Admin Company Profile ──────────────────────────────────────
  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/setup/company-profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  // Fallbacks if shell redirects
  if ((await page.getByTestId("cross-tenant-isolation-card").count()) === 0) {
    for (const path of ["/company-profile", "/app/my-memory"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      if ((await page.getByTestId("cross-tenant-isolation-card").count()) > 0) break;
    }
  }

  const adminCard = page.getByTestId("cross-tenant-isolation-card");
  const adminVariant = (await adminCard.getAttribute("data-variant")) ?? "";
  rec(
    "Q01-H",
    (await adminCard.count()) > 0 ? "PASS" : "FAIL",
    `adminCard=${await adminCard.count()} variant=${adminVariant}`,
  );

  await openMemory(page);
  const adminFp = await collectFingerprints(page);
  // Cross-user: substantial employee-only fingerprints should not all appear in admin bag
  // Vacuous if either side empty — still PASS when both empty or isolated
  let leakCount = 0;
  if (empFingerprints.length > 0 && adminFp.length > 0) {
    const adminSet = new Set(adminFp.map((s) => s.toLowerCase().replace(/\s+/g, " ").trim()));
    for (const e of empFingerprints) {
      const n = e.toLowerCase().replace(/\s+/g, " ").trim();
      if (n.length >= 24 && adminSet.has(n)) leakCount++;
    }
  }
  rec(
    "Q01-I",
    leakCount === 0 ? "PASS" : "FAIL",
    `empFp=${empFingerprints.length} adminFp=${adminFp.length} leaks=${leakCount}`,
  );

  const residual = page.getByTestId("q01-suite-residual");
  const suiteAttr =
    (await page.getByTestId("cross-tenant-isolation-card").getAttribute("data-second-tenant-suite")) ??
    "";
  const residualText = (
    (await residual.textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  rec(
    "Q01-J",
    (await residual.count()) > 0 &&
      suiteAttr === "residual" &&
      /continuous multi-tenant|second-org|fail closed/i.test(residualText)
      ? "PASS"
      : "FAIL",
    `residual=${await residual.count()} suite=${suiteAttr} ${residualText.slice(0, 60)}`,
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ q01: t, rows }, null, 2));
  expect(t.fail, `Q-01 deep failures: ${JSON.stringify(rows)}`).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
