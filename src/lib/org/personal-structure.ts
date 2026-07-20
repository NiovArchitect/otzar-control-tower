// FILE: personal-structure.ts
// PURPOSE: One-shot reporting glance for People — who you report to, who
//          reports to you, and a shallow org tree. Built only from
//          /org/hierarchy + person names (no invented edges).
// CONNECTS TO: PeopleStructureGlance, tests/unit/personal-structure.test.ts.

import type { EntityMembership } from "@/lib/types/foundation";

export interface StructurePerson {
  entity_id: string;
  name: string;
  role_title: string | null;
}

export interface StructureTree {
  lead: StructurePerson;
  reports: StructurePerson[];
}

export interface PersonalStructure {
  self: StructurePerson | null;
  manager: StructurePerson | null;
  reports: StructurePerson[];
  peopleCount: number;
  /** Org members with no person→person manager edge (includes true tops). */
  withoutManagerCount: number;
  /** Shallow trees: each root lead + direct reports only. */
  trees: StructureTree[];
}

export type StructureNameSource = {
  entity_id: string;
  display_name: string;
  email?: string | null;
};

// WHAT: viewer-centric + org-shallow structure for People.
// INPUT: org root, memberships, people (for names + email resolve), viewer email.
// OUTPUT: honest structure; empty-safe when hierarchy/people sparse.
export function buildPersonalStructure(input: {
  orgEntityId: string;
  memberships: ReadonlyArray<EntityMembership>;
  people: ReadonlyArray<StructureNameSource>;
  viewerEmail: string | null;
}): PersonalStructure {
  const { orgEntityId } = input;
  const nameOf = new Map(
    input.people.map((p) => [p.entity_id, p.display_name] as const),
  );
  const active = input.memberships.filter((m) => m.is_active);
  const orgEdges = active.filter((m) => m.parent_id === orgEntityId);
  const managerEdges = active.filter(
    (m) =>
      m.parent_id !== orgEntityId &&
      nameOf.has(m.parent_id) &&
      nameOf.has(m.child_id),
  );
  const managerOf = new Map(managerEdges.map((m) => [m.child_id, m] as const));
  const memberIds = orgEdges
    .map((e) => e.child_id)
    .filter((id) => nameOf.has(id));

  const roleOf = (id: string): string | null =>
    managerOf.get(id)?.role_title ??
    orgEdges.find((e) => e.child_id === id)?.role_title ??
    null;

  const person = (id: string): StructurePerson => ({
    entity_id: id,
    name: nameOf.get(id) ?? "Unknown",
    role_title: roleOf(id),
  });

  const email = input.viewerEmail?.trim().toLowerCase() ?? "";
  const selfEntity =
    email.length > 0
      ? input.people.find((p) => (p.email ?? "").toLowerCase() === email)
      : undefined;
  const self =
    selfEntity !== undefined ? person(selfEntity.entity_id) : null;

  const managerEdge =
    self !== null ? managerOf.get(self.entity_id) : undefined;
  const manager =
    managerEdge !== undefined ? person(managerEdge.parent_id) : null;

  const reports =
    self !== null
      ? managerEdges
          .filter((m) => m.parent_id === self.entity_id)
          .map((m) => person(m.child_id))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];

  const rootIds = memberIds.filter((id) => !managerOf.has(id));
  const trees: StructureTree[] = rootIds
    .map((id) => ({
      lead: person(id),
      reports: managerEdges
        .filter((m) => m.parent_id === id)
        .map((m) => person(m.child_id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort(
      (a, b) =>
        b.reports.length - a.reports.length ||
        a.lead.name.localeCompare(b.lead.name),
    );

  return {
    self,
    manager,
    reports,
    peopleCount: memberIds.length,
    withoutManagerCount: rootIds.length,
    trees,
  };
}
