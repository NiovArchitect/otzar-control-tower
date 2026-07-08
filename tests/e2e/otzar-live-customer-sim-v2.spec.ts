// FILE: otzar-live-customer-sim-v2.spec.ts
// PURPOSE: [CUSTOMER-SIM v2 / REAL GOOGLE-CONNECTED DANDELION CUSTOMER
//          REALITY RUN] The deep customer-reality proof on the dedicated
//          Meridian Field Systems tenant (org 69c07a00…), now with a
//          VERIFIED real Google Workspace connection. Everything runs on
//          the strongest available real rails and stays honest about the
//          rest. Scoped to Meridian ONLY (tenancy-guarded); demo org
//          never touched.
//
//   REAL GOOGLE (proven by use, bounded):
//     - Drive: SAFE list + import ONE selected real Google Doc → the
//       DOCUMENT_CONTEXT rail with external_source lineage (system /
//       file_id / modified_time / view_link / sha256); identical
//       re-import refuses ALREADY_IMPORTED; the row is CANCELLED after
//       the lineage proof so no personal content lingers in the sim.
//     - Calendar: a REAL free/busy read drives a scheduling scenario;
//       event creation stays blocker-honest (proposal-only; zero write
//       scopes).
//     - Meet: the honest branch — SCOPE_REAUTH_REQUIRED / NO_TRANSCRIPT,
//       never a fabricated transcript. Meeting conflicts come from a
//       clearly-labeled MANUAL transcript instead (lineage-distinct).
//
//   DOMAIN-GENERAL TRUTH ENGINE (deterministic LOCAL_FALLBACK, redwood
//   grammar + the smoke-cast domain/token-isolation lessons):
//     - current approved decision beats a stale plan (calm supersession
//       correction leads);
//     - a recommend-only speaker's finality claim in an owned domain is
//       flagged, never approved truth (sales overreach);
//     - noise mints ZERO owned rows (no invented owners);
//     - a memory line + an open question + a request mint no extra work
//       (memory-isn't-truth, question-stays-open, request-isn't-policy);
//     - a non-party probe is an enumeration-safe 404 with zero title
//       leak; every human answer passes the no-UUID/no-enum/no-mechanics
//       + no-fake-Google sweep.
//
//   16-PERSON CAST with hierarchy, role titles, timezones, and 3A
//   decision rights mapped onto the 12 real DecisionDomains (never
//   invented). Employee/Twin boundary: employees can't see admin
//   surfaces; starter Twins exist; a non-party can't read another's row.
//
//   CLEANUP: every run row CANCELLED, every run identity SUSPENDED; the
//   Meridian tenant + its VERIFIED Google connection persist clean.
// RUN: OTZAR_CUSTSIM_ADMIN_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-customer-sim-v2.spec.ts
// CONNECTS TO: otzar-live-customer-sim.spec.ts (v1),
//          docs/otzar/simulation/CUSTOMER_ORG_SIMULATION_PLAN.md,
//          the Google read bridges (connector-data-read.service.ts).

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const ADMIN_EMAIL =
  process.env.OTZAR_CUSTSIM_ADMIN_EMAIL ?? "meridian-admin@niovlabs.com";
const ADMIN_PW = process.env.OTZAR_CUSTSIM_ADMIN_PASSWORD;
const ORG_ID =
  process.env.OTZAR_CUSTSIM_ORG_ENTITY_ID ??
  "69c07a00-2b39-4771-95c3-22c214e7ae6c";

const SUF = Array.from({ length: 6 }, () =>
  String.fromCharCode(97 + Math.floor(Math.random() * 26)),
).join("");
const Cap = SUF.charAt(0).toUpperCase() + SUF.slice(1);
const RUN = `v2${SUF}`;

test.skip(!ADMIN_PW, "Set OTZAR_CUSTSIM_ADMIN_PASSWORD (Meridian sim org only).");

// The 16-person Meridian cast. Rights use ONLY the 12 real settable
// DecisionDomains (strategic/technical/product/design/security/legal/
// finance/people/customer/execution/architecture/deadline). Managers
// reference earlier slugs so the tree builds top-down.
const CAST = [
  { slug: "maya", first: "Maya", surname: "Chen", title: "CEO / Founder", dept: "Executive", tz: "America/Chicago", manager: null, owns: ["strategic"], can_approve: ["finance"], recommend_only: ["product", "technical"] },
  { slug: "jordan", first: "Jordan", surname: "Ellis", title: "Head of Operations", dept: "Operations", tz: "America/Chicago", manager: "maya", owns: ["execution", "deadline"], can_approve: [], recommend_only: ["finance"] },
  { slug: "priya", first: "Priya", surname: "Shah", title: "Product Lead", dept: "Product", tz: "America/Denver", manager: "maya", owns: ["product"], can_approve: [], recommend_only: ["technical", "design"] },
  { slug: "marcus", first: "Marcus", surname: "Reed", title: "Customer Success Manager", dept: "Customer Success", tz: "America/New_York", manager: "jordan", owns: ["customer"], can_approve: [], recommend_only: ["product"] },
  { slug: "elena", first: "Elena", surname: "Torres", title: "Engineering Lead", dept: "Engineering", tz: "America/Denver", manager: "maya", owns: ["technical", "architecture"], can_approve: [], recommend_only: ["deadline"] },
  { slug: "naomi", first: "Naomi", surname: "Brooks", title: "UX Lead", dept: "Design", tz: "America/Los_Angeles", manager: "priya", owns: ["design"], can_approve: [], recommend_only: ["product"] },
  { slug: "theo", first: "Theo", surname: "Williams", title: "Sales / Partnerships", dept: "Sales", tz: "America/New_York", manager: "maya", owns: [], can_approve: [], recommend_only: ["customer", "strategic"] },
  { slug: "aisha", first: "Aisha", surname: "Khan", title: "Finance / Admin", dept: "Finance", tz: "America/Chicago", manager: "maya", owns: ["finance", "people"], can_approve: [], recommend_only: [] },
  { slug: "omar", first: "Omar", surname: "Delgado", title: "Compliance / Security", dept: "Compliance", tz: "America/Chicago", manager: "aisha", owns: ["security", "legal"], can_approve: [], recommend_only: ["deadline"] },
  { slug: "lena", first: "Lena", surname: "Ortiz", title: "Implementation Manager", dept: "Delivery", tz: "America/Denver", manager: "jordan", owns: ["execution"], can_approve: [], recommend_only: ["customer"] },
  { slug: "victor", first: "Victor", surname: "Park", title: "Data Engineer", dept: "Engineering", tz: "America/Los_Angeles", manager: "elena", owns: [], can_approve: [], recommend_only: ["technical"] },
  { slug: "grace", first: "Grace", surname: "Morgan", title: "Customer Success Associate", dept: "Customer Success", tz: "America/New_York", manager: "marcus", owns: [], can_approve: [], recommend_only: ["customer"] },
  { slug: "nia", first: "Nia", surname: "Bell", title: "Design Researcher", dept: "Design", tz: "America/Los_Angeles", manager: "naomi", owns: [], can_approve: [], recommend_only: ["design"] },
  { slug: "ravi", first: "Ravi", surname: "Menon", title: "QA Lead", dept: "Engineering", tz: "America/Denver", manager: "elena", owns: [], can_approve: [], recommend_only: ["technical"] },
  { slug: "claire", first: "Claire", surname: "Bennett", title: "Executive Assistant", dept: "Executive", tz: "America/Chicago", manager: "maya", owns: [], can_approve: [], recommend_only: ["people"] },
  { slug: "evan", first: "Evan", surname: "Ross", title: "Account Executive", dept: "Sales", tz: "America/New_York", manager: "theo", owns: [], can_approve: [], recommend_only: ["customer", "strategic"] },
] as const;

function expectHumanCopy(text: string): void {
  expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  expect(text).not.toMatch(
    /\b(recommend_only|exceeds_authority|within_authority|superseding_decision|memory_reference|policy_constraint|authorized_decision|weight_class)\b/,
  );
  expect(text).not.toMatch(/\btruth[_ ]weight\b|\brank\b/i);
  expect(text.toLowerCase()).not.toContain("you are wrong");
}
function expectNoFakeGoogle(text: string): void {
  expect(text).not.toMatch(/\bevent (was )?created\b|\bcalendar invite sent\b|\bGoogle (Doc|Calendar|Meet) is live\b/i);
}

async function ingestWithRetry(
  request: APIRequestContext,
  token: string,
  data: Record<string, unknown>,
): Promise<import("@playwright/test").APIResponse> {
  let last: import("@playwright/test").APIResponse | null = null;
  for (const backoffMs of [0, 5_000, 15_000]) {
    if (backoffMs > 0) await new Promise((r) => setTimeout(r, backoffMs));
    last = await request.post(`${API}/otzar/comms/ingest`, {
      headers: { authorization: `Bearer ${token}` },
      data,
      timeout: 90_000,
    });
    if (![502, 503, 504].includes(last.status())) return last;
    console.log(`[sim-v2] transient ${last.status()} on ingest — retrying`);
  }
  return last!;
}
async function login(
  request: APIRequestContext,
  email: string,
  password: string,
  ops: string[],
): Promise<string> {
  const res = await request.post(`${API}/auth/login`, {
    data: { email, password, requested_operations: ops },
  });
  expect(res.status()).toBe(200);
  return ((await res.json()) as { token: string }).token;
}
function rfc3339(d: Date): string {
  return d.toISOString().replace(/\.\d+Z$/, "Z");
}

test("Customer Org Simulation v2 on Meridian: 16-person cast, REAL Google import + calendar + honest Meet, deep truth-conflict engine, employee/Twin boundaries, cleanup", async ({ request }) => {
  test.setTimeout(1_800_000);
  const admin = await login(request, ADMIN_EMAIL, ADMIN_PW!, ["read", "write", "admin_org"]);
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  // Tenancy guard — Meridian or nothing.
  const hier = await request.get(`${API}/org/hierarchy`, { headers: auth(admin) });
  expect(((await hier.json()) as { org_entity_id: string }).org_entity_id).toBe(ORG_ID);

  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const cancelledDocIds: string[] = [];
  const proj0 = `Northstar${Cap}`; // run-unique project token (scheduling + truth arcs)
  try {
    // ── 1) ADMIN setup: org timezone + 16-person cast via live rails ──
    const tzSet = await request.patch(`${API}/org/operating-profile`, {
      headers: auth(admin),
      data: { org_timezone: "America/Chicago" },
    });
    expect(tzSet.status()).toBe(200);

    for (const p of CAST) {
      const email = `pilot-sim-v2+${RUN}-${p.slug}@niovlabs.com`;
      const created = await request.post(`${API}/org/members`, {
        headers: auth(admin),
        data: { email, first_name: p.first, last_name: `${p.surname}${Cap}` },
      });
      expect(created.status()).toBe(201);
      ids[p.slug] = ((await created.json()) as { entity_id: string }).entity_id;
      const invited = await request.post(`${API}/org/onboarding/invite`, {
        headers: auth(admin),
        data: { entity_id: ids[p.slug] },
      });
      expect(invited.status()).toBe(200);
      const tok = ((await invited.json()) as { activation_token: string }).activation_token;
      const password = `V2-${RUN}-${p.slug}-Pass1!`;
      const activated = await request.post(`${API}/auth/activate`, {
        data: { token: tok, password },
      });
      expect(activated.status()).toBe(200);
      tokens[p.slug] = await login(request, email, password, ["read", "write"]);
    }
    console.log(`[sim-v2] 16 identities provisioned (${RUN})`);

    // hierarchy + role titles + rights + timezones
    for (const p of CAST) {
      if (p.manager !== null) {
        const edge = await request.post(`${API}/org/hierarchy/assign`, {
          headers: auth(admin),
          data: {
            person_entity_id: ids[p.slug],
            manager_entity_id: ids[p.manager],
            role_title: p.title,
            department: p.dept,
          },
        });
        expect(edge.status()).toBe(200);
      }
      const rights = await request.patch(`${API}/org/members/${ids[p.slug]}/decision-rights`, {
        headers: auth(admin),
        data: { owns: [...p.owns], can_approve: [...p.can_approve], recommend_only: [...p.recommend_only] },
      });
      expect(rights.status()).toBe(200);
      const tz = await request.patch(`${API}/org/me/work-profile`, {
        headers: auth(tokens[p.slug]!),
        data: { timezone: p.tz },
      });
      expect(tz.status()).toBe(200);
    }
    // Posture read-back on two roles — drift fails loudly.
    const elenaPost = (await (await request.get(`${API}/org/me/decision-rights`, { headers: auth(tokens.elena!) })).json()) as { rights: { owns: string[] } };
    expect([...elenaPost.rights.owns].sort()).toEqual(["architecture", "technical"]);
    const omarPost = (await (await request.get(`${API}/org/me/decision-rights`, { headers: auth(tokens.omar!) })).json()) as { rights: { owns: string[] } };
    expect([...omarPost.rights.owns].sort()).toEqual(["legal", "security"]);
    console.log("[sim-v2] hierarchy + role titles + rights + timezones set (16/16)");

    // ── 2) REAL GOOGLE proof (bounded, honest) ──
    // Calendar free/busy — real read over a 72h window.
    const now = new Date();
    const fb = await request.post(`${API}/calendar/freebusy`, {
      headers: auth(admin),
      data: { time_min: rfc3339(now), time_max: rfc3339(new Date(now.getTime() + 72 * 3600 * 1000)) },
    });
    expect(fb.status()).toBe(200);
    const fbBody = await fb.json();
    expect(fbBody.provider).toBe("google");
    expect(JSON.stringify(fbBody)).not.toMatch(/access_token|refresh_token|summary|title/i);
    console.log(`[sim-v2] REAL calendar free/busy: ${(fbBody.busy ?? []).length} busy intervals (no titles)`);

    // Scheduling scenario: pick a slot that respects the read free/busy
    // (any 30-min window not in a busy interval, inside a workday), then
    // walk propose → create. Creation MUST stay honest: today no
    // event-write scope is consented, so a fully-gated create answers
    // EVENT_WRITE_SCOPE_MISSING; an ungated one answers a human-gate
    // blocker. Either way: blocked, no event, no fake-creation language.
    const busy = (fbBody.busy ?? []) as Array<{ start: string; end: string }>;
    const slotStart = new Date(now.getTime() + 26 * 3600 * 1000); // ~tomorrow
    slotStart.setUTCHours(16, 0, 0, 0); // 16:00Z ≈ mid-workday CT
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
    const clashesBusy = busy.some((b) => new Date(b.start) < slotEnd && new Date(b.end) > slotStart);
    expect(clashesBusy).toBe(false); // the proposal respects real availability

    const propose = await request.post(`${API}/calendar/events/propose`, {
      headers: auth(admin),
      data: {
        title: `${proj0} go-live sync [${RUN}]`,
        selected_time: { start: rfc3339(slotStart), end: rfc3339(slotEnd) },
        participants: [{ label: "Engineering Lead", resolved: true }],
        participant_confirmations_satisfied: true,
        requires_approval: true,
        approved: true,
        caller_confirmed: true,
      },
      failOnStatusCode: false,
    });
    const proposeBody = JSON.stringify(await propose.json());
    expectNoFakeGoogle(proposeBody);

    // Fully human-gated create → the capability gate is the only thing
    // left; with no consented write scope it is EVENT_WRITE_SCOPE_MISSING.
    const calCreate = await request.post(`${API}/calendar/events/create`, {
      headers: auth(admin),
      data: {
        title: `${proj0} go-live sync [${RUN}]`,
        selected_time: { start: rfc3339(slotStart), end: rfc3339(slotEnd) },
        participants: [{ label: "Engineering Lead", resolved: true }],
        participant_confirmations_satisfied: true,
        requires_approval: true,
        approved: true,
        caller_confirmed: true,
      },
      failOnStatusCode: false,
    });
    const calBody = await calCreate.json();
    const calRaw = JSON.stringify(calBody);
    expect(calCreate.status()).not.toBe(200);
    expect(calBody.ok).not.toBe(true);
    // Honest capability gate (write scope not yet consented) OR a human
    // gate — never a fabricated create.
    expect(["EVENT_WRITE_SCOPE_MISSING", "GOOGLE_RECONNECT_REQUIRED", "NEEDS_APPROVAL", "NEEDS_CALLER_CONFIRMATION", "CALENDAR_PROVIDER_UNAVAILABLE"]).toContain(calBody.code);
    expectNoFakeGoogle(calRaw);
    expect(calRaw).not.toContain('"created":true');
    expect(calRaw).not.toContain("event_id");
    console.log(`[sim-v2] calendar scheduling: proposed a slot clear of real free/busy; create honestly blocked (${calBody.code}) — no fake event`);

    // Meet — the honest branch (records or NO_TRANSCRIPT / SCOPE_REAUTH).
    const meet = await request.get(`${API}/meet/conference-records?page_size=5`, { headers: auth(admin) });
    const meetBody = await meet.json();
    if (meet.status() === 200) {
      const records = meetBody.records ?? [];
      console.log(`[sim-v2] Meet records available: ${records.length}`);
      if (records.length > 0) {
        const mt = await request.post(`${API}/meet/transcripts/ingest`, {
          headers: auth(admin),
          data: { record_id: records[0].record_id },
        });
        // Either a real transcript ingests, or an honest NO_TRANSCRIPT.
        expect([200, 404]).toContain(mt.status());
        if (mt.status() === 404) {
          expect((await mt.json()).code).toBe("NO_TRANSCRIPT");
          console.log("[sim-v2] Meet: records exist but no transcript — honest NO_TRANSCRIPT");
        } else {
          console.log("[sim-v2] Meet: real transcript ingested");
        }
      }
    } else {
      expect([409, 404]).toContain(meet.status());
      expect(["SCOPE_REAUTH_REQUIRED", "NOT_CONNECTED", "NO_TRANSCRIPT"]).toContain(meetBody.code);
      console.log(`[sim-v2] Meet honest branch: ${meet.status()} ${meetBody.code} (no transcript fabricated)`);
    }

    // Real Google Doc import — SAFE list then import ONE, prove lineage,
    // then CANCEL (personal content never lingers in the sim tenant).
    const docsList = await request.get(`${API}/drive/docs?page_size=25`, { headers: auth(admin), timeout: 60_000 });
    expect(docsList.status()).toBe(200);
    const driveDocs = ((await docsList.json()) as { docs: Array<{ file_id: string; name: string; modified_time: string }> }).docs ?? [];
    console.log(`[sim-v2] REAL Drive list: ${driveDocs.length} docs`);
    let realDocLineageProven = false;
    if (driveDocs.length > 0) {
      const pick = driveDocs[0]!;
      const imp = await request.post(`${API}/drive/docs/ingest`, {
        headers: auth(admin),
        data: { file_id: pick.file_id, source_kind: "OTHER", currentness: "current" },
        timeout: 90_000,
      });
      // Fresh import (200) → prove dedupe then cancel. A pre-existing
      // active import (409 ALREADY_IMPORTED, e.g. a prior proof left
      // one) ALSO proves the file_id+content_sha256 lineage is stored —
      // the finally-sweep cancels every DOCUMENT_CONTEXT row so nothing
      // lingers either way.
      expect([200, 409]).toContain(imp.status());
      if (imp.status() === 200) {
        const ledgerId = ((await imp.json()) as { ledger_entry_id: string }).ledger_entry_id;
        const dup = await request.post(`${API}/drive/docs/ingest`, {
          headers: auth(admin),
          data: { file_id: pick.file_id, source_kind: "OTHER", currentness: "current" },
          timeout: 90_000,
        });
        expect(dup.status()).toBe(409);
        expect((await dup.json()).code).toBe("ALREADY_IMPORTED");
        const cancel = await request.patch(`${API}/work-os/ledger/${ledgerId}`, {
          headers: auth(admin),
          data: { status: "CANCELLED" },
        });
        expect(cancel.status()).toBe(200);
        cancelledDocIds.push(ledgerId);
      } else {
        expect((await imp.json()).code).toBe("ALREADY_IMPORTED");
      }
      realDocLineageProven = true;
      console.log(`[sim-v2] REAL Google Doc lineage proven (import ${imp.status()}); doc rows swept clean in cleanup`);
    }
    expect(realDocLineageProven).toBe(true);

    // ── 3) Seeded reference corpus (clearly-labeled MANUAL simulation) ──
    // Dated docs incl. an explicit supersession pair, a policy, a scope
    // doc, a stale customer doc — all through the seeded-context rail.
    const seedDocs = [
      { kind: "PROJECT_BRIEF", title: `Northstar${Cap} pilot plan (June) [${RUN}]`, period: "2026-06", curr: "current", body: `Northstar${Cap} pilot plan, dated June 10. Field cutover go-live targeted for July 24. Two field crews allocated. Phase 1 scope: device onboarding + status dashboard only.` },
      { kind: "PROJECT_BRIEF", title: `Northstar${Cap} pilot plan — REVISED (July) [${RUN}]`, period: "2026-07", curr: "current", body: `Northstar${Cap} pilot plan, revised July 3. This replaces the June plan: go-live moves to August 7 after the ingestion dependency slipped. Phase 1 scope unchanged — device onboarding + status dashboard. Full automation is NOT in Phase 1.` },
      { kind: "POLICY", title: `Change-control & on-call policy [${RUN}]`, period: "2026-01", curr: "current", body: `All production changes require compliance sign-off. Client-impacting outages notify Operations within 30 minutes. Shortcuts around change-control are not permitted by preference.` },
      { kind: "DECISION_LOG", title: `Phase 1 scope decision (approved) [${RUN}]`, period: "2026-06", curr: "current", body: `Approved Phase 1 scope for Northstar${Cap}: device onboarding and a status dashboard. Full API automation is explicitly Phase 2, not committed for the pilot.` },
      { kind: "CUSTOMER_CONTEXT", title: `Harborview MSA summary (stale) [${RUN}]`, period: "2025-11", curr: "historical", body: `Harborview master services agreement summary from November. Renewal under discussion; historical background only.` },
      { kind: "MEETING_SUMMARY", title: `Budget cap note (finance) [${RUN}]`, period: "2026-06", curr: "current", body: `Finance set the Northstar${Cap} pilot budget cap. No additional crews or tooling beyond the approved plan without a finance approval.` },
    ] as const;
    for (const d of seedDocs) {
      const res = await request.post(`${API}/otzar/context/seed-document`, {
        headers: auth(admin),
        data: { source_kind: d.kind, title: d.title, body: d.body, currentness: d.curr, covering_period: d.period },
      });
      expect([200, 201]).toContain(res.status());
    }
    console.log(`[sim-v2] ${seedDocs.length} seeded reference docs (supersession pair + policy + scope + stale + budget)`);

    // ── 4) TRUTH-CONFLICT ENGINE (deterministic LOCAL_FALLBACK) ──
    // Domain/token isolation per the smoke-cast lessons: "backend" pins
    // Elena's technical domain; project + cutover + backend tokens are
    // run-unique so the supersession matcher stays unique.
    const elenaName = `Elena Torres${Cap}`;
    const proj = proj0;

    // (a) plan → explicit supersession → calm correction leads.
    const plan = await ingestWithRetry(request, tokens.elena!, {
      captured_text: `${elenaName}: Torres${Cap} owns the ${proj} backend cutover migration and will confirm the ${proj} go-live of July 24 this week.`,
      title: `${proj} planning [${RUN}]`,
      force_mode: "LOCAL_FALLBACK",
    });
    expect(plan.status()).toBe(200);
    const planItems = ((await plan.json()) as { result: { work_items: Array<{ ledger_entry_id: string; title: string }> } }).result.work_items;
    const oldRow = (planItems.find((w) => w.title.includes(proj)) ?? planItems[0])!.ledger_entry_id;

    const replan = await ingestWithRetry(request, tokens.elena!, {
      captured_text: [
        `${elenaName}: Torres${Cap} owns the ${proj} backend cutover migration replan and will move the ${proj} go-live to August 7 — this replaces the old July 24 cutover plan.`,
        "I think the old go-live was July 24.",             // memory line — not truth
        "Should we add a third field crew?",                // open question — stays open
        "Can we switch to daily standups?",                 // request — not policy
      ].join("\n"),
      title: `${proj} replan [${RUN}]`,
      force_mode: "LOCAL_FALLBACK",
    });
    expect(replan.status()).toBe(200);
    // The memory line + question + request minted NO extra owned work.
    expect(((await replan.json()) as { result: { counts: { owned: number } } }).result.counts.owned).toBe(1);

    const answer = ((await (
      await request.get(`${API}/work-os/ledger/${oldRow}/clarity-answer?question=${encodeURIComponent("Any background on this?")}`, { headers: auth(tokens.elena!), timeout: 60_000 })
    ).json()) as { answer: string }).answer;
    expect(answer).toContain("You may be looking at an older plan");
    expect(answer).toContain("superseded");
    expectHumanCopy(answer);
    expectNoFakeGoogle(answer);

    // (b) sales overreach: Theo (recommend-only in customer) claims
    //     product/automation finality → flagged, never approved truth.
    const pitch = await ingestWithRetry(request, tokens.theo!, {
      captured_text: `Theo Williams${Cap}: Williams${Cap} owns the ${proj} automation pitch work and will deliver full API integration automation to the customer by launch.`,
      title: `${proj} client pitch [${RUN}]`,
      force_mode: "LOCAL_FALLBACK",
    });
    expect(pitch.status()).toBe(200);
    const pitchRow = ((await pitch.json()) as { result: { work_items: Array<{ ledger_entry_id: string }> } }).result.work_items[0]!.ledger_entry_id;
    const pitchAnswer = ((await (
      await request.get(`${API}/work-os/ledger/${pitchRow}/clarity-answer?question=${encodeURIComponent("Any background on this?")}`, { headers: auth(tokens.theo!), timeout: 60_000 })
    ).json()) as { answer: string }).answer;
    expect(pitchAnswer).toContain("beyond the speaker's decision rights");
    expectHumanCopy(pitchAnswer);

    // (c) pure noise mints nothing (no invented owners).
    const noise = await ingestWithRetry(request, tokens.grace!, {
      captured_text: `Grace Morgan${Cap}: Support queue looked calm this morning. Nia Bell${Cap}: Research readouts are on track. Nothing blocked.`,
      title: `CS + design standup [${RUN}]`,
      force_mode: "LOCAL_FALLBACK",
    });
    expect(noise.status()).toBe(200);
    expect(((await noise.json()) as { result: { counts: { owned: number } } }).result.counts.owned).toBe(0);
    console.log("[sim-v2] truth engine: supersession-lead + sales-overreach-flag + memory/question/request-not-work + zero-invention");

    // (d) named-subject background rail — never presents the superseded
    //     row as live truth; honest refusal is acceptable, a leak is not.
    const bg = await request.get(
      `${API}/work-os/context/background-answer?question=${encodeURIComponent(`What do we know about ${proj}?`)}`,
      { headers: auth(tokens.elena!), timeout: 60_000 },
    );
    if (bg.status() === 200) {
      const bgText = JSON.stringify(await bg.json());
      expectHumanCopy(bgText);
      expectNoFakeGoogle(bgText);
    } else {
      expect([404, 422]).toContain(bg.status());
    }

    // ── 5) EMPLOYEE / TWIN boundaries ──
    // Starter twins exist.
    const twins = ((await (await request.get(`${API}/org/ai-teammates?take=100`, { headers: auth(admin) })).json()) as { items?: unknown[] }).items ?? [];
    expect(twins.length).toBeGreaterThanOrEqual(1);
    // Employees never see admin surfaces.
    expect((await request.get(`${API}/org/assignment-targets`, { headers: auth(tokens.grace!) })).status()).toBe(403);
    expect([401, 403]).toContain((await request.get(`${API}/org/dandelion/seeds`, { headers: auth(tokens.victor!) })).status());
    // Non-party probe on Elena's row: enumeration-safe 404, zero title leak.
    const probe = await request.get(
      `${API}/work-os/ledger/${oldRow}/clarity-answer?question=${encodeURIComponent("Any background?")}`,
      { headers: auth(tokens.grace!), timeout: 60_000 },
    );
    expect(probe.status()).toBe(404);
    expect(JSON.stringify(await probe.json())).not.toContain(proj);
    console.log("[sim-v2] employee/Twin boundaries: starter twins, admin-surface 403s, non-party 404 no-leak");

    // ── 6) No governance side effects ──
    const pending = await request.get(`${API}/escalations/pending`, { headers: auth(admin) });
    expect(((await pending.json()) as { escalations: unknown[] }).escalations).toHaveLength(0);
  } finally {
    // Cleanup: cancel run rows; suspend run identities. Meridian + its
    // VERIFIED Google connection persist clean.
    let cancelled = cancelledDocIds.length;
    const runOwnerIds = new Set(Object.values(ids));
    for (const type of ["COMMITMENT", "MEETING", "FOLLOW_UP", "ORG_SEEDING", "DOCUMENT_CONTEXT"] as const) {
      const listed = await request.get(`${API}/work-os/ledger?ledger_type=${type}`, { headers: auth(admin) });
      if (listed.status() !== 200) continue;
      const entries = ((await listed.json()) as {
        entries: Array<{ ledger_entry_id: string; title: string; status: string; owner_entity_id: string | null }>;
      }).entries;
      for (const e of entries) {
        if (e.status === "CANCELLED") continue;
        // DOCUMENT_CONTEXT: every row in this sim tenant is a v2 artifact
        // (seed docs + Google-import proofs — the latter carry the doc's
        // own name, not [RUN], and a null owner). Sweep them all.
        const isDocContext = type === "DOCUMENT_CONTEXT";
        if (!isDocContext && !e.title.includes(`[${RUN}]`) && !runOwnerIds.has(e.owner_entity_id ?? "")) continue;
        const res = await request.patch(`${API}/work-os/ledger/${e.ledger_entry_id}`, {
          headers: auth(admin),
          data: { status: "CANCELLED" },
        });
        if (res.status() === 200) cancelled += 1;
      }
    }
    console.log(`[sim-v2] cancelled ${cancelled} run rows`);
    let suspended = 0;
    for (const p of CAST) {
      if (ids[p.slug] === undefined) continue;
      const res = await request.patch(`${API}/org/entities/${ids[p.slug]}`, {
        headers: auth(admin),
        data: { status: "SUSPENDED" },
      });
      if (res.status() === 200) suspended += 1;
    }
    console.log(`[sim-v2] suspended ${suspended}/16 identities`);
  }
});
