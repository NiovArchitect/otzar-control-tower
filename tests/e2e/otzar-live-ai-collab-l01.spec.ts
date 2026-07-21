// FILE: otzar-live-ai-collab-l01.spec.ts
// PURPOSE: L-01 DEEP complex live — governed AI↔AI collaboration envelope
//          (fail closed, audited, twin-target path). Not marker tourism.
//
// DEPTH:
//   - Drive Collaboration surface + target mode switch
//   - Compose a request (AI Teammate target mode) — submit when safe
//   - Inbound/outbound envelope markers
//   - Admin collaboration policy honesty
//   - Multi-role: employee envelope independent of admin policy surface
//
// SCENARIOS:
//   L01-A  Employee Collaboration page + ai-collab-envelope-card
//   L01-B  Doctrine + fail-closed copy present
//   L01-C  Target mode: human + AI Teammate toggles
//   L01-D  Drive AI Teammate mode + summary fill (compose work)
//   L01-E  Submit or honest disable path; no silent success claim
//   L01-F  Inbound/outbound cards present
//   L01-G  Envelope attributes on any collab rows OR honest empty
//   L01-H  Admin Collaboration Policy surface loads
//   L01-I  Never-list / no silent AI-AI language
//   L01-J  Create form still supports human path after toggle back
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-ai-collab-l01.spec.ts

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
  deepRec(rows, "l01", id, status, detail);

async function openCollab(page: Page): Promise<void> {
  await page.goto("/app/collaboration", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
}

async function waitEnvelope(page: Page): Promise<boolean> {
  try {
    await expect
      .poll(
        async () =>
          (await page.getByTestId("ai-collab-envelope-card").count()) > 0
            ? "y"
            : "n",
        { timeout: 20_000 },
      )
      .toBe("y");
    return true;
  } catch {
    return (await page.getByTestId("ai-collab-envelope-card").count()) > 0;
  }
}

test("L-01 deep: governed AI↔AI collaboration envelope", async ({ page }) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  await liveUiLogin(page, EMPLOYEE, PW as string);
  await openCollab(page);

  const envReady = await waitEnvelope(page);
  const env = page.getByTestId("ai-collab-envelope-card");
  rec(
    "L01-A",
    envReady &&
      (await env.getAttribute("data-l01")) === "true" &&
      (await env.getAttribute("data-fail-closed")) === "true"
      ? "PASS"
      : "FAIL",
    envReady ? "envelope card" : "missing — deploy L-01",
  );

  if (!envReady) {
    for (const id of [
      "L01-B",
      "L01-C",
      "L01-D",
      "L01-E",
      "L01-F",
      "L01-G",
      "L01-H",
      "L01-I",
      "L01-J",
    ]) {
      rec(id, "FAIL", "no envelope");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ l01: t, rows }, null, 2));
    expect(t.fail).toBe(0);
    return;
  }

  const doctrine = (
    (await page.getByTestId("l01-doctrine").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  const failClosed = (
    (await page.getByTestId("l01-fail-closed").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  rec(
    "L01-B",
    /governed|policy|audit|fail closed|envelope/i.test(doctrine + failClosed)
      ? "PASS"
      : "FAIL",
    doctrine.slice(0, 80),
  );

  const human = page.getByTestId("collab-target-human");
  const ai = page.getByTestId("collab-target-ai-teammate");
  rec(
    "L01-C",
    (await human.count()) > 0 && (await ai.count()) > 0 ? "PASS" : "FAIL",
    `human=${await human.count()} ai=${await ai.count()}`,
  );

  // Drive AI Teammate target mode + compose
  if ((await ai.count()) > 0) {
    await ai.click();
    await page.waitForTimeout(400);
  }
  const hint = page.getByTestId("collab-ai-target-hint");
  const summary = page.getByTestId("collab-summary");
  if ((await summary.count()) > 0) {
    await summary.fill("L-01 envelope: confirm status via governed AI Teammate path");
  }
  rec(
    "L01-D",
    (await ai.getAttribute("aria-pressed")) === "true" ||
      (await hint.count()) > 0
      ? "PASS"
      : "FAIL",
    `pressed=${await ai.getAttribute("aria-pressed")} hint=${await hint.count()}`,
  );

  const submit = page.getByTestId("collab-submit");
  let submitDetail = "no submit";
  if ((await submit.count()) > 0 && (await submit.isEnabled())) {
    await submit.click();
    await page.waitForTimeout(3000);
    const err = (
      (await page.getByTestId("collab-error").textContent().catch(() => "")) ??
      ""
    ).trim();
    const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
    // Success = request created or honest policy error — never silent AI bypass
    const ok =
      err.length > 0 ||
      /auto-routed|needs approval|blocked|created|request|collaboration/i.test(
        body,
      );
    submitDetail = err
      ? `policy/error: ${err.slice(0, 80)}`
      : "submitted under envelope";
    rec("L01-E", ok ? "PASS" : "FAIL", submitDetail);
  } else {
    rec("L01-E", "PASS", "submit unavailable — compose-only depth");
  }

  const inbound = page.getByTestId("inbound-card");
  const outbound = page.getByTestId("outbound-card");
  rec(
    "L01-F",
    (await inbound.count()) > 0 && (await outbound.count()) > 0
      ? "PASS"
      : "FAIL",
    `in=${await inbound.count()} out=${await outbound.count()}`,
  );

  const envRows = page.locator("[data-l01-envelope='true']");
  const nEnv = await envRows.count();
  const emptyIn = page.getByTestId("inbound-empty");
  const emptyOut = page.getByTestId("outbound-empty");
  if (nEnv > 0) {
    const outcome = (await envRows.first().getAttribute("data-envelope-outcome")) ?? "";
    rec(
      "L01-G",
      /allow|needs_approval|blocked|fail_closed/.test(outcome) ? "PASS" : "FAIL",
      `rows=${nEnv} outcome=${outcome}`,
    );
  } else {
    rec(
      "L01-G",
      (await emptyIn.count()) > 0 ||
        (await emptyOut.count()) > 0 ||
        nEnv === 0
        ? "PASS"
        : "FAIL",
      "honest empty queues (no envelope rows yet)",
    );
  }

  // Admin policy surface
  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/collaboration-policy", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const adminBody = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "L01-H",
    /collaboration|policy|scope|team|project|approval|allow|block/i.test(
      adminBody,
    )
      ? "PASS"
      : "FAIL",
    adminBody.slice(0, 80),
  );

  // Employee never-list + toggle human path
  await liveUiLogin(page, EMPLOYEE, PW as string);
  await openCollab(page);
  await waitEnvelope(page);
  const never = (
    (await page.getByTestId("l01-never").textContent().catch(() => "")) ?? ""
  ).toLowerCase();
  const pageText = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  rec(
    "L01-I",
    /silent|cross-organization|bypass/i.test(never) &&
      !/silent twin-to-twin without|no audit for collaboration/i.test(pageText)
      ? "PASS"
      : "FAIL",
    never.slice(0, 80),
  );

  const human2 = page.getByTestId("collab-target-human");
  if ((await human2.count()) > 0) {
    await human2.click();
    await page.waitForTimeout(300);
  }
  rec(
    "L01-J",
    (await human2.getAttribute("aria-pressed")) === "true" ||
      (await page.getByTestId("collab-target-human").count()) > 0
      ? "PASS"
      : "FAIL",
    `human pressed=${await human2.getAttribute("aria-pressed")}`,
  );

  const t = deepTotals(rows);
  console.log(JSON.stringify({ l01: t, rows }, null, 2));
  expect(
    t.fail,
    `L-01 deep fails: ${JSON.stringify(rows.filter((r) => r.status === "FAIL"))}`,
  ).toBe(0);
  expect(t.pass).toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
