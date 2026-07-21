// FILE: tests/unit/relationship-edges.test.ts
// PURPOSE: F-03 — matrix/sponsor/executive edge classification.

import { describe, expect, it } from "vitest";
import {
  F03_DOCTRINE,
  classifyPersonRelationship,
  inventoryRelationships,
  isContractorRole,
  isExecutiveRole,
  hasMatrixHint,
} from "@/lib/org/relationship-edges";

describe("F-03 relationship edges", () => {
  it("classifies executive without manager", () => {
    const v = classifyPersonRelationship({
      entity_id: "1",
      display_name: "Sadeil",
      manager_entity_id: null,
      role_title: "CEO / Founder",
    });
    expect(v.kind).toBe("executive_no_manager");
  });

  it("classifies contractor sponsor when manager present", () => {
    const v = classifyPersonRelationship({
      entity_id: "2",
      display_name: "Walter",
      manager_entity_id: "mgr",
      role_title: "Contractor",
    });
    expect(v.kind).toBe("contractor_sponsor");
  });

  it("classifies solid reporting and needs manager", () => {
    expect(
      classifyPersonRelationship({
        entity_id: "3",
        display_name: "Vishesh",
        manager_entity_id: "mgr",
        role_title: "Engineer",
      }).kind,
    ).toBe("solid_reporting");
    expect(
      classifyPersonRelationship({
        entity_id: "4",
        display_name: "Alex",
        manager_entity_id: null,
        role_title: "IC",
      }).kind,
    ).toBe("needs_manager");
  });

  it("detects matrix hints without replacing primary kind", () => {
    expect(hasMatrixHint("Matrix product lead", null)).toBe(true);
    const v = classifyPersonRelationship({
      entity_id: "5",
      display_name: "Jordan",
      manager_entity_id: "mgr",
      role_title: "Engineer (dotted-line product)",
    });
    expect(v.kind).toBe("solid_reporting");
    expect(v.matrix_hint).toBe(true);
  });

  it("inventories kinds and states doctrine", () => {
    const inv = inventoryRelationships([
      {
        entity_id: "a",
        display_name: "A",
        manager_entity_id: null,
        role_title: "CEO",
      },
      {
        entity_id: "b",
        display_name: "B",
        manager_entity_id: "a",
        role_title: "Contractor",
      },
      {
        entity_id: "c",
        display_name: "C",
        manager_entity_id: "a",
        role_title: "Engineer",
      },
    ]);
    expect(inv.executives_without_manager).toBe(1);
    expect(inv.contractor_sponsors).toBe(1);
    expect(inv.solid_reporting).toBe(1);
    expect(isExecutiveRole("Chief Product Officer")).toBe(true);
    expect(isContractorRole("Vendor consultant")).toBe(true);
    expect(F03_DOCTRINE).toMatch(/sponsor|executive|matrix/i);
  });
});
