// FILE: tests/unit/org-map.test.ts
// PURPOSE: PROD-UX-VIS-A — the org map grouping contract: departments group
//          by the manager edge's department (largest first), reporting trees
//          nest manager → direct reports, cross-department managers leave
//          the report as a root of its own department, fully-unplaced people
//          land in the honest unassigned bucket, and needsSetup flags any
//          missing department. Stable ids in, display names out.
import { describe, expect, it } from "vitest";
import { buildOrgMap } from "@/lib/org/org-map";
import type { Entity, EntityMembership } from "@/lib/types/foundation";

const ORG = "org-1";

function person(id: string, name: string): Entity {
  return {
    entity_id: id, entity_type: "PERSON", display_name: name, email: `${id}@x.test`,
    status: "ACTIVE", created_at: "2026-07-01T00:00:00Z", updated_at: "2026-07-01T00:00:00Z",
  } as Entity;
}
function edge(parent: string, child: string, over: Partial<EntityMembership> = {}): EntityMembership {
  return {
    membership_id: `${parent}-${child}`, parent_id: parent, child_id: child,
    role_title: null, department: null, hierarchy_level: 0, is_admin: false,
    is_active: true, created_at: "2026-07-01T00:00:00Z", ...over,
  };
}

const PEOPLE = [
  person("sadeil", "Sadeil"), person("david", "David"), person("vishesh", "Vishesh"),
  person("walter", "Walter"), person("annie", "Annie"), person("newbie", "Newbie"),
];

const MEMBERSHIPS = [
  // org enrollment edges
  edge(ORG, "sadeil", { department: "Leadership", role_title: "Founder & CEO" }),
  edge(ORG, "david"), edge(ORG, "vishesh"), edge(ORG, "walter"), edge(ORG, "annie"),
  edge(ORG, "newbie"),
  // manager edges
  edge("sadeil", "david", { department: "Engineering", role_title: "Engineering Lead", hierarchy_level: 2 }),
  edge("david", "vishesh", { department: "Engineering", role_title: "Engineer", hierarchy_level: 3 }),
  edge("sadeil", "walter", { department: "Sales", role_title: "Sales Lead", hierarchy_level: 2 }),
  edge("walter", "annie", { department: "Sales", role_title: "Account Executive", hierarchy_level: 3 }),
];

describe("org-map — buildOrgMap", () => {
  it("groups by department (largest first) and nests manager → reports", () => {
    const map = buildOrgMap(ORG, MEMBERSHIPS, PEOPLE);
    expect(map.totalPeople).toBe(6);
    const names = map.departments.map((d) => d.department);
    expect(names[0]).toBe("Engineering"); // 2 members, ties broken by name
    const eng = map.departments.find((d) => d.department === "Engineering")!;
    expect(eng.roots).toHaveLength(1);
    expect(eng.roots[0]!.name).toBe("David");
    expect(eng.roots[0]!.reports.map((r) => r.name)).toEqual(["Vishesh"]);
    // David's manager (Sadeil) is outside Engineering → David is the root.
  });

  it("fully-unplaced people land in the unassigned bucket and flag setup", () => {
    const map = buildOrgMap(ORG, MEMBERSHIPS, PEOPLE);
    expect(map.unassigned.map((p) => p.name)).toEqual(["Newbie"]);
    expect(map.needsSetup).toBe(true);
  });

  it("a fully-placed org does not flag setup", () => {
    const placed = [
      ...MEMBERSHIPS.filter((m) => m.child_id !== "newbie"),
      edge(ORG, "newbie"),
      edge("walter", "newbie", { department: "Sales", role_title: "SDR", hierarchy_level: 3 }),
    ];
    const map = buildOrgMap(ORG, placed, PEOPLE);
    expect(map.unassigned).toHaveLength(0);
    expect(map.needsSetup).toBe(false);
    const sales = map.departments.find((d) => d.department === "Sales")!;
    expect(sales.memberCount).toBe(3);
  });

  it("inactive and unknown-person edges are ignored; empty input is safe", () => {
    const map = buildOrgMap(ORG, [
      edge(ORG, "sadeil", { department: "Leadership" }),
      edge("sadeil", "ghost-id"), // unknown person → ignored
      edge("sadeil", "david", { is_active: false }), // inactive → ignored
      edge(ORG, "david"),
    ], PEOPLE.slice(0, 2));
    expect(map.totalPeople).toBe(2);
    expect(buildOrgMap(ORG, [], []).departments).toHaveLength(0);
  });

  it("defensive: a stale cyclic edge set cannot hang the tree walk", () => {
    const cyclic = [
      edge(ORG, "sadeil", { department: "Leadership" }),
      edge(ORG, "david"),
      edge("sadeil", "david", { department: "Leadership" }),
      edge("david", "sadeil", { department: "Leadership" }), // server refuses this; guard anyway
    ];
    const map = buildOrgMap(ORG, cyclic, PEOPLE.slice(0, 2));
    expect(map.departments[0]!.memberCount).toBe(2);
  });
});
