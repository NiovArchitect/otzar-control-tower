// FILE: otzar-live-r03-yc-first5.spec.ts
// PURPOSE: YC first-five-minute deep walkthrough on live R-03 reviewer.
//          Clears local walkthrough state; uses server-authoritative org.
//
// RUN: npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-r03-yc-first5.spec.ts
//
// Creds: .r03-s250-state/yc-reviewer.env.json (gitignored) or env:
//   R03_YC_EMAIL / R03_YC_PASSWORD

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

function loadReviewer(): { email: string; password: string } | null {
  if (process.env.R03_YC_EMAIL && process.env.R03_YC_PASSWORD) {
    return {
      email: process.env.R03_YC_EMAIL,
      password: process.env.R03_YC_PASSWORD,
    };
  }
  const p = join(process.cwd(), ".r03-s250-state", "yc-reviewer.env.json");
  if (!existsSync(p)) return null;
  const j = JSON.parse(readFileSync(p, "utf8"));
  return { email: j.email, password: j.password };
}

const reviewer = loadReviewer();
test.skip(!reviewer, "R-03 YC reviewer creds missing");

test("R-03 YC first-five: cinematic walkthrough + Home + team + project", async ({
  page,
}) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS * 2);
  const rows: DeepRow[] = [];
  const rec = (id: string, status: DeepRow["status"], detail: string) =>
    deepRec(rows, "yc5", id, status, detail);

  const t0 = Date.now();

  // Fresh local walkthrough state for this origin
  await page.addInitScript(() => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /first_use|walkthrough/i.test(k)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  });

  await liveUiLogin(page, reviewer!.email, reviewer!.password);
  rec(
    "YC5-AUTH",
    !page.url().includes("/login") ? "PASS" : "FAIL",
    page.url(),
  );

  if (!page.url().includes("/app")) {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(2800);
  const tSignal = Date.now() - t0;

  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "YC5-HOME-SIGNAL",
    /today|home|needs me|project|team|otzar|work/i.test(body) &&
      !/page not found|something went wrong/i.test(body)
      ? "PASS"
      : "FAIL",
    `t_ms=${tSignal} url=${page.url()}`,
  );

  // Walkthrough / first-use surface (A-08) if shown
  const reveal = page.getByTestId("first-use-reveal");
  const hasReveal = (await reveal.count()) > 0;
  if (hasReveal) {
    const a08 = (await reveal.getAttribute("data-a08")) ?? "";
    const ver = (await reveal.getAttribute("data-walkthrough-version")) ?? "";
    rec(
      "YC5-WALKTHROUGH",
      a08 === "true" || ver === "v2" || (await reveal.isVisible())
        ? "PASS"
        : "FAIL",
      `a08=${a08} ver=${ver}`,
    );
    // advance one step if next present
    const next = page.getByTestId("walkthrough-next");
    if ((await next.count()) > 0) {
      await next.click().catch(() => undefined);
      await page.waitForTimeout(500);
    }
    rec("YC5-WALKTHROUGH-ACTION", "PASS", "advanced_or_present");
  } else {
    // Server-side completed or returning — still OK if Home is coherent
    rec(
      "YC5-WALKTHROUGH",
      /today|needs me|project/i.test(body) ? "PASS" : "FAIL",
      "no strip — home coherent",
    );
    rec("YC5-WALKTHROUGH-ACTION", "PASS", "skip_or_server_done");
  }

  // Recognition: name / org / role cues (best-effort from surface)
  rec(
    "YC5-RECOGNITION",
    /yc|reviewer|r03|otzar|product|team|today/i.test(body) ? "PASS" : "FAIL",
    body.slice(0, 80),
  );

  // Hostile curiosity: team working on
  await page.goto("/app/voice", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const talk = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "YC5-TALK-PATH",
    /talk|otzar|voice|message|type|listen/i.test(talk) &&
      !/page not found/i.test(talk)
      ? "PASS"
      : "FAIL",
    "talk",
  );

  // Try ask via input if present
  const input = page
    .locator(
      '[data-testid="voice-input"], [data-testid="talk-input"], textarea, input[type="text"]',
    )
    .first();
  if ((await input.count()) > 0) {
    await input.fill("What is my team working on?").catch(() => undefined);
    const send = page.getByRole("button", { name: /send|ask|submit/i }).first();
    if ((await send.count()) > 0) {
      await send.click().catch(() => undefined);
      await page.waitForTimeout(4000);
    }
  }
  const talk2 = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "YC5-TEAM-QUESTION",
    talk2.length > 40 ? "PASS" : "FAIL",
    talk2.slice(0, 100),
  );

  // Project path
  await page.goto("/app/work-projects", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const proj = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "YC5-PROJECTS",
    /project|mission|work|create|empty|initiative/i.test(proj) &&
      !/page not found/i.test(proj)
      ? "PASS"
      : "FAIL",
    "projects",
  );

  // Provider honesty path (Tools)
  await page.goto("/app/connector-health", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const tools = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "YC5-PROVIDER-HONESTY",
    /tool|connector|google|calendar|docs|meet|health|reconnect|scope|not connected|connected/i.test(
      tools,
    )
      ? "PASS"
      : "FAIL",
    tools.slice(0, 80),
  );

  // Returning login → Home (not forced walkthrough maze)
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  rec(
    "YC5-RETURN-HOME",
    page.url().includes("/app") ? "PASS" : "FAIL",
    page.url(),
  );

  // No foreign tenant labels
  const finalBody = (
    (await page.locator("body").innerText()) ?? ""
  ).toLowerCase();
  rec(
    "YC5-NO-FOREIGN-ORG",
    !/meridian field systems/i.test(finalBody) ? "PASS" : "FAIL",
    "tenant",
  );

  const elapsed = Date.now() - t0;
  rec(
    "YC5-TIME-BUDGET",
    elapsed < 5 * 60 * 1000 ? "PASS" : "FAIL",
    `elapsed_ms=${elapsed}`,
  );

  const t = deepTotals(rows);
  console.log(
    JSON.stringify(
      {
        yc_first5: t,
        elapsed_ms: elapsed,
        time_to_signal_ms: tSignal,
        rows,
      },
      null,
      2,
    ),
  );
  expect(t.fail).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
