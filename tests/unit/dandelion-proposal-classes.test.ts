// FILE: tests/unit/dandelion-proposal-classes.test.ts
// PURPOSE: E-01 — multi-class Dandelion proposal inventory.

import { describe, expect, it } from "vitest";
import {
  DANDELION_PROPOSAL_CLASSES,
  E01_CORE_CLASSES,
  E01_DOCTRINE,
  classForSeedType,
  inventoryProposalClasses,
} from "@/lib/work-os/dandelion-proposal-classes";

describe("E-01 dandelion proposal classes", () => {
  it("covers people/roles/managers/teams/projects/externals/tools", () => {
    const ids = DANDELION_PROPOSAL_CLASSES.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "people",
        "roles",
        "managers",
        "teams",
        "projects",
        "externals",
        "tools",
      ]),
    );
  });

  it("maps seed types to classes", () => {
    expect(classForSeedType("set_manager")).toBe("managers");
    expect(classForSeedType("add_project_membership")).toBe("projects");
    expect(classForSeedType("review_external_party")).toBe("externals");
    expect(classForSeedType("confirm_or_activate_person")).toBe("people");
    expect(classForSeedType("grant_tool_access")).toBe("tools");
    expect(classForSeedType("unknown_xyz")).toBeNull();
  });

  it("inventories multi-class coverage", () => {
    const inv = inventoryProposalClasses([
      { seed_type: "set_manager" },
      { seed_type: "set_manager" },
      { seed_type: "add_project_membership" },
      { seed_type: "review_external_party" },
      { seed_type: "confirm_or_activate_person" },
      { seed_type: "mystery_type" },
    ]);
    expect(inv.total_seeds).toBe(6);
    expect(inv.multi_class).toBe(true);
    expect(inv.classes_present).toEqual(
      expect.arrayContaining(["managers", "projects", "externals", "people"]),
    );
    expect(inv.core_classes_present.length).toBeGreaterThanOrEqual(3);
    expect(inv.unknown_seed_types).toContain("mystery_type");
    const mgr = inv.rows.find((r) => r.id === "managers");
    expect(mgr?.count).toBe(2);
    expect(mgr?.present).toBe(true);
  });

  it("states doctrine and core classes", () => {
    expect(E01_DOCTRINE).toMatch(/people|projects|externals/i);
    expect(E01_CORE_CLASSES).toEqual(
      expect.arrayContaining(["people", "managers", "projects", "externals"]),
    );
  });
});
