// FILE: portable-core.ts
// PURPOSE: H-02 / I-01 — portable personal core vs org-bound memory.
//          Classifies preference ownership, isolates multi-user views,
//          and keeps export honesty (doctrine yes; export not shipped).
// CONNECTS TO: MyMemory PortableCoreCard, Teach Otzar approvals,
//          FOUNDER H-02 / I, WalletPortabilityPanel doctrine.

export type PreferenceOwnership = "portable" | "org_bound" | "unknown";

export interface ClassifiedPreference {
  correction_id: string;
  plain: string;
  ownership: PreferenceOwnership;
  raw_summary: string;
}

/** Prefixes Foundation / work-style may stamp onto safe_summary. */
const PORTABLE_RE = /^\[portable\]\s*/i;
const ORG_BOUND_RE = /^\[org-bound\]\s*/i;

export const PORTABLE_CORE_DOCTRINE =
  "You can take the shape of how you work. You cannot take the company's work. " +
  "Methods and preferences stay personal; projects, customers, and confidential records stay with the organization.";

export const EXPORT_HONESTY =
  "Export of your portable personal core is not available yet. " +
  "Ownership is real today; transfer between organizations is a future, consented flow.";

export const NEVER_PORTABLE = [
  "Company projects, customers, and confidential documents",
  "Raw messages, transcripts, or source excerpts",
  "Org hierarchy, approvals, and audit records",
  "Credentials, connector bindings, and secret references",
] as const;

export function classifyPreferenceSummary(raw: string): {
  plain: string;
  ownership: PreferenceOwnership;
} {
  const t = (raw ?? "").trim();
  if (PORTABLE_RE.test(t)) {
    return { plain: t.replace(PORTABLE_RE, "").trim(), ownership: "portable" };
  }
  if (ORG_BOUND_RE.test(t)) {
    return { plain: t.replace(ORG_BOUND_RE, "").trim(), ownership: "org_bound" };
  }
  // Work-style learning is personal by default unless stamped org-bound.
  return { plain: t, ownership: t.length > 0 ? "portable" : "unknown" };
}

export function classifyPreferences(
  rows: Array<{ correction_id: string; safe_summary: string }>,
): ClassifiedPreference[] {
  return rows.map((r) => {
    const { plain, ownership } = classifyPreferenceSummary(r.safe_summary);
    return {
      correction_id: r.correction_id,
      plain,
      ownership,
      raw_summary: r.safe_summary,
    };
  });
}

export function portableOnly(
  rows: ClassifiedPreference[],
): ClassifiedPreference[] {
  return rows.filter((r) => r.ownership === "portable");
}

export function orgBoundOnly(
  rows: ClassifiedPreference[],
): ClassifiedPreference[] {
  return rows.filter((r) => r.ownership === "org_bound");
}

/**
 * Multi-user isolation: principal B must not surface principal A's
 * preference fingerprints. Empty A is vacuously isolated.
 */
export function preferencesIsolatedAcrossUsers(
  principalA: string[],
  principalB: string[],
): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const bSet = new Set(
    principalB.map(norm).filter((s) => s.length >= 12),
  );
  for (const a of principalA) {
    const n = norm(a);
    if (n.length < 12) continue;
    if (bSet.has(n)) return false;
    // Also reject if B's joined text contains a long unique A fingerprint
    for (const b of bSet) {
      if (b.includes(n) || n.includes(b)) {
        // short shared boilerplate (e.g. "prefer") — only fail on substantial overlap
        if (Math.min(n.length, b.length) >= 24 && (b.includes(n) || n.includes(b))) {
          return false;
        }
      }
    }
  }
  return true;
}

/** Reject confidential / org-substance markers in portable plain text. */
export function isSafePortablePlain(plain: string): boolean {
  const t = plain.toLowerCase();
  if (
    /\b(customer secret|ssn|salary band confidential|api key|password|confidential document)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  if (/\b(export twin|take this with you|portable today)\b/i.test(t)) {
    return false;
  }
  return true;
}

export function ownershipLabel(o: PreferenceOwnership): string {
  switch (o) {
    case "portable":
      return "Portable personal";
    case "org_bound":
      return "Org-bound (stays)";
    default:
      return "Unclassified";
  }
}
