// FILE: otzar-live-bugd-connectedness.spec.ts
// PURPOSE: [PROD-UX-BUGD] LIVE multi-scenario verification on app.otzar.ai
//          that People & Collaboration states connectedness truthfully:
//          1. API source-of-truth (admin): precise copy + structured context.
//          2. Admin UI renders the truth (screenshot) — no disconnection
//             language, honest "Hide for now", no raw ids/codes.
//          3. "Hide for now" is honestly session-local: hidden card RETURNS
//             on remount (server recompute) — never a fake durable dismiss.
//          4. Employee isolation: a non-admin never sees the admin growth
//             card, and their People page carries no disconnection language.
//          5. Dual-control regression: a managed employee's send QUEUES for
//             approval (PROPOSED + escalation) — never NO_ELIGIBLE_TARGET
//             from manager edges. Cleaned up via the approver's governed
//             reject.
//          Login note: the admin login takes ~5s server-side and lands on the
//          admin shell at "/"; /app/collaboration is reached client-side via
//          pushState+popstate (a full page load would drop the in-memory
//          session by doctrine).
// RUN: OTZAR_SMOKE_BASE_URL=https://app.otzar.ai DEMO_SHARED_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-bugd-connectedness.spec.ts

import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

// Scenario 5 mutates live data (creates a governed action) — no retries.
test.describe.configure({ retries: 0 });

const ADMIN_EMAIL = process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "sadeil@niovlabs.com";
const EMPLOYEE_EMAIL = process.env.OTZAR_SMOKE_EMAIL ?? "vishesh@niovlabs.com";
const PW = process.env.DEMO_SHARED_PASSWORD;
const TAG = process.env.OTZAR_SHOT_TAG ?? "bugd";
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
// Live demo-org member (Samiksha) — scenario 5's recipient.
const SAMIKSHA = "a378367c-5baf-43f6-9b0d-675dc74cb9a6";

const BANNED = /isn't connected|not connected|disconnected/i;

test.skip(!PW, "Set DEMO_SHARED_PASSWORD.");

async function apiLogin(request: APIRequestContext, email: string): Promise<string> {
  const lr = await request.post(`${API}/auth/login`, {
    data: { email, password: PW, requested_operations: ["read", "write"] },
  });
  return (await lr.json()).token as string;
}

async function uiLogin(p: Page, email: string): Promise<void> {
  await p.goto("/login");
  await p.getByLabel("Email").fill(email);
  await p.getByLabel("Password").fill(PW as string);
  await p.getByRole("button", { name: /sign in/i }).click();
  // The admin login is slow (~5s POST + shell bootstrap) — wait for the login
  // page to actually be LEFT, not for a URL substring ("/app" also matches
  // the domain "//app.otzar.ai").
  await p.waitForFunction(() => !window.location.pathname.startsWith("/login"), undefined, { timeout: 45_000 });
  await p.waitForTimeout(2500);
}

// Client-side route change that keeps the in-memory session (React Router
// listens to popstate; a page.goto would reload and drop auth).
async function clientRoute(p: Page, path: string): Promise<void> {
  await p.evaluate((to) => {
    history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await p.waitForTimeout(2000);
}

// ── Scenario 1 — API source-of-truth (admin view) ───────────────────────────
test("S1 api: recommendations state true org placement with structured context — never 'not connected'", async ({ request }) => {
  const token = await apiLogin(request, ADMIN_EMAIL);
  const gr = await request.get(`${API}/otzar/dandelion/org-growth`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const growth = (await gr.json()).growth as {
    recommendations: Array<{
      kind: string;
      title: string;
      why: string;
      context?: {
        person_entity_id: string;
        org_member: boolean;
        has_department: boolean;
        has_manager: boolean;
        has_project_or_workspace: boolean;
        missing_connection_type: string;
      };
    }>;
    signals: Record<string, number>;
  };
  const needs = growth.recommendations.filter((r) => r.kind === "NEEDS_PROJECT_OR_WORKSPACE");
  expect(needs.length).toBeGreaterThan(0); // the live org genuinely has members without projects
  for (const r of needs) {
    expect(r.title).toContain("needs a first project or workspace");
    expect(r.why).toContain("already part of your organization");
    expect(`${r.title} ${r.why}`).not.toMatch(BANNED);
    expect(r.context?.org_member).toBe(true);
    expect(r.context?.has_project_or_workspace).toBe(false);
    expect(r.context?.missing_connection_type).toBe("PROJECT_OR_WORKSPACE");
    expect((r.context?.person_entity_id ?? "").length).toBeGreaterThan(0); // stable id
  }
  // People with a real manager edge are placed on their manager's team.
  for (const r of needs.filter((x) => x.context?.has_manager === true)) {
    expect(r.why).toContain("'s team");
  }
  // No recommendation of ANY kind uses the old flattening vocabulary.
  for (const r of growth.recommendations) {
    expect(`${r.title} ${r.why}`).not.toMatch(/isn't connected to any project/i);
  }
  expect(growth.signals.members_without_project_count).toBeGreaterThan(0);
  expect(growth.signals.disconnected_members_count).toBeUndefined(); // old signal gone
});

// ── Scenario 2 — Admin UI renders the truth (screenshot) ────────────────────
test("S2 admin ui: People & Collaboration card reads accurately, honest hide control, no raw ids", async ({ page }) => {
  test.setTimeout(150_000);
  await uiLogin(page, ADMIN_EMAIL);
  await clientRoute(page, "/app/collaboration");
  const card = page.getByTestId("dandelion-growth-card");
  await card.waitFor({ state: "visible", timeout: 30_000 });
  const items = page.getByTestId("dandelion-growth-item");
  expect(await items.count()).toBeGreaterThan(0);
  const cardText = (await card.textContent()) ?? "";
  expect(cardText).toContain("already part of your organization");
  expect(cardText).toContain("needs a first project or workspace");
  expect(cardText).not.toMatch(BANNED);
  // No raw backend codes or entity ids rendered as copy.
  expect(cardText).not.toContain("NEEDS_PROJECT_OR_WORKSPACE");
  expect(cardText).not.toContain("CONNECT_TEAMMATE");
  expect(cardText).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  // The hide control never claims durable dismissal.
  await expect(page.getByTestId("dandelion-growth-dismiss").first()).toHaveText(/hide for now/i);
  await page.screenshot({ path: `screenshots/${TAG}-1-admin-people-collab.png`, fullPage: true });
});

// ── Scenario 3 — "Hide for now" is honestly session-local ───────────────────
test("S3 admin ui: a hidden recommendation returns on remount (session-local, not fake-durable)", async ({ page }) => {
  test.setTimeout(150_000);
  await uiLogin(page, ADMIN_EMAIL);
  await clientRoute(page, "/app/collaboration");
  await page.getByTestId("dandelion-growth-card").waitFor({ state: "visible", timeout: 30_000 });
  const items = page.getByTestId("dandelion-growth-item");
  const before = await items.count();
  expect(before).toBeGreaterThan(0);
  await page.getByTestId("dandelion-growth-dismiss").first().click();
  await expect.poll(async () => items.count(), { timeout: 5_000 }).toBe(before - 1);
  await page.screenshot({ path: `screenshots/${TAG}-2-after-hide.png`, fullPage: true });
  // Leave and come back (remount) — the recommendation recomputes and RETURNS.
  await clientRoute(page, "/app/my-day");
  await clientRoute(page, "/app/collaboration");
  await page.getByTestId("dandelion-growth-card").waitFor({ state: "visible", timeout: 30_000 });
  await expect.poll(async () => items.count(), { timeout: 15_000 }).toBe(before);
});

// ── Scenario 4 — Employee isolation + no disconnection language ─────────────
test("S4 employee ui: non-admin never sees the growth card; page carries no disconnection language", async ({ page }) => {
  test.setTimeout(120_000);
  await uiLogin(page, EMPLOYEE_EMAIL);
  await page.getByTestId("ambient-nav").getByRole("link", { name: /people/i }).first().click();
  await page.waitForTimeout(2500);
  // The employee page renders; the admin-gated growth card does NOT.
  expect(await page.getByTestId("dandelion-growth-card").count()).toBe(0);
  const body = (await page.locator("main, body").first().textContent()) ?? "";
  expect(body).not.toMatch(/isn't connected to any project/i);
  await page.screenshot({ path: `screenshots/${TAG}-3-employee-people.png`, fullPage: true });
});

// ── Scenario 5 — dual-control regression: managed employee's send QUEUES ────
test("S5 governance: a managed employee's send queues for approval (no manager-edge NO_ELIGIBLE_TARGET)", async ({ request }) => {
  const employeeToken = await apiLogin(request, EMPLOYEE_EMAIL);
  const key = `bugd-smoke-dualcontrol-${new Date().toISOString().slice(0, 10)}`;
  const send = await request.post(`${API}/actions`, {
    headers: { authorization: `Bearer ${employeeToken}` },
    data: {
      action_type: "SEND_INTERNAL_NOTIFICATION",
      idempotency_key: key,
      payload_summary: "BUGD smoke: dual-control approver resolution",
      payload_redacted: {
        recipient_entity_id: SAMIKSHA,
        notification_class: "OTZAR_INTERNAL_NOTE",
        body_summary: "BUGD smoke: verifying approver resolution — will be rejected by the approver.",
      },
    },
  });
  const body = await send.json();
  // The regression returned 503 DUAL_CONTROL_NO_APPROVER_AVAILABLE here.
  expect(body.ok).toBe(true);
  expect(body.action.status).toBe("PROPOSED");
  expect(body.action.requires_approval).toBe(true);
  expect(body.action.escalation_id ?? null).not.toBeNull();

  // Governed cleanup: the approver rejects the smoke escalation (idempotency
  // key means retries reuse the same action rather than piling up).
  const adminToken = await apiLogin(request, ADMIN_EMAIL);
  const rej = await request.post(`${API}/escalations/${body.action.escalation_id}/reject`, {
    headers: { authorization: `Bearer ${adminToken}` },
    data: { reason: "BUGD live smoke — governed cleanup, not a real send." },
  });
  const rb = await rej.json();
  expect(rb.ok).toBe(true);
});
