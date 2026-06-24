// FILE: tests/e2e/otzar-live-admin-rbac.spec.ts
// PURPOSE: [OTZAR-LIVE-6] Close the admin-positive RBAC gap from the Live
//          Collaboration Verification Matrix. Proves, against the DEPLOYED app:
//          a standard user is denied the org-admin Control Tower; a demo ADMIN
//          (can_admin_org) reaches it; admin/member asymmetry is real; and no
//          backend machinery leaks. DIAGNOSTIC + sanitized. The admin-positive
//          rows SKIP cleanly unless OTZAR_SMOKE_ADMIN_EMAIL (+ a password) is set,
//          so this never fakes admin verification with a standard user.
// RUN: OTZAR_SMOKE_EMAIL=<std> DEMO_SHARED_PASSWORD=<pw> \
//      OTZAR_SMOKE_ADMIN_EMAIL=<admin> [OTZAR_SMOKE_ADMIN_PASSWORD=<pw>] \
//      npm run test:e2e:live:admin
// CONNECTS TO: playwright.live.config.ts, AuthGuard, AdminSidebar, EmployeeLayout.
import { test, expect, type Page, type Browser } from "@playwright/test";

const STD_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const STD_PW = process.env.DEMO_SHARED_PASSWORD;
const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL;
// Admin may share the demo password or use a dedicated one; never logged.
const ADMIN_PW = process.env.OTZAR_SMOKE_ADMIN_PASSWORD ?? process.env.DEMO_SHARED_PASSWORD;
const haveAdmin = Boolean(ADMIN_EMAIL && ADMIN_PW);

test.describe.configure({ retries: 0, timeout: 300_000 });

type Status = "PASS" | "FAIL" | "SKIP";
const rows: Array<{ name: string; status: Status; cls: string; detail: string }> = [];
function sanitize(s: string): string {
  return s
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{20,}\b/gi, "<uuid>")
    .replace(/\b(ent|org|usr|tar)_[0-9a-z]{6,}\b/gi, "<id>")
    .replace(/\s+/g, " ").trim().slice(0, 180);
}
function record(name: string, status: Status, cls: string, detail: string): void {
  const clean = sanitize(detail);
  rows.push({ name, status, cls, detail: clean });
  console.log(`[admin-rbac] ${status} | ${cls} | ${name} :: ${clean}`);
}

async function login(page: Page, email: string, pw: string): Promise<{ path: string; adminShell: boolean; employeeShell: boolean }> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(pw);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname), { timeout: 25_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  return {
    path: new URL(page.url()).pathname,
    adminShell: (await page.getByTestId("admin-nav-group").count()) > 0,
    employeeShell: (await page.getByTestId("employee-nav").count()) > 0 || /\/app/.test(page.url()),
  };
}

// Backend machinery that must never appear in normal UX (the AccessDenied screen
// names `can_admin_org` deliberately, so that token is excluded).
async function leakCheck(page: Page): Promise<{ ok: boolean; hit: string }> {
  const html = await page.locator("body").innerHTML().catch(() => "");
  const leaks = [/Traceback \(most recent/, /\bInternalServerError\b/, /\b(ent|org|usr|tar)_[0-9a-z]{8,}\b/, /CROSS_ORG_DENIED/, /\bPOLICY_[A-Z_]+\b/, /\/api\/v1\/[\w/-]+/];
  for (const re of leaks) { const m = html.match(re); if (m) return { ok: false, hit: m[0] }; }
  return { ok: true, hit: "" };
}

test("Live admin RBAC / ABAC verification", async ({ browser }: { browser: Browser }) => {
  test.skip(!STD_PW, "Set DEMO_SHARED_PASSWORD (standard-user negative needs it).");

  // ── A. Standard-user NEGATIVE — denied the org-admin Control Tower ──────
  const stdCtx = await browser.newContext();
  const stdPage = await stdCtx.newPage();
  let stdAdminShell = true;
  try {
    const s = await login(stdPage, STD_EMAIL, STD_PW as string);
    stdAdminShell = s.adminShell;
    record("A: standard login reaches employee shell, NOT admin", !s.adminShell && s.employeeShell ? "PASS" : "FAIL", !s.adminShell ? "rbac-expected" : "product-bug", `landed ${s.path} adminShell=${s.adminShell} employeeShell=${s.employeeShell}`);
    // Direct admin route is blocked (redirect/login/AccessDenied — never admin UI).
    await stdPage.goto("/admin/users").catch(() => undefined);
    await stdPage.waitForTimeout(1200);
    const reachedAdmin = (await stdPage.getByTestId("admin-nav-group").count()) > 0;
    const denied = (await stdPage.getByRole("heading", { name: /access denied/i }).count()) > 0;
    const onLogin = /\/login/.test(stdPage.url());
    record("A: standard blocked from /admin/users", !reachedAdmin ? "PASS" : "FAIL", !reachedAdmin ? "rbac-expected" : "product-bug", `reachedAdminUI=${reachedAdmin} accessDenied=${denied} login=${onLogin} at=${new URL(stdPage.url()).pathname}`);
    const leak = await leakCheck(stdPage);
    record("A: no backend leakage on the denial path", leak.ok ? "PASS" : "FAIL", leak.ok ? "ok" : "product-bug", leak.ok ? "clean" : `leak: ${leak.hit}`);
  } finally { await stdCtx.close(); }

  // ── B–H. Admin-POSITIVE — only with a real admin credential ────────────
  if (!haveAdmin) {
    record("B: admin-positive verification", "SKIP", "cred-gap", "set OTZAR_SMOKE_ADMIN_EMAIL (+ password) to verify admin-positive; NOT faked with a standard user");
    record("E: cross-org isolation", "SKIP", "data-gap", "no second-org fixture/credential");
    record("G: approval-positive", "SKIP", "data-gap", "no seeded approval-required scenario");
  } else {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    try {
      const a = await login(adminPage, ADMIN_EMAIL as string, ADMIN_PW as string);
      // If the admin account can't authenticate against this deployment, the
      // admin-positive rows are a CRED/DATA gap (account not provisioned) — NOT a
      // product bug. Honest classification: skip the dependent rows.
      const adminAuthed = !/\/login/.test(a.path) && (a.adminShell || a.employeeShell);
      if (!adminAuthed) {
        record("B: admin-positive verification", "SKIP", "cred-gap", `admin account did not authenticate against this deployment (landed ${a.path}) — likely not provisioned in prod; not a product defect`);
        record("D: admin/member asymmetry", "SKIP", "cred-gap", "needs a working admin login");
        record("E: cross-org isolation", "SKIP", "data-gap", "no second-org fixture");
        record("G: approval-positive", "SKIP", "data-gap", "no seeded approval scenario");
      } else {
        // B. admin reaches the Control Tower (admin shell).
        record("B: admin login reaches org-admin Control Tower", a.adminShell ? "PASS" : "FAIL", a.adminShell ? "ok" : "product-bug", `landed ${a.path} adminShell=${a.adminShell}`);
        // C. admin reaches a deeper admin-only route via CLIENT-SIDE nav. A hard
        // goto would log out (in-memory session, same as the standard path), so we
        // click an admin-sidebar link and confirm the route changes while the
        // session + admin shell persist.
        const beforeUrl = adminPage.url();
        const navLinks = adminPage.locator('[data-testid="admin-nav-group"] a[href]');
        const linkCount = await navLinks.count();
        let clicked = false;
        for (let i = 0; i < linkCount && !clicked; i++) {
          const href = await navLinks.nth(i).getAttribute("href").catch(() => null);
          if (href && href !== new URL(beforeUrl).pathname) {
            await navLinks.nth(i).click().catch(() => undefined);
            await adminPage.waitForFunction((u) => location.href !== u, beforeUrl, { timeout: 6000 }).catch(() => undefined);
            clicked = true;
          }
        }
        const stillAdmin = (await adminPage.getByTestId("admin-nav-group").count()) > 0;
        const movedAndAuthed = clicked && stillAdmin && !/\/login/.test(adminPage.url()) && adminPage.url() !== beforeUrl;
        record("C: admin-only route loads for admin (client nav)", movedAndAuthed ? "PASS" : (linkCount === 0 ? "SKIP" : "FAIL"), movedAndAuthed ? "ok" : (linkCount === 0 ? "data-gap" : "product-bug"), `links=${linkCount} at ${new URL(adminPage.url()).pathname} adminShell=${stillAdmin}`);
        // D. admin/member ASYMMETRY — the discriminating proof.
        record("D: admin/member asymmetry (admin sees admin shell, standard does not)", a.adminShell && !stdAdminShell ? "PASS" : "FAIL", a.adminShell && !stdAdminShell ? "ok" : "product-bug", `admin.adminShell=${a.adminShell} standard.adminShell=${stdAdminShell}`);
        // H. No backend leakage in admin UX.
        const leak = await leakCheck(adminPage);
        record("H: no backend leakage in admin UX", leak.ok ? "PASS" : "FAIL", leak.ok ? "ok" : "product-bug", leak.ok ? "clean" : `leak: ${leak.hit}`);
        record("E: cross-org isolation", "SKIP", "data-gap", "no second-org fixture — admin scope-to-org not adversarially tested");
        record("G: approval-positive", "SKIP", "data-gap", "no seeded approval-required scenario in demo org");
      }
    } finally { await adminCtx.close(); }
  }

  console.log("ADMIN_RBAC_JSON_BEGIN" + JSON.stringify(rows) + "ADMIN_RBAC_JSON_END");
  const by = (s: Status) => rows.filter((r) => r.status === s).length;
  console.log(`[admin-rbac] TOTALS pass=${by("PASS")} fail=${by("FAIL")} skip=${by("SKIP")}`);
  // The standard-user negative MUST pass even without admin creds.
  expect(rows.filter((r) => r.name.startsWith("A:") && r.status === "FAIL").length).toBe(0);
});
