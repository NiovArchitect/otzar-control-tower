// FILE: twin-authority.ts
// PURPOSE: [GAP-G SLICE-1] Human labels for the twin authority truth surface:
//          the template's RECOMMENDED autonomy and the authority STATUS
//          (applied / capped / adjusted / default / not set). Derived only
//          from server-stored provenance (TwinConfig.autonomy_source +
//          template_recommended_autonomy) and the org ceiling — never
//          guessed, never claiming capability beyond the enforced
//          autonomy_level. Fail-honest: anything unknown reads "Not set yet".
// CONNECTS TO: src/pages/AITeammates.tsx, Foundation TwinConfig provenance
//          (GAP-G slice 1), src/lib/labels/autonomy-levels.ts.

import type { TwinAutonomyLevel, TwinConfig } from "@/lib/types/foundation";
import { AUTONOMY_LEVEL_LABELS } from "@/lib/labels/autonomy-levels";

const RANK: Record<TwinAutonomyLevel, number> = {
  OBSERVE_ONLY: 0,
  APPROVAL_REQUIRED: 1,
  EXECUTIVE_OVERRIDE: 2,
};

function isLevel(v: unknown): v is TwinAutonomyLevel {
  return typeof v === "string" && v in RANK;
}

/** The template's recommended autonomy in human words, or the honest state. */
export function recommendedAutonomyLabel(config: TwinConfig | null): string {
  const rec = config?.template_recommended_autonomy;
  return isLevel(rec) ? AUTONOMY_LEVEL_LABELS[rec] : "Not set yet";
}

// WHAT: The authority status line — where the current level came from.
// WHY: Provable-only derivations. The single post-provisioning mutation
//      path is the audited admin PATCH, so a current level ABOVE what
//      provisioning could have applied is provably an admin change. A level
//      at-or-below a capped recommendation stays "Capped by org policy"
//      (conservative: never overclaims an admin action, never implies more
//      authority than enforced).
export function authorityStatusLabel(config: TwinConfig | null): string {
  if (config === null || typeof config.autonomy_source !== "string") {
    return "Not set yet";
  }
  const current = config.autonomy_level;
  const rec = config.template_recommended_autonomy;
  switch (config.autonomy_source) {
    case "admin_twin":
      return current === "EXECUTIVE_OVERRIDE" ? "Admin twin" : "Adjusted by admin";
    case "system_default":
      return current === "APPROVAL_REQUIRED"
        ? "Default approval policy"
        : "Adjusted by admin";
    case "role_template_default":
      return isLevel(rec) && current === rec
        ? "Applied from role template"
        : "Adjusted by admin";
    case "org_ceiling_capped":
      if (isLevel(rec) && RANK[current] > RANK[rec]) return "Adjusted by admin";
      return isLevel(rec) && current === rec
        ? "Applied from role template"
        : "Capped by org policy";
    default:
      return "Not set yet";
  }
}
