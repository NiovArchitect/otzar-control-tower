// FILE: canonical-entity.ts
// PURPOSE: Phase 1285-H semantic reconciliation — the SINGLE client identity
//          contract. Before this, surfaces rendered identity 8 different ways
//          ("a teammate", "Unknown sender", "your teammate", or a raw UUID).
//          This collapses them to one rule: every entity renders through a
//          CanonicalEntity, a missing entity is a FIRST-CLASS state (unresolved
//          = true, canonical label "Unknown entity"), a UUID is NEVER shown as
//          a label, and rendering NEVER crashes on missing identity.
// CONNECTS TO: WorkLedgerItem, TeamWork, InboxThread, PersonCockpit,
//          AmbientOtzarBar; tests/unit/canonical-entity.test.ts.

import { formatPersonName } from "@/lib/identity/person-name";

export type CanonicalRole =
  | "owner"
  | "requester"
  | "target"
  | "participant"
  | "actor"
  | "system";

export type CanonicalProvenance =
  | "thread"
  | "ledger"
  | "message"
  | "notification"
  | "action_center"
  | "ui_inferred";

export interface CanonicalEntity {
  entity_id: string | null;
  display_name: string;
  role: CanonicalRole;
  // First-class state (decision 2026-06-16): true when the id had no resolvable
  // display name. Surfaces may badge it; they must NEVER crash and NEVER show
  // the raw entity_id as the primary label.
  unresolved: boolean;
  provenance: CanonicalProvenance;
}

// The single canonical label for an unresolved entity. Mirrors the backend
// UNRESOLVED_ENTITY_LABEL. NEVER a raw UUID.
export const UNRESOLVED_LABEL = "Unknown entity";

// WHAT: build a CanonicalEntity from a (possibly missing) server display name +
//        id. INPUT: a display name (server-provided) + entity_id + role/
//        provenance. OUTPUT: always a CanonicalEntity — unresolved when the
//        name is absent/blank; the id is carried for traceability ONLY, never
//        used as the label.
export function toCanonicalEntity(args: {
  entity_id?: string | null;
  display_name?: string | null;
  role: CanonicalRole;
  provenance: CanonicalProvenance;
}): CanonicalEntity {
  const name = typeof args.display_name === "string" ? args.display_name.trim() : "";
  const resolved = name.length > 0;
  return {
    entity_id: args.entity_id ?? null,
    display_name: resolved ? name : UNRESOLVED_LABEL,
    role: resolved ? args.role : "system",
    unresolved: !resolved,
    provenance: args.provenance,
  };
}

// WHAT: the label to render for an entity — ALWAYS a human label, NEVER a UUID.
// WHY: the one function every surface uses so identity renders identically and
//      a raw entity_id can never leak into the UI as a primary label. The name
//      is run through formatPersonName so people read as people ("samiksha
//      sharma" → "Samiksha Sharma") at every call site at once; emails, raw
//      ids, and all-caps acronyms are left untouched by the formatter.
export function entityLabel(
  displayName: string | null | undefined,
): string {
  const name = formatPersonName(displayName);
  return name.length > 0 ? name : UNRESOLVED_LABEL;
}
