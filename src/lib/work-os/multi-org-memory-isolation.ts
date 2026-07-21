// FILE: multi-org-memory-isolation.ts
// PURPOSE: I-02 — one user, multiple orgs without blended memory.
//          Org-bound memory stays per-org; portable methods may travel
//          only via future consented export (not silent blend).
// CONNECTS TO: MyMemory MultiOrgMemoryIsolationCard, PortableCoreCard,
//          org-switch, FOUNDER I-02 / Q multi-tenant residuals.

import {
  classifyPreferenceSummary,
  preferencesIsolatedAcrossUsers,
  type ClassifiedPreference,
} from "@/lib/work-os/portable-core";

export const I02_DOCTRINE =
  "One person can work in many organizations. Each organization keeps its own " +
  "work memory. Methods and preferences that are personal may travel with you " +
  "later, only with your consent — company records never silently blend.";

export const I02_ISOLATION_RULES = [
  {
    id: "org_bound_stays",
    label: "Org-bound stays put",
    plain:
      "Projects, customers, approvals, and org-stamped learning stay inside that organization.",
  },
  {
    id: "portable_not_silent",
    label: "Portable is not silent blend",
    plain:
      "Your personal methods do not auto-copy into another org. Export is a future, consented flow.",
  },
  {
    id: "switch_resets_client",
    label: "Org switch resets client memory views",
    plain:
      "Changing organization clears blendable client state and returns you to Home for that org.",
  },
  {
    id: "twin_per_org",
    label: "Org-bound Twin relationships",
    plain:
      "Your AI Teammate relationship to company work is per organization — not one blended twin.",
  },
] as const;

export type OrgScopedPreferenceBag = {
  org_entity_id: string;
  /** Plain preference strings visible to this principal in this org. */
  fingerprints: string[];
  /** Org-bound only subset (must never appear in another org's bag). */
  org_bound: string[];
  /** Portable methods (may exist in multiple bags only if user approved in each context — never auto-blended). */
  portable: string[];
};

export function buildOrgScopedBag(
  org_entity_id: string,
  preferences: Array<{ safe_summary: string }>,
): OrgScopedPreferenceBag {
  const org = (org_entity_id ?? "").trim();
  const fingerprints: string[] = [];
  const org_bound: string[] = [];
  const portable: string[] = [];
  for (const p of preferences) {
    const { plain, ownership } = classifyPreferenceSummary(p.safe_summary);
    if (plain.length === 0) continue;
    fingerprints.push(plain);
    if (ownership === "org_bound") org_bound.push(plain);
    else if (ownership === "portable") portable.push(plain);
  }
  return { org_entity_id: org, fingerprints, org_bound, portable };
}

/**
 * Multi-org isolation: org-bound fingerprints from A must not appear in B's
 * bag (org-bound or full fingerprint list). Empty bags are vacuously isolated.
 */
export function orgBoundIsolatedAcrossOrgs(
  a: OrgScopedPreferenceBag,
  b: OrgScopedPreferenceBag,
): boolean {
  if (a.org_entity_id.length === 0 || b.org_entity_id.length === 0) {
    return false;
  }
  if (a.org_entity_id === b.org_entity_id) {
    // Same org is not multi-org isolation — treat as non-applicable fail for multi-org claim.
    return false;
  }
  // Org-bound from A must not appear anywhere in B.
  if (!preferencesIsolatedAcrossUsers(a.org_bound, b.fingerprints)) {
    return false;
  }
  if (!preferencesIsolatedAcrossUsers(b.org_bound, a.fingerprints)) {
    return false;
  }
  return true;
}

/**
 * Detect silent blend: if an org-bound string from A appears in B's org-bound
 * list under a different org id, memory has blended.
 */
export function detectOrgBoundBlend(
  a: OrgScopedPreferenceBag,
  b: OrgScopedPreferenceBag,
): string[] {
  if (a.org_entity_id === b.org_entity_id) return [];
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const bSet = new Set(b.org_bound.map(norm).filter((s) => s.length >= 12));
  const leaks: string[] = [];
  for (const raw of a.org_bound) {
    const n = norm(raw);
    if (n.length < 12) continue;
    if (bSet.has(n)) leaks.push(raw);
  }
  return leaks;
}

/**
 * Client isolation buckets after org switch — must match org-switch.ts
 * ORG_SWITCH_CLEAR_BUCKETS (conversation, continuity, surface, prior route).
 */
export const BLENDABLE_CLIENT_BUCKETS = [
  "conversation_scope",
  "continuity",
  "surface_context",
  "prior_route",
] as const;

export function clientIsolationAfterOrgSwitch(args: {
  fromOrgId: string | null;
  toOrgId: string;
  clearedBuckets: readonly string[];
}): { isolated: boolean; reason: string } {
  const to = args.toOrgId.trim();
  if (to.length === 0) {
    return { isolated: false, reason: "empty target org" };
  }
  const from = (args.fromOrgId ?? "").trim();
  if (from.length > 0 && from === to) {
    return { isolated: true, reason: "same org — no switch" };
  }
  const required = new Set<string>(BLENDABLE_CLIENT_BUCKETS);
  const cleared = new Set(args.clearedBuckets);
  for (const k of required) {
    if (!cleared.has(k)) {
      return { isolated: false, reason: `missing clear: ${k}` };
    }
  }
  return { isolated: true, reason: "blendable client buckets cleared" };
}

export function classifyPreferencesForOrg(
  org_entity_id: string,
  rows: Array<{ correction_id: string; safe_summary: string }>,
): { org_entity_id: string; classified: ClassifiedPreference[] } {
  const classified = rows.map((r) => {
    const { plain, ownership } = classifyPreferenceSummary(r.safe_summary);
    return {
      correction_id: r.correction_id,
      plain,
      ownership,
      raw_summary: r.safe_summary,
    };
  });
  return { org_entity_id: org_entity_id.trim(), classified };
}

export function multiOrgStatusLabel(orgCount: number): {
  label: string;
  mode: "single_org" | "multi_org";
} {
  if (orgCount >= 2) {
    return { label: "Multi-org membership — memory stays per organization", mode: "multi_org" };
  }
  return {
    label: "Single organization in this session — isolation rules still apply",
    mode: "single_org",
  };
}
