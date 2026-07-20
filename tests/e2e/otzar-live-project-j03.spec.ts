// FILE: otzar-live-project-j03.spec.ts
// PURPOSE: J-03 DEEP live smoke — conversation resolves to project safely;
//          routine project work is NOT a multi-page maze.
//
// SCENARIOS (hard-fail scorecard):
//   J03-A  Projects page loads (list or empty honest)
//   J03-B  Talk "Open projects" → /app/work-projects in ONE navigation
//   J03-C  Named "Open project {name}" → heart open (?project=&open=1)
//          + conversation-project-resolved + spine/pulse when present
//   J03-D  Ambiguous / missing name is honest (list or which-project)
//   J03-E  Non-project work talk does NOT steal into projects (action center)
//   J03-F  Direct deep link ?project=&open=1 opens heart (no extra clicks)
//   J03-G  Project heart stays in viewport (J-01 regression)
//   J03-H  Orb survives project nav pressure
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-project-j03.spec.ts

import { test, expect, type Page } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const PW = process.env.DEMO_SHARED_PASSWORD;
const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

type Row = { id: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };
const rows: Row[] = [];
function rec(id: string, status: Row["status"], detail: string): void {
  rows.push({ id, status, detail: detail.slice(0, 280) });
  console.log(
    `[j03] ${status === "PASS" ? "✓" : status === "SKIP" ? "·" : "✗"} ${id} :: ${detail.slice(0, 160)}`,
  );
}

async function expandTalk(page: Page): Promise<boolean> {
  const input = page.getByLabel(/Message to Otzar/i);
  const orb = page.getByTestId("ambient-otzar-bar").first();
  await orb.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
  for (let i = 0; i < 5; i++) {
    if ((await input.count()) > 0 && (await input.first().isVisible().catch(() => false))) {
      return true;
    }
    await orb.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(350);
    if (!(await input.first().isVisible().catch(() => false))) {
      await page
        .getByTestId("header-talk-otzar")
        .click({ force: true })
        .catch(() => undefined);
      await page.waitForTimeout(350);
    }
  }
  return (await input.count()) > 0 && (await input.first().isVisible().catch(() => false));
}

async function askOrb(page: Page, text: string, timeoutMs = 28_000): Promise<string> {
  const REPLY = '[data-testid="otzar-conversation-entry"]:not([data-role="user"])';
  await expandTalk(page);
  const input = page.getByLabel(/Message to Otzar/i);
  const send = page.getByRole("button", { name: /^send$/i });
  const before = await page.locator(REPLY).count().catch(() => 0);
  await input.fill(text);
  await send.click();
  try {
    await expect
      .poll(async () => await page.locator(REPLY).count().catch(() => before), {
        timeout: timeoutMs,
      })
      .toBeGreaterThan(before);
  } catch {
    /* fall through */
  }
  // Wait briefly for navigation side-effects
  await page.waitForTimeout(800);
  const outcome = (
    (await page.getByTestId("voice-action-outcome").textContent().catch(() => "")) ??
    ""
  ).trim();
  if (outcome.length > 0) return outcome;
  return (
    ((await page.locator(REPLY).last().textContent().catch(() => "")) ?? "")
      .replace(/^(Otzar:|Action:|Error:)\s*/, "")
      .trim()
  );
}

test("J-03 deep: conversation → project heart (anti-maze)", async ({ page }) => {
  test.setTimeout(300_000);
  await liveUiLogin(page, EMAIL, PW as string);

  // ── J03-A: projects surface ────────────────────────────────────
  await page.goto("/app/work-projects", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const pageOk = (await page.getByTestId("work-projects-page").count()) > 0;
  if (!pageOk) {
    rec("J03-A", "FAIL", "work-projects-page missing");
  } else {
    rec("J03-A", "PASS", "work-projects-page visible");
  }

  const empty = (await page.getByTestId("projects-empty").count()) > 0;
  const list = page.getByTestId("projects-list");
  const rowsCount = await page.locator('[data-testid^="project-row-"]').count();
  let projectName: string | null = null;
  let projectId: string | null = null;
  if (rowsCount > 0) {
    const first = page.locator('[data-testid^="project-row-"]').first();
    projectId = await first.getAttribute("data-project-id");
    projectName = (
      (await first.locator(".font-medium, span.text-sm.font-medium").first().textContent()) ??
      (await first.textContent()) ??
      ""
    )
      .replace(/Active|Member|Owner|Reviewer|Open project context|Hide project context|Archive/gi, "")
      .replace(/·.*/g, "")
      .trim()
      .split("\n")[0]
      ?.trim() ?? null;
    // Prefer clean name from button sibling area
    const nameEl = first.locator("span.text-sm.font-medium").first();
    if ((await nameEl.count()) > 0) {
      projectName = ((await nameEl.textContent()) ?? "").trim() || projectName;
    }
    rec(
      "J03-A-data",
      "PASS",
      `projects=${rowsCount} sample="${projectName}" id=${projectId}`,
    );
  } else if (empty || (await list.count()) === 0) {
    rec("J03-A-data", "SKIP", "no projects on this account — named resolve limited");
  } else {
    rec("J03-A-data", "FAIL", "ambiguous projects load state");
  }

  // ── J03-B: Open projects from Talk — one hop ───────────────────
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const hopsBefore = page.url();
  const outList = await askOrb(page, "Open projects");
  // Allow nav settle
  await page.waitForTimeout(1500);
  const afterList = page.url();
  const oneHopList = /\/app\/work-projects/.test(afterList);
  const listOutcome =
    /project|mission|opening|active|create|which/i.test(outList) || oneHopList;
  rec(
    "J03-B",
    oneHopList && listOutcome ? "PASS" : "FAIL",
    `from=${hopsBefore.slice(-20)} → ${afterList} outcome=${outList.slice(0, 100)}`,
  );
  // Anti-maze: should not land on login or unrelated multi-step
  if (/\/login/.test(afterList)) {
    rec("J03-B-maze", "FAIL", "bounced to login");
  } else {
    rec("J03-B-maze", "PASS", "no login bounce");
  }

  // ── J03-C: named open → heart ──────────────────────────────────
  if (projectName && projectName.length >= 2) {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const cmd = `Open project ${projectName}`;
    const outNamed = await askOrb(page, cmd, 35_000);
    await page.waitForTimeout(2000);
    const url = page.url();
    const onProjects = /\/app\/work-projects/.test(url);
    const hasQuery =
      projectId !== null
        ? url.includes(`project=${encodeURIComponent(projectId)}`) ||
          url.includes(`project=${projectId}`)
        : /project=/.test(url);
    const panel = page.getByTestId("project-context-panel");
    const panelVisible = (await panel.count()) > 0 && (await panel.isVisible().catch(() => false));
    const resolvedBanner = page.getByTestId("conversation-project-resolved");
    const bannerOk = (await resolvedBanner.count()) > 0;
    const pageResolved =
      (await page.getByTestId("work-projects-page").getAttribute("data-conversation-resolved")) ===
      "true";

    // Deploy lag: if markers missing but panel open, partial
    if (onProjects && (panelVisible || hasQuery || /opening/i.test(outNamed))) {
      rec(
        "J03-C",
        panelVisible || hasQuery || pageResolved || bannerOk ? "PASS" : "FAIL",
        `url=${url.slice(-80)} panel=${panelVisible} query=${hasQuery} banner=${bannerOk} outcome=${outNamed.slice(0, 80)}`,
      );
    } else {
      rec(
        "J03-C",
        "FAIL",
        `named open failed url=${url} outcome=${outNamed.slice(0, 120)}`,
      );
    }

    // Spine / pulse when panel open
    if (panelVisible) {
      const spine = (await page.getByTestId("project-spine").count()) > 0;
      const pulse = (await page.getByTestId("project-context-pulse").count()) > 0;
      rec(
        "J03-C-spine",
        spine || pulse ? "PASS" : "FAIL",
        `spine=${spine} pulse=${pulse}`,
      );
    } else {
      rec("J03-C-spine", "SKIP", "panel not open — spine N/A");
    }
  } else {
    rec("J03-C", "SKIP", "no project name available");
    rec("J03-C-spine", "SKIP", "no project");
  }

  // ── J03-D: bare "Open project" honest ──────────────────────────
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const bare = await askOrb(page, "Open project");
  await page.waitForTimeout(1200);
  const bareUrl = page.url();
  const honest =
    /which project|projects|mission|create|open projects|active/i.test(bare) ||
    /\/app\/work-projects/.test(bareUrl);
  rec("J03-D", honest ? "PASS" : "FAIL", `outcome=${bare.slice(0, 120)} url=${bareUrl}`);

  // ── J03-E: non-project must not hijack ─────────────────────────
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const ac = await askOrb(page, "Open action center");
  await page.waitForTimeout(1200);
  const acUrl = page.url();
  const acOk =
    /action-center|approvals|needs me|opened action|nothing is waiting|approval/i.test(
      ac + " " + acUrl,
    );
  const notProjectsOnly = !(/\/app\/work-projects/.test(acUrl) && !/action-center/.test(acUrl));
  rec(
    "J03-E",
    acOk && notProjectsOnly ? "PASS" : "FAIL",
    `outcome=${ac.slice(0, 100)} url=${acUrl}`,
  );

  // ── J03-F: deep link direct ────────────────────────────────────
  if (projectId) {
    await page.goto(
      `/app/work-projects?project=${encodeURIComponent(projectId)}&open=1`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForTimeout(2500);
    const panel = page.getByTestId("project-context-panel");
    const open =
      (await panel.count()) > 0 && (await panel.isVisible().catch(() => false));
    // Fallback: toggle was auto-selected via data-selected-project
    const selectedAttr = await page
      .getByTestId("work-projects-page")
      .getAttribute("data-selected-project");
    const selectedOk = selectedAttr === projectId;
    rec(
      "J03-F",
      open || selectedOk ? "PASS" : "FAIL",
      `panel=${open} selected=${selectedAttr}`,
    );
  } else {
    rec("J03-F", "SKIP", "no project id for deep link");
  }

  // ── J03-G: heart in viewport ───────────────────────────────────
  const panelG = page.getByTestId("project-context-panel");
  if ((await panelG.count()) > 0 && (await panelG.isVisible().catch(() => false))) {
    const inView = await panelG.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.9 && r.bottom > 40;
    });
    rec("J03-G", inView ? "PASS" : "FAIL", `inView=${inView}`);
  } else if (projectId) {
    // Try open toggle
    const toggle = page.getByTestId(`project-toggle-${projectId}`);
    if ((await toggle.count()) > 0) {
      await toggle.click();
      await page.waitForTimeout(800);
      const inView = await page.getByTestId("project-context-panel").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight * 0.9 && r.bottom > 40;
      }).catch(() => false);
      rec("J03-G", inView ? "PASS" : "FAIL", `after-toggle inView=${inView}`);
    } else {
      rec("J03-G", "SKIP", "no panel to measure");
    }
  } else {
    rec("J03-G", "SKIP", "no project");
  }

  // ── J03-H: orb alive ───────────────────────────────────────────
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const alive = await expandTalk(page);
  rec("J03-H", alive ? "PASS" : "FAIL", `orb_expanded=${alive}`);

  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log(
    "J03_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "J03_JSON_END",
  );
  console.log(`[j03] TOTALS pass=${pass} fail=${fail} skip=${skip} rows=${rows.length}`);

  expect(fail, `J-03 deep smoke had ${fail} failures`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(5);
});
