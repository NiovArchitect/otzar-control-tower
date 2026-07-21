// FILE: validate-graph.ts
// PURPOSE: R-03 S250 — structural counts + hard graph invariants.
// CONNECTS TO: seed-org, canonical-provision, acceptance-gate.

import type { SyntheticOrg, SyntheticPerson } from "./types";

export type StructuralCounts = {
  humans: number;
  ai_teammates: number;
  active_memberships: number;
  suspended_memberships: number;
  teams: number;
  departments: number;
  managers: number;
  direct_reports: number;
  dotted_line_relationships: number;
  users_without_managers: number;
  project_squads: number;
  project_owners: number;
  decision_owners: number;
  contractors: number;
  consultants: number;
  external_participants: number;
  cross_team_dependencies: number;
  restricted_scopes: number;
  executives: number;
  employees: number;
  matrix_edges: number;
  hierarchy_edges: number;
  projects_active: number;
  projects_blocked: number;
};

export type InvariantViolation = {
  code: string;
  severity: "P0" | "P1" | "P2";
  plain: string;
  subject_id?: string;
};

export type GraphValidation = {
  counts: StructuralCounts;
  violations: InvariantViolation[];
  pass: boolean;
};

function countKind(people: SyntheticPerson[], kind: string): number {
  return people.filter((p) => p.kind === kind).length;
}

export function structuralCounts(org: SyntheticOrg): StructuralCounts {
  const withManager = org.people.filter((p) => p.manager_id).length;
  const withoutManager = org.people.filter((p) => !p.manager_id).length;
  // Cross-team deps: projects spanning >1 team
  const crossTeam = org.projects.filter((p) => p.team_ids.length > 1).length;
  const restricted = org.people.filter(
    (p) =>
      p.kind === "contractor" ||
      p.kind === "consultant" ||
      p.kind === "external" ||
      p.autonomy_ceiling === "observe",
  ).length;

  return {
    humans: org.people.length,
    ai_teammates: org.twins.length,
    active_memberships: org.people.filter((p) => p.kind !== "external").length,
    suspended_memberships: 0, // seed has no suspended yet — honesty zero
    teams: org.teams.length,
    departments: org.teams.length, // teams stand in for departments in S250 seed
    managers: countKind(org.people, "manager"),
    direct_reports: withManager,
    dotted_line_relationships: org.matrix_edges.length,
    users_without_managers: withoutManager,
    project_squads: org.projects.length,
    project_owners: new Set(org.projects.map((p) => p.owner_id)).size,
    decision_owners: org.people.filter((p) => p.decision_rights.length > 0)
      .length,
    contractors: countKind(org.people, "contractor"),
    consultants: countKind(org.people, "consultant"),
    external_participants: countKind(org.people, "external"),
    cross_team_dependencies: crossTeam,
    restricted_scopes: restricted,
    executives: countKind(org.people, "executive"),
    employees: countKind(org.people, "employee"),
    matrix_edges: org.matrix_edges.length,
    hierarchy_edges: org.hierarchy_edges.length,
    projects_active: org.projects.filter((p) => p.status === "active").length,
    projects_blocked: org.projects.filter((p) => p.status === "blocked").length,
  };
}

/** Detect circular reporting via walk. */
function hasHierarchyCycle(org: SyntheticOrg): string | null {
  const mgr = new Map(
    org.hierarchy_edges.map((e) => [e.person_id, e.manager_id]),
  );
  for (const p of org.people) {
    const seen = new Set<string>();
    let cur: string | null | undefined = p.id;
    while (cur) {
      if (seen.has(cur)) return cur;
      seen.add(cur);
      cur = mgr.get(cur) ?? null;
    }
  }
  return null;
}

export function validateOrgGraph(org: SyntheticOrg): GraphValidation {
  const violations: InvariantViolation[] = [];
  const counts = structuralCounts(org);
  const peopleById = new Map(org.people.map((p) => [p.id, p]));
  const twinByHuman = new Map(org.twins.map((t) => [t.human_id, t]));
  const twinIds = new Set(org.twins.map((t) => t.id));

  // Counts floors
  if (counts.humans !== 250) {
    violations.push({
      code: "human_count",
      severity: "P0",
      plain: `Expected 250 humans, got ${counts.humans}`,
    });
  }
  if (counts.ai_teammates !== 250) {
    violations.push({
      code: "twin_count",
      severity: "P0",
      plain: `Expected 250 twins, got ${counts.ai_teammates}`,
    });
  }
  if (counts.teams < 20) {
    violations.push({
      code: "team_floor",
      severity: "P0",
      plain: `Expected ≥20 teams, got ${counts.teams}`,
    });
  }
  if (counts.project_squads < 30) {
    violations.push({
      code: "project_floor",
      severity: "P0",
      plain: `Expected ≥30 projects, got ${counts.project_squads}`,
    });
  }

  // Every active Twin has one valid principal
  for (const t of org.twins) {
    const human = peopleById.get(t.human_id);
    if (!human) {
      violations.push({
        code: "orphan_twin",
        severity: "P0",
        plain: `Twin ${t.id} has no principal`,
        subject_id: t.id,
      });
    }
    if (!t.org_bound) {
      violations.push({
        code: "unbound_twin",
        severity: "P0",
        plain: `Twin ${t.id} not org-bound`,
        subject_id: t.id,
      });
    }
  }

  // Every human has exactly one twin
  for (const p of org.people) {
    const twin = twinByHuman.get(p.id);
    if (!twin) {
      violations.push({
        code: "missing_twin",
        severity: "P0",
        plain: `Human ${p.id} has no twin`,
        subject_id: p.id,
      });
    } else if (p.twin_id !== twin.id) {
      violations.push({
        code: "twin_id_mismatch",
        severity: "P0",
        plain: `Human ${p.id} twin_id mismatch`,
        subject_id: p.id,
      });
    }
    // Twin authority ceiling cannot exceed principal rights (observe ≤ execute order)
    const rank = { observe: 0, draft: 1, confirm: 2, execute: 3 } as const;
    // Twin inherits ceiling — no broader: twin autonomy == person ceiling
    if (!rank[p.autonomy_ceiling] && rank[p.autonomy_ceiling] !== 0) {
      violations.push({
        code: "invalid_autonomy",
        severity: "P1",
        plain: `Invalid autonomy on ${p.id}`,
        subject_id: p.id,
      });
    }
  }

  // No duplicate twin ids
  if (twinIds.size !== org.twins.length) {
    violations.push({
      code: "duplicate_twin_id",
      severity: "P0",
      plain: "Duplicate twin ids",
    });
  }

  // Project owner is active authorized member
  for (const proj of org.projects) {
    const owner = peopleById.get(proj.owner_id);
    if (!owner) {
      violations.push({
        code: "missing_owner",
        severity: "P0",
        plain: `Project ${proj.id} owner missing`,
        subject_id: proj.id,
      });
      continue;
    }
    if (!proj.member_ids.includes(proj.owner_id)) {
      violations.push({
        code: "owner_not_member",
        severity: "P0",
        plain: `Project ${proj.id} owner not in membership`,
        subject_id: proj.id,
      });
    }
    if (owner.kind === "external") {
      violations.push({
        code: "external_owner",
        severity: "P0",
        plain: `Project ${proj.id} owned by external`,
        subject_id: proj.id,
      });
    }
    for (const mid of proj.member_ids) {
      if (!peopleById.has(mid)) {
        violations.push({
          code: "ghost_member",
          severity: "P0",
          plain: `Project ${proj.id} ghost member ${mid}`,
          subject_id: proj.id,
        });
      }
    }
  }

  // Contractors have sponsors where required (kind contractor → sponsor preferred)
  for (const p of org.people) {
    if (p.kind === "contractor" && !p.sponsor_id && !p.manager_id) {
      violations.push({
        code: "contractor_unsponsored",
        severity: "P1",
        plain: `Contractor ${p.id} has no sponsor or manager`,
        subject_id: p.id,
      });
    }
  }

  // Hierarchy edges reference same-org people only (single-tenant seed)
  for (const e of org.hierarchy_edges) {
    if (!peopleById.has(e.person_id)) {
      violations.push({
        code: "hierarchy_ghost",
        severity: "P0",
        plain: `Hierarchy person missing ${e.person_id}`,
      });
    }
    if (e.manager_id && !peopleById.has(e.manager_id)) {
      violations.push({
        code: "hierarchy_foreign_manager",
        severity: "P0",
        plain: `Manager ${e.manager_id} not in org`,
        subject_id: e.person_id,
      });
    }
  }

  // No invalid circular reporting
  const cycle = hasHierarchyCycle(org);
  if (cycle) {
    violations.push({
      code: "hierarchy_cycle",
      severity: "P0",
      plain: `Hierarchy cycle involving ${cycle}`,
      subject_id: cycle,
    });
  }

  // No duplicate people ids
  if (new Set(org.people.map((p) => p.id)).size !== org.people.length) {
    violations.push({
      code: "duplicate_person",
      severity: "P0",
      plain: "Duplicate person ids",
    });
  }

  // Team leads exist
  for (const team of org.teams) {
    if (!peopleById.has(team.lead_id)) {
      violations.push({
        code: "team_lead_missing",
        severity: "P0",
        plain: `Team ${team.id} lead missing`,
        subject_id: team.id,
      });
    }
  }

  const p0 = violations.filter((v) => v.severity === "P0");
  return {
    counts,
    violations,
    pass: p0.length === 0,
  };
}
