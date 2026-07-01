// FILE: seed-grouping.ts
// PURPOSE: PROD-UX-P0E — cluster Organization Seeding (Dandelion) suggestions into
//          grouped, prioritized queues so a small org does not render a 75-card wall
//          and an enterprise org (5,000+ people) stays comprehensible. Duplicate
//          suggestions for the SAME person/target (e.g. five "activate David" seeds)
//          collapse into ONE grouped card with all suggested actions. Pure +
//          deterministic; the page renders whatever this returns. No new data model —
//          it groups the existing OrgSeed rows by the backend-provided subject_key
//          (falling back to the same derivation when absent).
// CONNECTS TO: src/lib/types/foundation.ts (OrgSeed), src/pages/OrganizationSeeding.tsx.
import type { OrgSeed } from "../types/foundation";

export type SeedQueueId =
  | "people_to_review"
  | "tool_setup"
  | "role_project_team"
  | "ambiguous_identity"
  | "low_confidence"
  | "held"
  | "resolved";

export interface SeedQueueDef {
  id: SeedQueueId;
  label: string;
  description: string;
}

// Queue order = admin triage priority (most fundamental first).
export const SEED_QUEUES: readonly SeedQueueDef[] = [
  { id: "people_to_review", label: "People to review", description: "Real participants who aren't in your org yet — confirm or activate them." },
  { id: "tool_setup", label: "Access & tool setup", description: "Connections a person needs before their committed work can move." },
  { id: "role_project_team", label: "Roles, projects & teams", description: "Suggested role / team / project structure from real work evidence." },
  { id: "ambiguous_identity", label: "Ambiguous identities", description: "Low-confidence people — confirm who this is before acting." },
  { id: "low_confidence", label: "Low-confidence suggestions", description: "Weaker signals held back from the main queues." },
  { id: "held", label: "Held", description: "You've paused these for later." },
  { id: "resolved", label: "Reviewed & applied", description: "Approved, applied, or dismissed." },
] as const;

export interface SeedGroup {
  /** Stable subject key (person/target) — all seeds in this group share it. */
  key: string;
  subject_name: string | null;
  subject_entity_id: string | null;
  /** Every suggestion for this subject (a person may need activation AND a tool). */
  seeds: OrgSeed[];
  count: number;
  pending_count: number;
  /** Highest confidence among the group's seeds. */
  confidence: "high" | "medium" | "low";
  approval_required: boolean;
  queue: SeedQueueId;
  /** Distinct source conversations that produced these suggestions. */
  source_count: number;
}

export interface GroupedSeeds {
  queues: Array<{ def: SeedQueueDef; groups: SeedGroup[] }>;
  total_seeds: number;
  total_groups: number;
  pending_groups: number;
}

const PENDING = new Set(["SEED_PROPOSED", "SEED_NEEDS_REVIEW"]);
const isPending = (s: OrgSeed): boolean => PENDING.has(s.status);
const isHeld = (s: OrgSeed): boolean => s.status === "SEED_HELD";

const CONF_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

/** The grouping key: backend subject_key, else the same derivation the backend uses. */
export function seedKey(s: OrgSeed): string {
  if (s.subject_key && s.subject_key.length > 0) return s.subject_key;
  if (s.subject_entity_id) return `entity:${s.subject_entity_id}`;
  if (s.subject_name && s.subject_name.trim().length > 0) return `name:${s.subject_name.trim().toLowerCase()}`;
  return `type:${s.seed_type}`;
}

function queueForGroup(seeds: OrgSeed[]): SeedQueueId {
  const pending = seeds.filter(isPending);
  if (pending.length === 0) return seeds.some(isHeld) ? "held" : "resolved";
  const has = (re: RegExp) => pending.some((s) => re.test(s.seed_type));
  const allLow = pending.every((s) => (s.confidence ?? "medium") === "low");
  // Person activation is the most fundamental (can't route work/tools to a
  // person who isn't in the org yet).
  if (pending.some((s) => s.seed_type === "confirm_or_activate_person")) {
    return allLow ? "ambiguous_identity" : "people_to_review";
  }
  if (has(/role|team|project|support/)) return "role_project_team";
  if (has(/tool|connector|grant/)) return "tool_setup";
  return allLow ? "low_confidence" : "people_to_review";
}

function highestConfidence(seeds: OrgSeed[]): "high" | "medium" | "low" {
  let best = 1;
  for (const s of seeds) best = Math.max(best, CONF_RANK[s.confidence ?? "medium"] ?? 2);
  return best >= 3 ? "high" : best === 2 ? "medium" : "low";
}

/** Group flat seeds into deduped, prioritized queues. Deterministic. */
export function groupSeeds(seeds: readonly OrgSeed[]): GroupedSeeds {
  const byKey = new Map<string, OrgSeed[]>();
  for (const s of seeds) {
    const k = seedKey(s);
    const arr = byKey.get(k);
    if (arr) arr.push(s);
    else byKey.set(k, [s]);
  }

  const groups: SeedGroup[] = [];
  for (const [key, groupSeedsArr] of byKey) {
    // Newest first inside a group so the top suggestion is the most recent.
    const sorted = [...groupSeedsArr].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const named = sorted.find((s) => s.subject_name && s.subject_name.trim().length > 0);
    const withEntity = sorted.find((s) => s.subject_entity_id);
    const sources = new Set(sorted.map((s) => s.source_conversation_id).filter((c): c is string => !!c));
    groups.push({
      key,
      subject_name: named?.subject_name ?? null,
      subject_entity_id: withEntity?.subject_entity_id ?? null,
      seeds: sorted,
      count: sorted.length,
      pending_count: sorted.filter(isPending).length,
      confidence: highestConfidence(sorted),
      approval_required: sorted.some((s) => s.approval_required),
      queue: queueForGroup(sorted),
      source_count: sources.size,
    });
  }

  // Within a queue: pending first, then by count desc, then name.
  const cmp = (a: SeedGroup, b: SeedGroup): number =>
    b.pending_count - a.pending_count ||
    b.count - a.count ||
    (a.subject_name ?? a.key).localeCompare(b.subject_name ?? b.key);

  const queues = SEED_QUEUES.map((def) => ({
    def,
    groups: groups.filter((g) => g.queue === def.id).sort(cmp),
  })).filter((q) => q.groups.length > 0);

  return {
    queues,
    total_seeds: seeds.length,
    total_groups: groups.length,
    pending_groups: groups.filter((g) => g.pending_count > 0).length,
  };
}
