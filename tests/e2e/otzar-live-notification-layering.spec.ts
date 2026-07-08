// FILE: otzar-live-notification-layering.spec.ts
// PURPOSE: [ORG-AUTONOMY] LIVE visual proof that the employee notification
//          dropdown renders ABOVE the ambient ladder/orb (the portal fix).
//          Provisions ONE Meridian employee, seeds a real CALENDAR_EVENT_CREATED
//          notification via the autonomy loop, logs in AS that employee in the
//          browser, opens the bell, and screenshots — then asserts the portaled
//          dropdown sits above the orb by DOM geometry + captures a PNG for eyes.
//          Meridian sim org ONLY; demo org untouched; full cleanup.
// RUN: OTZAR_CUSTSIM_ADMIN_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-notification-layering.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const APP = process.env.OTZAR_SMOKE_BASE_URL ?? "https://app.otzar.ai";
const ADMIN_EMAIL = process.env.OTZAR_CUSTSIM_ADMIN_EMAIL ?? "meridian-admin@niovlabs.com";
const ADMIN_PW = process.env.OTZAR_CUSTSIM_ADMIN_PASSWORD;
const ORG_ID = process.env.OTZAR_CUSTSIM_ORG_ENTITY_ID ?? "69c07a00-2b39-4771-95c3-22c214e7ae6c";
const SUF = Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
const RUN = `nl${SUF}`;

test.skip(!ADMIN_PW, "Set OTZAR_CUSTSIM_ADMIN_PASSWORD (Meridian sim org only).");

async function apiLogin(request: APIRequestContext, email: string, password: string, ops: string[]): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: { email, password, requested_operations: ops } });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { token: string }).token;
}
function rfc3339(d: Date): string {
  return d.toISOString().replace(/\.\d+Z$/, "Z");
}

test("Notification dropdown paints above the ambient orb on the live employee shell (portal fix)", async ({ request, page }) => {
  test.setTimeout(240_000);
  const admin = await apiLogin(request, ADMIN_EMAIL, ADMIN_PW!, ["read", "write", "admin_org"]);
  const auth = { authorization: `Bearer ${admin}` };
  const hier = await request.get(`${API}/org/hierarchy`, { headers: auth });
  expect(((await hier.json()) as { org_entity_id: string }).org_entity_id).toBe(ORG_ID);

  // Provision one employee (the viewer) + activate.
  const email = `pilot-nl+${RUN}@niovlabs.com`;
  const password = `NL-${RUN}-Pass1!`;
  const created = await request.post(`${API}/org/members`, { headers: auth, data: { email, first_name: "Vera", last_name: `View${RUN}` } });
  expect(created.status()).toBe(201);
  const viewerId = ((await created.json()) as { entity_id: string }).entity_id;
  const invited = await request.post(`${API}/org/onboarding/invite`, { headers: auth, data: { entity_id: viewerId } });
  const tokn = ((await invited.json()) as { activation_token: string }).activation_token;
  await request.post(`${API}/auth/activate`, { data: { token: tokn, password } });

  let eventId: string | null = null;
  let calendarId = "primary";
  try {
    // Seed a real notification for the viewer via the autonomy loop (gated create).
    const slot = new Date(Date.now() + 28 * 3600 * 1000);
    slot.setUTCHours(15, 0, 0, 0);
    const create = await request.post(`${API}/calendar/events/create`, {
      headers: auth,
      data: {
        title: `Layering check [${RUN}]`,
        selected_time: { start: rfc3339(slot), end: rfc3339(new Date(slot.getTime() + 30 * 60 * 1000)) },
        participants: [{ label: "Viewer", resolved: true, entity_id: viewerId }],
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
    }

    // Log in AS the viewer in the browser and open the bell.
    await page.goto(`${APP}/login`);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForFunction(() => window.location.pathname.startsWith("/app"), undefined, { timeout: 45_000 });
    await page.waitForTimeout(3000); // let the ambient shell + orb settle

    // Open the notification dropdown (the trigger carries an aria-label with the count).
    const bell = page.getByRole("button", { name: /notification/i }).first();
    await bell.click();
    const dropdown = page.getByTestId("notification-bell-dropdown");
    await expect(dropdown).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1200);

    // Geometry assertion: the dropdown must be a portaled child of <body> (not
    // nested in the frosted header) and carry a z-index above the orb (z-60).
    const geom = await dropdown.evaluate((el) => {
      const z = getComputedStyle(el).zIndex;
      const parentIsBody = el.parentElement === document.body;
      const r = el.getBoundingClientRect();
      // Find the orb (AmbientOtzarBar) — the fixed z-[60] layer.
      let orbZ: string | null = null;
      for (const n of Array.from(document.querySelectorAll("body > *, body *"))) {
        const cs = getComputedStyle(n as Element);
        if (cs.position === "fixed" && cs.zIndex === "60") { orbZ = cs.zIndex; break; }
      }
      return { z, parentIsBody, w: Math.round(r.width), h: Math.round(r.height), orbZ };
    });
    console.log(`[layering] dropdown z=${geom.z} portaledToBody=${geom.parentIsBody} size=${geom.w}x${geom.h} orbZseen=${geom.orbZ}`);
    expect(geom.parentIsBody, "dropdown must be portaled to <body> (escapes the header stacking context)").toBe(true);
    expect(Number(geom.z), "dropdown z-index must be above the orb (60)").toBeGreaterThan(60);
    expect(geom.w).toBeGreaterThan(0);

    await page.screenshot({ path: "test-results/notification-dropdown-layering.png", fullPage: false });
    console.log(`[layering] screenshot saved → test-results/notification-dropdown-layering.png`);
  } finally {
    if (eventId !== null) {
      await request.post(`${API}/calendar/events/delete`, { headers: auth, data: { event_id: eventId, calendar_id: calendarId }, failOnStatusCode: false }).catch(() => {});
    }
    // sweep MEETING rows + suspend the viewer
    const listed = await request.get(`${API}/work-os/ledger?ledger_type=MEETING`, { headers: auth, failOnStatusCode: false });
    if (listed.ok()) {
      const entries = ((await listed.json()) as { entries?: Array<{ ledger_entry_id: string; title?: string; status: string }> }).entries ?? [];
      for (const e of entries) {
        if (e.status !== "CANCELLED" && (e.title ?? "").includes(`[${RUN}]`)) {
          await request.patch(`${API}/work-os/ledger/${e.ledger_entry_id}`, { headers: auth, data: { status: "CANCELLED" }, failOnStatusCode: false }).catch(() => {});
        }
      }
    }
    await request.patch(`${API}/org/entities/${viewerId}`, { headers: auth, data: { status: "SUSPENDED" }, failOnStatusCode: false }).catch(() => {});
    console.log(`[layering] cleanup done (event deleted, MEETING rows swept, viewer suspended)`);
  }
});
