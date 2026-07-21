// FILE: tests/unit/person-type-taxonomy.test.ts
// PURPOSE: E-03 — employee/contractor/vendor/customer; participation ≠ authority.

import { describe, expect, it } from "vitest";
import {
  E03_DOCTRINE,
  PARTICIPATION_NEQ_AUTHORITY,
  PERSON_TYPES,
  classifyPersonType,
  inventoryPersonTypes,
  participationImpliesAuthority,
  personTypeLabel,
} from "@/lib/org/person-type-taxonomy";

describe("E-03 person type taxonomy", () => {
  it("classifies four person types", () => {
    expect(classifyPersonType({ role_title: "Engineer" })).toBe("employee");
    expect(classifyPersonType({ role_title: "Contractor" })).toBe("contractor");
    expect(classifyPersonType({ role_title: "Vendor contact" })).toBe("vendor");
    expect(classifyPersonType({ title: "Customer success lead", role_title: "Customer account" })).toBe(
      "customer",
    );
  });

  it("defaults empty labels to employee", () => {
    expect(classifyPersonType({})).toBe("employee");
    expect(personTypeLabel("contractor")).toBe("Contractor");
  });

  it("inventories multi-type orgs", () => {
    const inv = inventoryPersonTypes([
      { entity_id: "1", display_name: "A", role_title: "Engineer" },
      { entity_id: "2", display_name: "B", role_title: "Contractor" },
      { entity_id: "3", display_name: "C", department: "Vendor ops" },
    ]);
    expect(inv.total).toBe(3);
    expect(inv.by_type.employee).toBe(1);
    expect(inv.by_type.contractor).toBe(1);
    expect(inv.by_type.vendor).toBe(1);
    expect(inv.multi_type).toBe(true);
  });

  it("states participation ≠ authority", () => {
    expect(participationImpliesAuthority()).toBe(false);
    expect(PARTICIPATION_NEQ_AUTHORITY).toMatch(/not authority/i);
    expect(E03_DOCTRINE).toMatch(/employee|contractor|vendor|customer/i);
    expect(PERSON_TYPES).toHaveLength(4);
  });
});
