// FILE: permission-scopes.ts
// PURPOSE: Single source of truth mapping AccessScope literal values
//          to customer-facing display labels. Foundation primitives
//          (the literal values) stay in the type contract; this map
//          wraps them in enterprise-admin vocabulary.
// CONNECTS TO: GrantPermissionDialog (12B.4) Access Scope select,
//              BridgeDetailDrawer per-bridge scope label.
//
// VOCABULARY DISCIPLINE:
// Foundation calls these "access_scope" because that's the patent-
// claim language. Customers see "Metadata only / Summary / Full
// access". Never hardcode an AccessScope literal in UI -- always go
// through getPermissionScopeLabel.
//
// EXHAUSTIVENESS: Record<AccessScope, string> requires every literal
// to have an entry. AccessScope is exactly 3 values per Foundation's
// schema.prisma:391-395 -- adding any future value would break the
// build here until the label is supplied.
//
// 12B.4 Drift 3 RESOLUTION:
// Foundation's AccessScope enum is exactly 3 values per
// schema.prisma:391-395. The client-side PermissionLevel = 'NONE' |
// AccessScope is a UI-only superset for empty matrix cells where no
// Permission row exists. NONE is rendered via hardcoded "No access"
// copy in MatrixCell, NOT via this label map -- keeps
// Record<AccessScope, string> exhaustiveness honest against Foundation.

import type { AccessScope } from "@/lib/types/foundation";

export const PERMISSION_SCOPE_LABELS: Record<AccessScope, string> = {
  METADATA_ONLY: "Metadata only",
  SUMMARY: "Summary",
  FULL: "Full access",
} as const;

// WHAT: Look up the customer-facing label for an AccessScope literal.
// INPUT: An AccessScope literal value.
// OUTPUT: The display label, or the literal itself if no map entry
//          exists (defensive against contract drift).
// WHY: Centralized lookup so call sites don't hardcode either the
//      literal or the label. Same pattern as getCapsuleTypeLabel,
//      getEntityTypeLabel, getAuditEventLabel,
//      getAutonomyLevelLabel.
export function getPermissionScopeLabel(scope: AccessScope): string {
  return PERMISSION_SCOPE_LABELS[scope] ?? scope;
}
