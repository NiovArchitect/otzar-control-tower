// FILE: autonomy-levels.ts
// PURPOSE: Single source of truth mapping TwinAutonomyLevel literal
//          values to customer-facing "Behavior Policy" labels.
// CONNECTS TO: AI Teammates table (12B.3) Behavior Policy column,
//              TwinDetailDrawer Settings tab autonomy_level Select,
//              BulkAutonomyAction wrapper.
//
// VOCABULARY DISCIPLINE (per Emphasis 1, 12B.1):
// Foundation's TWIN_AUTONOMY_VALUES (org.routes.ts ee4dafb) has
// exactly 3 literals: APPROVAL_REQUIRED, EXECUTIVE_OVERRIDE,
// OBSERVE_ONLY. Customers see these as "Approval required",
// "Executive override", "Observe only" under the customer-facing
// "Behavior Policy" column. The internal token "autonomy_level"
// never appears in copy. EXECUTIVE_OVERRIDE here is the autonomy
// MODE for non-admin twins; admin-twin status (the orange pill) is
// driven separately by `TwinConfig.is_admin_twin === true`.
//
// `Record<TwinAutonomyLevel, string>` enforces compile-time
// exhaustiveness -- adding a new Foundation literal will fail tsc
// here until this map is updated.

import type { TwinAutonomyLevel } from "@/lib/types/foundation";

export const AUTONOMY_LEVEL_LABELS: Record<TwinAutonomyLevel, string> = {
  APPROVAL_REQUIRED: "Approval required",
  EXECUTIVE_OVERRIDE: "Executive override",
  OBSERVE_ONLY: "Observe only",
} as const;

// WHAT: Look up the customer-facing Behavior Policy label.
// INPUT: A TwinAutonomyLevel literal value.
// OUTPUT: The display label, or the literal itself if no entry.
// WHY: Centralized lookup so columns, badges, selects, and bulk
//      action menus never hardcode either form.
export function getAutonomyLevelLabel(level: TwinAutonomyLevel): string {
  return AUTONOMY_LEVEL_LABELS[level] ?? level;
}
