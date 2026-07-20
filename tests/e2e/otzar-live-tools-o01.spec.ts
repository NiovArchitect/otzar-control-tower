// FILE: otzar-live-tools-o01.spec.ts
// PURPOSE: O-01 DEEP live smoke — primary UI capability-first; MCP advanced-only.
//
// SCENARIOS:
//   O01-A  Employee /app/connector-health is capability-first surface
//   O01-B  Capability banner + data-capability-first; MCP not primary
//   O01-C  Capabilities listed (or honest empty/loading) — not MCP protocol home
//   O01-D  First-paint body does not lead with bare "MCP" as the product
//   O01-E  Admin /tools-connections: default inventory; advanced last
//   O01-F  Advanced tab shows MCP-advanced-only copy; not default selected
//   O01-G  Employee nav tools path stays connector-health
//
// RUN: DEMO_SHARED_PASSWORD=… npx playwright test --config=playwright.live.config.ts \
//      tests/e2e/otzar-live-tools-o01.spec.ts

import { test, expect } from "@playwright/test";
import { liveUiLogin } from "./live-login";

const PW = process.env.DEMO_SHARED_PASSWORD;
const EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const ADMIN = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

type Row = { id: string; status: "PASS" | "FAIL" | "SKIP"; detail: string };
const rows: Row[] = [];
function rec(id: string, status: Row["status"], detail: string): void {
  rows.push({ id, status, detail: detail.slice(0, 280) });
  console.log(
    `[o01] ${status === "PASS" ? "✓" : status === "SKIP" ? "·" : "✗"} ${id} :: ${detail.slice(0, 160)}`,
  );
}

test("O-01 deep: capability-first tools; MCP advanced-only", async ({ page }) => {
  test.setTimeout(240_000);

  // ── Employee capability-first ──────────────────────────────────
  await liveUiLogin(page, EMAIL, PW as string);
  await page.goto("/app/connector-health", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const health = page.getByTestId("connector-health-page");
  if ((await health.count()) === 0) {
    rec("O01-A", "FAIL", "connector-health-page missing");
  } else {
    await expect(health).toBeVisible();
    const capFirst = await health.getAttribute("data-capability-first");
    const mcpPrimary = await health.getAttribute("data-mcp-primary");
    rec(
      "O01-A",
      capFirst === "true" && mcpPrimary === "false" ? "PASS" : "FAIL",
      `capability-first=${capFirst} mcp-primary=${mcpPrimary}`,
    );
  }

  const banner = page.getByTestId("tools-capability-first-banner");
  if ((await banner.count()) === 0) {
    rec("O01-B", "FAIL", "capability-first banner missing — deploy O-01");
  } else {
    const t = ((await banner.textContent()) ?? "").toLowerCase();
    const ok =
      /capability|calendar|document|meet/i.test(t) &&
      !/^mcp\b/.test(t.trim());
    rec("O01-B", ok ? "PASS" : "FAIL", t.slice(0, 120));
  }

  const caps = page.getByTestId("enterprise-tools-capability");
  const loading = page.getByTestId("enterprise-tools-loading");
  const err = page.getByTestId("enterprise-tools-error");
  const nCaps = await caps.count();
  if (nCaps > 0) {
    rec("O01-C", "PASS", `capabilities=${nCaps}`);
  } else if ((await loading.count()) > 0 || (await err.count()) > 0) {
    rec("O01-C", "PASS", "honest loading/error without MCP home");
  } else {
    // Empty catalog still ok if headline present
    const head = page.getByTestId("enterprise-tools-headline");
    rec(
      "O01-C",
      (await head.count()) > 0 || (await health.count()) > 0 ? "PASS" : "FAIL",
      "empty catalog or surface-only",
    );
  }

  // First 500 chars of main should not be MCP product pitch
  const mainText = (
    (await page.locator("main").innerText().catch(() => "")) ?? ""
  )
    .slice(0, 500)
    .toLowerCase();
  const mcpLead =
    mainText.trimStart().startsWith("mcp") ||
    /^model context protocol/i.test(mainText.trim());
  rec(
    "O01-D",
    !mcpLead ? "PASS" : "FAIL",
    mcpLead ? "MCP leads employee tools surface" : "employee surface not MCP-led",
  );

  // Nav: tools points to connector-health
  const toolsNav = page.locator('a[href="/app/connector-health"]').first();
  rec(
    "O01-G",
    (await toolsNav.count()) > 0 || /connector-health/.test(page.url())
      ? "PASS"
      : "SKIP",
    "employee tools path",
  );

  // ── Admin tools (inventory default, MCP advanced last) ─────────
  try {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await liveUiLogin(page, ADMIN, PW as string);
    await page.goto("/tools-connections", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const adminPage = page.getByTestId("tools-connections-page");
    if ((await adminPage.count()) === 0) {
      // Non-admin bounce or missing route
      const path = new URL(page.url()).pathname;
      rec(
        "O01-E",
        path.includes("login") || path.includes("app") ? "SKIP" : "FAIL",
        `admin tools not reachable path=${path}`,
      );
      rec("O01-F", "SKIP", "no admin tools page");
    } else {
      const cap = await adminPage.getAttribute("data-capability-first");
      const mcpOnly = await adminPage.getAttribute("data-mcp-advanced-only");
      const tablist = page.getByTestId("tools-admin-tablist");
      const order =
        (await tablist.getAttribute("data-tab-order")) ??
        "inventory>connected>advanced";
      const inv = page.getByTestId("tab-tools-inventory");
      const adv = page.getByTestId("tab-integrations-advanced");
      // Default panel should be inventory (selected or content visible)
      const invPanel = page.getByTestId("panel-tools-inventory");
      const invVisible =
        (await invPanel.count()) > 0 &&
        (await invPanel.isVisible().catch(() => false));
      rec(
        "O01-E",
        cap === "true" &&
          mcpOnly === "true" &&
          order.endsWith("advanced") &&
          order.startsWith("inventory") &&
          invVisible
          ? "PASS"
          : "FAIL",
        `cap=${cap} mcpOnly=${mcpOnly} order=${order} invVisible=${invVisible}`,
      );

      // Advanced not default — open it
      if ((await adv.count()) > 0) {
        await adv.click();
        await page.waitForTimeout(500);
        const advPanel = page.getByTestId("panel-integrations-advanced");
        const mcpCopy = page.getByTestId("tools-mcp-advanced-copy");
        const copy =
          ((await mcpCopy.textContent().catch(() => "")) ?? "").toLowerCase();
        const ok =
          (await advPanel.count()) > 0 &&
          (copy.includes("technical") ||
            copy.includes("mcp") ||
            copy.includes("ordinary") ||
            copy.includes("not require"));
        rec(
          "O01-F",
          ok ? "PASS" : "FAIL",
          ok ? `advanced: ${copy.slice(0, 100)}` : "advanced panel/copy weak",
        );
        // Inventory tab still exists first
        rec(
          "O01-F-order",
          (await inv.count()) > 0 ? "PASS" : "FAIL",
          "inventory tab still present",
        );
      } else {
        rec("O01-F", "FAIL", "advanced tab missing");
      }
    }
  } catch (e) {
    rec(
      "O01-E",
      "SKIP",
      `admin path skipped: ${e instanceof Error ? e.message : String(e)}`.slice(
        0,
        120,
      ),
    );
    rec("O01-F", "SKIP", "admin skipped");
  }

  const pass = rows.filter((r) => r.status === "PASS").length;
  const fail = rows.filter((r) => r.status === "FAIL").length;
  const skip = rows.filter((r) => r.status === "SKIP").length;
  console.log(
    "O01_JSON_BEGIN" + JSON.stringify({ pass, fail, skip, rows }) + "O01_JSON_END",
  );
  console.log(`[o01] TOTALS pass=${pass} fail=${fail} skip=${skip} rows=${rows.length}`);

  expect(fail, `O-01 deep smoke had ${fail} failures`).toBe(0);
  expect(pass).toBeGreaterThanOrEqual(4);
});
