// FILE: org-map.ts
// PURPOSE: PROD-UX-VIS-A — the pure grouping behind the admin's org map:
//          departments → managers → direct reports, plus the two honest
//          attention buckets ("No manager assigned", "Needs setup"). Built
//          entirely from the /org/hierarchy read (stable entity ids under
//          the hood; display names only at the edges). Smallest clear org
//          map — deliberately not an HRIS.
// CONNECTS TO: src/pages/Users.tsx (OrgMapCard), tests/unit/org-map.test.ts.

import type { Entity, EntityMembership } from "@/lib/types/foundation";

export interface OrgMapPerson {
  entity_id: string;
  name: string;
  role_title: string | null;
  reports: OrgMapPerson[];
}

export interface OrgMapDepartment {
  department: string;
  /** Top people of this department's reporting trees (no manager inside the dept). */
  roots: OrgMapPerson[];
  memberCount: number;
}

export interface OrgMap {
  departments: OrgMapDepartment[];
  /** People with no manager AND no department — need hierarchy setup. */
  unassigned: OrgMapPerson[];
  /** True when anyone lacks a manager or department (drives the calm warning). */
  needsSetup: boolean;
  totalPeople: number;
}

// WHAT: build the org map from the hierarchy read + the people list.
// INPUT: memberships (org→person AND person→person manager edges; the org
//        root id distinguishes them) + the PERSON entities for names.
// OUTPUT: departments sorted by size (largest first), reporting trees inside,
//         unassigned bucket, and the needs-setup flag. Never throws on sparse
//         or cyclic data (cycles are server-refused; a defensive visited-set
//         still guards the walk).
export function buildOrgMap(
  orgEntityId: string,
  memberships: EntityMembership[],
  people: Entity[],
): OrgMap {
  const nameOf = new Map(people.map((p) => [p.entity_id, p.display_name] as const));
  const active = memberships.filter((m) => m.is_active);
  const orgEdges = active.filter((m) => m.parent_id === orgEntityId);
  const managerEdges = active.filter(
    (m) => m.parent_id !== orgEntityId && nameOf.has(m.parent_id) && nameOf.has(m.child_id),
  );
  const managerOf = new Map(managerEdges.map((m) => [m.child_id, m] as const));

  // department: manager edge wins, else the org enrollment edge.
  const deptOf = (id: string): string | null =>
    managerOf.get(id)?.department ??
    orgEdges.find((e) => e.child_id === id)?.department ??
    null;
  const roleOf = (id: string): string | null =>
    managerOf.get(id)?.role_title ??
    orgEdges.find((e) => e.child_id === id)?.role_title ??
    null;

  const memberIds = orgEdges.map((e) => e.child_id).filter((id) => nameOf.has(id));

  const node = (id: string, visited: Set<string>): OrgMapPerson => ({
    entity_id: id,
    name: nameOf.get(id) ?? "Unknown",
    role_title: roleOf(id),
    reports: managerEdges
      .filter((m) => m.parent_id === id && !visited.has(m.child_id))
      .map((m) => {
        visited.add(m.child_id);
        return node(m.child_id, visited);
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
  });

  const byDept = new Map<string, string[]>();
  const unassignedIds: string[] = [];
  for (const id of memberIds) {
    const dept = deptOf(id);
    const hasManager = managerOf.has(id);
    if (dept === null && !hasManager) {
      unassignedIds.push(id);
      continue;
    }
    const key = dept ?? "No department yet";
    byDept.set(key, [...(byDept.get(key) ?? []), id]);
  }

  const departments: OrgMapDepartment[] = [...byDept.entries()]
    .map(([department, ids]) => {
      const inDept = new Set(ids);
      // Roots: members whose manager is absent or outside this department.
      const rootIds = ids.filter((id) => {
        const mgr = managerOf.get(id)?.parent_id;
        return mgr === undefined || !inDept.has(mgr);
      });
      const visited = new Set<string>(rootIds);
      return {
        department,
        roots: rootIds.map((id) => node(id, visited)).sort((a, b) => a.name.localeCompare(b.name)),
        memberCount: ids.length,
      };
    })
    .sort((a, b) => b.memberCount - a.memberCount || a.department.localeCompare(b.department));

  // Needs setup = anyone fully unassigned, or anyone still missing a
  // department. (A person with a department but no manager is a valid
  // department top — not flagged.)
  const anyMissing =
    unassignedIds.length > 0 || memberIds.some((id) => deptOf(id) === null);

  return {
    departments,
    unassigned: unassignedIds
      .map((id) => ({ entity_id: id, name: nameOf.get(id) ?? "Unknown", role_title: roleOf(id), reports: [] }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    needsSetup: anyMissing,
    totalPeople: memberIds.length,
  };
}
