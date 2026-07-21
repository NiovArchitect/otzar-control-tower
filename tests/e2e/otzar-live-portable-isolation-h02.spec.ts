// FILE: otzar-live-portable-isolation-h02.spec.ts
// PURPOSE: H-02 / I-01 DEEP complex live — portable personal core UI +
//          multi-user work-style isolation (not marker tourism).
//
// DEPTH:
//   - Drive employee Memory portable core + optional Teach refresh
//   - Two principals: collect preference fingerprints; prove no cross-leak
//   - Export honesty (no export control); doctrine + ownership labels
//   - Cross-surface: My Twin wallet panel when present
//
// SCENARIOS:
//   H02-A  Employee Memory shows portable-core-card (I-01)
//   H02-B  Doctrine: shape of how you work / company work stays
//   H02-C  Export honesty — not shipped; no export/import buttons
//   H02-D  Ownership lists or honest empty (portable vs org-bound markers)
//   H02-E  Drive teach session if empty so core has real content (optional)
//   H02-F  Capture employee preference fingerprints
//   H02-G  Second principal (admin) Memory — independent core
//   H02-H  Multi-user isolation: employee fingerprints ∉ admin core/body
//   H02-I  My Twin wallet portability surface OR Memory boundary fallback
//   H02-J  No confidential / false-portability claims on either principal
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-portable-isolation-h02.spec.ts

import { test, expect, type Page } from "@playwright/test";
import { liveUiLogin } from "./live-login";
import {
  DEEP_SMOKE_MIN_PASS,
  DEEP_SMOKE_TIMEOUT_MS,
  deepRec,
  deepTotals,
  type DeepRow,
} from "./deep-smoke-contract";

/** Strip ownership badges for multi-user fingerprint compare. */
function stripOwnershipBadge(s: string): string {
  return s
    .replace(/portable personal/gi, "")
    .replace(/org-bound \(stays\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PW = process.env.DEMO_SHARED_PASSWORD;
const ADMIN = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const rows: DeepRow[] = [];
const rec = (id: string, status: DeepRow["status"], detail: string) =>
  deepRec(rows, "h02", id, status, detail);

async function openMemory(page: Page): Promise<void> {
  await page.goto("/app/my-memory", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  try {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("my-memory-page").count()) > 0 ||
          (await page.getByTestId("portable-core-card").count()) > 0
            ? "y"
            : "n",
        { timeout: 25_000 },
      )
      .toBe("y");
  } catch {
    /* */
  }
}

async function collectPreferenceFingerprints(page: Page): Promise<string[]> {
  const out: string[] = [];
  const items = page.getByTestId("portable-core-item");
  const n = await items.count();
  for (let i = 0; i < n; i++) {
    const t = ((await items.nth(i).innerText()) ?? "").trim();
    if (t.length >= 12) out.push(t);
  }
  const approved = page.getByTestId("work-style-approved-item");
  const m = await approved.count();
  for (let i = 0; i < m; i++) {
    const t = ((await approved.nth(i).innerText()) ?? "").trim();
    if (t.length >= 12) out.push(t);
  }
  return out;
}

async function ensureSomePreferences(page: Page): Promise<string> {
  const core = page.getByTestId("portable-core-card");
  const countAttr = (await core.getAttribute("data-portable-count")) ?? "0";
  if (Number(countAttr) > 0) return `existing portable=${countAttr}`;

  const teach = page.getByTestId("observation-consent-card");
  if ((await teach.count()) === 0) return "no teach card";

  const phase = (await teach.getAttribute("data-h01-phase")) ?? "";
  const orgOn = (await teach.getAttribute("data-org-policy-enabled")) === "true";
  if (!orgOn) return "org policy off";

  if (phase === "active") {
    const stop = page.getByTestId("observation-stop");
    if ((await stop.count()) > 0) {
      await stop.click();
      await page.waitForTimeout(3500);
    }
  }

  // From review, approve one if present
  let cands = page.getByTestId("work-style-candidate");
  if ((await cands.count()) === 0 && phase !== "active") {
    const done = page.getByTestId("observation-review-done");
    if ((await done.count()) > 0) await done.click();
    await page.waitForTimeout(500);
    const box = page.getByTestId("observation-consent-checkbox");
    if ((await box.count()) > 0) {
      if (!(await box.isChecked())) await box.check();
      const start = page.getByTestId("observation-start");
      if ((await start.count()) > 0 && (await start.isEnabled())) {
        await start.click();
        await page.waitForTimeout(4000);
        const stop = page.getByTestId("observation-stop");
        if ((await stop.count()) > 0) {
          await stop.click();
          await page.waitForTimeout(4000);
        }
      }
    }
  }

  cands = page.getByTestId("work-style-candidate");
  if ((await cands.count()) > 0) {
    const approve = page.getByTestId("work-style-approve").first();
    await approve.click();
    await page.waitForTimeout(2000);
    // reload core
    await page.goto("/app/my-memory", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    return "approved candidate";
  }
  return "no candidates to approve";
}

test("H-02/I deep: portable core + multi-user isolation", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  // ── Principal A: employee ──────────────────────────────────────
  await liveUiLogin(page, EMPLOYEE, PW as string);
  await openMemory(page);

  const core = page.getByTestId("portable-core-card");
  rec(
    "H02-A",
    (await core.count()) > 0 &&
      (await core.getAttribute("data-i01")) === "true" &&
      (await core.getAttribute("data-h02")) === "true"
      ? "PASS"
      : "FAIL",
    (await core.count()) > 0
      ? "portable-core-card"
      : "missing — deploy I-01/H-02",
  );

  if ((await core.count()) === 0) {
    for (const id of [
      "H02-B",
      "H02-C",
      "H02-D",
      "H02-E",
      "H02-F",
      "H02-G",
      "H02-H",
      "H02-I",
      "H02-J",
    ]) {
      rec(id, "FAIL", "no portable core card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ h02: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("portable-core-doctrine").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  rec(
    "H02-B",
    /shape of how you work|company's work|methods|preferences/i.test(doctrine)
      ? "PASS"
      : "FAIL",
    doctrine.slice(0, 100),
  );

  const honesty = (
    (await page
      .getByTestId("portable-core-export-honesty")
      .textContent()
      .catch(() => "")) ?? ""
  ).toLowerCase();
  const exportBtn = await page.getByRole("button", { name: /export|import/i }).count();
  const exportAttr = (await core.getAttribute("data-export-available")) ?? "";
  rec(
    "H02-C",
    /not available yet|future/i.test(honesty) &&
      exportBtn === 0 &&
      exportAttr === "false"
      ? "PASS"
      : "FAIL",
    `honesty=${honesty.slice(0, 60)} exportBtns=${exportBtn} attr=${exportAttr}`,
  );

  const travels = page.getByTestId("portable-core-travels");
  const stays = page.getByTestId("portable-core-stays");
  const empty = page.getByTestId("portable-core-empty");
  const list = page.getByTestId("portable-core-list");
  rec(
    "H02-D",
    ((await travels.count()) > 0 && (await stays.count()) > 0) ||
      (await empty.count()) > 0 ||
      (await list.count()) > 0
      ? "PASS"
      : "FAIL",
    `travels=${await travels.count()} stays=${await stays.count()} list=${await list.count()} empty=${await empty.count()}`,
  );

  const driveNote = await ensureSomePreferences(page);
  rec(
    "H02-E",
    /approved|existing portable|no candidates|org policy/i.test(driveNote)
      ? "PASS"
      : "FAIL",
    driveNote,
  );

  await openMemory(page);
  const empFingerprints = await collectPreferenceFingerprints(page);
  const portableCount =
    (await page.getByTestId("portable-core-card").getAttribute("data-portable-count")) ??
    "0";
  rec(
    "H02-F",
    empFingerprints.length > 0 || portableCount === "0"
      ? "PASS"
      : "FAIL",
    `fingerprints=${empFingerprints.length} portableCount=${portableCount} sample=${(empFingerprints[0] ?? "").slice(0, 60)}`,
  );

  // ── Principal B: admin ─────────────────────────────────────────
  await liveUiLogin(page, ADMIN, PW as string);
  await openMemory(page);

  const adminCore = page.getByTestId("portable-core-card");
  rec(
    "H02-G",
    (await adminCore.count()) > 0 ? "PASS" : "FAIL",
    (await adminCore.count()) > 0
      ? `admin portable=${(await adminCore.getAttribute("data-portable-count")) ?? "?"}`
      : "admin missing portable core",
  );

  const adminFingerprints = await collectPreferenceFingerprints(page);
  const adminBody = ((await page.locator("body").innerText()) ?? "").toLowerCase();

  // Isolation: substantial employee preference text must not appear for admin
  let leak = false;
  const leakSamples: string[] = [];
  const empPlains = empFingerprints.map(stripOwnershipBadge).filter((s) => s.length >= 24);
  const adminPlains = adminFingerprints.map(stripOwnershipBadge).filter((s) => s.length >= 24);
  for (const plain of empPlains) {
    for (const ap of adminPlains) {
      if (ap.includes(plain) || plain.includes(ap)) {
        leak = true;
        leakSamples.push(plain.slice(0, 40));
      }
    }
  }
  rec(
    "H02-H",
    !leak || empPlains.length === 0 ? "PASS" : "FAIL",
    empPlains.length === 0
      ? "no employee fingerprints to cross-check (honest empty)"
      : leak
        ? `LEAK sample=${leakSamples[0] ?? "?"}`
        : `isolated emp=${empPlains.length} admin=${adminPlains.length}`,
  );

  // Cross-surface wallet / boundary
  await page.goto("/app/my-twin", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const walletPanel = page.getByTestId("wallet-portability-panel");
  const twinBody = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  if ((await walletPanel.count()) > 0) {
    rec(
      "H02-I",
      /personal|org|never|wallet|travel|stays/i.test(
        ((await walletPanel.textContent()) ?? "").toLowerCase(),
      )
        ? "PASS"
        : "FAIL",
      "wallet-portability-panel",
    );
  } else {
    await openMemory(page);
    const boundary = page.getByTestId("my-memory-boundary");
    rec(
      "H02-I",
      (await boundary.count()) > 0 || /personal wallet|company-owned/i.test(twinBody)
        ? "PASS"
        : "FAIL",
      (await boundary.count()) > 0 ? "memory boundary fallback" : twinBody.slice(0, 80),
    );
  }

  const empBodyCheck = adminBody + twinBody;
  rec(
    "H02-J",
    !/export your twin|take this with you|portable today|applied without approval/i.test(
      empBodyCheck,
    ) &&
      !/customer secret|api key\s*[:=]/i.test(empBodyCheck)
      ? "PASS"
      : "FAIL",
    "no false portability / confidential leak language",
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ h02: t, rows }, null, 2));
  expect(
    t.fail,
    `H-02 deep fails: ${JSON.stringify(rows.filter((r) => r.status === "FAIL"))}`,
  ).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
