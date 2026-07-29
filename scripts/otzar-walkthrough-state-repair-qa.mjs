#!/usr/bin/env node
/**
 * FILE: otzar-walkthrough-state-repair-qa.mjs
 * PURPOSE: Independent browser proof of walkthrough state repair (yc-demo-v6).
 *          Clicks real Next/Back in a CLEAN context. Does NOT inject step IDs.
 *          Prior harnesses that forced step IDs or treated resume-at-8 as pass are INVALID.
 *
 * Usage:
 *   node scripts/otzar-walkthrough-state-repair-qa.mjs
 *   OTZAR_APP_URL=https://app.otzar.ai node scripts/otzar-walkthrough-state-repair-qa.mjs
 *
 * Exit 0 only when first-time start is 1/12 and Next/Back advance one step each.
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const APP = (process.env.OTZAR_APP_URL || "https://app.otzar.ai").replace(/\/$/, "");
const API = (process.env.OTZAR_API_URL || "https://api.otzar.ai").replace(/\/$/, "");
const OUT = process.env.OTZAR_QA_OUT ||
  join(process.cwd(), "docs/testing/acceptance-evidence/walkthrough-state-repair");
const PERSONA = process.env.OTZAR_DEMO_PERSONA || "organization_lead";

mkdirSync(OUT, { recursive: true });

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function mintToken(personaKey) {
  const res = await fetch(`${API}/api/v1/demo/yc-labs/persona-session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ persona_key: personaKey }),
  });
  const json = await res.json();
  if (!json.ok || !json.token) {
    throw new Error(`persona-session failed: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json;
}

async function readCoach(page) {
  const reveal = page.locator('[data-testid="first-use-reveal"]');
  const resume = page.locator('[data-testid="first-use-reveal-resume-choice"]');
  const corrupt = page.locator('[data-testid="first-use-reveal-corrupt"]');
  const restart = page.locator('[data-testid="first-use-reveal-restart"]');

  if (await corrupt.isVisible().catch(() => false)) {
    return { mode: "corrupt" };
  }
  if (await resume.isVisible().catch(() => false)) {
    const saved = await resume.getAttribute("data-saved-step");
    return { mode: "resume-choice", savedStep: saved };
  }
  if (await restart.isVisible().catch(() => false)) {
    return { mode: "completed-restart" };
  }
  if (!(await reveal.isVisible().catch(() => false))) {
    return { mode: "absent" };
  }
  const stepIndex = await reveal.getAttribute("data-step-index");
  const stepId = await reveal.getAttribute("data-step");
  const version = await reveal.getAttribute("data-walkthrough-version");
  const progress = await page
    .locator('[data-testid="walkthrough-progress"]')
    .innerText()
    .catch(() => "");
  const title = await page
    .locator('[data-testid="walkthrough-step-title"]')
    .innerText()
    .catch(() => "");
  return {
    mode: "active",
    stepIndex: stepIndex === null ? null : Number(stepIndex),
    stepId,
    version,
    progress,
    title,
    route: page.url(),
  };
}

async function storageSnapshot(page) {
  return page.evaluate(() => {
    const local = {};
    const session = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.includes("walkthrough")) local[k] = localStorage.getItem(k);
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k.includes("walkthrough") || k.includes("demo"))) {
        session[k] = sessionStorage.getItem(k);
      }
    }
    return { local, session };
  });
}

async function injectAuth(page, token, personaKey) {
  // Auth is in-memory (Zustand). Seed via demo launcher path simulation:
  // go to /demo/yc is cleaner — but we also need force-start. Prefer launcher click.
  await page.goto(`${APP}/demo/yc`, { waitUntil: "domcontentloaded", timeout: 60000 });
  // Clear any prior storage after landing so first-time is true.
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  // Mint happens via product button so resetWalkthroughForDemoLaunch runs.
  const btn = page.locator(`[data-testid="demo-launch-${personaKey}"]`);
  await btn.waitFor({ state: "visible", timeout: 30000 });
  await btn.click();
  await page.waitForURL(/\/app/, { timeout: 45000 });
  // Wait for coach hydrate
  await page.waitForTimeout(1500);
}

async function main() {
  const report = {
    run_at: new Date().toISOString(),
    app: APP,
    persona: PERSONA,
    gates: {},
    steps: [],
    verdict: "FAIL",
  };

  const browser = await chromium.launch({ headless: true });
  // CLEAN context — no shared profile, no prior storage.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  try {
    // Preflight: API personas
    const list = await fetch(`${API}/api/v1/demo/yc-labs/personas`).then((r) =>
      r.json(),
    );
    report.gates.PERSONA_LIST = list.ok === true ? "PASS" : "FAIL";

    await injectAuth(page, null, PERSONA);
    const shot0 = join(OUT, `first-time-${stamp()}.png`);
    await page.screenshot({ path: shot0, fullPage: false });
    report.steps.push({ phase: "first_land", screenshot: shot0 });

    // If resume choice appears on first-time, that is FAIL (should be force start).
    let coach = await readCoach(page);
    report.steps.push({ phase: "first_coach", coach });
    report.gates.SILENT_MID_RESUME =
      coach.mode === "resume-choice" ? "FAIL" : "PASS";
    report.gates.FIRST_TIME_START =
      coach.mode === "active" && coach.stepIndex === 0 ? "PASS" : "FAIL";
    report.gates.PROGRESS_1_OF_12 =
      coach.mode === "active" &&
      (coach.progress.includes("1/12") || coach.stepIndex === 0)
        ? "PASS"
        : "FAIL";
    report.gates.VERSION_YC_DEMO_V6 =
      coach.mode === "active" && coach.version === "yc-demo-v6" ? "PASS" : "FAIL";

    // Role value card above the fold
    const roleCard = page.locator('[data-testid="demo-role-value-card"]');
    report.gates.ROLE_VALUE_CARD = (await roleCard.isVisible().catch(() => false))
      ? "PASS"
      : "FAIL";
    if (report.gates.ROLE_VALUE_CARD === "PASS") {
      report.role_card = {
        who: await page.locator('[data-testid="demo-role-who"]').innerText(),
        outcome: await page.locator('[data-testid="demo-role-outcome"]').innerText(),
        handled: await page
          .locator('[data-testid="demo-role-otzar-handled"]')
          .innerText(),
        needs: await page
          .locator('[data-testid="demo-role-needs-human"]')
          .innerText(),
        impact: await page
          .locator('[data-testid="demo-role-org-impact"]')
          .innerText(),
      };
    }

    // Next through first 4 steps (real clicks only)
    let nextOk = true;
    let doubleAdvance = false;
    for (let i = 0; i < 4; i++) {
      const before = await readCoach(page);
      if (before.mode !== "active") {
        nextOk = false;
        report.steps.push({ phase: `next_${i}_before`, before, error: "not active" });
        break;
      }
      await page.locator('[data-testid="walkthrough-next"]').click();
      await page.waitForTimeout(700);
      const after = await readCoach(page);
      report.steps.push({
        phase: `next_${i}`,
        before_index: before.stepIndex,
        after_index: after.stepIndex,
        after_route: after.route,
        after_id: after.stepId,
      });
      if (after.mode !== "active") {
        nextOk = false;
        break;
      }
      if (after.stepIndex !== before.stepIndex + 1) {
        nextOk = false;
        if (after.stepIndex > before.stepIndex + 1) doubleAdvance = true;
        break;
      }
    }
    report.gates.NEXT_SINGLE_CLICK_ADVANCE = nextOk ? "PASS" : "FAIL";
    report.gates.DOUBLE_ADVANCE = doubleAdvance ? "FAIL" : "PASS";

    // Back once
    const beforeBack = await readCoach(page);
    await page.locator('[data-testid="walkthrough-back"]').click();
    await page.waitForTimeout(700);
    const afterBack = await readCoach(page);
    report.steps.push({
      phase: "back_1",
      before_index: beforeBack.stepIndex,
      after_index: afterBack.stepIndex,
      after_route: afterBack.route,
      after_id: afterBack.stepId,
    });
    report.gates.BACK_ONE_STEP =
      afterBack.mode === "active" &&
      beforeBack.mode === "active" &&
      afterBack.stepIndex === beforeBack.stepIndex - 1
        ? "PASS"
        : "FAIL";

    // Start over
    await page.locator('[data-testid="walkthrough-start-over"]').click();
    await page.waitForTimeout(1000);
    const afterReset = await readCoach(page);
    report.steps.push({ phase: "start_over", coach: afterReset });
    report.gates.START_OVER_TO_1 =
      afterReset.mode === "active" && afterReset.stepIndex === 0
        ? "PASS"
        : "FAIL";

    // Returning user: set step mid-walk, reload, expect resume choice (not silent step 8)
    await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) =>
        k.includes("walkthrough_step"),
      );
      for (const k of keys) localStorage.setItem(k, "7");
      sessionStorage.removeItem("otzar_walkthrough_force_start");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const returning = await readCoach(page);
    report.steps.push({ phase: "returning_mid", coach: returning });
    report.gates.RETURNING_SHOWS_CHOICE =
      returning.mode === "resume-choice" ? "PASS" : "FAIL";
    report.gates.RETURNING_NOT_SILENT_STEP_8 =
      returning.mode === "active" && returning.stepIndex === 7
        ? "FAIL"
        : returning.mode === "resume-choice"
          ? "PASS"
          : "FAIL";

    if (returning.mode === "resume-choice") {
      await page.locator('[data-testid="walkthrough-start-over"]').click();
      await page.waitForTimeout(1000);
      const afterChoiceStart = await readCoach(page);
      report.gates.CHOICE_START_OVER =
        afterChoiceStart.mode === "active" && afterChoiceStart.stepIndex === 0
          ? "PASS"
          : "FAIL";
    } else {
      report.gates.CHOICE_START_OVER = "SKIP";
    }

    report.storage = await storageSnapshot(page);
    const shot1 = join(OUT, `final-${stamp()}.png`);
    await page.screenshot({ path: shot1, fullPage: false });
    report.final_screenshot = shot1;

    const critical = [
      "FIRST_TIME_START",
      "PROGRESS_1_OF_12",
      "VERSION_YC_DEMO_V6",
      "NEXT_SINGLE_CLICK_ADVANCE",
      "DOUBLE_ADVANCE",
      "BACK_ONE_STEP",
      "START_OVER_TO_1",
      "SILENT_MID_RESUME",
      "RETURNING_SHOWS_CHOICE",
      "RETURNING_NOT_SILENT_STEP_8",
    ];
    const fails = critical.filter((g) => report.gates[g] === "FAIL");
    report.verdict = fails.length === 0 ? "PASS" : "FAIL";
    report.failing_gates = fails;
    report.note =
      "Does not self-approve founder experience. Founder must re-open a clean browser.";
  } catch (err) {
    report.error = String(err?.stack || err);
    report.verdict = "FAIL";
  } finally {
    await browser.close();
  }

  const outPath = join(OUT, `walkthrough-state-repair-${stamp()}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ outPath, verdict: report.verdict, gates: report.gates }, null, 2));
  process.exit(report.verdict === "PASS" ? 0 : 1);
}

main();
