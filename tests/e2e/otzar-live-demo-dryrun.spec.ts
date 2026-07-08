// FILE: otzar-live-demo-dryrun.spec.ts
// PURPOSE: [DEMO-DRYRUN] Visual walk of the deployed app.otzar.ai in the Meridian
//          demo-script order — admin shell + employee shell — capturing a
//          screenshot per surface for a presentation-blocker review. Seeds ONE
//          real calendar event (as a provisioned Meridian employee) so the
//          Scheduled lane + bell have content, then cleans up. No new features;
//          read-only UI walk + Meridian-only mutations. Demo org untouched.
// RUN: OTZAR_CUSTSIM_ADMIN_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-demo-dryrun.spec.ts

import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

test.describe.configure({ retries: 0 });

const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const APP = process.env.OTZAR_SMOKE_BASE_URL ?? "https://app.otzar.ai";
const ADMIN_EMAIL = process.env.OTZAR_CUSTSIM_ADMIN_EMAIL ?? "meridian-admin@niovlabs.com";
const ADMIN_PW = process.env.OTZAR_CUSTSIM_ADMIN_PASSWORD;
const ORG_ID = process.env.OTZAR_CUSTSIM_ORG_ENTITY_ID ?? "69c07a00-2b39-4771-95c3-22c214e7ae6c";
const SUF = Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
const RUN = `dr${SUF}`;
const DIR = "test-results/demo-dryrun";

test.skip(!ADMIN_PW, "Set OTZAR_CUSTSIM_ADMIN_PASSWORD (Meridian sim org only).");

async function apiLogin(request: APIRequestContext, email: string, password: string, ops: string[]): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: { email, password, requested_operations: ops } });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { token: string }).token;
}
function rfc3339(d: Date): string {
  return d.toISOString().replace(/\.\d+Z$/, "Z");
}
async function uiLogin(page: Page, email: string, password: string, landing: RegExp): Promise<void> {
  await page.goto(`${APP}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForFunction((l) => new RegExp(l).test(window.location.pathname), landing.source, { timeout: 45_000 });
  await page.waitForTimeout(2500);
}
async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });
  console.log(`[dryrun] captured ${name}`);
}
// Navigate CLIENT-SIDE (click an in-app link) so the SPA's in-memory auth
// survives — a full page.goto reload logs the session out (watch-item).
// waitFor: an optional testid to await (so a slow data fetch has resolved
// before the screenshot, instead of catching an empty/loading frame).
async function nav(page: Page, path: string, name: string, waitFor?: string): Promise<void> {
  const link = page.locator(`a[href="${path}"], a[href^="${path}"]`).first();
  try {
    if (await link.count() > 0) {
      await link.click({ timeout: 8000 });
    } else {
      // Fallback: SPA client-side navigation via the History API + popstate.
      await page.evaluate((p) => { window.history.pushState({}, "", p); window.dispatchEvent(new PopStateEvent("popstate")); }, path);
    }
    if (waitFor !== undefined) {
      await page.getByTestId(waitFor).first().waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    }
    await page.waitForTimeout(2800);
  } catch {
    console.log(`[dryrun] nav ${path} click failed — capturing current view`);
  }
  await shot(page, name);
}

test("Demo dry-run: walk admin + employee shells and capture each surface", async ({ request, page }) => {
  test.setTimeout(420_000);
  const admin = await apiLogin(request, ADMIN_EMAIL, ADMIN_PW!, ["read", "write", "admin_org"]);
  const authH = { authorization: `Bearer ${admin}` };
  expect(((await (await request.get(`${API}/org/hierarchy`, { headers: authH })).json()) as { org_entity_id: string }).org_entity_id).toBe(ORG_ID);

  // Provision an employee (the "organizer") + a required + optional attendee id.
  const email = `pilot-dr+${RUN}@niovlabs.com`;
  const password = `DR-${RUN}-Pass1!`;
  const created = await request.post(`${API}/org/members`, { headers: authH, data: { email, first_name: "Dana", last_name: `Demo${RUN}` } });
  expect(created.status()).toBe(201);
  const empId = ((await created.json()) as { entity_id: string }).entity_id;
  const invited = await request.post(`${API}/org/onboarding/invite`, { headers: authH, data: { entity_id: empId } });
  const tok = ((await invited.json()) as { activation_token: string }).activation_token;
  await request.post(`${API}/auth/activate`, { data: { token: tok, password } });
  const empToken = await apiLogin(request, email, password, ["read", "write"]);
  // A second member so the roster shows a required attendee with a name.
  const created2 = await request.post(`${API}/org/members`, { headers: authH, data: { email: `pilot-dr2+${RUN}@niovlabs.com`, first_name: "Priya", last_name: `Req${RUN}` } });
  const reqId = ((await created2.json()) as { entity_id: string }).entity_id;
  const suspendIds = [empId, reqId];

  let eventId: string | null = null;
  let calendarId = "primary";
  try {
    // Employee organizes a real meeting: required (Priya, resolved) + optional (unresolved).
    const slot = new Date(Date.now() + 30 * 3600 * 1000);
    slot.setUTCHours(16, 0, 0, 0);
    const create = await request.post(`${API}/calendar/events/create`, {
      headers: { authorization: `Bearer ${empToken}` },
      data: {
        title: `Meridian go-live sync [${RUN}]`,
        selected_time: { start: rfc3339(slot), end: rfc3339(new Date(slot.getTime() + 30 * 60 * 1000)) },
        participants: [
          { label: "Priya (Product Lead)", resolved: true, entity_id: reqId, role: "required_attendee", required: true },
          { label: "Finance (optional)", resolved: false, role: "optional_attendee", required: false },
        ],
        participant_confirmations_satisfied: true,
        requires_approval: true,
        approved: true,
        caller_confirmed: true,
      },
      failOnStatusCode: false,
      timeout: 60_000,
    });
    const cb = await create.json();
    if (create.status() === 200 && cb.ok) {
      eventId = cb.event_id as string;
      calendarId = (cb.calendar_id as string) ?? "primary";
      console.log(`[dryrun] seeded real meeting for the Scheduled lane (${eventId.slice(0, 8)}…)`);
    } else {
      console.log(`[dryrun] meeting seed non-200 (${create.status()} ${cb.code ?? ""}) — lane will show empty state`);
    }

    // ── ADMIN SHELL ──
    await page.goto(`${APP}/login`);
    await page.waitForTimeout(1500);
    await shot(page, "01-login");
    await uiLogin(page, ADMIN_EMAIL, ADMIN_PW!, /^\/$|^\/(home|dashboard)?$/);
    await shot(page, "02-admin-home");
    await nav(page, "/setup/company-profile", "03-company-profile-decision-rights");
    await nav(page, "/users", "04-people-hierarchy");
    await nav(page, "/data-knowledge", "05-data-knowledge-source-trust", "data-source-row");
    await nav(page, "/security-audit", "06-security-audit");

    // ── EMPLOYEE SHELL ── (fresh session)
    await page.context().clearCookies();
    await page.goto(`${APP}/login`);
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* noop */ } });
    await uiLogin(page, email, password, /^\/app/);
    await shot(page, "07-employee-ambient-home");
    // Open the notification dropdown (bell) over the ambient shell.
    try {
      await page.getByRole("button", { name: /notification/i }).first().click();
      await expect(page.getByTestId("notification-bell-dropdown")).toBeVisible({ timeout: 8000 });
      await page.waitForTimeout(1000);
      await shot(page, "08-notification-dropdown");
    } catch {
      console.log("[dryrun] notification dropdown not opened — capturing shell");
      await shot(page, "08-notification-dropdown-fallback");
    }
    await nav(page, "/app/action-center", "09-action-center-scheduled-lane");
    await nav(page, "/app/my-twin", "10-my-twin");
    await nav(page, "/app/work-schedule", "11-work-schedule");
  } finally {
    if (eventId !== null) {
      await request.post(`${API}/calendar/events/delete`, { headers: authH, data: { event_id: eventId, calendar_id: calendarId }, failOnStatusCode: false }).catch(() => {});
    }
    const listed = await request.get(`${API}/work-os/ledger?ledger_type=MEETING`, { headers: authH, failOnStatusCode: false });
    if (listed.ok()) {
      const entries = ((await listed.json()) as { entries?: Array<{ ledger_entry_id: string; title?: string; status: string }> }).entries ?? [];
      for (const e of entries) {
        if (e.status !== "CANCELLED" && (e.title ?? "").includes(`[${RUN}]`)) {
          await request.patch(`${API}/work-os/ledger/${e.ledger_entry_id}`, { headers: authH, data: { status: "CANCELLED" }, failOnStatusCode: false }).catch(() => {});
        }
      }
    }
    let suspended = 0;
    for (const id of suspendIds) {
      const r = await request.patch(`${API}/org/entities/${id}`, { headers: authH, data: { status: "SUSPENDED" }, failOnStatusCode: false }).catch(() => null);
      if (r && r.ok()) suspended += 1;
    }
    console.log(`[dryrun] cleanup: event deleted, MEETING rows swept, ${suspended} identities suspended`);
  }
});
