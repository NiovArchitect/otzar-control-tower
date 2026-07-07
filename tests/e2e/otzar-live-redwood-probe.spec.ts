// FILE: otzar-live-redwood-probe.spec.ts
// PURPOSE: [REDWOOD-RUNTIME LIVE] The 2-persona Redwood conflict-pattern
//          probe against the NIOV SMOKE ORG over real HTTPS — the live
//          counterpart of FND tests/integration/redwood-atlas-runtime.test.ts,
//          provisioning through the REAL rails (member create → invite →
//          activate → password login; NO direct DB writes, NO Google/OAuth
//          claims anywhere) and proving the truth-weight arc end to end:
//            admin-authored 3A decision rights → self-set timezones →
//            conflict-pair ingest → supersession links at ingest → the
//            clarity rail LEADS with the calm correction → sales overreach
//            lands exceeds-authority (quiet honest flag, never approved
//            truth) → non-party probe is an enumeration-safe 404 → every
//            human-read string passes the no-mechanics sweep.
//          TENANCY: runs ONLY against the smoke org (smoke-admin login).
//          Set OTZAR_SMOKE_ADMIN_PASSWORD (and optionally
//          OTZAR_SMOKE_ADMIN_EMAIL) — the spec SKIPS without it and can
//          never fall back onto the demo org.
//          REPEAT-SAFETY: every run mints letter-suffixed surnames AND
//          letter-suffixed content tokens, so prior-run residue (suspended
//          personas, old ledger rows) can never make the supersession
//          matcher ambiguous ("unresolved beats guessed" — the 2026-07-06
//          probe's Northstar lesson) and name-token authority matching
//          stays unique per run. The speaker's SURNAME must directly
//          precede "owns" in transcripts (the responsibility-graph NAME
//          pattern captures one capitalized token).
//          CLEANUP: canonical rails only — personas are SUSPENDED in
//          finally (logins fail closed); ledger rows remain contained in
//          the disposable smoke org per runbook §5 leave-alone policy.
// CONNECTS TO: docs/otzar/OTZAR_PILOT_OPS_RUNBOOK.md §3 + §4 (smoke
//          tenancy + gates), docs/otzar/simulation/redwood-atlas/ (the
//          full-corpus doctrine this probe fronts), FND
//          responsibility-graph.ts / supersession-linking.service.ts /
//          truth-weight.service.ts (the substrate under live proof).

import { test, expect, type APIRequestContext } from "@playwright/test";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL =
  process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "smoke-admin@niovlabs.com";
const ADMIN_PW = process.env.OTZAR_SMOKE_ADMIN_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

// Letters-only run suffix: safe inside a single capitalized name token
// and inside content tokens (the extractor's NAME class is [A-Z][A-Za-z]+).
const SUF = Array.from({ length: 6 }, () =>
  String.fromCharCode(97 + Math.floor(Math.random() * 26)),
).join("");
const RUN = `rw${SUF}`;

test.skip(!ADMIN_PW, "Set OTZAR_SMOKE_ADMIN_PASSWORD (smoke org only).");

/** No raw mechanics in anything a human reads: no UUIDs, no lineage/enum
 *  tokens, no ranking vocabulary. */
function expectHumanCopy(text: string): void {
  expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  expect(text).not.toMatch(
    /\b(recommend_only|exceeds_authority|within_authority|superseding_decision|memory_reference|policy_constraint|authorized_decision|weight_class)\b/,
  );
  expect(text).not.toMatch(/\btruth[_ ]weight\b|\brank\b/i);
}

/** One live ingest with bounded retry on transient gateway errors
 *  (502/503/504) — ported from the corpus spec (proven 2026-07-07): a
 *  single edge blip must not fail the probe. Non-5xx statuses return
 *  immediately (they are real answers, not transport noise). */
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
    console.log(`[redwood-probe] transient ${last.status()} on ingest — retrying`);
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
  const body = (await res.json()) as { token: string; allowed_operations: string[] };
  for (const op of ops) expect(body.allowed_operations).toContain(op);
  return body.token;
}

test("Redwood 2-persona conflict-pattern probe on the smoke org: rails-only provisioning, supersession + calm correction, overreach flag, boundary 404, cleanup", async ({ request }) => {
  test.setTimeout(300_000);
  const admin = await login(request, ADMIN_EMAIL, ADMIN_PW!, ["read", "write", "admin_org"]);
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  // Run-unique identities: surname is ONE capitalized token ending right
  // before "owns" in transcripts; content tokens are run-unique so the
  // supersession candidate search can never cross runs.
  const personas = [
    { slug: "elena", first: "Elena", last: `Torres${SUF.charAt(0).toUpperCase()}${SUF.slice(1)}` },
    { slug: "theo", first: "Theo", last: `Williams${SUF.charAt(0).toUpperCase()}${SUF.slice(1)}` },
  ] as const;
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};

  try {
    // ── Provision through the LIVE RAILS (password auth only) ──
    for (const p of personas) {
      const email = `pilot-smoke+${RUN}-${p.slug}@niovlabs.com`;
      const created = await request.post(`${API}/org/members`, {
        headers: auth(admin),
        data: { email, first_name: p.first, last_name: p.last },
      });
      expect(created.status()).toBe(201);
      ids[p.slug] = ((await created.json()) as { entity_id: string }).entity_id;
      const invited = await request.post(`${API}/org/onboarding/invite`, {
        headers: auth(admin),
        data: { entity_id: ids[p.slug] },
      });
      expect(invited.status()).toBe(200);
      const activationToken = ((await invited.json()) as { activation_token: string })
        .activation_token;
      const password = `Rw-${RUN}-${p.slug}-Pass1!`;
      const activated = await request.post(`${API}/auth/activate`, {
        data: { token: activationToken, password },
      });
      expect(activated.status()).toBe(200);
      tokens[p.slug] = await login(request, email, password, ["read", "write"]);
    }

    // ── 3A rights (admin-authored) + self-set timezones ──
    const elenaRights = await request.patch(
      `${API}/org/members/${ids.elena}/decision-rights`,
      {
        headers: auth(admin),
        data: { owns: ["technical", "architecture"], can_approve: [], recommend_only: ["deadline"] },
      },
    );
    expect(elenaRights.status()).toBe(200);
    const theoRights = await request.patch(
      `${API}/org/members/${ids.theo}/decision-rights`,
      {
        headers: auth(admin),
        data: { owns: [], can_approve: [], recommend_only: ["technical", "customer"] },
      },
    );
    expect(theoRights.status()).toBe(200);
    for (const [slug, tz] of [
      ["elena", "America/Denver"],
      ["theo", "America/New_York"],
    ] as const) {
      const set = await request.patch(`${API}/org/me/work-profile`, {
        headers: auth(tokens[slug]!),
        data: { timezone: tz },
      });
      expect(set.status()).toBe(200);
    }
    // Posture read-back derives from what was authored — drift fails loudly.
    const posture = (await (
      await request.get(`${API}/org/me/decision-rights`, { headers: auth(tokens.elena!) })
    ).json()) as { rights: { owns: string[] } };
    expect(posture.rights.owns.sort()).toEqual(["architecture", "technical"]);

    // ── Conflict pair: plan → explicit supersession (Elena's domain) ──
    const elenaName = `Elena ${personas[0].last}`;
    const proj = `Sunspear${SUF.charAt(0).toUpperCase()}${SUF.slice(1)}`;
    const phase = `Gateway${SUF.charAt(0).toUpperCase()}${SUF.slice(1)}`;
    const ingest1 = await ingestWithRetry(request, tokens.elena!, {
        captured_text: `${elenaName} owns the ${proj} ${phase} migration kickoff work and will confirm the July 24 date this week.`,
        title: `${proj} planning sync`,
        force_mode: "LOCAL_FALLBACK",
      });
    expect(ingest1.status()).toBe(200);
    const row1 = ((await ingest1.json()) as {
      result: { work_items: Array<{ ledger_entry_id: string }> };
    }).result.work_items[0]!.ledger_entry_id;
    const ingest2 = await ingestWithRetry(request, tokens.elena!, {
        captured_text: [
          `${elenaName} owns the ${proj} ${phase} migration replan work and will move the kickoff to August 7 — this replaces the old July 24 plan.`,
          "I think the old date was July 24.",
          "Can we do daily syncs?",
        ].join("\n"),
        title: `${proj} replan sync`,
        force_mode: "LOCAL_FALLBACK",
      });
    expect(ingest2.status()).toBe(200);

    // ── Truth: the OLD row answers with the calm correction ──
    const answerRes = await request.get(
      `${API}/work-os/ledger/${row1}/clarity-answer?question=${encodeURIComponent("Any background on this?")}`,
      { headers: auth(tokens.elena!), timeout: 60_000 },
    );
    expect(answerRes.status()).toBe(200);
    const answer = ((await answerRes.json()) as { answer: string }).answer;
    expect(answer).toContain("You may be looking at an older plan");
    expect(answer).toContain("superseded");
    expect(answer.toLowerCase()).not.toContain("you are wrong");
    expectHumanCopy(answer);

    // ── Sales overreach in Elena's domain: flagged, never approved truth ──
    const theoName = `Theo ${personas[1].last}`;
    const overreach = await ingestWithRetry(request, tokens.theo!, {
        captured_text: `${theoName} owns the ${proj} automation pitch work and will deliver full API integration automation by launch.`,
        title: `${proj} client call`,
        force_mode: "LOCAL_FALLBACK",
      });
    expect(overreach.status()).toBe(200);
    const theoRow = ((await overreach.json()) as {
      result: { work_items: Array<{ ledger_entry_id: string }> };
    }).result.work_items[0]!.ledger_entry_id;
    const theoAnswerRes = await request.get(
      `${API}/work-os/ledger/${theoRow}/clarity-answer?question=${encodeURIComponent("Any background on this?")}`,
      { headers: auth(tokens.theo!), timeout: 60_000 },
    );
    expect(theoAnswerRes.status()).toBe(200);
    const theoAnswer = ((await theoAnswerRes.json()) as { answer: string }).answer;
    expect(theoAnswer).toContain("beyond the speaker's decision rights");
    expectHumanCopy(theoAnswer);

    // ── Boundary as UX: Theo (non-party, non-manager) on Elena's row ──
    const probe = await request.get(
      `${API}/work-os/ledger/${row1}/clarity-answer?question=${encodeURIComponent("Any background on this?")}`,
      { headers: auth(tokens.theo!), timeout: 60_000 },
    );
    expect(probe.status()).toBe(404);
    expect(JSON.stringify(await probe.json())).not.toContain(proj); // zero title leak

    // ── No governance side effects: nothing queued for approval ──
    const pending = await request.get(`${API}/escalations/pending`, {
      headers: auth(admin),
    });
    expect(((await pending.json()) as { escalations: unknown[] }).escalations).toHaveLength(0);
  } finally {
    // Cleanup rail 1: CANCEL every ledger row this run created (matched by
    // the run-unique project token in the title, or run-persona ownership).
    // CANCELLED rows are settled history — excluded from supersession
    // candidacy — so future runs always see exactly one live candidate.
    const proj = `Sunspear${SUF.charAt(0).toUpperCase()}${SUF.slice(1)}`;
    const runOwnerIds = new Set(Object.values(ids));
    for (const type of ["COMMITMENT", "MEETING"] as const) {
      const listed = await request.get(`${API}/work-os/ledger?ledger_type=${type}`, {
        headers: auth(admin),
      });
      if (listed.status() !== 200) continue;
      const entries = ((await listed.json()) as {
        entries: Array<{ ledger_entry_id: string; title: string; owner_entity_id: string | null }>;
      }).entries;
      for (const e of entries) {
        if (!e.title.includes(proj) && !runOwnerIds.has(e.owner_entity_id ?? "")) continue;
        const cancelled = await request.patch(`${API}/work-os/ledger/${e.ledger_entry_id}`, {
          headers: auth(admin),
          data: { status: "CANCELLED" },
        });
        console.log(`[redwood-probe] cancel ${type} ${e.ledger_entry_id.slice(0, 8)}: ${cancelled.status()}`);
      }
    }
    // Cleanup rail 2: suspend the run personas; suspended logins fail closed.
    for (const p of personas) {
      if (ids[p.slug] === undefined) continue;
      const cleanup = await request.patch(`${API}/org/entities/${ids[p.slug]}`, {
        headers: auth(admin),
        data: { status: "SUSPENDED" },
      });
      console.log(`[redwood-probe] cleanup suspend ${p.slug}: ${cleanup.status()}`);
    }
  }
});
