// FILE: otzar-live-tools-o02.spec.ts
// PURPOSE: O-02 DEEP live smoke — org/team/user connection coverage,
//          enterprise admin consent, SCIM/group honesty (never false-provisioned).
//
// SCENARIOS:
//   O02-A  Admin /tools-connections loads inventory
//   O02-B  Coverage panel present with org/team/user scope badges
//   O02-C  data-coverage-health + scope counts on panel
//   O02-D  Enterprise admin consent line present
//   O02-E  SCIM status is honest not_wired (or explicit state) — never false live
//   O02-F  No false SCIM-provisioned claims on page
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-tools-o02.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const PW = process.env.DEMO_SHARED_PASSWORD;
const ADMIN = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

type Row = { id: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };
const rows: Row[] = [];
function rec(id: string, status: Row["status"], detail: string): void {
  rows.push({ id, status, detail: detail.slice(0, 280) });
  console.log(
    `[o02] ${status === "PASS" ? "✓" : status === "SKIP" ? "·" : "✗"} ${id} :: ${detail.slice(0, 160)}`,
  );
}

test("O-02 deep: org/team/user coverage + SCIM honesty", async ({ page }) => {
  test.setTimeout(240_000);
  await liveUiLogin(page, ADMIN, PW as string);
  await page.goto("/tools-connections", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const root = page.getByTestId("tools-connections-page");
  if ((await root.count()) === 0) {
    rec("O02-A", "FAIL", "tools-connections-page missing");
    expect(false, "tools page").toBe(true);
    return;
  }
  rec("O02-A", "PASS", "tools-connections page");

  // Prefer inventory tab if not default
  const invTab = page.getByTestId("tab-tools-inventory");
  if ((await invTab.count()) > 0) {
    await invTab.click().catch(() => undefined);
    await page.waitForTimeout(800);
  }

  // Wait for coverage panel (or inventory loaded)
  try {
    await expect
      .poll(
        async () => {
          if ((await page.getByTestId("tools-coverage-panel").count()) > 0)
            return "panel";
          if ((await page.getByTestId("tools-inventory-panel").count()) > 0)
            return "inv";
          if ((await page.getByTestId("tools-inventory-error").count()) > 0)
            return "err";
          return "wait";
        },
        { timeout: 25_000 },
      )
      .not.toBe("wait");
  } catch {
    /* fall through */
  }

  const panel = page.getByTestId("tools-coverage-panel");
  if ((await panel.count()) === 0) {
    const inv = page.getByTestId("tools-inventory-panel");
    const err = page.getByTestId("tools-inventory-error");
    if ((await err.count()) > 0) {
      rec("O02-B", "FAIL", "inventory error — coverage panel not rendered");
    } else if ((await inv.count()) > 0) {
      rec(
        "O02-B",
        "FAIL",
        "inventory loaded but tools-coverage-panel missing — deploy O-02",
      );
    } else {
      rec("O02-B", "FAIL", "no inventory / coverage panel");
    }
    // Still check rest as FAIL/SKIP
    rec("O02-C", "FAIL", "no panel");
    rec("O02-D", "FAIL", "no panel");
    rec("O02-E", "FAIL", "no panel");
  } else {
    const org = page.getByTestId("tools-scope-org");
    const team = page.getByTestId("tools-scope-team");
    const user = page.getByTestId("tools-scope-user");
    const hasScopes =
      (await org.count()) > 0 &&
      (await team.count()) > 0 &&
      (await user.count()) > 0;
    rec(
      "O02-B",
      hasScopes ? "PASS" : "FAIL",
      hasScopes
        ? "org/team/user badges"
        : `org=${await org.count()} team=${await team.count()} user=${await user.count()}`,
    );

    const health = (await panel.getAttribute("data-coverage-health")) ?? "";
    const orgN = (await panel.getAttribute("data-org-count")) ?? "";
    const teamN = (await panel.getAttribute("data-team-count")) ?? "";
    const userN = (await panel.getAttribute("data-user-count")) ?? "";
    const healthOk = /^(empty|partial|healthy|blocked)$/.test(health);
    rec(
      "O02-C",
      healthOk ? "PASS" : "FAIL",
      `health=${health} org=${orgN} team=${teamN} user=${userN}`,
    );

    const consent = page.getByTestId("tools-admin-consent");
    const consentText = ((await consent.textContent().catch(() => "")) ?? "").toLowerCase();
    const consentState =
      (await consent.getAttribute("data-consent-state").catch(() => "")) ?? "";
    rec(
      "O02-D",
      (await consent.count()) > 0 && /consent|oauth|enterprise|verified|pending|connect/i.test(consentText)
        ? "PASS"
        : "FAIL",
      `state=${consentState} ${consentText.slice(0, 100)}`,
    );

    const scim = page.getByTestId("tools-scim-status");
    const scimState =
      (await scim.getAttribute("data-scim-state").catch(() => "")) ??
      (await panel.getAttribute("data-scim-state")) ??
      "";
    const scimText = ((await scim.textContent().catch(() => "")) ?? "").toLowerCase();
    const scimHonest =
      scimState === "not_wired" ||
      /not wired|not automatic|configured|syncing|healthy|failed/i.test(scimText);
    const scimFalse =
      /\b(scim (is )?(live|active|connected|provisioned)|groups? fully synced via scim|domain[- ]wide provisioned)\b/i.test(
        scimText,
      ) && !/not (wired|provisioned|configured)/i.test(scimText);
    rec(
      "O02-E",
      scimHonest && !scimFalse ? "PASS" : "FAIL",
      `scim=${scimState} false=${scimFalse} ${scimText.slice(0, 100)}`,
    );
  }

  const body = ((await page.locator("body").innerText()) ?? "").toLowerCase();
  const pageFalse =
    /\b(scim (is )?(live|active|connected|provisioned)|domain[- ]wide (fully )?provisioned|groups? fully synced via scim)\b/i.test(
      body,
    ) && !/not wired|not (yet )?(provisioned|configured)/i.test(body);
  rec(
    "O02-F",
    !pageFalse ? "PASS" : "FAIL",
    pageFalse ? "false SCIM provisioned claim on page" : "no false SCIM claims",
  );

  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log(
    "O02_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "O02_JSON_END",
  );
  console.log(`[o02] TOTALS pass=${pass} fail=${fail} skip=${skip} rows=${rows.length}`);

  expect(fail, `O-02 deep smoke had ${fail} failures`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(3);
});
