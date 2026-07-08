// FILE: otzar-live-org-autonomy.spec.ts
// PURPOSE: [ORG-AUTONOMY] LIVE proof on Meridian of the autonomy loop:
//          a gated, real Google Calendar event → permission-scoped in-app
//          notifications to the RIGHT humans (creator + resolved attendee),
//          NOT to a non-party → delete → cancellation notifications → zero
//          residue. Proves Otzar notifies without asking again and without
//          leaking to non-parties. Meridian sim org ONLY (tenancy-guarded);
//          demo org is never touched. Mutation branches that need a scope-less
//          tenant or upstream change stay in FND tests — this proves the real
//          create→notify→delete→cancel lifecycle end-to-end.
// RUN: OTZAR_CUSTSIM_ADMIN_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-org-autonomy.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const ADMIN_EMAIL = process.env.OTZAR_CUSTSIM_ADMIN_EMAIL ?? "meridian-admin@niovlabs.com";
const ADMIN_PW = process.env.OTZAR_CUSTSIM_ADMIN_PASSWORD;
const ORG_ID = process.env.OTZAR_CUSTSIM_ORG_ENTITY_ID ?? "69c07a00-2b39-4771-95c3-22c214e7ae6c";

const SUF = Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
const RUN = `oa${SUF}`;

test.skip(!ADMIN_PW, "Set OTZAR_CUSTSIM_ADMIN_PASSWORD (Meridian sim org only).");

async function login(request: APIRequestContext, email: string, password: string, ops: string[]): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: { email, password, requested_operations: ops } });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { token: string }).token;
}
function rfc3339(d: Date): string {
  return d.toISOString().replace(/\.\d+Z$/, "Z");
}
async function provision(
  request: APIRequestContext,
  admin: string,
  slug: string,
  first: string,
): Promise<{ id: string; token: string }> {
  const auth = { authorization: `Bearer ${admin}` };
  const email = `pilot-oa+${RUN}-${slug}@niovlabs.com`;
  const created = await request.post(`${API}/org/members`, { headers: auth, data: { email, first_name: first, last_name: `Auto${RUN}` } });
  expect(created.status()).toBe(201);
  const id = ((await created.json()) as { entity_id: string }).entity_id;
  const invited = await request.post(`${API}/org/onboarding/invite`, { headers: auth, data: { entity_id: id } });
  expect(invited.status()).toBe(200);
  const tokn = ((await invited.json()) as { activation_token: string }).activation_token;
  const password = `OA-${RUN}-${slug}-Pass1!`;
  const activated = await request.post(`${API}/auth/activate`, { data: { token: tokn, password } });
  expect(activated.status()).toBe(200);
  const token = await login(request, email, password, ["read", "write"]);
  return { id, token };
}
async function inbox(request: APIRequestContext, token: string): Promise<Array<{ notification_id: string; notification_class: string; body_summary: string }>> {
  const res = await request.get(`${API}/notifications?page_size=30`, { headers: { authorization: `Bearer ${token}` } });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { notifications?: unknown[]; items?: unknown[] };
  return (body.notifications ?? body.items ?? []) as Array<{ notification_id: string; notification_class: string; body_summary: string }>;
}

test("Org autonomy on Meridian: gated real calendar event → permission-scoped notify (creator + attendee, NOT non-party) → delete → cancel → zero residue", async ({ request }) => {
  test.setTimeout(300_000);
  const admin = await login(request, ADMIN_EMAIL, ADMIN_PW!, ["read", "write", "admin_org"]);
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  // Tenancy guard — Meridian or nothing.
  const hier = await request.get(`${API}/org/hierarchy`, { headers: auth(admin) });
  expect(((await hier.json()) as { org_entity_id: string }).org_entity_id).toBe(ORG_ID);

  const suspendIds: string[] = [];
  const dismiss: Array<{ token: string; id: string }> = [];
  let eventId: string | null = null;
  let calendarId = "primary";
  try {
    // 1) Two real identities: an attendee (a party) and a non-party (must NOT be notified).
    const attendee = await provision(request, admin, "attendee", "Ada");
    const nonparty = await provision(request, admin, "nonparty", "Nate");
    suspendIds.push(attendee.id, nonparty.id);
    console.log(`[org-autonomy] provisioned attendee + non-party (${RUN})`);

    // 2) Real free/busy → pick a clear slot inside a workday.
    const now = new Date();
    const fb = await request.post(`${API}/calendar/freebusy`, {
      headers: auth(admin),
      data: { time_min: rfc3339(now), time_max: rfc3339(new Date(now.getTime() + 72 * 3600 * 1000)) },
      timeout: 60_000,
    });
    expect(fb.status()).toBe(200);
    const busy = (((await fb.json()) as { busy?: Array<{ start: string; end: string }> }).busy ?? []);
    const slot = new Date(now.getTime() + 26 * 3600 * 1000);
    slot.setUTCHours(16, 0, 0, 0);
    const slotEnd = new Date(slot.getTime() + 30 * 60 * 1000);
    const clear = !busy.some((b) => new Date(b.start) < slotEnd && new Date(b.end) > slot);
    expect(clear, "picked slot must be clear of real busy intervals").toBe(true);

    // 3) Gated real create — all gates satisfied AND the attendee carries an entity_id
    //    so Otzar can notify the party (no redundant ask; agreement is present).
    const title = `Go-live sync [${RUN}]`;
    const create = await request.post(`${API}/calendar/events/create`, {
      headers: auth(admin),
      data: {
        title,
        selected_time: { start: rfc3339(slot), end: rfc3339(slotEnd) },
        participants: [{ label: "Implementation Attendee", resolved: true, entity_id: attendee.id }],
        participant_confirmations_satisfied: true,
        requires_approval: true,
        approved: true,
        caller_confirmed: true,
      },
      failOnStatusCode: false,
      timeout: 60_000,
    });
    const createBody = await create.json();
    expect(create.status(), JSON.stringify(createBody)).toBe(200);
    expect(createBody.ok).toBe(true);
    expect(createBody.source_kind).toBe("google_calendar_event");
    eventId = createBody.event_id as string;
    calendarId = (createBody.calendar_id as string) ?? "primary";
    expect(typeof eventId).toBe("string");
    expect(JSON.stringify(createBody)).not.toMatch(/access_token|refresh_token/i);
    console.log(`[org-autonomy] REAL event created (${eventId.slice(0, 10)}…) after all gates`);

    // 4) Permission-scoped fanout. Notifications are a best-effort post-success
    //    side-effect; poll briefly.
    type Notif = { notification_id: string; notification_class: string; body_summary: string };
    const findCreated = (items: Notif[]) => items.filter((n) => n.notification_class === "CALENDAR_EVENT_CREATED");
    let adminCreated: Array<{ token: string; id: string }> = [];
    let attendeeCreated: Notif[] = [];
    for (let i = 0; i < 8; i++) {
      const [ai, ti] = [await inbox(request, admin), await inbox(request, attendee.token)];
      adminCreated = findCreated(ai).map((n) => ({ token: admin, id: (n as { notification_id: string }).notification_id }));
      attendeeCreated = findCreated(ti);
      if (adminCreated.length > 0 && attendeeCreated.length > 0) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    // creator (actor) is a recipient
    expect(adminCreated.length, "creator should receive CALENDAR_EVENT_CREATED").toBeGreaterThan(0);
    // resolved attendee is a recipient, and the body is calm + party-appropriate
    expect(attendeeCreated.length, "resolved attendee should receive CALENDAR_EVENT_CREATED").toBeGreaterThan(0);
    expect(attendeeCreated[0]!.body_summary).toMatch(/no action needed|scheduled/i);
    for (const n of [...attendeeCreated]) {
      expect(n.body_summary).not.toMatch(/access_token|refresh_token/i);
      dismiss.push({ token: attendee.token, id: n.notification_id });
    }
    dismiss.push(...adminCreated);
    // NON-PARTY must have zero calendar notifications — the permission boundary.
    const npItems = await inbox(request, nonparty.token);
    expect(npItems.filter((n) => n.notification_class.startsWith("CALENDAR_EVENT")).length,
      "non-party must receive NO calendar notification").toBe(0);
    console.log(`[org-autonomy] notify scoped: creator ✓ attendee ✓ non-party 0 — no leak`);

    // 5) Delete → cancellation fanout to the parties (pass party context so the
    //    cancellation reaches the attendee whether or not a ledger row was written).
    const del = await request.post(`${API}/calendar/events/delete`, {
      headers: auth(admin),
      data: {
        event_id: eventId,
        calendar_id: calendarId,
        participants: [{ label: "Implementation Attendee", resolved: true, entity_id: attendee.id }],
        title,
      },
      failOnStatusCode: false,
      timeout: 60_000,
    });
    expect(del.status()).toBe(200);
    expect((await del.json()).ok).toBe(true);
    let attendeeCancelled: Array<{ notification_id: string; notification_class: string }> = [];
    for (let i = 0; i < 8; i++) {
      const ti = await inbox(request, attendee.token);
      attendeeCancelled = ti.filter((n) => n.notification_class === "CALENDAR_EVENT_CANCELLED");
      if (attendeeCancelled.length > 0) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    expect(attendeeCancelled.length, "attendee should receive CALENDAR_EVENT_CANCELLED").toBeGreaterThan(0);
    for (const n of attendeeCancelled) dismiss.push({ token: attendee.token, id: n.notification_id });
    eventId = null; // deleted — nothing to clean in finally
    console.log(`[org-autonomy] delete → cancellation notified to the party`);
  } finally {
    // Cleanup: delete any residual event, dismiss test notifications, suspend the
    // two provisioned identities. Zero residue on the shared sim tenant.
    if (eventId !== null) {
      await request.post(`${API}/calendar/events/delete`, { headers: auth(admin), data: { event_id: eventId, calendar_id: calendarId }, failOnStatusCode: false }).catch(() => {});
    }
    for (const d of dismiss) {
      await request.put(`${API}/notifications/${d.id}/dismiss`, { headers: { authorization: `Bearer ${d.token}` }, failOnStatusCode: false }).catch(() => {});
    }
    // Sweep any MEETING ledger rows this run created (best-effort; row is org-scoped).
    const listed = await request.get(`${API}/work-os/ledger?ledger_type=MEETING`, { headers: auth(admin), failOnStatusCode: false });
    if (listed.ok()) {
      const entries = ((await listed.json()) as { entries?: Array<{ ledger_entry_id: string; title?: string; status: string }> }).entries ?? [];
      for (const e of entries) {
        if (e.status !== "CANCELLED" && (e.title ?? "").includes(`[${RUN}]`)) {
          await request.patch(`${API}/work-os/ledger/${e.ledger_entry_id}`, { headers: auth(admin), data: { status: "CANCELLED" }, failOnStatusCode: false }).catch(() => {});
        }
      }
    }
    let suspended = 0;
    for (const id of suspendIds) {
      const r = await request.patch(`${API}/org/entities/${id}`, { headers: auth(admin), data: { status: "SUSPENDED" }, failOnStatusCode: false }).catch(() => null);
      if (r && r.ok()) suspended += 1;
    }
    console.log(`[org-autonomy] cleanup: ${dismiss.length} notifications dismissed, ${suspended} identities suspended, MEETING rows swept`);
  }
});
