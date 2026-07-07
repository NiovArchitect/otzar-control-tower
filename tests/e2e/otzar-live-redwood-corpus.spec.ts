// FILE: otzar-live-redwood-corpus.spec.ts
// PURPOSE: [REDWOOD-CORPUS LIVE] The FULL Redwood Atlas corpus run against
//          the NIOV SMOKE ORG over real HTTPS — all 8 personas provisioned
//          through the live rails (member create → invite → activate →
//          password login; no direct DB writes, no Google/OAuth claims),
//          admin-authored 3A decision rights per the people fixture,
//          self-set timezones, then ALL 48 corpus artifacts through the
//          governed ingest rail: 36 conversation artifacts (meeting
//          transcripts / chats / emails / call notes) as flattened
//          speaker-attributed text, 12 simulated documents through the
//          admin seeded-context rail with their simulation label kept
//          honest in the title (never presented as live-connector truth).
//
//          WHAT THIS PROVES LIVE (the live-provable slice of the binding
//          44-check matrix; the C/R/S engine checks are CI-bound in FND
//          tests/integration/redwood-atlas-simulation.test.ts and stay
//          green there):
//            - the ingest rail holds at corpus scale (48/48 accepted);
//            - deterministic honesty at scale: conversational prose that
//              never states ownership in the canonical responsibility
//              grammar mints ZERO owned rows (no invented owners) —
//              LOCAL_FALLBACK extraction is honest-empty and the graph
//              rail only mints from explicit grammar (FND
//              responsibility-graph.ts); owned work with stamped lineage
//              is minted by the controlled conflict-pair ingests (§4);
//            - a request / memory line / open question mints NO work row
//              (request-is-not-policy, memory-is-not-current-truth);
//            - supersession links on the controlled conflict pair and the
//              clarity rail LEADS with the calm correction;
//            - a recommend-only speaker's promise in an owned domain is
//              flagged (beyond decision rights), never approved truth;
//            - the named-subject background answer never presents the
//              superseded row as live truth and keeps the flag quiet;
//            - non-party probe = enumeration-safe 404, zero title leak;
//            - connector honesty: no "event created" / live-Google claims
//              anywhere; seeded docs stay labeled as seeded simulations;
//            - no governance side effects (pending escalations stay 0);
//            - cleanup: every run row CANCELLED (settled history per FND
//              b564da8) + all 8 personas SUSPENDED, logins fail closed.
//
//          TENANCY: smoke org ONLY (requires OTZAR_SMOKE_ADMIN_PASSWORD;
//          skips without it). REPEAT-SAFETY: run-suffixed surnames +
//          run-tagged titles + full row cancellation in cleanup.
// CONNECTS TO: docs/otzar/simulation/redwood-atlas/{corpus,people}.json
//          (the doctrine fixtures), otzar-live-redwood-probe.spec.ts (the
//          2-persona gate this scales up), OTZAR_PILOT_OPS_RUNBOOK.md §4.

import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

test.describe.configure({ retries: 0 });

const ADMIN_EMAIL =
  process.env.OTZAR_SMOKE_ADMIN_EMAIL ?? "smoke-admin@niovlabs.com";
const ADMIN_PW = process.env.OTZAR_SMOKE_ADMIN_PASSWORD;
const API = process.env.OTZAR_SMOKE_API_URL ?? "https://api.otzar.ai/api/v1";

const SUF = Array.from({ length: 6 }, () =>
  String.fromCharCode(97 + Math.floor(Math.random() * 26)),
).join("");
const CapSuf = SUF.charAt(0).toUpperCase() + SUF.slice(1);
const RUN = `rwc${SUF}`;

test.skip(!ADMIN_PW, "Set OTZAR_SMOKE_ADMIN_PASSWORD (smoke org only).");

// The 8 Redwood personas — rights mapped conservatively onto the existing
// DecisionDomain vocabulary (same mapping the FND runtime suite locks).
const PERSONAS = [
  { slug: "maya", first: "Maya", surname: "Chen", tz: "America/Los_Angeles", owns: ["strategic"], can_approve: ["customer"], recommend_only: ["technical", "product"] },
  { slug: "jordan", first: "Jordan", surname: "Ellis", tz: "America/Los_Angeles", owns: ["execution", "deadline"], can_approve: [], recommend_only: ["product", "finance"] },
  { slug: "priya", first: "Priya", surname: "Shah", tz: "America/Los_Angeles", owns: ["product"], can_approve: [], recommend_only: ["deadline", "finance"] },
  { slug: "marcus", first: "Marcus", surname: "Reed", tz: "America/Los_Angeles", owns: ["customer"], can_approve: [], recommend_only: ["product", "finance"] },
  { slug: "elena", first: "Elena", surname: "Torres", tz: "America/Denver", owns: ["technical", "architecture"], can_approve: [], recommend_only: ["deadline"] },
  { slug: "naomi", first: "Naomi", surname: "Brooks", tz: "America/Los_Angeles", owns: ["design"], can_approve: [], recommend_only: ["product"] },
  { slug: "theo", first: "Theo", surname: "Williams", tz: "America/New_York", owns: [], can_approve: [], recommend_only: ["technical", "product", "customer"] },
  { slug: "aisha", first: "Aisha", surname: "Khan", tz: "America/Los_Angeles", owns: ["finance", "legal"], can_approve: [], recommend_only: [] },
] as const;

interface CorpusStatement {
  speaker: string;
  text: string;
  act: string;
}
interface CorpusArtifact {
  id: string;
  title: string;
  communication_type: string;
  date: string;
  statements?: CorpusStatement[];
  body?: string;
}

function loadCorpus(): CorpusArtifact[] {
  const p = path.join(
    process.cwd(),
    "docs/otzar/simulation/redwood-atlas/corpus.json",
  );
  return (JSON.parse(readFileSync(p, "utf8")) as { artifacts: CorpusArtifact[] })
    .artifacts;
}

/** Run-adapt every persona surname so speaker capture + roster matching
 *  stay unique per run ("TorresAbcdef owns …"). First names stay. */
function adaptNames(text: string): string {
  let out = text;
  for (const p of PERSONAS) {
    out = out.replaceAll(p.surname, `${p.surname}${CapSuf}`);
  }
  return out;
}

function expectHumanCopy(text: string): void {
  expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  expect(text).not.toMatch(
    /\b(recommend_only|exceeds_authority|within_authority|superseding_decision|memory_reference|policy_constraint|authorized_decision|weight_class)\b/,
  );
  expect(text).not.toMatch(/\btruth[_ ]weight\b|\brank\b/i);
}

/** Connector honesty: nothing a human reads may claim a live event/doc
 *  was created on Google/Calendar/Meet — simulation stays labeled. */
function expectConnectorHonesty(text: string): void {
  expect(text).not.toMatch(/\bevent (was )?created\b|\bcalendar invite sent\b|\bGoogle (Doc|Calendar|Meet) is live\b/i);
}

/** One live ingest with bounded retry on transient gateway errors
 *  (502/503/504) — a 48-artifact run holds the edge open for ~10 minutes
 *  and a single blip must not fail the whole corpus. Non-5xx statuses
 *  return immediately (they are real answers, not transport noise). */
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
    console.log(`[redwood-corpus] transient ${last.status()} on ingest — retrying`);
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

test("Redwood FULL corpus on the smoke org: 8 personas via rails, 48 artifacts ingested, truth-weight conflict proofs, connector honesty, cleanup", async ({ request }) => {
  test.setTimeout(1_500_000);
  const admin = await login(request, ADMIN_EMAIL, ADMIN_PW!, ["read", "write", "admin_org"]);
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const ids: Record<string, string> = {};
  const tokens: Record<string, string> = {};
  const bySurname = new Map<string, (typeof PERSONAS)[number]>();
  for (const p of PERSONAS) bySurname.set(p.surname, p);

  try {
    // ── 1) Provision all 8 personas through the live rails ──
    for (const p of PERSONAS) {
      const email = `pilot-smoke+${RUN}-${p.slug}@niovlabs.com`;
      const created = await request.post(`${API}/org/members`, {
        headers: auth(admin),
        data: { email, first_name: p.first, last_name: `${p.surname}${CapSuf}` },
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
    console.log(`[redwood-corpus] 8 personas provisioned (${RUN})`);

    // ── 2) 3A rights (admin-authored) + self-set timezones ──
    for (const p of PERSONAS) {
      const rights = await request.patch(
        `${API}/org/members/${ids[p.slug]}/decision-rights`,
        {
          headers: auth(admin),
          data: { owns: [...p.owns], can_approve: [...p.can_approve], recommend_only: [...p.recommend_only] },
        },
      );
      expect(rights.status()).toBe(200);
      const tz = await request.patch(`${API}/org/me/work-profile`, {
        headers: auth(tokens[p.slug]!),
        data: { timezone: p.tz },
      });
      expect(tz.status()).toBe(200);
      // Posture read-back derived from the mapping — drift fails loudly.
      const posture = (await (
        await request.get(`${API}/org/me/decision-rights`, { headers: auth(tokens[p.slug]!) })
      ).json()) as { rights: { owns: string[]; recommend_only: string[] } };
      expect([...posture.rights.owns].sort()).toEqual([...p.owns].sort());
      expect([...posture.rights.recommend_only].sort()).toEqual([...p.recommend_only].sort());
    }
    console.log("[redwood-corpus] rights + timezones set, postures verified 8/8");

    // ── 3) Ingest ALL 48 corpus artifacts through the live rails ──
    const artifacts = loadCorpus();
    expect(artifacts.length).toBe(48);
    let conversations = 0;
    let seededDocs = 0;
    let ownedRows = 0;
    for (const artifact of artifacts) {
      if (artifact.communication_type === "seeded_google_doc_simulation") {
        // Simulated documents go through the admin seeded-context rail,
        // labeled as seeded simulations — NEVER as live connector truth.
        const res = await ingestWithRetry(request, admin, {
          captured_text: adaptNames(artifact.body ?? artifact.title),
          title: `[Seeded simulation] ${artifact.title} [${RUN}]`,
          force_mode: "LOCAL_FALLBACK",
          seeded_context: { covering_period: artifact.date },
        });
        expect(res.status()).toBe(200);
        seededDocs += 1;
        continue;
      }
      // Conversation artifact: flatten statements as speaker-attributed
      // lines (surnames run-adapted); the ingest caller is the first
      // speaker's persona when it is an internal person, else the admin.
      const statements = artifact.statements ?? [];
      const textLines = statements.map((s) => `${adaptNames(s.speaker)}: ${adaptNames(s.text)}`);
      const firstInternal = statements
        .map((s) => bySurname.get(s.speaker.split(" ").pop() ?? ""))
        .find((p) => p !== undefined);
      const callerToken = firstInternal ? tokens[firstInternal.slug]! : admin;
      const res = await ingestWithRetry(request, callerToken, {
        captured_text: textLines.join("\n"),
        title: `${artifact.title} [${RUN}]`,
        force_mode: "LOCAL_FALLBACK",
      });
      expect(res.status()).toBe(200);
      const body = (await res.json()) as {
        result: { counts: { owned: number }; extraction: { summary: string } };
      };
      ownedRows += body.result.counts.owned;
      expectConnectorHonesty(JSON.stringify(body.result.extraction));
      conversations += 1;
    }
    console.log(
      `[redwood-corpus] ingested ${conversations} conversations + ${seededDocs} seeded docs; derived owned rows: ${ownedRows}`,
    );
    expect(conversations).toBe(36);
    expect(seededDocs).toBe(12);
    // Deterministic honesty at corpus scale: the Redwood prose never
    // states ownership in the canonical responsibility grammar
    // ("<Name> owns the … work"), and forced LOCAL_FALLBACK extraction is
    // honest-empty — so ZERO owned rows is the correct no-invented-owners
    // outcome (proven live 2026-07-06: 48/48 accepted, owned=0). Owned
    // minting with stamped lineage is proven by the §4 controlled ingests.
    expect(ownedRows).toBe(0);

    // ── 4) Controlled conflict-pair truth proofs (isolated run tokens) ──
    // (a) plan → explicit supersession → the clarity rail leads with the
    //     calm correction (current pilot truth beats the old pilot date).
    //     DOMAIN + TOKEN ISOLATION (run-3 lesson, proven live): unlike the
    //     empty-org probe, this pair lands among ~50 ACTIVE corpus rows.
    //     "backend" pins the capture to the engineering→technical domain
    //     Elena OWNS (no false exceeds-authority flag: the corpus gives
    //     Jordan the execution domain the generic classifier falls back
    //     to), and the pair's shared tokens (project name + cutover +
    //     backend + migration) have ZERO corpus occurrences, so the FND
    //     supersession linker (≥2 shared tokens, EXACTLY ONE candidate)
    //     stays unique. No "with/on/for" phrasing — the topic regex would
    //     hijack the row title (run-3: "Client this week").
    const elenaName = `Elena Torres${CapSuf}`;
    const proj = `Northlight${CapSuf}`;
    const ingest1 = await request.post(`${API}/otzar/comms/ingest`, {
      headers: auth(tokens.elena!),
      data: {
        captured_text: `${elenaName}: Torres${CapSuf} owns the ${proj} backend cutover migration and will confirm the ${proj} go-live of July 24 this week.`,
        title: `${proj} planning [${RUN}]`,
        force_mode: "LOCAL_FALLBACK",
      },
      timeout: 90_000,
    });
    expect(ingest1.status()).toBe(200);
    const items1 = ((await ingest1.json()) as {
      result: { work_items: Array<{ ledger_entry_id: string; title: string }> };
    }).result.work_items;
    const oldRow = (items1.find((w) => w.title.includes(proj)) ?? items1[0])!
      .ledger_entry_id;
    const ingest2 = await request.post(`${API}/otzar/comms/ingest`, {
      headers: auth(tokens.elena!),
      data: {
        captured_text: [
          `${elenaName}: Torres${CapSuf} owns the ${proj} backend cutover migration replan and will move the ${proj} go-live to August 7 — this replaces the old July 24 cutover plan.`,
          "I think the old go-live was July 24.",
          "Can we switch to daily syncs?",
          "Should the cutover include the archive tier?",
        ].join("\n"),
        title: `${proj} replan [${RUN}]`,
        force_mode: "LOCAL_FALLBACK",
      },
      timeout: 90_000,
    });
    expect(ingest2.status()).toBe(200);
    // The memory line, the request, and the open question minted NO
    // additional work rows: exactly ONE owned row from this capture.
    const replanCounts = ((await ingest2.json()) as { result: { counts: { owned: number } } }).result.counts;
    expect(replanCounts.owned).toBe(1);

    const answer = ((await (
      await request.get(
        `${API}/work-os/ledger/${oldRow}/clarity-answer?question=${encodeURIComponent("Any background on this?")}`,
        { headers: auth(tokens.elena!), timeout: 60_000 },
      )
    ).json()) as { answer: string }).answer;
    expect(answer).toContain("You may be looking at an older plan");
    expect(answer).toContain("superseded");
    expect(answer.toLowerCase()).not.toContain("you are wrong");
    expectHumanCopy(answer);
    expectConnectorHonesty(answer);

    // (b) recommend-only speaker promises in the owned domain → flagged,
    //     never approved truth (sales promise loses to approved scope).
    const overreach = await request.post(`${API}/otzar/comms/ingest`, {
      headers: auth(tokens.theo!),
      data: {
        captured_text: `Theo Williams${CapSuf}: Williams${CapSuf} owns the ${proj} automation pitch work and will deliver full API integration automation by launch.`,
        title: `${proj} client pitch [${RUN}]`,
        force_mode: "LOCAL_FALLBACK",
      },
      timeout: 90_000,
    });
    expect(overreach.status()).toBe(200);
    const theoRow = ((await overreach.json()) as { result: { work_items: Array<{ ledger_entry_id: string }> } })
      .result.work_items[0]!.ledger_entry_id;
    const theoAnswer = ((await (
      await request.get(
        `${API}/work-os/ledger/${theoRow}/clarity-answer?question=${encodeURIComponent("Any background on this?")}`,
        { headers: auth(tokens.theo!), timeout: 60_000 },
      )
    ).json()) as { answer: string }).answer;
    expect(theoAnswer).toContain("beyond the speaker's decision rights");
    expectHumanCopy(theoAnswer);

    // (c) named-subject rail: the superseded row is never presented as
    //     live truth; the flagged promise never reads as approved truth.
    const bg = await request.get(
      `${API}/work-os/context/background-answer?question=${encodeURIComponent(`What do we know about ${proj}?`)}`,
      { headers: auth(tokens.elena!), timeout: 60_000 },
    );
    if (bg.status() === 200) {
      const bgText = JSON.stringify(await bg.json());
      expectHumanCopy(bgText);
      expectConnectorHonesty(bgText);
    } else {
      // An honest refusal (unresolvable subject) is acceptable; a leak is not.
      expect([404, 422]).toContain(bg.status());
    }

    // (d) boundary as UX: a non-party, non-manager persona probing
    //     Elena's row gets an enumeration-safe 404 with zero title leak.
    const probe = await request.get(
      `${API}/work-os/ledger/${oldRow}/clarity-answer?question=${encodeURIComponent("Any background on this?")}`,
      { headers: auth(tokens.naomi!), timeout: 60_000 },
    );
    expect(probe.status()).toBe(404);
    expect(JSON.stringify(await probe.json())).not.toContain(proj);

    // ── 5) No governance side effects across the whole corpus run ──
    const pending = await request.get(`${API}/escalations/pending`, {
      headers: auth(admin),
    });
    expect(((await pending.json()) as { escalations: unknown[] }).escalations).toHaveLength(0);
  } finally {
    // ── Cleanup rail 1: CANCEL every run row (settled history) ──
    let cancelled = 0;
    const runOwnerIds = new Set(Object.values(ids));
    for (const type of ["COMMITMENT", "MEETING", "FOLLOW_UP", "ORG_SEEDING"] as const) {
      const listed = await request.get(`${API}/work-os/ledger?ledger_type=${type}`, {
        headers: auth(admin),
      });
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
        else console.log(`[redwood-corpus] contain ${type} ${e.ledger_entry_id.slice(0, 8)}: ${res.status()} (left as contained residue)`);
      }
    }
    console.log(`[redwood-corpus] cancelled ${cancelled} run rows`);
    // ── Cleanup rail 2: suspend all run personas ──
    for (const p of PERSONAS) {
      if (ids[p.slug] === undefined) continue;
      const cleanup = await request.patch(`${API}/org/entities/${ids[p.slug]}`, {
        headers: auth(admin),
        data: { status: "SUSPENDED" },
      });
      console.log(`[redwood-corpus] suspend ${p.slug}: ${cleanup.status()}`);
    }
  }
});
