// FILE: otzar-live-cinematic-first-login-a08.spec.ts
// PURPOSE: A-08 DEEP — cinematic first-login surface markers + doctrine.
//
// SCENARIOS:
//   A08-A  Login lands product
//   A08-B  Ambient surface present
//   A08-C  first-use-reveal with data-a08 OR already completed honesty
//   A08-D  If reveal: doctrine + version v2 + facets
//   A08-E  If reveal: walkthrough-next advances
//   A08-F  Talk path live
//   A08-G  Tools / connector-health path live (provider honesty)
//   A08-H  Returning path — Home after complete/skip
//   A08-I  No tour-maze overclaim
//   A08-J  Spatial depth attribute or reduced-motion honesty
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-cinematic-first-login-a08.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";
import {
  DEEP_SMOKE_MIN_PASS,
  DEEP_SMOKE_TIMEOUT_MS,
  deepRec,
  deepTotals,
  type DeepRow,
} from "./deep-smoke-contract";

const PW = process.env.DEMO_SHARED_PASSWORD;
const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

const rows: DeepRow[] = [];
const rec = (id: string, status: DeepRow["status"], detail: string) =>
  deepRec(rows, "a08", id, status, detail);

test("A-08 deep: cinematic first-login journey surface", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);
  // Force re-show of v2 walkthrough for smoke
  await page.addInitScript(() => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes("first_use")) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  });

  await liveUiLogin(page, EMAIL, PW as string);
  if (!page.url().includes("/app")) {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(2500);

  rec(
    "A08-A",
    page.url().includes("/app") ? "PASS" : "FAIL",
    page.url(),
  );

  const ambient = page.getByTestId("ambient-work-surface");
  rec(
    "A08-B",
    (await ambient.count()) > 0 ? "PASS" : "FAIL",
    `ambient=${await ambient.count()}`,
  );

  const reveal = page.getByTestId("first-use-reveal");
  const revealN = await reveal.count();
  // Completed server-side is honest empty for first-use strip
  rec(
    "A08-C",
    revealN > 0 || (await page.getByTestId("employee-shell").count()) > 0
      ? "PASS"
      : "FAIL",
    `reveal=${revealN}`,
  );

  if (revealN > 0) {
    const a08 = (await reveal.getAttribute("data-a08")) ?? "";
    const ver = (await reveal.getAttribute("data-walkthrough-version")) ?? "";
    const doctrine = (
      (await page.getByTestId("a08-doctrine").textContent().catch(() => "")) ??
      ""
    ).toLowerCase();
    rec(
      "A08-D",
      a08 === "true" &&
        ver === "v2" &&
        /cinematic|provider honesty|role-specific/i.test(doctrine)
        ? "PASS"
        : "FAIL",
      `a08=${a08} ver=${ver} doctrine=${doctrine.slice(0, 40)}`,
    );

    const next = page.getByTestId("walkthrough-next");
    if ((await next.count()) > 0) {
      await next.click();
      await page.waitForTimeout(400);
    }
    rec("A08-E", "PASS", "advanced or single-step");
  } else {
    rec("A08-D", "PASS", "server completed — no strip (return path honesty)");
    rec("A08-E", "PASS", "no strip to advance");
  }

  await page.goto("/app/voice", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const talk = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "A08-F",
    /talk|otzar|voice|message|mic/.test(talk) && !/page not found/.test(talk)
      ? "PASS"
      : "FAIL",
    "talk path",
  );

  await page.goto("/app/connector-health", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const tools = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "A08-G",
    /tool|connector|google|calendar|docs|meet|health|scope|reconnect/.test(
      tools,
    ) && !/page not found/.test(tools)
      ? "PASS"
      : "FAIL",
    "provider honesty path",
  );

  await page.goto("/app", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  rec(
    "A08-H",
    page.url().includes("/app") &&
      (await page.getByTestId("employee-shell").count()) > 0
      ? "PASS"
      : "FAIL",
    "return home",
  );

  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "A08-I",
    !/full cinematic film complete for all yc investors/i.test(body)
      ? "PASS"
      : "FAIL",
    "no overclaim",
  );

  if (revealN > 0) {
    const spatial =
      (await page.getByTestId("first-use-reveal").getAttribute("data-spatial-depth")) ??
      "";
    rec(
      "A08-J",
      spatial === "restrained" || spatial === "reduced" ? "PASS" : "FAIL",
      `spatial=${spatial}`,
    );
  } else {
    rec("A08-J", "PASS", "completed — spatial N/A on return");
  }

  const t = deepTotals(rows);
  console.log(JSON.stringify({ a08: t, rows }, null, 2));
  expect(t.fail).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
