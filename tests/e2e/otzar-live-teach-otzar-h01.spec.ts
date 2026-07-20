// FILE: otzar-live-teach-otzar-h01.spec.ts
// PURPOSE: H-01 DEEP complex live — Teach Otzar work-style end-to-end
//          (admin enable → employee consent → session → signals →
//          review → approve/reject branch). Not marker tourism.
//
// DEPTH (deep-smoke-contract.ts):
//   - Drive admin policy enable on Company Profile
//   - Multi-step employee consent + start + stop + approve/reject
//   - Boundary honesty (never secrets / never new permissions)
//   - Cross-surface: admin Control Tower ↔ employee Memory
//
// SCENARIOS:
//   H01-A  Admin Company Profile shows work-style-policy-card (H-01)
//   H01-B  Drive enable (or already-enabled) professional learning
//   H01-C  Policy status reflects enabled for org
//   H01-D  Employee Memory: observation-consent-card with data-h01
//   H01-E  Consent + task label + start session (drive real work)
//   H01-F  Active session shows signals / progress
//   H01-G  Stop → review candidates (or honest empty after stop)
//   H01-H  Approve OR reject branch when candidates present
//   H01-I  Boundary copy: policy authorizes; no silent authority
//   H01-J  Employee cannot govern org policy card on company-profile
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-teach-otzar-h01.spec.ts

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
  deepRec(rows, "h01", id, status, detail);

async function waitTeachCard(page: Page): Promise<boolean> {
  try {
    await expect
      .poll(
        async () => {
          const c = page.getByTestId("observation-consent-card");
          if ((await c.count()) === 0) return "wait";
          const phase = await c.getAttribute("data-h01-phase");
          return phase && phase !== "loading" ? "ready" : "loading";
        },
        { timeout: 25_000 },
      )
      .toBe("ready");
    return true;
  } catch {
    return (await page.getByTestId("observation-consent-card").count()) > 0;
  }
}

test("H-01 deep: Teach Otzar admin enable + employee learning journey", async ({
  page,
}) => {
  test.setTimeout(DEEP_SMOKE_TIMEOUT_MS);

  // ── Admin: enable professional learning ────────────────────────
  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/setup/company-profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const policyCard = page.getByTestId("work-style-policy-card");
  try {
    await expect
      .poll(async () => ((await policyCard.count()) > 0 ? "y" : "n"), {
        timeout: 20_000,
      })
      .toBe("y");
  } catch {
    /* deploy pending */
  }

  rec(
    "H01-A",
    (await policyCard.count()) > 0 &&
      (await policyCard.getAttribute("data-h01-admin")) === "true"
      ? "PASS"
      : "FAIL",
    (await policyCard.count()) > 0
      ? "work-style-policy-card"
      : "missing — deploy H-01 policy card",
  );

  if ((await policyCard.count()) === 0) {
    for (const id of [
      "H01-B",
      "H01-C",
      "H01-D",
      "H01-E",
      "H01-F",
      "H01-G",
      "H01-H",
      "H01-I",
      "H01-J",
    ]) {
      rec(id, "FAIL", "no admin policy card");
    }
    const t = deepTotals(rows);
    console.log(JSON.stringify({ h01: t, rows }, null, 2));
    expect(t.fail, "H-01 deep requires policy card").toBe(0);
    return;
  }

  // Wait status out of loading
  try {
    await expect
      .poll(
        async () => {
          const en = await policyCard.getAttribute("data-policy-enabled");
          return en === "true" || en === "false" ? en : "wait";
        },
        { timeout: 15_000 },
      )
      .not.toBe("wait");
  } catch {
    /* */
  }

  let enabledAttr = (await policyCard.getAttribute("data-policy-enabled")) ?? "";
  if (enabledAttr !== "true") {
    const enableBtn = page.getByTestId("work-style-policy-enable");
    if ((await enableBtn.count()) > 0 && (await enableBtn.isEnabled())) {
      await enableBtn.click();
      await page.waitForTimeout(2500);
    }
    enabledAttr = (await policyCard.getAttribute("data-policy-enabled")) ?? "";
    const notice = (
      (await page.getByTestId("work-style-policy-notice").textContent().catch(() => "")) ??
      ""
    ).toLowerCase();
    rec(
      "H01-B",
      enabledAttr === "true" || /enabled|learning is on/i.test(notice)
        ? "PASS"
        : "FAIL",
      `after enable data-policy-enabled=${enabledAttr} notice=${notice.slice(0, 80)}`,
    );
  } else {
    rec("H01-B", "PASS", "already enabled — no toggle needed");
  }

  const statusText = (
    (await page.getByTestId("work-style-policy-status").textContent().catch(() => "")) ??
    ""
  ).toLowerCase();
  rec(
    "H01-C",
    enabledAttr === "true" || /enabled for this organization/i.test(statusText)
      ? "PASS"
      : "FAIL",
    `enabled=${enabledAttr} status=${statusText.slice(0, 60)}`,
  );

  // ── Employee: consent → session → stop → review ────────────────
  await liveUiLogin(page, EMPLOYEE, PW as string);
  await page.goto("/app/my-memory", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const cardReady = await waitTeachCard(page);
  const teach = page.getByTestId("observation-consent-card");

  rec(
    "H01-D",
    cardReady &&
      (await teach.count()) > 0 &&
      (await teach.getAttribute("data-h01")) === "true"
      ? "PASS"
      : "FAIL",
    cardReady
      ? `phase=${(await teach.getAttribute("data-h01-phase")) ?? ""}`
      : "teach card missing",
  );

  if ((await teach.count()) === 0) {
    for (const id of ["H01-E", "H01-F", "H01-G", "H01-H", "H01-I", "H01-J"]) {
      rec(id, "FAIL", "no teach card");
    }
  } else {
    let phase = (await teach.getAttribute("data-h01-phase")) ?? "";
    const orgOn = (await teach.getAttribute("data-org-policy-enabled")) === "true";

    // If mid-session from prior run, stop first
    if (phase === "active") {
      const stop = page.getByTestId("observation-stop");
      if ((await stop.count()) > 0) {
        await stop.click();
        await page.waitForTimeout(3000);
      }
      phase = (await teach.getAttribute("data-h01-phase")) ?? phase;
    }

    // If in review with pending, handle approve/reject later
    if (phase === "org_disabled" || !orgOn) {
      rec(
        "H01-E",
        "FAIL",
        "org policy still disabled for employee — enable did not stick",
      );
      rec("H01-F", "SKIP", "no session");
      rec("H01-G", "SKIP", "no session");
      rec("H01-H", "SKIP", "no session");
    } else {
      // Return to idle if needed
      if (phase === "review" || phase === "complete") {
        const done = page.getByTestId("observation-review-done");
        if ((await done.count()) > 0) {
          await done.click();
          await page.waitForTimeout(800);
        }
        // Reject leftover candidates so we can start clean, or proceed from idle
        const leftover = page.getByTestId("work-style-reject");
        while ((await leftover.count()) > 0) {
          await leftover.first().click();
          await page.waitForTimeout(800);
        }
        const done2 = page.getByTestId("observation-review-done");
        if ((await done2.count()) > 0) {
          await done2.click();
          await page.waitForTimeout(500);
        }
      }

      phase = (await teach.getAttribute("data-h01-phase")) ?? "";
      // If still review after rejects, that's ok — we can still prove branch on H01-H
      if (
        phase === "idle" ||
        (await page.getByTestId("observation-idle").count()) > 0
      ) {
        const task = page.getByTestId("work-style-task-label");
        if ((await task.count()) > 0) {
          await task.fill("H-01 deep smoke brief");
        }
        const box = page.getByTestId("observation-consent-checkbox");
        if ((await box.count()) > 0 && !(await box.isChecked())) {
          await box.check();
        }
        const start = page.getByTestId("observation-start");
        await expect(start).toBeEnabled({ timeout: 10_000 });
        await start.click();
        await page.waitForTimeout(4000);

        phase = (await teach.getAttribute("data-h01-phase")) ?? "";
        rec(
          "H01-E",
          phase === "active" ||
            (await page.getByTestId("observation-active").count()) > 0
            ? "PASS"
            : "FAIL",
          `after start phase=${phase}`,
        );
      } else if (phase === "active") {
        rec("H01-E", "PASS", "session already active after prior start");
      } else if (phase === "review") {
        rec(
          "H01-E",
          "PASS",
          "landed in review with candidates — prior session completed",
        );
      } else {
        rec("H01-E", "FAIL", `unexpected phase after setup: ${phase}`);
      }

      phase = (await teach.getAttribute("data-h01-phase")) ?? "";
      if (phase === "active") {
        const indicator = page.getByTestId("observation-active-indicator");
        const indText = (
          (await indicator.textContent().catch(() => "")) ?? ""
        ).toLowerCase();
        const progress = (
          (await page.getByTestId("teach-journey-progress").textContent().catch(() => "")) ??
          ""
        ).toLowerCase();
        rec(
          "H01-F",
          /signal|active|learning/i.test(indText + progress) ? "PASS" : "FAIL",
          `indicator=${indText.slice(0, 60)} progress=${progress.slice(0, 40)}`,
        );

        const stop = page.getByTestId("observation-stop");
        await stop.click();
        await page.waitForTimeout(4000);
        phase = (await teach.getAttribute("data-h01-phase")) ?? "";
      } else if (phase === "review" || phase === "complete") {
        rec("H01-F", "PASS", "session already past active (signals captured earlier)");
      } else {
        rec("H01-F", "FAIL", `not active/review after start: ${phase}`);
      }

      phase = (await teach.getAttribute("data-h01-phase")) ?? "";
      const reviewUi = page.getByTestId("observation-review");
      const candList = page.getByTestId("work-style-candidate");
      const nCand = await candList.count();
      rec(
        "H01-G",
        phase === "review" ||
          phase === "complete" ||
          (await reviewUi.count()) > 0 ||
          nCand > 0
          ? "PASS"
          : "FAIL",
        `phase=${phase} candidates=${nCand}`,
      );

      if (nCand > 0) {
        // Branch: reject one if multiple, else approve (non-destructive preference)
        const rejectBtn = page.getByTestId("work-style-reject").first();
        const approveBtn = page.getByTestId("work-style-approve").first();
        if (nCand >= 2 && (await rejectBtn.count()) > 0) {
          await rejectBtn.click();
          await page.waitForTimeout(1500);
          rec(
            "H01-H",
            "PASS",
            `reject branch; remaining=${await candList.count()}`,
          );
        } else if ((await approveBtn.count()) > 0) {
          await approveBtn.click();
          await page.waitForTimeout(2000);
          const approved = page.getByTestId("work-style-approved");
          const afterCand = await candList.count();
          const approvedCount =
            (await teach.getAttribute("data-approved-preferences")) ?? "0";
          const ok =
            (await approved.count()) > 0 ||
            afterCand < nCand ||
            approvedCount !== "0";
          rec(
            "H01-H",
            ok ? "PASS" : "FAIL",
            `approve branch; candidates now=${afterCand} approvedAttr=${approvedCount}`,
          );
        } else {
          rec("H01-H", "FAIL", "candidates present but no approve/reject controls");
        }
      } else {
        // Honest empty after stop is allowed if generation produced none —
        // still prove reject/approve path is not silently auto-applied
        const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
        rec(
          "H01-H",
          /no pending|start another|approved preferences|what otzar noticed/i.test(
            body,
          )
            ? "PASS"
            : "SKIP",
          "no candidates to branch — honest empty review",
        );
      }
    }

    const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
    const boundary = page.getByTestId("observation-status-note");
    const bText = (
      (await boundary.textContent().catch(() => "")) ?? body
    ).toLowerCase();
    rec(
      "H01-I",
      /preference proposes|policy authorizes|never|permission|confidential|portable/i.test(
        bText,
      ) && !/applied without approval|auto-granted permission/i.test(body)
        ? "PASS"
        : "FAIL",
      bText.slice(0, 120),
    );

    // Employee isolation: company profile policy card is admin surface
    await page.goto("/setup/company-profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const empPolicy = page.getByTestId("work-style-policy-card");
    const empUrl = page.url();
    const empBody = ((await page.locator("body").innerText()) ?? "").toLowerCase();
    const blocked =
      (await empPolicy.count()) === 0 ||
      /not authorized|access denied|don't have|sign in|control tower|permission/i.test(
        empBody,
      ) ||
      !/setup\/company-profile/.test(empUrl);
    // Admin-only page: employee either redirected, denied, or lacks enable control working
    const enableOnEmp = page.getByTestId("work-style-policy-enable");
    const canGovern =
      (await empPolicy.count()) > 0 &&
      (await enableOnEmp.count()) > 0 &&
      (await enableOnEmp.isEnabled().catch(() => false));
    rec(
      "H01-J",
      blocked || !canGovern ? "PASS" : "FAIL",
      canGovern
        ? "employee can enable org policy — isolation leak"
        : `blocked=${blocked} url=${empUrl.slice(-40)}`,
    );
  }

  const t = deepTotals(rows);
  console.log(JSON.stringify({ h01: t, rows }, null, 2));
  expect(t.fail, `H-01 deep fails: ${JSON.stringify(rows.filter((r) => r.status === "FAIL"))}`).toBe(
    0,
  );
  expect(t.pass, "H-01 deep min pass").toBeGreaterThanOrEqual(DEEP_SMOKE_MIN_PASS);
});
