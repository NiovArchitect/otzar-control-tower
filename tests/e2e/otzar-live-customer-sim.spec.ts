// FILE: otzar-live-customer-sim.spec.ts
// PURPOSE: [CUSTOMER-SIM v1 / DANDELION CUSTOMER REALITY RUN] The lived-in
//          customer-tenant proof on the DEDICATED Meridian Field Systems
//          org (created 2026-07-07 through the dual-controlled Phase-0
//          rail — operator-1 requested, operator-2 approved). Exercises
//          the real customer experience end to end over live HTTPS:
//
//          ADMIN ARC: org timezone via the operating-profile rail → 8
//          identities through the live onboarding rails (run-suffixed
//          surnames) → reporting tree via the hierarchy rail → 3A
//          decision rights with posture read-back → dated reference docs
//          incl. an EXPLICIT supersession pair + a policy + a stale doc
//          → the HONEST missing-Google state (adapter BLOCKED_BY_
//          CREDENTIAL, oauth status without google, /drive/docs
//          NOT_CONNECTED — connected status is never faked).
//
//          TRUTH ARC (deterministic LOCAL_FALLBACK, redwood grammar +
//          the smoke-cast domain/token-isolation lessons): plan →
//          explicit supersession → the clarity rail LEADS with the calm
//          correction; a recommend-only sales speaker's promise in an
//          owned domain is flagged, never approved truth; a noise
//          standup mints NOTHING (no invented owners).
//
//          EMPLOYEE ARC: activation → starter Twin exists (TWIN-
//          BOOTSTRAP) → self-set timezone → role boundary (403 on admin
//          surfaces) → calm corrections with zero UUIDs/enums/mechanics
//          → non-party probe = enumeration-safe 404 with zero title leak.
//
//          CALENDAR HONESTY: propose + create both answer with honest
//          blockers — no event is created, nothing claims one was.
//
//          CLEANUP: run rows CANCELLED, run identities SUSPENDED; the
//          Meridian tenant persists clean for the next reality run.
// RUN: OTZAR_CUSTSIM_ADMIN_PASSWORD=… \
//      npx playwright test --config=playwright.live.config.ts tests/e2e/otzar-live-customer-sim.spec.ts
// CONNECTS TO: docs/otzar/simulation/CUSTOMER_ORG_SIMULATION_PLAN.md,
//          otzar-live-redwood-{probe,corpus}.spec.ts (the grammar +
//          isolation doctrine), live-tenancy.ts (pattern; different org).

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";
const ADMIN_EMAIL =
  process.env.OTZAR_CUSTSIM_ADMIN_EMAIL ?? "meridian-admin@niovlabs.com";
const ADMIN_PW = process.env.OTZAR_CUSTSIM_ADMIN_PASSWORD;
/** Meridian Field Systems COMPANY entity (dual-controlled Phase-0,
 *  2026-07-07). An identifier, not a credential. */
const ORG_ID =
  process.env.OTZAR_CUSTSIM_ORG_ENTITY_ID ??
  "69c07a00-2b39-4771-95c3-22c214e7ae6c";

const SUF = Array.from({ length: 6 }, () =>
  String.fromCharCode(97 + Math.floor(Math.random() * 26)),
).join("");
const Cap = SUF.charAt(0).toUpperCase() + SUF.slice(1);
const RUN = `ms${SUF}`;

test.skip(!ADMIN_PW, "Set OTZAR_CUSTSIM_ADMIN_PASSWORD (Meridian sim org only).");

// The Meridian cast — hierarchy edges + 3A rights map the company shape:
// CEO > VP Ops / VP Sales / Eng Director > leads/ICs. Surnames run-suffixed.
const CAST = [
  { slug: "ceo", first: "Alex", surname: "Varga", tz: "America/Chicago", manager: null, owns: ["strategic"], can_approve: ["finance"], recommend_only: ["technical", "product"] },
  { slug: "vpops", first: "Dana", surname: "Whitmore", tz: "America/Chicago", manager: "ceo", owns: ["execution", "deadline"], can_approve: [], recommend_only: ["finance"] },
  { slug: "vpsales", first: "Theo", surname: "Marsh", tz: "America/New_York", manager: "ceo", owns: ["customer"], can_approve: [], recommend_only: ["technical", "product"] },
  { slug: "engdir", first: "Elena", surname: "Ruiz", tz: "America/Denver", manager: "ceo", owns: ["technical", "architecture"], can_approve: [], recommend_only: ["deadline"] },
  { slug: "lead", first: "Priya", surname: "Nair", tz: "America/Chicago", manager: "engdir", owns: ["product"], can_approve: [], recommend_only: ["technical"] },
  { slug: "compliance", first: "Ruth", surname: "Adler", tz: "America/Chicago", manager: "vpops", owns: ["legal"], can_approve: [], recommend_only: ["deadline"] },
  { slug: "ic1", first: "Marco", surname: "Silva", tz: "America/Chicago", manager: "lead", owns: [], can_approve: [], recommend_only: ["technical"] },
  { slug: "ic2", first: "Jun", surname: "Park", tz: "America/Denver", manager: "lead", owns: [], can_approve: [], recommend_only: ["product"] },
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
    console.log(`[customer-sim] transient ${last.status()} on ingest — retrying`);
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

test("Customer Org Simulation v1 on Meridian: admin setup, honest Google state, truth conflicts, employee reality, calendar honesty, cleanup", async ({ request }) => {
  test.setTimeout(1_500_000);
  const admin = await login(request, ADMIN_EMAIL, ADMIN_PW!, ["read", "write", "admin_org"]);
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  // ── Tenancy guard: this token is Meridian's, or nothing runs.
  const hier = await request.get(`${API}/org/hierarchy`, { headers: auth(admin) });
  expect(((await hier.json()) as { org_entity_id: string }).org_entity_id).toBe(ORG_ID);

  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  try {
    // ── 1) ADMIN: org timezone via the operating-profile rail.
    const tzSet = await request.patch(`${API}/org/operating-profile`, {
      headers: auth(admin),
      data: { org_timezone: "America/Chicago" },
    });
    expect(tzSet.status()).toBe(200);

    // ── 2) ADMIN: provision the 8-person cast via the live rails.
    for (const p of CAST) {
      const email = `pilot-smoke+${RUN}-${p.slug}@niovlabs.com`;
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
      const token = ((await invited.json()) as { activation_token: string }).activation_token;
      const password = `Ms-${RUN}-${p.slug}-Pass1!`;
      const activated = await request.post(`${API}/auth/activate`, {
        data: { token, password },
      });
      expect(activated.status()).toBe(200);
      tokens[p.slug] = await login(request, email, password, ["read", "write"]);
    }
    console.log(`[customer-sim] 8 identities provisioned (${RUN})`);

    // ── 3) ADMIN: reporting tree + 3A rights + self-set timezones.
    for (const p of CAST) {
      if (p.manager !== null) {
        const edge = await request.post(`${API}/org/hierarchy/assign`, {
          headers: auth(admin),
          data: {
            person_entity_id: ids[p.slug],
            manager_entity_id: ids[p.manager],
            role_title: p.slug,
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
    // Posture read-back — drift fails loudly (employee sees their role honestly).
    const posture = (await (
      await request.get(`${API}/org/me/decision-rights`, { headers: auth(tokens.engdir!) })
    ).json()) as { rights: { owns: string[] } };
    expect([...posture.rights.owns].sort()).toEqual(["architecture", "technical"]);
    console.log("[customer-sim] hierarchy + rights + timezones set");

    // ── 4) ADMIN: dated reference docs on the document-context rail —
    //        an EXPLICIT supersession pair + a policy + a stale doc.
    const docs = [
      { kind: "PROJECT_BRIEF", title: `Atlas${Cap} Q3 delivery plan (June) [${RUN}]`, period: "2026-06", body: `Atlas${Cap} Q3 delivery plan, dated June 10. Field installation go-live targeted for July 24. Crew allocation: two field teams.` },
      { kind: "PROJECT_BRIEF", title: `Atlas${Cap} Q3 delivery plan — REVISED (July) [${RUN}]`, period: "2026-07", body: `Atlas${Cap} Q3 delivery plan, revised July 3. This replaces the June plan: go-live moves to August 7 after the ingestion dependency slipped. Crew allocation unchanged.` },
      { kind: "POLICY", title: `On-call and escalation policy [${RUN}]`, period: "2026-01", body: `Escalations page the on-call lead first. Client-impacting outages notify the VP Ops within 30 minutes. No exceptions by preference.` },
      { kind: "CUSTOMER_CONTEXT", title: `Harborview MSA summary (stale) [${RUN}]`, period: "2025-11", body: `Harborview master services agreement summary from November. Renewal terms under discussion; treat as historical background.` },
    ] as const;
    for (const d of docs) {
      const seeded = await request.post(`${API}/otzar/context/seed-document`, {
        headers: auth(admin),
        data: {
          source_kind: d.kind,
          title: d.title,
          body: d.body,
          currentness: d.title.includes("stale") ? "historical" : "current",
          covering_period: d.period,
        },
      });
      expect([200, 201]).toContain(seeded.status());
    }
    console.log("[customer-sim] 4 reference docs seeded (dated, one explicit supersession pair)");

    // ── 5) ADMIN: the HONEST missing-Google state — never a fake connect.
    const adapters = await request.get(`${API}/connectors/adapters`, { headers: auth(admin) });
    const adapterList = ((await adapters.json()) as { adapters?: Array<{ provider_name: string; status: string }> }).adapters ?? [];
    const google = adapterList.find((a) => a.provider_name === "GOOGLE_WORKSPACE");
    expect(google?.status).toBe("BLOCKED_BY_CREDENTIAL"); // no OAuth app creds — said plainly
    const oauth = await request.get(`${API}/connectors/oauth/status`, { headers: auth(admin) });
    const oauthRaw = JSON.stringify(await oauth.json());
    expect(oauthRaw).not.toMatch(/"GOOGLE_WORKSPACE"[^}]*"(VERIFIED|CONNECTED)/);
    const docsList = await request.get(`${API}/drive/docs`, { headers: auth(admin) });
    expect(docsList.status()).not.toBe(200); // honest refusal, never a fake list
    const docsBody = JSON.stringify(await docsList.json());
    expect(docsBody).toMatch(/NOT_CONNECTED|APP_CREDENTIALS_MISSING|TOKEN_REFRESH_FAILED/);
    console.log("[customer-sim] Google state honest: adapter blocked, no oauth, /drive/docs refuses");

    // ── 6) TRUTH ARC (deterministic grammar; domain/token isolation per
    //        the smoke-cast lessons — "backend" pins Elena's technical
    //        domain; Atlas+cutover+backend tokens are run-unique).
    const elenaName = `Elena Ruiz${Cap}`;
    const proj = `Atlas${Cap}`;
    const plan = await ingestWithRetry(request, tokens.engdir!, {
      captured_text: `${elenaName}: Ruiz${Cap} owns the ${proj} backend cutover migration and will confirm the ${proj} go-live of July 24 this week.`,
      title: `${proj} planning [${RUN}]`,
      force_mode: "LOCAL_FALLBACK",
    });
    expect(plan.status()).toBe(200);
    const items1 = ((await plan.json()) as { result: { work_items: Array<{ ledger_entry_id: string; title: string }> } }).result.work_items;
    const oldRow = (items1.find((w) => w.title.includes(proj)) ?? items1[0])!.ledger_entry_id;

    const replan = await ingestWithRetry(request, tokens.engdir!, {
      captured_text: [
        `${elenaName}: Ruiz${Cap} owns the ${proj} backend cutover migration replan and will move the ${proj} go-live to August 7 — this replaces the old July 24 cutover plan.`,
        "I think the old go-live was July 24.",
        "Should we add a third field crew?",
      ].join("\n"),
      title: `${proj} replan [${RUN}]`,
      force_mode: "LOCAL_FALLBACK",
    });
    expect(replan.status()).toBe(200);
    expect(((await replan.json()) as { result: { counts: { owned: number } } }).result.counts.owned).toBe(1);

    // The calm correction leads on the OLD row.
    const answer = ((await (
      await request.get(
        `${API}/work-os/ledger/${oldRow}/clarity-answer?question=${encodeURIComponent("Any background on this?")}`,
        { headers: auth(tokens.engdir!), timeout: 60_000 },
      )
    ).json()) as { answer: string }).answer;
    expect(answer).toContain("You may be looking at an older plan");
    expect(answer).toContain("superseded");
    expectHumanCopy(answer);
    expectNoFakeGoogle(answer);

    // Sales handoff language: flagged, never approved truth.
    const pitch = await ingestWithRetry(request, tokens.vpsales!, {
      captured_text: `Theo Marsh${Cap}: Marsh${Cap} owns the ${proj} automation pitch work and will deliver full API integration automation by launch.`,
      title: `${proj} client pitch [${RUN}]`,
      force_mode: "LOCAL_FALLBACK",
    });
    expect(pitch.status()).toBe(200);
    const pitchRow = ((await pitch.json()) as { result: { work_items: Array<{ ledger_entry_id: string }> } }).result.work_items[0]!.ledger_entry_id;
    const pitchAnswer = ((await (
      await request.get(
        `${API}/work-os/ledger/${pitchRow}/clarity-answer?question=${encodeURIComponent("Any background on this?")}`,
        { headers: auth(tokens.vpsales!), timeout: 60_000 },
      )
    ).json()) as { answer: string }).answer;
    expect(pitchAnswer).toContain("beyond the speaker's decision rights");
    expectHumanCopy(pitchAnswer);

    // Noise standup mints NOTHING (no invented owners).
    const standup = await ingestWithRetry(request, tokens.ic1!, {
      captured_text: `Marco Silva${Cap}: Site checks went fine yesterday. Jun Park${Cap}: Same on the north route. Nothing blocked.`,
      title: `Field standup [${RUN}]`,
      force_mode: "LOCAL_FALLBACK",
    });
    expect(standup.status()).toBe(200);
    expect(((await standup.json()) as { result: { counts: { owned: number } } }).result.counts.owned).toBe(0);
    console.log("[customer-sim] truth arc proven: supersession + overreach flag + zero invention");

    // ── 7) EMPLOYEE reality (ic1): starter twin, role boundary, no leaks.
    const teammates = await request.get(`${API}/org/ai-teammates?take=100`, { headers: auth(admin) });
    const twins = ((await teammates.json()) as { items?: Array<{ entity_id: string }> }).items ?? [];
    expect(twins.length).toBeGreaterThanOrEqual(1); // starter twins exist (TWIN-BOOTSTRAP)
    const boundary = await request.get(`${API}/org/assignment-targets`, { headers: auth(tokens.ic1!) });
    expect(boundary.status()).toBe(403); // role boundary: employees never see admin surfaces
    const seeds = await request.get(`${API}/org/dandelion/seeds`, { headers: auth(tokens.ic1!) });
    expect([401, 403]).toContain(seeds.status());

    // Non-party probe: ic2 on Elena's row — enumeration-safe 404, zero title leak.
    const probe = await request.get(
      `${API}/work-os/ledger/${oldRow}/clarity-answer?question=${encodeURIComponent("Any background on this?")}`,
      { headers: auth(tokens.ic2!), timeout: 60_000 },
    );
    expect(probe.status()).toBe(404);
    expect(JSON.stringify(await probe.json())).not.toContain(proj);

    // ── 8) CALENDAR honesty: propose + create both answer with honest
    //        blockers; nothing claims an event was created.
    for (const path of ["propose", "create"]) {
      const cal = await request.post(`${API}/calendar/events/${path}`, {
        headers: auth(admin),
        data: { title: `${proj} go-live sync [${RUN}]` },
        failOnStatusCode: false,
      });
      const calRaw = JSON.stringify(await cal.json());
      expectNoFakeGoogle(calRaw);
      expect(calRaw).not.toContain('"created":true');
    }
    console.log("[customer-sim] calendar honesty proven: proposal-only, no fake creation");

    // ── 9) No governance side effects.
    const pending = await request.get(`${API}/escalations/pending`, { headers: auth(admin) });
    expect(((await pending.json()) as { escalations: unknown[] }).escalations).toHaveLength(0);
  } finally {
    // ── Cleanup: cancel run rows; suspend run identities. The Meridian
    //    tenant itself persists (clean) for the next reality run.
    let cancelled = 0;
    const runOwnerIds = new Set(Object.values(ids));
    for (const type of ["COMMITMENT", "MEETING", "FOLLOW_UP", "ORG_SEEDING", "DOCUMENT_CONTEXT"] as const) {
      const listed = await request.get(`${API}/work-os/ledger?ledger_type=${type}`, { headers: auth(admin) });
      if (listed.status() !== 200) continue;
      const entries = ((await listed.json()) as {
        entries: Array<{ ledger_entry_id: string; title: string; status: string; owner_entity_id: string | null }>;
      }).entries;
      for (const e of entries) {
        if (e.status === "CANCELLED") continue;
        if (!e.title.includes(`[${RUN}]`) && !runOwnerIds.has(e.owner_entity_id ?? "")) continue;
        const res = await request.patch(`${API}/work-os/ledger/${e.ledger_entry_id}`, {
          headers: auth(admin),
          data: { status: "CANCELLED" },
        });
        if (res.status() === 200) cancelled += 1;
      }
    }
    console.log(`[customer-sim] cancelled ${cancelled} run rows`);
    for (const p of CAST) {
      if (ids[p.slug] === undefined) continue;
      const cleanup = await request.patch(`${API}/org/entities/${ids[p.slug]}`, {
        headers: auth(admin),
        data: { status: "SUSPENDED" },
      });
      console.log(`[customer-sim] suspend ${p.slug}: ${cleanup.status()}`);
    }
  }
});
