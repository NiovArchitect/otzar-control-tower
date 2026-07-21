// FILE: basis-status.ts
// PURPOSE: Single source of truth mapping truth-evidence basis states to
//          customer-facing copy + severity. Foundation primitives (the literal
//          union values) stay in the type contract; this map wraps them in
//          calm, non-accusatory enterprise vocabulary.
// CONNECTS TO: DecisionEvidenceLane + DecisionEvidenceDrawer, src/lib/types/
//              foundation.ts (BasisStatus, CurrentSourceStatus).
//
// VOCABULARY + TONE DISCIPLINE (founder §O — MANDATORY):
//   - NEVER claim a decision was wrong merely because its evidence changed.
//   - Use these EXACT phrases: "Evidence changed. Review required";
//     "Source was superseded"; "Source is no longer available";
//     "Decision basis remains current".
//   - Historical captured evidence and the live current status are DISTINCT.
//
// EXHAUSTIVENESS: Record<Union, string> requires every literal to have an entry.
// Adding a new BasisStatus / CurrentSourceStatus to the contract breaks the
// build here until copy is supplied. That's the intended safety net.

import type { BasisStatus, CurrentSourceStatus } from "@/lib/types/foundation";

// Ambient severity — drives restrained colour, not alarm. amber = changed
// (review), red = the source is gone/superseded (stronger review), neutral =
// current / not-applicable. Never a full-bleed alert.
export type EvidenceSeverity = "neutral" | "amber" | "red";

// ── Basis status (per decision) ─────────────────────────────────────────────

// Short badge label.
export const BASIS_STATUS_LABELS: Record<BasisStatus, string> = {
  current: "Basis current",
  stale: "Review required",
  none: "No recorded basis",
} as const;

// The calm one-line headline. `current` uses the mandated exact phrase; `stale`
// uses the mandated review phrase; `none` stays quiet (no basis captured yet).
export const BASIS_STATUS_HEADLINE: Record<BasisStatus, string> = {
  current: "Decision basis remains current.",
  stale: "Evidence changed. Review required",
  none: "No decision basis recorded yet.",
} as const;

export const BASIS_STATUS_SEVERITY: Record<BasisStatus, EvidenceSeverity> = {
  current: "neutral",
  stale: "amber",
  none: "neutral",
} as const;

export function getBasisStatusLabel(status: BasisStatus): string {
  return BASIS_STATUS_LABELS[status] ?? status;
}
export function getBasisStatusHeadline(status: BasisStatus): string {
  return BASIS_STATUS_HEADLINE[status] ?? "";
}
export function getBasisStatusSeverity(status: BasisStatus): EvidenceSeverity {
  return BASIS_STATUS_SEVERITY[status] ?? "neutral";
}

// ── Current source status (per evidence snapshot) ───────────────────────────

// The live projection of the captured basis against the current source. Copy is
// non-accusatory and uses the mandated exact phrases where they apply.
export const CURRENT_SOURCE_STATUS_LABELS: Record<CurrentSourceStatus, string> = {
  unchanged: "Basis unchanged",
  changed: "Evidence changed. Review required",
  superseded: "Source was superseded",
  retracted: "Source is no longer available",
  unavailable: "Source is no longer available",
  unknown: "Not yet checked",
} as const;

export const CURRENT_SOURCE_STATUS_SEVERITY: Record<CurrentSourceStatus, EvidenceSeverity> = {
  unchanged: "neutral",
  changed: "amber",
  superseded: "red",
  retracted: "red",
  unavailable: "red",
  unknown: "neutral",
} as const;

export function getCurrentSourceStatusLabel(status: CurrentSourceStatus): string {
  return CURRENT_SOURCE_STATUS_LABELS[status] ?? "Not yet checked";
}
export function getCurrentSourceStatusSeverity(status: CurrentSourceStatus): EvidenceSeverity {
  return CURRENT_SOURCE_STATUS_SEVERITY[status] ?? "neutral";
}

// ── Captured classifications (safe, open-ish vocabularies) ──────────────────

// WHAT: humanize a snake_case classification token (communication_act,
//       truth_class, authority_class, currentness, source_integrity_state)
//       into Title Case. These are SAFE classification strings, never content.
// WHY: the truth-substrate vocabularies are broad + may extend; a total
//      defensive humanizer (not an exhaustive Record) keeps copy friendly
//      without breaking on a new backend classification. Unknown/empty → a
//      neutral placeholder, never a raw id.
export function humanizeClassification(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim().length === 0) {
    return "Not recorded";
  }
  return value
    .split(/[_\s]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
