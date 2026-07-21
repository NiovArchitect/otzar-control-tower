// FILE: relationship-edges.ts
// PURPOSE: F-03 — matrix/dotted-line, contractor sponsor, executive without
//          manager. Classifies relationship edge kinds from hierarchy + role
//          labels (solid reporting remains the durable manager edge).
// CONNECTS TO: HierarchyEditor, Users, FOUNDER F-03 / F-04.

export type RelationshipEdgeKind =
  | "solid_reporting"
  | "contractor_sponsor"
  | "executive_no_manager"
  | "needs_manager"
  | "dotted_line_hint";

export interface RelationshipEdgeKindDef {
  id: RelationshipEdgeKind;
  label: string;
  plain: string;
  /** Primary durable reporting line (manager edge). */
  is_primary_reporting: boolean;
}

export const RELATIONSHIP_EDGE_KINDS: readonly RelationshipEdgeKindDef[] = [
  {
    id: "solid_reporting",
    label: "Solid reporting",
    plain: "Primary who-reports-to-whom line. Durable hierarchy edge.",
    is_primary_reporting: true,
  },
  {
    id: "contractor_sponsor",
    label: "Contractor sponsor",
    plain: "Contractor (or external-style role) has a sponsor as their manager edge.",
    is_primary_reporting: true,
  },
  {
    id: "executive_no_manager",
    label: "Executive without manager",
    plain: "Top-level leader with no manager — intentional, not a gap.",
    is_primary_reporting: false,
  },
  {
    id: "needs_manager",
    label: "Needs a manager",
    plain: "No manager assigned and not classified as an executive top.",
    is_primary_reporting: false,
  },
  {
    id: "dotted_line_hint",
    label: "Matrix / dotted-line (hint)",
    plain: "Secondary matrix signal from role/department labels — not a second durable edge yet.",
    is_primary_reporting: false,
  },
] as const;

export const F03_DOCTRINE =
  "Otzar supports more than one relationship shape: solid reporting, contractor " +
  "sponsors, executives without managers, and matrix/dotted-line hints. " +
  "Solid reporting is the durable hierarchy edge. Hierarchy is still not access control.";

export const F03_DOTTED_LINE_HONESTY =
  "Matrix and dotted-line relationships are secondary signals today. " +
  "They appear when role or department labels say matrix/dotted — they do not replace the solid manager edge.";

const EXEC_RE =
  /\b(ceo|coo|cto|cfo|chief|founder|executive|president|owner|managing partner)\b/i;
const CONTRACTOR_RE =
  /\b(contractor|contract|vendor|consultant|freelance|temp|interim|external)\b/i;
const MATRIX_RE = /\b(matrix|dotted[-\s]?line|dotted line|dual report|secondary manager)\b/i;

export function isExecutiveRole(
  roleTitle: string | null | undefined,
  department?: string | null,
): boolean {
  const t = `${roleTitle ?? ""} ${department ?? ""}`;
  return EXEC_RE.test(t);
}

export function isContractorRole(
  roleTitle: string | null | undefined,
  department?: string | null,
): boolean {
  const t = `${roleTitle ?? ""} ${department ?? ""}`;
  return CONTRACTOR_RE.test(t);
}

export function hasMatrixHint(
  roleTitle: string | null | undefined,
  department?: string | null,
): boolean {
  const t = `${roleTitle ?? ""} ${department ?? ""}`;
  return MATRIX_RE.test(t);
}

export interface PersonRelationshipInput {
  entity_id: string;
  display_name: string;
  manager_entity_id: string | null;
  role_title?: string | null;
  department?: string | null;
}

export interface PersonRelationshipView {
  entity_id: string;
  display_name: string;
  manager_entity_id: string | null;
  kind: RelationshipEdgeKind;
  kind_label: string;
  /** Secondary matrix hint alongside primary kind. */
  matrix_hint: boolean;
}

export function classifyPersonRelationship(
  p: PersonRelationshipInput,
): PersonRelationshipView {
  const role = p.role_title ?? null;
  const dept = p.department ?? null;
  const matrix = hasMatrixHint(role, dept);
  let kind: RelationshipEdgeKind;
  if (p.manager_entity_id === null) {
    kind = isExecutiveRole(role, dept)
      ? "executive_no_manager"
      : "needs_manager";
  } else if (isContractorRole(role, dept)) {
    kind = "contractor_sponsor";
  } else {
    kind = "solid_reporting";
  }
  // Matrix hint is additive; primary kind stays solid/sponsor when manager exists.
  // If no manager and matrix label only, still needs_manager/executive, with matrix_hint true.
  const def = RELATIONSHIP_EDGE_KINDS.find((k) => k.id === kind)!;
  return {
    entity_id: p.entity_id,
    display_name: p.display_name,
    manager_entity_id: p.manager_entity_id,
    kind,
    kind_label: def.label,
    matrix_hint: matrix,
  };
}

export interface RelationshipInventory {
  total: number;
  by_kind: Record<RelationshipEdgeKind, number>;
  matrix_hint_count: number;
  executives_without_manager: number;
  contractor_sponsors: number;
  needs_manager: number;
  solid_reporting: number;
}

export function inventoryRelationships(
  people: PersonRelationshipInput[],
): RelationshipInventory {
  const by_kind: Record<RelationshipEdgeKind, number> = {
    solid_reporting: 0,
    contractor_sponsor: 0,
    executive_no_manager: 0,
    needs_manager: 0,
    dotted_line_hint: 0,
  };
  let matrix_hint_count = 0;
  for (const p of people) {
    const v = classifyPersonRelationship(p);
    by_kind[v.kind] += 1;
    if (v.matrix_hint) {
      matrix_hint_count += 1;
      by_kind.dotted_line_hint += 1;
    }
  }
  return {
    total: people.length,
    by_kind,
    matrix_hint_count,
    executives_without_manager: by_kind.executive_no_manager,
    contractor_sponsors: by_kind.contractor_sponsor,
    needs_manager: by_kind.needs_manager,
    solid_reporting: by_kind.solid_reporting,
  };
}

export function relationshipKindBadgeTone(
  kind: RelationshipEdgeKind,
): "default" | "executive" | "sponsor" | "attention" | "matrix" {
  switch (kind) {
    case "executive_no_manager":
      return "executive";
    case "contractor_sponsor":
      return "sponsor";
    case "needs_manager":
      return "attention";
    case "dotted_line_hint":
      return "matrix";
    default:
      return "default";
  }
}
