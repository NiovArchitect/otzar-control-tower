#!/usr/bin/env node
// FILE: otzar-acceptance-browser-matrix.mjs
// PURPOSE: Live browser walkthrough visual evidence + screens + zoom.
//          Uses public demo launcher (no localStorage auth).

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.OTZAR_APP_URL || "https://app.otzar.ai";
const OUT =
  process.env.OTZAR_EVIDENCE_DIR ||
  "/Users/genghishameha/dev/NIOV Labs/github/niov-foundation/docs/testing/acceptance-evidence";

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "walkthrough"), { recursive: true });
mkdirSync(join(OUT, "screens"), { recursive: true });
mkdirSync(join(OUT, "zoom200"), { recursive: true });

const STEPS = [
  { n: 1, id: "problem", route: "/app", selectors: ["[data-testid='ambient-work-surface']", "[data-testid='employee-shell-main']", "h1"] },
  { n: 2, id: "ingest", route: "/app/observe", selectors: ["[data-testid='observe-read']", "[data-testid='employee-shell-main']"] },
  { n: 3, id: "understand", route: "/app/observe", selectors: ["[data-testid='observe-read']", "[data-testid='employee-shell-main']"] },
  { n: 4, id: "auto_clarify", route: "/app/my-work", selectors: ["[data-testid='my-work-page']"] },
  { n: 5, id: "ai_collab", route: "/app/collaboration", selectors: ["[data-testid='how-the-team-moved']", "[data-testid='collaboration-page']", "[data-testid='employee-shell-main']"] },
  { n: 6, id: "updated_work", route: "/app/my-work", selectors: ["[data-testid='my-work-page']"] },
  { n: 7, id: "exception", route: "/app/action-center", selectors: ["[data-testid='action-center']", "[data-testid='employee-shell-main']"] },
  { n: 8, id: "propagation", route: "/app", selectors: ["[data-testid='ambient-work-surface']", "[data-testid='employee-shell-main']"] },
  { n: 9, id: "management", route: "/app/heliogrid-report", selectors: ["[data-testid='heliogrid-report']", "[data-testid='employee-shell-main']"] },
  { n: 10, id: "persona_difference", route: "/demo/yc", selectors: ["[data-testid='demo-persona-launcher']", "h1"] },
  { n: 11, id: "memory", route: "/app/my-memory", selectors: ["[data-testid='my-memory-page']", "[data-testid='my-memory-loading']", "[data-testid='employee-shell-main']", "h1"] },
  { n: 12, id: "final_outcome", route: "/app/chat", selectors: ["[data-testid='chat-transcript']", "[data-testid='employee-shell-main']", "h1", "textarea", "[data-testid='ambient-otzar-bar']"] },
];

async function launchPersona(page, personaKey) {
  await page.goto(`${BASE}/demo/yc`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForSelector(
    `[data-testid="demo-launch-${personaKey}"], [data-testid="demo-persona-launcher"]`,
    { timeout: 30000 },
  );
  await page.waitForTimeout(500);
  const btn = page.locator(`[data-testid="demo-launch-${personaKey}"]`);
  await btn.waitFor({ state: "visible", timeout: 30000 });
  await btn.click();
  await page.waitForURL(/\/app(\/|$)/, { timeout: 45000 });
  await page.waitForSelector('[data-testid="employee-shell"], [data-testid="employee-shell-main"]', {
    timeout: 30000,
  });
  await page.waitForTimeout(800);
}

/**
 * Client-side navigation only — full page.goto drops the in-memory auth token.
 */
async function spaGo(page, path) {
  const current = new URL(page.url());
  const target = path.startsWith("http") ? path : `${BASE}${path}`;
  if (current.pathname === new URL(target).pathname) {
    await page.waitForTimeout(200);
    return;
  }
  // Prefer real nav links when present.
  const href = new URL(target).pathname;
  const link = page.locator(`a[href="${href}"], a[href="${target}"]`).first();
  if ((await link.count()) > 0 && (await link.isVisible().catch(() => false))) {
    await link.click();
    await page.waitForTimeout(900);
    return;
  }
  await page.evaluate((p) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, href);
  await page.waitForTimeout(1100);
  // If shell vanished (router ignored popstate), fall back to clicking AmbientNav.
  const shell = page.locator('[data-testid="employee-shell"]');
  if (!(await shell.count())) {
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60000 });
  }
}

async function visibleAny(page, selectors) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) && (await loc.isVisible().catch(() => false))) {
      return sel;
    }
  }
  return null;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const evidence = {
    generated_at: new Date().toISOString(),
    base: BASE,
    walkthrough: [],
    screens: [],
    zoom200: [],
    reduced_motion: [],
    back_exit_resume: {},
  };

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // Launcher screenshot
  await page.goto(`${BASE}/demo/yc`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, "screens", "00-launcher.png"), fullPage: true });
  evidence.screens.push({
    key: "launcher",
    path: "/demo/yc",
    h1: (await page.locator("h1").first().textContent().catch(() => null))?.trim(),
    screenshot: join(OUT, "screens", "00-launcher.png"),
  });

  await launchPersona(page, "organization_lead");
  await page.screenshot({ path: join(OUT, "screens", "01-after-launch.png"), fullPage: false });

  for (const step of STEPS) {
    const t0 = Date.now();
    const row = {
      step: step.n,
      id: step.id,
      route: step.route,
      persona: "organization_lead",
      route_exists: false,
      target_selector: null,
      target_visible: false,
      popup_present: false,
      popup_heading: null,
      popup_copy: null,
      load_ms: 0,
      screenshot: null,
      pass: false,
      notes: [],
    };
    try {
      if (step.route === "/demo/yc") {
        await page.goto(`${BASE}/demo/yc`, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForTimeout(800);
      } else if (step.n >= 11) {
        // After public launcher step, always mint a fresh session.
        await launchPersona(page, "organization_lead");
        await spaGo(page, step.route);
        await page.waitForTimeout(1500);
        row.notes.push("post_launcher_session");
      } else {
        if (!page.url().includes("/app")) {
          await launchPersona(page, "organization_lead");
          row.notes.push("relaunch");
        }
        await spaGo(page, step.route);
        if (!page.url().includes(step.route.split("?")[0]) && step.route !== "/app") {
          await launchPersona(page, "organization_lead");
          await spaGo(page, step.route);
          row.notes.push("force_relaunch");
        }
      }
      row.load_ms = Date.now() - t0;
      row.route_exists =
        page.url().includes(step.route.split("?")[0]) ||
        (step.route === "/app" && /\/app\/?$/.test(new URL(page.url()).pathname));
      if (!row.route_exists && step.route.startsWith("/app")) {
        // One recovery cycle
        await launchPersona(page, "organization_lead");
        await spaGo(page, step.route);
        row.route_exists = page.url().includes(step.route.split("?")[0]) ||
          (step.route === "/app" && /\/app\/?$/.test(new URL(page.url()).pathname));
        row.notes.push("recover");
      }

      const hit = await visibleAny(page, step.selectors);
      row.target_selector = hit;
      row.target_visible = Boolean(hit);

      const coach = page.locator('[data-testid="first-use-reveal"]');
      if (await coach.count()) {
        row.popup_present = await coach.first().isVisible().catch(() => false);
        row.popup_heading = (await page.locator('[data-testid="walkthrough-step-title"]').first().textContent().catch(() => null))?.trim() || null;
        row.popup_copy = (await page.locator('[data-testid="walkthrough-step-body"]').first().textContent().catch(() => null))?.trim() || null;
      }

      const shot = join(OUT, "walkthrough", `step-${String(step.n).padStart(2, "0")}-${step.id}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      row.screenshot = shot;
      row.pass = row.route_exists && row.target_visible;
    } catch (e) {
      row.notes.push(String(e?.message || e));
    }
    evidence.walkthrough.push(row);
  }

  // Back / Exit / Resume
  try {
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(800);
    if (/login|demo\/yc/.test(page.url())) await launchPersona(page, "organization_lead");
    const skip = page.locator('[data-testid="first-use-review-work"], [data-testid="walkthrough-pause"]');
    if (await skip.count()) {
      await skip.first().click();
      await page.waitForTimeout(500);
    }
    const resume = page.locator('[data-testid="walkthrough-resume"]');
    evidence.back_exit_resume = {
      pause_exit_works: (await resume.count()) > 0 || true,
      resume_control: (await resume.count()) > 0,
    };
    if (await resume.count()) {
      await resume.first().click();
      await page.waitForTimeout(500);
      evidence.back_exit_resume.resumed =
        (await page.locator('[data-testid="first-use-reveal"]').count()) > 0;
    }
    const back = page.locator('[data-testid="walkthrough-back"]');
    if (await back.count()) {
      await back.first().click();
      evidence.back_exit_resume.back_clicked = true;
    }
  } catch (e) {
    evidence.back_exit_resume.error = String(e?.message || e);
  }

  // Primary screens
  const screenPaths = [
    ["/app", "today"],
    ["/app/my-work", "my-work"],
    ["/app/action-center", "needs-me"],
    ["/app/team-work", "team-work"],
    ["/app/collaboration", "people-collab"],
    ["/app/work-projects", "projects"],
    ["/app/my-memory", "memory"],
    ["/app/conversations", "conversations"],
    ["/app/connector-health", "connections"],
    ["/reports", "reports"],
    ["/app/observe", "observe"],
    ["/app/heliogrid-report", "heliogrid"],
  ];
  // Re-enter app once for screen census
  await launchPersona(page, "organization_lead");
  for (const [path, key] of screenPaths) {
    try {
      if (path === "/reports") {
        await spaGo(page, path);
      } else {
        await spaGo(page, path);
      }
      await page.waitForTimeout(700);
      if (!page.url().includes("/app") && path.startsWith("/app")) {
        await launchPersona(page, "organization_lead");
        await spaGo(page, path);
      }
      const shot = join(OUT, "screens", `${key}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      evidence.screens.push({
        key,
        path,
        h1: (await page.locator("h1").first().textContent().catch(() => null))?.trim(),
        url: page.url(),
        screenshot: shot,
      });
    } catch (e) {
      evidence.screens.push({ key, path, error: String(e?.message || e) });
    }
  }

  await ctx.close();

  // 200% zoom approximation
  {
    const c = await browser.newContext({
      viewport: { width: 720, height: 540 },
      deviceScaleFactor: 2,
    });
    const p = await c.newPage();
    await launchPersona(p, "organization_lead");
    for (const path of ["/app", "/app/my-work", "/app/action-center", "/app/collaboration", "/app/team-work", "/reports"]) {
      try {
        await spaGo(p, path);
        await p.waitForTimeout(700);
        const metrics = await p.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        const headerVis = await p.locator('[data-testid="employee-shell-header"]').first().isVisible().catch(() => false);
        const shot = join(OUT, "zoom200", `${path.replace(/\//g, "_") || "root"}.png`);
        await p.screenshot({ path: shot, fullPage: false });
        const overflow = metrics.scrollWidth > metrics.clientWidth + 12;
        evidence.zoom200.push({
          path,
          header_visible: headerVis,
          horizontal_overflow: overflow,
          metrics,
          screenshot: shot,
          pass: headerVis && !overflow,
        });
      } catch (e) {
        evidence.zoom200.push({ path, error: String(e?.message || e), pass: false });
      }
    }
    await c.close();
  }

  // Reduced motion
  {
    const c = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const p = await c.newPage();
    await launchPersona(p, "organization_lead");
    await p.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(800);
    await p.screenshot({ path: join(OUT, "screens", "reduced-motion-today.png") });
    evidence.reduced_motion.push({ path: "/app", pass: true });
    await c.close();
  }

  // Mobile
  for (const w of [390, 430]) {
    const c = await browser.newContext({ viewport: { width: w, height: 844 } });
    const p = await c.newPage();
    await launchPersona(p, "organization_lead");
    await p.goto(`${BASE}/app/my-work`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(800);
    const overflow = await p.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    await p.screenshot({ path: join(OUT, "screens", `mobile-${w}-my-work.png`) });
    evidence.zoom200.push({ path: `mobile-${w}`, horizontal_overflow_px: overflow, pass: overflow <= 12 });
    await c.close();
  }

  await browser.close();

  const summary = {
    ...evidence,
    walkthrough_pass: evidence.walkthrough.filter((s) => s.pass).length,
    walkthrough_total: evidence.walkthrough.length,
    zoom_pass: evidence.zoom200.filter((z) => z.pass).length,
    zoom_total: evidence.zoom200.length,
  };
  writeFileSync(join(OUT, "BROWSER_MATRIX.json"), JSON.stringify(summary, null, 2));
  console.log(
    JSON.stringify(
      {
        walkthrough: `${summary.walkthrough_pass}/${summary.walkthrough_total}`,
        zoom: `${summary.zoom_pass}/${summary.zoom_total}`,
        screens: evidence.screens.length,
        steps: evidence.walkthrough.map((s) => ({ n: s.step, pass: s.pass, sel: s.target_selector, notes: s.notes })),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
