// FILE: duration-types.ts
// PURPOSE: Single source of truth mapping DurationType literal values
//          to customer-facing display labels, plus the strict
//          sub-domain of duration_type values that are valid for the
//          GRANT flow (DURATION_TYPE_DROPDOWN_OPTIONS).
// CONNECTS TO: GrantPermissionDialog (12B.4) duration select,
//              BridgeDetailDrawer per-bridge duration label,
//              future MatrixCell tooltip if duration ever surfaces
//              in cell affordance.
//
// VOCABULARY DISCIPLINE:
// Foundation calls these "duration_type" -- the schema.prisma:397-404
// enum value names. Customers see "Temporary / Short-term / ...".
// Never hardcode a DurationType literal in UI -- always go through
// getDurationTypeLabel.
//
// EXHAUSTIVENESS (decision #18): Record<DurationType, string> requires
// every literal to have an entry. DurationType is exactly 6 values per
// schema.prisma:397-404 -- adding any future value would break the
// build here until the label is supplied.
//
// 12B.4 NONE SUB-DECISION (Drift 2 / Option B):
// Per Foundation's permission.ts:45-46, verbatim:
//
//     "PERMANENT has no expiry. SESSION_ONLY has no fixed expiry yet
//      because the Session model arrives in Section 2; for now we
//      record null and rely on duration_type to mark these. NONE is
//      an explicit block, not a grant, so it has no expiry either."
//
// The grant dialog operates on the strict sub-domain
// {TEMPORARY, SHORT_TERM, LONG_TERM, PERMANENT, SESSION_ONLY}. NONE
// remains in the label map for defensive matrix rendering of any
// historical NONE-rows but is filtered from the GrantPermissionDialog
// dropdown options. Per decision #18, the type system holds
// Record<DurationType, string> exhaustive -- the dropdown filter is
// a UI scope choice (a grant flow is not a block flow), not a type
// subset.

import type { DurationType } from "@/lib/types/foundation";

export const DURATION_TYPE_LABELS: Record<DurationType, string> = {
  TEMPORARY: "Temporary",
  SHORT_TERM: "Short-term",
  LONG_TERM: "Long-term",
  PERMANENT: "Permanent",
  SESSION_ONLY: "Session only",
  NONE: "No access (block)",
} as const;

// WHAT: The strict grant-flow sub-domain of DurationType.
// WHY: NONE is a block-marker per Foundation's permission.ts:45-46,
//      not a grant-marker. The GrantPermissionDialog's duration_type
//      dropdown iterates this array, not Object.keys(DURATION_TYPE_LABELS),
//      so the UI honestly reflects that a grant flow is a strict
//      sub-domain of the enum. This is a UI scope choice -- the type
//      system stays exhaustive (decision #18 holds).
export const DURATION_TYPE_DROPDOWN_OPTIONS: readonly DurationType[] = [
  "TEMPORARY",
  "SHORT_TERM",
  "LONG_TERM",
  "PERMANENT",
  "SESSION_ONLY",
] as const;

// WHAT: DurationType values for which an explicit expires_at is
//       meaningful (and the picker should be visible).
// WHY: TEMPORARY, SHORT_TERM, LONG_TERM use defaultExpiresAt windows
//      in Foundation's DURATION_MS table (permission.ts:31-38). The
//      caller can override the default by passing an explicit
//      expires_at -- the picker is visible exclusively for these.
//      PERMANENT, SESSION_ONLY, NONE all return null from
//      defaultExpiresAt; surfacing a picker for them would be either
//      semantically wrong (PERMANENT) or non-functional (SESSION_ONLY,
//      NONE).
export const DURATION_TYPES_WITH_EXPIRES_AT: ReadonlySet<DurationType> = new Set(
  ["TEMPORARY", "SHORT_TERM", "LONG_TERM"],
);

// WHAT: Look up the customer-facing label for a DurationType literal.
// INPUT: A DurationType literal value.
// OUTPUT: The display label, or the literal itself if no map entry
//          exists (defensive against contract drift).
// WHY: Centralized lookup so call sites don't hardcode either the
//      literal or the label.
export function getDurationTypeLabel(duration: DurationType): string {
  return DURATION_TYPE_LABELS[duration] ?? duration;
}
