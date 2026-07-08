// FILE: otzar-live-participant-coordination.spec.ts
// PURPOSE: [ORGX] LIVE proof on Meridian that (1) an OPTIONAL unresolved
//          attendee does NOT block scheduling, (2) a REQUIRED unresolved
//          attendee DOES block, (3) the terminal MEETING row exposes the SAFE
//          scheduled_meeting roster projection (roles, no ids), and (4) the
//          Scheduled-lane data source is caller-scoped — a non-party employee
//          sees ZERO meetings. Meridian sim org ONLY; demo org untouched; full
//          cleanup to zero residue.
// RUN: OTZAR_CUSTSIM_ADMIN_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-participant-coordination.spec.ts

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const ADMIN_EMAIL = process.env.OTZAR_CUSTSIM_ADMIN_EMAIL ?? "meridian-admin@niovlabs.com";
const ADMIN_PW = process.env.OTZAR_CUSTSIM_ADMIN_PASSWORD;
const ORG_ID = process.env.OTZAR_CUSTSIM_ORG_ENTITY_ID ?? "69c07a00-2b39-4771-95c3-22c214e7ae6c";
const SUF = Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
const RUN = `pc${SUF}`;

test.skip(!ADMIN_PW, "Set OTZAR_CUSTSIM_ADMIN_PASSWORD (Meridian sim org only).");

async function login(request: APIRequestContext, email: string, password: string, ops: string[]): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: { email, password, requested_operations: ops } });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { token: string }).token;
}
function rfc3339(d: Date): string {
  return d.toISOString().replace(/\.\d+Z$/, "Z");
}
async function provision(request: APIRequestContext, admin: string, slug: string, first: string): Promise<{ id: string; token: string }> {
  const auth = { authorization: `Bearer ${admin}` };
  const email = `pilot-pc+${RUN}-${slug}@niovlabs.com`;
  const created = await request.post(`${API}/org/members`, { headers: auth, data: { email, first_name: first, last_name: `Coord${RUN}` } });
  expect(created.status()).toBe(201);
  const id = ((await created.json()) as { entity_id: string }).entity_id;
  const invited = await request.post(`${API}/org/onboarding/invite`, { headers: auth, data: { entity_id: id } });
  const tokn = ((await invited.json()) as { activation_token: string }).activation_token;
  const password = `PC-${RUN}-${slug}-Pass1!`;
  await request.post(`${API}/auth/activate`, { data: { token: tokn, password } });
  const token = await login(request, email, password, ["read", "write"]);
  return { id, token };
}

test("Participant coordination on Meridian: optional doesn't block · required blocks · safe roster · non-party sees zero", async ({ request }) => {
  test.setTimeout(300_000);
  const admin = await login(request, ADMIN_EMAIL, ADMIN_PW!, ["read", "write", "admin_org"]);
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const hier = await request.get(`${API}/org/hierarchy`, { headers: auth(admin) });
  expect(((await hier.json()) as { org_entity_id: string }).org_entity_id).toBe(ORG_ID);

  const suspendIds: string[] = [];
  let eventId: string | null = null;
  let calendarId = "primary";
  try {
    const required = await provision(request, admin, "req", "Rhea");
    const nonparty = await provision(request, admin, "nonparty", "Nia");
    suspendIds.push(required.id, nonparty.id);

    const now = new Date();
    const slot = new Date(now.getTime() + 27 * 3600 * 1000);
    slot.setUTCHours(16, 0, 0, 0);
    const slotEnd = new Date(slot.getTime() + 30 * 60 * 1000);
    const base = {
      selected_time: { start: rfc3339(slot), end: rfc3339(slotEnd) },
      participant_confirmations_satisfied: true,
      requires_approval: true,
      approved: true,
      caller_confirmed: true,
    };

    // 1) OPTIONAL unresolved attendee must NOT block — required is resolved.
    const okCreate = await request.post(`${API}/calendar/events/create`, {
      headers: auth(admin),
      data: {
        ...base,
        title: `Budget review [${RUN}]`,
        participants: [
          { label: "Rhea (Eng Lead)", resolved: true, entity_id: required.id, role: "required_attendee", required: true },
          { label: "Optional Finance", resolved: false, role: "optional_attendee", required: false },
        ],
      },
      failOnStatusCode: false,
      timeout: 60_000,
    });
    const okBody = await okCreate.json();
    expect(okCreate.status(), JSON.stringify(okBody)).toBe(200);
    expect(okBody.ok).toBe(true);
    eventId = okBody.event_id as string;
    calendarId = (okBody.calendar_id as string) ?? "primary";
    console.log(`[pc] optional-unresolved did NOT block — event created (${eventId.slice(0, 10)}…)`);

    // 2) REQUIRED unresolved attendee MUST block.
    const blocked = await request.post(`${API}/calendar/events/create`, {
      headers: auth(admin),
      data: {
        ...base,
        title: `Should block [${RUN}]`,
        participants: [{ label: "Missing Required", resolved: false, role: "required_attendee", required: true }],
      },
      failOnStatusCode: false,
      timeout: 60_000,
    });
    const blockedBody = await blocked.json();
    expect(blocked.status()).not.toBe(200);
    expect(blockedBody.code).toBe("PARTICIPANT_UNRESOLVED");
    expect(blockedBody.event_id).toBeUndefined();
    console.log(`[pc] required-unresolved correctly blocked (${blockedBody.code}) — no event`);

    // 3) Safe scheduled_meeting roster on the MEETING row (organizer view).
    const listed = await request.get(`${API}/work-os/ledger?ledger_type=MEETING`, { headers: auth(admin) });
    expect(listed.status()).toBe(200);
    const entries = ((await listed.json()) as { entries: Array<Record<string, unknown>> }).entries;
    const mine = entries.find((e) => typeof e.title === "string" && (e.title as string).includes(`[${RUN}]`));
    expect(mine, "the created MEETING row must be present for the organizer").toBeTruthy();
    const sm = mine!.scheduled_meeting as { provider?: string; participants?: Array<{ label: string; role: string | null; required: boolean }> } | undefined;
    expect(sm).toBeTruthy();
    expect(sm!.provider).toBe("google_calendar_event");
    const roles = (sm!.participants ?? []).map((p) => `${p.label}:${p.required}`);
    expect(roles.some((r) => r.startsWith("Rhea") && r.endsWith("true")), "required attendee present + required").toBe(true);
    expect(roles.some((r) => r.startsWith("Optional") && r.endsWith("false")), "optional attendee present + not required").toBe(true);
    // Safe projection carries NO raw ids.
    const smRaw = JSON.stringify(sm);
    expect(smRaw).not.toContain(eventId);
    expect(smRaw).not.toContain(required.id);
    expect(smRaw).not.toMatch(/event_id|calendar_id|recipient_entity_ids/);
    console.log(`[pc] safe roster projection: ${roles.join(" · ")} — no ids`);

    // 4) Non-party employee sees ZERO meetings (caller-scoped source).
    const npList = await request.get(`${API}/work-os/ledger?ledger_type=MEETING`, { headers: auth(nonparty.token) });
    expect(npList.status()).toBe(200);
    const npEntries = ((await npList.json()) as { entries: Array<Record<string, unknown>> }).entries;
    const npMeetings = npEntries.filter((e) => e.ledger_type === "MEETING");
    expect(npMeetings.length, "a non-party employee must see NO meetings").toBe(0);
    console.log(`[pc] non-party employee sees ${npMeetings.length} meetings — Scheduled lane is caller-scoped`);
  } finally {
    if (eventId !== null) {
      await request.post(`${API}/calendar/events/delete`, { headers: auth(admin), data: { event_id: eventId, calendar_id: calendarId }, failOnStatusCode: false }).catch(() => {});
    }
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
    console.log(`[pc] cleanup: event deleted, MEETING rows swept, ${suspended} identities suspended`);
  }
});
