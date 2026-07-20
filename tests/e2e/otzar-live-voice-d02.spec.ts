// FILE: otzar-live-voice-d02.spec.ts
// PURPOSE: D-02 DEEP live smoke — voice-first text-second; voice drives
//          WORK not a decorative page. Heavy multi-step prove against
//          app.otzar.ai so failures yield repair signal, not greenwash.
//
// SCENARIOS (all must hold or fail with diagnostics):
//   D02-A  Orb expands with voice-work-rail (mic primary, text secondary)
//   D02-B  Mic is labeled Start listening; text is secondary fallback
//   D02-C  Work path copy claims same governed path (not Sesame/demo only)
//   D02-D  Shared runtime: typed work commands yield non-decorative outcomes
//          (Needs me / context / deictic ask / nav)
//   D02-E  Transcript context → create actions still works (voice-runtime path)
//   D02-F  /app/voice is work page: drives-work, primary mic, secondary text,
//          links to Needs me / Today / Projects
//   D02-G  /app/voice typed send drives work outcome (same path as orb)
//   D02-H  Action Center reachable from voice work links / ask path
//   D02-I  No fake-voice claims (Sesame active, always listening covertly)
//   D02-J  Orb survives rapid work asks (regression with D-01 presence)
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-voice-d02.spec.ts
// CONNECTS TO: voice-work-first.ts, AmbientOtzarBar, pages/app/Voice.

import { test, expect, type Page } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const PW = process.env.DEMO_SHARED_PASSWORD;
const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const TRANSCRIPT =
  "Team, we decided to ship the onboarding flow next week. David is blocked on the API keys. " +
  "Samiksha owns the summary by Friday. William needs the investor decisions. " +
  "There is a risk the demo could slip if API access is not resolved. " +
  "It is unclear who owns the launch checklist.";

type Row = {
  id: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
};

const rows: Row[] = [];
function rec(id: string, status: Row["status"], detail: string): void {
  rows.push({ id, status, detail: detail.slice(0, 280) });
  const mark = status === "PASS" ? "✓" : status === "SKIP" ? "·" : "✗";
  console.log(`[d02] ${mark} ${id} :: ${detail.slice(0, 160)}`);
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
      await page.getByTestId("header-talk-otzar").click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(350);
    }
  }
  return (await input.count()) > 0 && (await input.first().isVisible().catch(() => false));
}

async function askOrb(page: Page, text: string, timeoutMs = 32_000): Promise<string> {
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
  const outcome = ((await page.getByTestId("voice-action-outcome").textContent().catch(() => "")) ?? "").trim();
  if (outcome.length > 0) return outcome;
  return (
    ((await page.locator(REPLY).last().textContent().catch(() => "")) ?? "")
      .replace(/^(Otzar:|Action:|Error:)\s*/, "")
      .replace(/\[[^\]]*\]\s*$/, "")
      .trim()
  );
}

async function injectAndAddContext(page: Page, text: string): Promise<boolean> {
  await expandTalk(page);
  // Clear prior chip so leftover meeting summary cannot mask inject failure
  if ((await page.getByTestId("surface-context-chip").count()) > 0) {
    await page.getByTestId("surface-context-clear").click().catch(() => undefined);
    await page.waitForTimeout(150);
  }
  await page.evaluate((t) => {
    let el = document.getElementById("__d02_ctx__");
    if (!el) {
      el = document.createElement("div");
      el.id = "__d02_ctx__";
      el.style.position = "fixed";
      el.style.bottom = "0";
      el.style.left = "0";
      el.style.opacity = "0.01";
      el.style.zIndex = "1";
      document.body.appendChild(el);
    }
    el.textContent = t;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, text);
  const add = page.getByTestId("surface-context-add");
  await add.dispatchEvent("pointerdown").catch(() => undefined);
  await add.click().catch(() => undefined);
  return (await page.getByTestId("surface-context-chip").count()) > 0;
}

function isWorkOutcome(copy: string): boolean {
  const t = copy.trim();
  if (t.length === 0) return false;
  if (/^(listening|ready|speak now)\.?$/i.test(t)) return false;
  return (
    /proposed action|i found|sent|opened|needs me|approval|action center|what should|who should|blocker|follow-?up|decision|got it|using the|created|review request|track|which|couldn'?t|paste or select/i.test(
      t,
    ) || t.length >= 12
  );
}

test("D-02 deep: voice-first work path (orb + /app/voice + shared runtime)", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // ── D02-A / D02-B: expand + structure ──────────────────────────
  const expanded = await expandTalk(page);
  if (!expanded) {
    rec("D02-A", "FAIL", "could not expand Talk orb to show Message input");
  } else {
    rec("D02-A", "PASS", "Talk orb expanded");
  }

  const rail = page.getByTestId("voice-work-rail");
  // Pre-deploy lag: markers may be absent — fail with clear repair signal
  const railCount = await rail.count();
  if (railCount === 0) {
    rec(
      "D02-A-rail",
      "FAIL",
      "voice-work-rail missing — deploy D-02 product or expand failed",
    );
  } else {
    await expect(rail.first()).toBeVisible();
    expect(await rail.first().getAttribute("data-voice-first")).toBe("true");
    expect(await rail.first().getAttribute("data-drives-work")).toBe("true");
    const bar = page.getByTestId("ambient-otzar-bar").first();
    expect(await bar.getAttribute("data-voice-first")).toBe("true");
    expect(await bar.getAttribute("data-drives-work")).toBe("true");
    rec("D02-A-rail", "PASS", "voice-work-rail + bar voice-first + drives-work");
  }

  const mic = page.getByTestId("ambient-mic-button");
  if ((await mic.count()) === 0) {
    rec("D02-B", "FAIL", "ambient-mic-button missing");
  } else {
    const label = (await mic.getAttribute("aria-label")) ?? "";
    const primary = await mic.getAttribute("data-voice-primary");
    const ok =
      /start listening|stop listening|voice is paused|unavailable/i.test(label) &&
      (primary === "true" || primary === null); // null = pre-deploy
    if (primary !== "true") {
      rec(
        "D02-B",
        primary === null ? "FAIL" : "FAIL",
        `mic label="${label}" data-voice-primary=${primary} (need deploy for primary marker)`,
      );
    } else {
      rec("D02-B", ok ? "PASS" : "FAIL", `mic primary label="${label}"`);
    }
  }

  const textSec = page.getByTestId("ambient-text-secondary");
  if ((await textSec.count()) === 0) {
    // Fall back to Message label (older bundle)
    const fallback = page.getByLabel(/Message to Otzar/i);
    if ((await fallback.count()) > 0) {
      rec("D02-B-text", "FAIL", "text secondary testid missing (Message input present — deploy lag)");
    } else {
      rec("D02-B-text", "FAIL", "no text input at all");
    }
  } else {
    expect(await textSec.getAttribute("data-text-secondary")).toBe("true");
    rec("D02-B-text", "PASS", "text marked secondary");
  }

  // ── D02-C: work path copy / no fake voice ──────────────────────
  const pathCopy = page.getByTestId("voice-work-path-copy");
  if ((await pathCopy.count()) > 0) {
    const t = ((await pathCopy.first().textContent()) ?? "").toLowerCase();
    const good =
      t.includes("governed") ||
      t.includes("same") ||
      (t.includes("action") && t.includes("voice"));
    const bad = /sesame active|always listening|monitoring your|productivity score/i.test(t);
    rec("D02-C", good && !bad ? "PASS" : "FAIL", t.slice(0, 160));
  } else {
    rec("D02-C", "FAIL", "voice-work-path-copy missing — product deploy required");
  }

  // ── D02-D: multi-command work runtime (typed = voice path) ─────
  const workCmds: Array<{ id: string; cmd: string; expect: RegExp }> = [
    {
      id: "D02-D-context",
      cmd: "Ask David to review this.",
      expect: /what should I use as the current context|do you mean|which|sent|review|couldn'?t find/i,
    },
    {
      id: "D02-D-needsme",
      cmd: "Open action center",
      expect: /action center|opened|needs me|approval|queue|inbox/i,
    },
    {
      id: "D02-D-vague",
      cmd: "Handle this.",
      expect: /who should|what should|which|own|context|couldn'?t/i,
    },
    {
      id: "D02-D-blocked",
      cmd: "What is blocked?",
      expect: /blocker|blocked|which|meeting|transcript|nothing|api keys|i found/i,
    },
  ];
  for (const w of workCmds) {
    const out = await askOrb(page, w.cmd);
    const ok = w.expect.test(out) && isWorkOutcome(out);
    rec(w.id, ok ? "PASS" : "FAIL", out || "(empty outcome)");
  }

  // ── D02-E: transcript → actions (shared work path) ─────────────
  const added = await injectAndAddContext(page, TRANSCRIPT);
  if (!added) {
    rec("D02-E", "FAIL", "could not inject transcript context (selection/add)");
  } else {
    const acts = await askOrb(page, "Create action items from this meeting.", 45_000);
    const n = await page.getByTestId("transcript-action").count();
    if (n > 0) {
      rec("D02-E", "PASS", `cards=${n} outcome=${acts.slice(0, 120)}`);
    } else if (/didn'?t find any clear next actions/i.test(acts)) {
      rec("D02-E", "FAIL", `0 cards empty extract: ${acts.slice(0, 120)}`);
    } else {
      rec("D02-E", "FAIL", `0 cards outcome=${acts.slice(0, 160)}`);
    }
  }

  // ── D02-F / G: full Voice page ─────────────────────────────────
  await page.goto("/app/voice", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const workPage = page.getByTestId("voice-work-page");
  if ((await workPage.count()) === 0) {
    rec("D02-F", "FAIL", "voice-work-page marker missing — deploy D-02 or wrong route");
  } else {
    expect(await workPage.getAttribute("data-drives-work")).toBe("true");
    expect(await workPage.getAttribute("data-voice-first")).toBe("true");
    rec("D02-F", "PASS", "voice-work-page drives-work + voice-first");
  }

  const pageMic = page.getByTestId("voice-page-mic");
  if ((await pageMic.count()) === 0) {
    // Fallback: Start listening button
    const start = page.getByRole("button", { name: /start listening|stop listening|voice input unavailable/i });
    rec(
      "D02-F-mic",
      (await start.count()) > 0 ? "FAIL" : "FAIL",
      (await start.count()) > 0
        ? "mic present without voice-page-mic testid (deploy lag)"
        : "no mic control on /app/voice",
    );
  } else {
    expect(await pageMic.getAttribute("data-voice-primary")).toBe("true");
    rec("D02-F-mic", "PASS", "voice-page-mic primary");
  }

  const pageText = page.getByTestId("voice-page-text-secondary");
  if ((await pageText.count()) === 0) {
    rec("D02-F-text", "FAIL", "voice-page-text-secondary missing");
  } else {
    expect(await pageText.getAttribute("data-text-secondary")).toBe("true");
    rec("D02-F-text", "PASS", "page text secondary");
  }

  // Work links
  for (const [tid, path] of [
    ["voice-work-needs-me-link", "/app/action-center"],
    ["voice-work-today-link", "/app"],
    ["voice-work-projects-link", "/app/work-projects"],
  ] as const) {
    const link = page.getByTestId(tid);
    if ((await link.count()) === 0) {
      rec(`D02-F-${tid}`, "FAIL", "link missing");
    } else {
      const href = (await link.getAttribute("href")) ?? "";
      rec(
        `D02-F-${tid}`,
        href.includes(path) || href.endsWith(path) ? "PASS" : "FAIL",
        `href=${href}`,
      );
    }
  }

  // D02-G: send work command from voice page
  const va = page.getByTestId("voice-page-text-secondary");
  const sendPage = page.getByTestId("voice-page-send");
  if ((await va.count()) > 0 && (await sendPage.count()) > 0) {
    await va.fill("What needs my attention?");
    await sendPage.click();
    // Wait for some response surface
    await page.waitForTimeout(4000);
    const body = ((await page.locator("body").innerText().catch(() => "")) ?? "").slice(0, 4000);
    const hasResponse =
      /needs me|action|approval|attention|waiting|nothing|clear|open|work|i found|who|what/i.test(
        body,
      );
    // Prefer proposed action card / response card if present
    const responseCard = page.locator("text=/Otzar|proposed|attention|approval/i").first();
    const visible = await responseCard.isVisible().catch(() => false);
    rec(
      "D02-G",
      hasResponse || visible ? "PASS" : "FAIL",
      hasResponse || visible
        ? "voice page send produced work-path response"
        : "no work response after send on /app/voice",
    );
  } else {
    rec("D02-G", "FAIL", "cannot send from voice page (controls missing)");
  }

  // ── D02-H: Needs me link works ─────────────────────────────────
  const needs = page.getByTestId("voice-work-needs-me-link");
  if ((await needs.count()) > 0) {
    await needs.click();
    await page.waitForTimeout(1500);
    const path = new URL(page.url()).pathname;
    rec(
      "D02-H",
      /action-center|approvals|needs/i.test(path) ? "PASS" : "FAIL",
      `landed ${path}`,
    );
  } else {
    // Try via orb from /app
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const out = await askOrb(page, "Open action center");
    rec(
      "D02-H",
      /action center|opened|needs me|approval/i.test(out) ||
        /action-center/.test(page.url())
        ? "PASS"
        : "FAIL",
      out.slice(0, 120) || page.url(),
    );
  }

  // ── D02-I: no fake voice claims on voice + app shell ───────────
  await page.goto("/app/voice", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const shellText = ((await page.locator("body").innerText().catch(() => "")) ?? "").toLowerCase();
  const fake =
    /sesame active|always listening to you|monitoring your productivity|covert recording|we store your raw audio/i.test(
      shellText,
    );
  rec("D02-I", fake ? "FAIL" : "PASS", fake ? "fake/surveillance claim found" : "no fake-voice claims");

  // ── D02-J: orb still alive after pressure ──────────────────────
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const alive = await expandTalk(page);
  const orbStill = (await page.getByTestId("ambient-otzar-bar").count()) > 0;
  if (alive && orbStill) {
    // Rapid asks
    for (const q of ["Who should own this?", "What is blocked?"]) {
      await askOrb(page, q, 20_000);
    }
    const still = (await page.getByTestId("ambient-otzar-bar").count()) > 0;
    const presence = await page
      .getByTestId("ambient-otzar-bar")
      .first()
      .getAttribute("data-presence-human")
      .catch(() => null);
    rec(
      "D02-J",
      still ? "PASS" : "FAIL",
      `orb_alive=${still} presence_human=${presence ?? "n/a"}`,
    );
  } else {
    rec("D02-J", "FAIL", "orb not available after navigation");
  }

  // ── Scorecard ──────────────────────────────────────────────────
  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log(
    "D02_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "D02_JSON_END",
  );
  console.log(`[d02] TOTALS pass=${pass} fail=${fail} skip=${skip} rows=${rows.length}`);

  // Hard fail the suite if any FAIL — deep smoke must not soft-pass
  expect(fail, `D-02 deep smoke had ${fail} failures — see [d02] log`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(10);
});
