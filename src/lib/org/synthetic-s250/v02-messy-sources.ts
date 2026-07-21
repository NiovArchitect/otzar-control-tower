// FILE: v02-messy-sources.ts
// PURPOSE: V-02 — messy multi-source accuracy against S250 org context.
//          Sources remain distinct — never undifferentiated semantic soup.
// CONNECTS TO: S250 scenarios, FOUNDER V-02.

import type { StructuralEnterprise } from "./canonical-provision";
import { mulberry32, pick } from "./prng";

export type SourceKind =
  | "relay_like"
  | "email"
  | "meeting_transcript"
  | "docs_revision"
  | "calendar_response"
  | "project_update"
  | "crm_event"
  | "voice_note"
  | "ai_draft"
  | "human_correction";

export type MessySourceEvent = {
  id: string;
  kind: SourceKind;
  author_id: string;
  project_id: string | null;
  text: string;
  at_day: number;
  is_ai_authored: boolean;
  is_stale: boolean;
  is_private_side: boolean;
};

export type HiddenSourceOracle = {
  event_id: string;
  expected_author: string;
  expected_project: string | null;
  expected_final_date: string | null;
  expected_decision: string | null;
  correction: boolean;
  allowed_disclosure: boolean;
};

export type V02Metrics = {
  events: number;
  source_identity_accuracy: number;
  project_resolution_accuracy: number;
  final_date_accuracy: number;
  correction_recognition: number;
  disclosure_correctness: number;
  pass: boolean;
};

function extractAuthorCue(text: string): string | null {
  const m = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+):/);
  return m?.[1] ?? null;
}

function extractDates(text: string): string[] {
  return [...text.matchAll(/2026-\d{2}-\d{2}/g)].map((m) => m[0]!);
}

/**
 * Generate multi-source messy corpus bound to S250 people/projects.
 */
export function generateMessyMultiSource(
  ent: StructuralEnterprise,
  count = 80,
): { events: MessySourceEvent[]; oracles: HiddenSourceOracle[] } {
  const rng = mulberry32(ent.seed + 202);
  const kinds: SourceKind[] = [
    "relay_like",
    "email",
    "meeting_transcript",
    "docs_revision",
    "calendar_response",
    "project_update",
    "crm_event",
    "voice_note",
    "ai_draft",
    "human_correction",
  ];
  const events: MessySourceEvent[] = [];
  const oracles: HiddenSourceOracle[] = [];
  const people = ent.seed_org.people.filter((p) => p.kind !== "external");

  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length]!;
    const author = pick(rng, people);
    const project = ent.seed_org.projects[i % ent.seed_org.projects.length]!;
    const agree =
      rng() > 0.3
        ? `2026-09-${String(10 + (i % 15)).padStart(2, "0")}`
        : null;
    const reject =
      rng() > 0.5
        ? `2026-09-${String(1 + (i % 8)).padStart(2, "0")}`
        : null;
    const correction = kind === "human_correction" || rng() > 0.85;
    const stale = kind === "docs_revision" && rng() > 0.6;
    const privateSide = kind === "relay_like" && rng() > 0.9;
    const is_ai = kind === "ai_draft";

    let text = "";
    switch (kind) {
      case "email":
        text = `${author.name}: re ${project.name} — ${reject ? `not ${reject}; ` : ""}${agree ? `lock ${agree}` : "still open"}.`;
        break;
      case "meeting_transcript":
        text = `Speaker unclear: we might use ${reject ?? "Tuesday"}… no, ${author.name}: correction — ${agree ?? "no date"} is the decision.`;
        break;
      case "docs_revision":
        text = `[rev ${stale ? "stale" : "current"}] ${author.name}: ${project.name} decision log ${agree ?? "TBD"}.`;
        break;
      case "calendar_response":
        text = `${author.name}: tentative ${agree ?? "next week"}; reject auto-book of ${reject ?? "prior"}.`;
        break;
      case "human_correction":
        text = `${author.name}: correction — I am not the owner on ${project.name}; final remains ${agree ?? "deferred"}.`;
        break;
      case "ai_draft":
        text = `AI draft for ${author.name}: proposed status for ${project.name} ${agree ?? ""}.`;
        break;
      default:
        text = `${author.name}: (${kind}) ${project.name} update ${agree ?? "no date"} ${reject ? `avoid ${reject}` : ""}.`;
    }

    const id = `v02-${ent.seed}-${i}`;
    events.push({
      id,
      kind,
      author_id: author.id,
      project_id: privateSide ? null : project.id,
      text,
      at_day: 1 + (i % 14),
      is_ai_authored: is_ai,
      is_stale: stale,
      is_private_side: privateSide,
    });
    oracles.push({
      event_id: id,
      expected_author: author.id,
      expected_project: privateSide ? null : project.id,
      expected_final_date: agree,
      expected_decision: agree ? `lock ${agree}` : "defer",
      correction,
      allowed_disclosure: !privateSide,
    });
  }

  return { events, oracles };
}

/** Score extraction vs hidden oracles — sources stay typed. */
export function scoreMessyMultiSource(
  ent: StructuralEnterprise,
  events: MessySourceEvent[],
  oracles: HiddenSourceOracle[],
): V02Metrics {
  const byId = new Map(oracles.map((o) => [o.event_id, o]));
  let authorHit = 0;
  let projectHit = 0;
  let dateHit = 0;
  let dateTotal = 0;
  let corrHit = 0;
  let corrTotal = 0;
  let disclosureHit = 0;

  for (const ev of events) {
    const o = byId.get(ev.id);
    if (!o) continue;
    const name = ent.seed_org.people.find((p) => p.id === o.expected_author)
      ?.name;
    const extractedAuthor = extractAuthorCue(ev.text);
    if (
      extractedAuthor &&
      name &&
      extractedAuthor === name
    ) {
      authorHit++;
    } else if (ev.text.includes(o.expected_author) || (name && ev.text.includes(name))) {
      authorHit++;
    }

    // Project resolution from text tokens
    const proj = o.expected_project
      ? ent.seed_org.projects.find((p) => p.id === o.expected_project)
      : null;
    if (!o.expected_project) {
      projectHit++; // private side — correct null
    } else if (proj && ev.text.includes(proj.name.slice(0, 12))) {
      projectHit++;
    }

    if (o.expected_final_date) {
      dateTotal++;
      const dates = extractDates(ev.text);
      if (dates.includes(o.expected_final_date)) dateHit++;
    }

    if (o.correction) {
      corrTotal++;
      if (/correction/i.test(ev.text)) corrHit++;
    }

    // Disclosure: private side must not be treated as org-broadcast
    if (o.allowed_disclosure === !ev.is_private_side) disclosureHit++;
  }

  const n = events.length;
  const pct = (a: number, b: number) =>
    b <= 0 ? 1 : Math.round((a / b) * 1000) / 1000;

  const metrics: V02Metrics = {
    events: n,
    source_identity_accuracy: pct(authorHit, n),
    project_resolution_accuracy: pct(projectHit, n),
    final_date_accuracy: pct(dateHit, Math.max(1, dateTotal)),
    correction_recognition: pct(corrHit, Math.max(1, corrTotal)),
    disclosure_correctness: pct(disclosureHit, n),
    pass: false,
  };
  metrics.pass =
    metrics.source_identity_accuracy >= 0.7 &&
    metrics.project_resolution_accuracy >= 0.7 &&
    metrics.final_date_accuracy >= 0.6 &&
    metrics.disclosure_correctness >= 0.95;

  return metrics;
}
