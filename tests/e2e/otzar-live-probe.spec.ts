// FILE: tests/e2e/otzar-live-probe.spec.ts
// PURPOSE: One-off LIVE capability probe — for each provisioned demo account
//          (shared DEMO_SHARED_PASSWORD), determine: does login succeed, does a
//          name render, and does the org-admin shell (/admin/*) load (i.e. does
//          this account actually hold can_admin_org). Used to decide whether the
//          collaboration matrix's admin / two-user rows are real tests or gaps.
//          READ-ONLY. Never logs secrets. Sanitized JSON to stdout only.
// RUN: OTZAR_SMOKE_PROBE_EMAILS="a@x,b@x" DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-probe.spec.ts
import { test, expect, type Page } from "@playwright/test";

const PASSWORD = process.env.DEMO_SHARED_PASSWORD;
// Known provisioned demo team (from niov-foundation provision-demo-team-accounts).
// Override with OTZAR_SMOKE_PROBE_EMAILS (comma-separated) — no users invented.
const EMAILS = (
  process.env.OTZAR_SMOKE_PROBE_EMAILS ??
  "sadeil@niovlabs.com,david@niovlabs.com,vishesh@niovlabs.com"
)
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

test.skip(!PASSWORD, "Set DEMO_SHARED_PASSWORD to run the live probe.");

async function login(page: Page, email: string): Promise<boolean> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD as string);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for either an app surface or an auth error.
  await page
    .waitForURL(/\/app|\/admin/, { timeout: 20_000 })
    .catch(() => undefined);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const onAuthedShell = /\/app|\/admin/.test(page.url());
  return onAuthedShell;
}

test("live account/capability probe", async ({ browser }) => {
  const results: Array<Record<string, unknown>> = [];
  for (const email of EMAILS) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const row: Record<string, unknown> = { email };
    try {
      const loginOk = await login(page, email);
      row.loginOk = loginOk;
      if (loginOk) {
        // Does the org-admin shell load, or redirect away (no can_admin_org)?
        await page.goto("/admin/users").catch(() => undefined);
        await page.waitForLoadState("networkidle").catch(() => undefined);
        row.adminRouteUrl = new URL(page.url()).pathname;
        row.adminRouteLoads = /\/admin/.test(page.url());
        // Admin-only employee nav markers (Team Work / Launch readiness).
        await page.goto("/app").catch(() => undefined);
        await page.waitForLoadState("networkidle").catch(() => undefined);
        row.teamWorkNav = await page
          .getByRole("link", { name: /team work/i })
          .count()
          .catch(() => -1);
      }
    } catch (err) {
      row.error = err instanceof Error ? err.message.slice(0, 120) : "unknown";
    } finally {
      results.push(row);
      await ctx.close();
    }
  }
  console.log("PROBE_JSON_BEGIN" + JSON.stringify(results) + "PROBE_JSON_END");
  expect(results.length).toBe(EMAILS.length);
});
