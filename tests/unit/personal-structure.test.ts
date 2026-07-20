// FILE: personal-structure.test.ts
// PURPOSE: Contract for People hierarchy glance — manager, reports, trees.

import { describe, expect, it } from "vitest";
import { buildPersonalStructure } from "@/lib/org/personal-structure";
import type { EntityMembership } from "@/lib/types/foundation";

const ORG = "org-1";

function edge(
  parent: string,
  child: string,
  over: Partial<EntityMembership> = {},
): EntityMembership {
  return {
    membership_id: `${parent}-${child}`,
    parent_id: parent,
    child_id: child,
    role_title: null,
    department: null,
    hierarchy_level: 0,
    is_admin: false,
    is_active: true,
    created_at: "2026-07-01T00:00:00Z",
    ...over,
  };
}

const PEOPLE = [
  { entity_id: "sadeil", display_name: "Sadeil", email: "sadeil@x.test" },
  { entity_id: "david", display_name: "David", email: "david@x.test" },
  { entity_id: "vishesh", display_name: "Vishesh", email: "vishesh@x.test" },
  { entity_id: "newbie", display_name: "Newbie", email: "newbie@x.test" },
];

const MEMBERSHIPS = [
  edge(ORG, "sadeil", { role_title: "Founder" }),
  edge(ORG, "david"),
  edge(ORG, "vishesh"),
  edge(ORG, "newbie"),
  edge("sadeil", "david", { role_title: "Tech Lead", hierarchy_level: 2 }),
  edge("david", "vishesh", { role_title: "Engineer", hierarchy_level: 3 }),
];

describe("buildPersonalStructure", () => {
  it("resolves viewer manager and direct reports by email", () => {
    const s = buildPersonalStructure({
      orgEntityId: ORG,
      memberships: MEMBERSHIPS,
      people: PEOPLE,
      viewerEmail: "david@x.test",
    });
    expect(s.self?.name).toBe("David");
    expect(s.manager?.name).toBe("Sadeil");
    expect(s.reports.map((r) => r.name)).toEqual(["Vishesh"]);
  });

  it("marks top-of-chain when viewer has no manager", () => {
    const s = buildPersonalStructure({
      orgEntityId: ORG,
      memberships: MEMBERSHIPS,
      people: PEOPLE,
      viewerEmail: "sadeil@x.test",
    });
    expect(s.manager).toBeNull();
    expect(s.reports.map((r) => r.name)).toEqual(["David"]);
  });

  it("builds shallow trees from roots", () => {
    const s = buildPersonalStructure({
      orgEntityId: ORG,
      memberships: MEMBERSHIPS,
      people: PEOPLE,
      viewerEmail: "sadeil@x.test",
    });
    expect(s.peopleCount).toBe(4);
    // roots: sadeil + newbie (no manager edge)
    expect(s.withoutManagerCount).toBe(2);
    const leadNames = s.trees.map((t) => t.lead.name).sort();
    expect(leadNames).toEqual(["Newbie", "Sadeil"]);
    const sadeilTree = s.trees.find((t) => t.lead.name === "Sadeil")!;
    expect(sadeilTree.reports.map((r) => r.name)).toEqual(["David"]);
  });

  it("is empty-safe without people or memberships", () => {
    const s = buildPersonalStructure({
      orgEntityId: ORG,
      memberships: [],
      people: [],
      viewerEmail: "x@y.test",
    });
    expect(s.self).toBeNull();
    expect(s.trees).toEqual([]);
    expect(s.peopleCount).toBe(0);
  });
});
