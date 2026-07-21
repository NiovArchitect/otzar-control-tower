// FILE: canonical-provision.ts
// PURPOSE: R-03 — build STRUCTURAL_CANONICAL_FIXTURE enterprise from S250 seed.
//          Shapes mirror Foundation contracts (membership, twin, project, policy)
//          without claiming live Foundation bulk provision of 250 accounts.
// CONNECTS TO: seed-org, validate-graph, runtime-sample, FOUNDER R-03.

import type { SyntheticOrg, SyntheticPerson } from "./types";
import { generateS250Org } from "./seed-org";
import { validateOrgGraph, type GraphValidation } from "./validate-graph";

export type ProvisionPath =
  | "DATASET_ONLY"
  | "STRUCTURAL_CANONICAL_FIXTURE"
  | "FOUNDATION_LIVE";

/** Foundation-shaped membership edge (fixture — not a DB row). */
export type CanonicalMembership = {
  membership_id: string;
  org_id: string;
  person_id: string;
  is_active: boolean;
  role: string;
  kind: SyntheticPerson["kind"];
  team_id: string | null;
  manager_id: string | null;
  sponsor_id: string | null;
  decision_rights: string[];
  autonomy_ceiling: SyntheticPerson["autonomy_ceiling"];
  /** Explicit fixture tag — never present as live-connector truth. */
  source: "structural_canonical_fixture";
};

export type CanonicalTwin = {
  twin_id: string;
  principal_id: string;
  org_id: string;
  org_bound: true;
  /** Twin must not exceed principal autonomy. */
  autonomy_ceiling: SyntheticPerson["autonomy_ceiling"];
  memory_scope: "org_bound_personal";
  source: "structural_canonical_fixture";
};

export type CanonicalProjectMembership = {
  project_id: string;
  person_id: string;
  role: "owner" | "member";
  org_id: string;
  source: "structural_canonical_fixture";
};

export type CanonicalPolicy = {
  person_id: string;
  tool_eligibility: string[];
  disclosure_ceiling: "internal" | "restricted" | "external_safe";
  source: "structural_canonical_fixture";
};

export type StructuralEnterprise = {
  path: ProvisionPath;
  org_id: string;
  name: string;
  seed: number;
  seed_org: SyntheticOrg;
  memberships: CanonicalMembership[];
  twins: CanonicalTwin[];
  project_memberships: CanonicalProjectMembership[];
  policies: CanonicalPolicy[];
  validation: GraphValidation;
  /** Live Foundation entity count if any — always 0 for fixture path. */
  foundation_live_entity_count: number;
};

function toolEligibility(kind: SyntheticPerson["kind"]): string[] {
  switch (kind) {
    case "executive":
    case "manager":
    case "employee":
      return ["talk", "docs_read", "calendar_propose", "collab_request"];
    case "contractor":
      return ["talk", "docs_read", "collab_request"];
    case "consultant":
      return ["talk", "docs_read"];
    case "external":
      return ["collab_request"];
  }
}

function disclosureCeiling(
  kind: SyntheticPerson["kind"],
): CanonicalPolicy["disclosure_ceiling"] {
  if (kind === "external") return "external_safe";
  if (kind === "contractor" || kind === "consultant") return "restricted";
  return "internal";
}

/**
 * Provision S250 through the structural canonical path.
 * Mirrors real-org steps: org → people → memberships → hierarchy → twins →
 * projects → policies — as fixtures, not silent raw DB inserts without tags.
 */
export function provisionS250Structural(
  seed = 250_001,
): StructuralEnterprise {
  const seed_org = generateS250Org(seed);
  const memberships: CanonicalMembership[] = seed_org.people.map((p) => ({
    membership_id: `mem-${p.id}`,
    org_id: seed_org.org_id,
    person_id: p.id,
    is_active: p.kind !== "external", // externals participate without full membership
    role: p.role_template,
    kind: p.kind,
    team_id: p.team_id,
    manager_id: p.manager_id,
    sponsor_id: p.sponsor_id,
    decision_rights: [...p.decision_rights],
    autonomy_ceiling: p.autonomy_ceiling,
    source: "structural_canonical_fixture",
  }));

  // Externals get inactive membership edge for graph completeness when needed
  // Active count excludes them.

  const twins: CanonicalTwin[] = seed_org.people.map((p) => ({
    twin_id: p.twin_id,
    principal_id: p.id,
    org_id: seed_org.org_id,
    org_bound: true as const,
    autonomy_ceiling: p.autonomy_ceiling,
    memory_scope: "org_bound_personal" as const,
    source: "structural_canonical_fixture",
  }));

  const project_memberships: CanonicalProjectMembership[] = [];
  for (const proj of seed_org.projects) {
    for (const person_id of proj.member_ids) {
      project_memberships.push({
        project_id: proj.id,
        person_id,
        role: person_id === proj.owner_id ? "owner" : "member",
        org_id: seed_org.org_id,
        source: "structural_canonical_fixture",
      });
    }
  }

  const policies: CanonicalPolicy[] = seed_org.people.map((p) => ({
    person_id: p.id,
    tool_eligibility: toolEligibility(p.kind),
    disclosure_ceiling: disclosureCeiling(p.kind),
    source: "structural_canonical_fixture",
  }));

  const validation = validateOrgGraph(seed_org);

  // Extra twin authority invariant: twin ceiling ≤ principal (equal only)
  for (const t of twins) {
    const m = memberships.find((x) => x.person_id === t.principal_id);
    if (m && t.autonomy_ceiling !== m.autonomy_ceiling) {
      validation.violations.push({
        code: "twin_broader_than_principal",
        severity: "P0",
        plain: `Twin ${t.twin_id} autonomy exceeds principal`,
        subject_id: t.twin_id,
      });
      validation.pass = validation.violations.every((v) => v.severity !== "P0")
        ? validation.pass
        : false;
    }
  }
  // Recompute pass on P0
  validation.pass = validation.violations.filter((v) => v.severity === "P0")
    .length === 0;

  return {
    path: "STRUCTURAL_CANONICAL_FIXTURE",
    org_id: seed_org.org_id,
    name: seed_org.name,
    seed,
    seed_org,
    memberships,
    twins,
    project_memberships,
    policies,
    validation,
    foundation_live_entity_count: 0,
  };
}

export function assertStructuralHonesty(ent: StructuralEnterprise): string {
  return (
    `path=${ent.path} · humans=${ent.seed_org.people.length} · ` +
    `twins=${ent.twins.length} · memberships=${ent.memberships.length} · ` +
    `foundation_live=${ent.foundation_live_entity_count} · ` +
    `graph_pass=${ent.validation.pass}`
  );
}
