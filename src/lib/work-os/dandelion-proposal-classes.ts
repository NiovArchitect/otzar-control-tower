// FILE: dandelion-proposal-classes.ts
// PURPOSE: E-01 — Dandelion discovers/proposes multi-class structure:
//          people, roles, managers, teams, projects, externals (+ tools).
//          Inventory coverage for continuous product + deep smoke.
// CONNECTS TO: OrganizationSeeding, FOUNDER E-01, proposal-honesty.

export type ProposalClassId =
  | "people"
  | "roles"
  | "managers"
  | "teams"
  | "projects"
  | "externals"
  | "tools";

export interface ProposalClassDef {
  id: ProposalClassId;
  label: string;
  plain: string;
  seed_types: readonly string[];
}

/** Canonical E-01 classes Dandelion may propose from real work evidence. */
export const DANDELION_PROPOSAL_CLASSES: readonly ProposalClassDef[] = [
  {
    id: "people",
    label: "People",
    plain: "Activate or resolve a person in the org.",
    seed_types: ["confirm_or_activate_person", "resolve_identity"],
  },
  {
    id: "roles",
    label: "Roles",
    plain: "Support or ownership roles observed in work.",
    seed_types: ["confirm_support_role", "add_work_owner_edge"],
  },
  {
    id: "managers",
    label: "Managers",
    plain: "Reporting line / manager assignment proposals.",
    seed_types: ["set_manager"],
  },
  {
    id: "teams",
    label: "Teams",
    plain: "Team membership from observed collaboration.",
    seed_types: ["add_team_membership"],
  },
  {
    id: "projects",
    label: "Projects",
    plain: "First project placement and project membership.",
    seed_types: ["add_project_membership"],
  },
  {
    id: "externals",
    label: "Externals",
    plain: "External collaborator review — never auto-tracked.",
    seed_types: ["review_external_party"],
  },
  {
    id: "tools",
    label: "Tools",
    plain: "Tool access and connector setup needs.",
    seed_types: ["grant_tool_access", "connector_setup"],
  },
] as const;

export const E01_CORE_CLASSES: readonly ProposalClassId[] = [
  "people",
  "managers",
  "projects",
  "externals",
] as const;

export function classForSeedType(seedType: string): ProposalClassId | null {
  const t = seedType.trim();
  for (const c of DANDELION_PROPOSAL_CLASSES) {
    if (c.seed_types.includes(t)) return c.id;
  }
  return null;
}

export interface ClassCoverageRow {
  id: ProposalClassId;
  label: string;
  plain: string;
  count: number;
  seed_types_seen: string[];
  present: boolean;
}

export interface ProposalClassInventory {
  total_seeds: number;
  rows: ClassCoverageRow[];
  classes_present: ProposalClassId[];
  core_classes_present: ProposalClassId[];
  unknown_seed_types: string[];
  multi_class: boolean;
}

export function inventoryProposalClasses(
  seeds: Array<{ seed_type?: string | null }>,
): ProposalClassInventory {
  const counts = new Map<ProposalClassId, { n: number; types: Set<string> }>();
  for (const c of DANDELION_PROPOSAL_CLASSES) {
    counts.set(c.id, { n: 0, types: new Set() });
  }
  const unknown: string[] = [];
  for (const s of seeds) {
    const t = (s.seed_type ?? "").trim();
    if (!t) continue;
    const cls = classForSeedType(t);
    if (!cls) {
      unknown.push(t);
      continue;
    }
    const bucket = counts.get(cls)!;
    bucket.n += 1;
    bucket.types.add(t);
  }
  const rows: ClassCoverageRow[] = DANDELION_PROPOSAL_CLASSES.map((c) => {
    const b = counts.get(c.id)!;
    return {
      id: c.id,
      label: c.label,
      plain: c.plain,
      count: b.n,
      seed_types_seen: Array.from(b.types),
      present: b.n > 0,
    };
  });
  const classes_present = rows.filter((r) => r.present).map((r) => r.id);
  const core_classes_present = classes_present.filter((id) =>
    (E01_CORE_CLASSES as readonly string[]).includes(id),
  ) as ProposalClassId[];
  return {
    total_seeds: seeds.length,
    rows,
    classes_present,
    core_classes_present,
    unknown_seed_types: Array.from(new Set(unknown)),
    multi_class: classes_present.length >= 2,
  };
}

export const E01_DOCTRINE =
  "Dandelion discovers structure from real work — people, roles, managers, " +
  "teams, projects, and externals — and proposes only. Nothing applies until " +
  "an admin confirms. Empty classes mean no open signal, not a fake row.";
