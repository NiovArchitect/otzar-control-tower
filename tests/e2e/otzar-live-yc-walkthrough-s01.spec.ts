// FILE: otzar-live-yc-walkthrough-s01.spec.ts
// PURPOSE: S-01 DEEP complex live — continuous multi-role YC walkthrough
//          survival on real product (not marker tourism). Dedicated YC org
//          residual is honest; demo multi-role continuous is product truth.
//
// DEPTH:
//   - Drive ≥3 roles through first-five primary paths
//   - Multi-step per role: Home → Needs me → Talk → Twin (and Memory on last)
//   - Honesty: no staged fakes / error walls
//   - Cross-surface: admin Company Profile walkthrough card
//
// SCENARIOS:
//   S01-A  Admin Company Profile shows yc-continuous-walkthrough-card
//   S01-B  Doctrine + 5 paths + 5 roles + dedicated residual
//   S01-C  CEO/founder: login → Home + Needs me + Twin survive
//   S01-D  Employee: full primary path chain survives
//   S01-E  Manager: Home + Needs me + Talk survive
//   S01-F  At least one of executive/contractor survives Home+Needs me
//   S01-G  Multi-role coverage ≥3 distinct personas driven
//   S01-H  No staged-fake language on driven bodies
//   S01-I  Today stamps data-s01-walkthrough
//   S01-J  Dedicated-org residual honest (not claiming pure YC org)
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-yc-walkthrough-s01.spec.ts

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
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const ROLES = {
  ceo: process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com",
  manager: process.env.OTZAR_SMOKE_MANAGER_EMAIL ?? "david@niovlabs.com",
  employee: process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com",
  executive: process.env.OTZAR_SMOKE_EXEC_EMAIL ?? "annie@niovlabs.com",
  contractor: process.env.OTZAR_SMOKE_CONTRACTOR_EMAIL ?? "walter@niovlabs.com",
} as const;

const rows: DeepRow[] = [];
const rec = (id: string, status: DeepRow["status"], detail: string) =>
  deepRec(rows, "s01", id, status, detail);

const drivenRoles = new Set<string>();
const bodyCorpus: string[] = [];

function stagedFake(text: string): boolean {
  return /coming soon|not implemented|placeholder only|demo mode only|staged for investors|fake data for demo|lorem ipsum|todo: wire|start chatting with nothing|empty chat box only/i.test(
    text,
  );
}

function errorWall(text: string): boolean {
  return /Something went wrong|Application error|Page not found/i.test(text);
}

async function go(page: Page, path: string): Promise<string> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1600);
  const t = ((await page.locator("body").innerText()) ?? "").trim();
  bodyCorpus.push(t);
  return t;
}

async function surviveHomeNeedsTwin(
  page: Page,
  email: string,
  roleId: string,
  withTalk: boolean,
  withMemory: boolean,
): Promise<{ ok: boolean; detail: string }> {
  await liveUiLogin(page, email, PW as string);
  drivenRoles.add(roleId);

  if (!page.url().includes("/app")) {
    await go(page, "/app");
  } else {
    await page.waitForTimeout(1200);
  }

  const home =
    ((await page.locator("body").innerText()) ?? "").trim() +
    " " +
    (((await page.getByTestId("ambient-work-surface").count()) > 0
      ? "Today Needs me Talk Otzar"
      : "") as string);
  bodyCorpus.push(home);
  const homeOk =
    home.length > 40 &&
    !errorWall(home) &&
    !stagedFake(home) &&
    /Today|Needs me|Talk|Otzar|work|project|AI Teammate/i.test(home);

  const needs = await go(page, "/app/action-center");
  const needsOk =
    needs.length > 30 &&
    !errorWall(needs) &&
    !stagedFake(needs) &&
    /Needs me|approval|handoff|work|waiting|clear|empty|nothing|queue/i.test(
      needs,
    );

  let talkOk = true;
  if (withTalk) {
    const talk = await go(page, "/app/voice");
    talkOk =
      talk.length > 20 &&
      !errorWall(talk) &&
      !stagedFake(talk) &&
      /Talk|Otzar|voice|mic|type|listen|message/i.test(talk);
  }

  const twin = await go(page, "/app/my-twin");
  const twinOk =
    twin.length > 30 &&
    !errorWall(twin) &&
    !stagedFake(twin) &&
    /AI Teammate|template|role|authority|Twin|memory|calibration|tools|responsib/i.test(
      twin,
    );

  let memOk = true;
  if (withMemory) {
    const mem = await go(page, "/app/my-memory");
    memOk =
      mem.length > 30 &&
      !errorWall(mem) &&
      !stagedFake(mem) &&
      /wallet|memory|preference|portable|Teach|isolation|work style|Digital Work/i.test(
        mem,
      );
  }

  const ok = homeOk && needsOk && talkOk && twinOk && memOk;
  return {
    ok,
    detail: `home=${homeOk} needs=${needsOk} talk=${talkOk} twin=${twinOk} mem=${memOk}`,
  };
}

test("S-01 deep: multi-role YC continuous walkthrough", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  // ── Card on admin Company Profile ──────────────────────────────
  await liveUiLogin(page, ROLES.ceo, PW as string);
  await page.goto("/setup/company-profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);

  const card = page.getByTestId("yc-continuous-walkthrough-card");
  rec(
    "S01-A",
    (await card.count()) > 0 && (await card.getAttribute("data-s01")) === "true"
      ? "PASS"
      : "FAIL",
    (await card.count()) > 0
      ? "yc-continuous-walkthrough-card"
      : "missing — deploy S-01 product",
  );

  if ((await card.count()) === 0) {
    for (const id of [
      "S01-B",
      "S01-C",
      "S01-D",
      "S01-E",
      "S01-F",
      "S01-G",
      "S01-H",
      "S01-I",
      "S01-J",
    ]) {
      rec(id, "FAIL", "no walkthrough card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ s01: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("s01-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  const pathRows = await page.getByTestId("s01-path-row").count();
  const roleRows = await page.getByTestId("s01-role-row").count();
  const residual = (
    (await page.getByTestId("s01-dedicated-residual").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  rec(
    "S01-B",
    /unscripted|multi-role|yc|first five|survival/i.test(doctrine) &&
      pathRows >= 5 &&
      roleRows >= 5 &&
      /dedicated synthetic yc org/i.test(residual)
      ? "PASS"
      : "FAIL",
    `paths=${pathRows} roles=${roleRows} doctrine=${doctrine.slice(0, 50)}`,
  );

  // ── Multi-role drive ───────────────────────────────────────────
  const ceo = await surviveHomeNeedsTwin(page, ROLES.ceo, "ceo", false, false);
  rec("S01-C", ceo.ok ? "PASS" : "FAIL", ceo.detail);

  const emp = await surviveHomeNeedsTwin(
    page,
    ROLES.employee,
    "employee",
    true,
    true,
  );
  rec("S01-D", emp.ok ? "PASS" : "FAIL", emp.detail);

  const mgr = await surviveHomeNeedsTwin(
    page,
    ROLES.manager,
    "manager",
    true,
    false,
  );
  rec("S01-E", mgr.ok ? "PASS" : "FAIL", mgr.detail);

  // Executive or contractor — try executive first, fallback contractor
  let fourth: { ok: boolean; detail: string } = { ok: false, detail: "skip" };
  try {
    fourth = await surviveHomeNeedsTwin(
      page,
      ROLES.executive,
      "executive",
      false,
      false,
    );
    if (!fourth.ok) {
      fourth = await surviveHomeNeedsTwin(
        page,
        ROLES.contractor,
        "contractor",
        false,
        false,
      );
    }
  } catch (e) {
    fourth = {
      ok: false,
      detail: `fourth-role error: ${String(e).slice(0, 80)}`,
    };
  }
  rec("S01-F", fourth.ok ? "PASS" : "FAIL", fourth.detail);

  rec(
    "S01-G",
    drivenRoles.size >= 3 ? "PASS" : "FAIL",
    `roles=${[...drivenRoles].join(",")}`,
  );

  const joined = bodyCorpus.join("\n");
  const anyFake = stagedFake(joined);
  const anyWall = errorWall(joined);
  rec(
    "S01-H",
    !anyFake && !anyWall ? "PASS" : "FAIL",
    `fake=${anyFake} wall=${anyWall} corpus_len=${joined.length}`,
  );

  await liveUiLogin(page, ROLES.employee, PW as string);
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const surface = page.getByTestId("ambient-work-surface");
  const s01Attr = (await surface.getAttribute("data-s01-walkthrough")) ?? "";
  const pathsAttr = (await surface.getAttribute("data-s01-primary-paths")) ?? "";
  rec(
    "S01-I",
    (await surface.count()) > 0 && s01Attr === "true" && /login_home/.test(pathsAttr)
      ? "PASS"
      : "FAIL",
    `s01=${s01Attr} paths=${pathsAttr.slice(0, 60)}`,
  );

  // Re-check residual honesty on card
  await liveUiLogin(page, ROLES.ceo, PW as string);
  await page.goto("/setup/company-profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  const card2 = page.getByTestId("yc-continuous-walkthrough-card");
  const harness =
    (await card2.getAttribute("data-dedicated-org-harness")) ?? "";
  const res2 = (
    (await page.getByTestId("s01-dedicated-residual").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  rec(
    "S01-J",
    harness === "residual" &&
      /dedicated synthetic yc org|residual/i.test(res2) &&
      !/dedicated yc org fully proven|no residual/i.test(res2)
      ? "PASS"
      : "FAIL",
    `harness=${harness} residual=${res2.slice(0, 70)}`,
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ s01: t, rows, driven: [...drivenRoles] }, null, 2));
  expect(t.fail, `S-01 deep failures: ${JSON.stringify(rows)}`).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
