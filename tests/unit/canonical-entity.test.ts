// FILE: canonical-entity.test.ts
// PURPOSE: Phase 1285-H — lock the single client identity contract: every
//          entity renders a human label (never a raw UUID), a missing entity is
//          a first-class state (unresolved=true, "Unknown entity"), and the
//          entity_id is carried for traceability ONLY.
// CONNECTS TO: src/lib/identity/canonical-entity.ts

import { describe, expect, it } from "vitest";
import {
  toCanonicalEntity,
  entityLabel,
  UNRESOLVED_LABEL,
} from "@/lib/identity/canonical-entity";

describe("entityLabel — never a raw UUID", () => {
  it("returns the display name when present", () => {
    expect(entityLabel("David Odie")).toBe("David Odie");
  });
  it("returns the canonical label for null/undefined/blank (never a UUID)", () => {
    expect(entityLabel(null)).toBe(UNRESOLVED_LABEL);
    expect(entityLabel(undefined)).toBe(UNRESOLVED_LABEL);
    expect(entityLabel("   ")).toBe(UNRESOLVED_LABEL);
  });
  it("never returns a value equal to a UUID-looking input it was not given", () => {
    // entityLabel only ever returns the trimmed name or the canonical label.
    expect(entityLabel("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    ); // a real name could look odd, but a UUID is never SYNTHESIZED as a label
    expect(entityLabel("")).toBe(UNRESOLVED_LABEL); // blank → canonical, not id
  });
});

describe("toCanonicalEntity — missing entity is first-class", () => {
  it("resolved entity carries the given role + display name", () => {
    const c = toCanonicalEntity({
      entity_id: "e1",
      display_name: "Sadeil Lewis",
      role: "owner",
      provenance: "ledger",
    });
    expect(c).toEqual({
      entity_id: "e1",
      display_name: "Sadeil Lewis",
      role: "owner",
      unresolved: false,
      provenance: "ledger",
    });
  });
  it("unresolved entity → canonical label, role=system, unresolved=true, id kept for traceability", () => {
    const c = toCanonicalEntity({
      entity_id: "e-missing",
      display_name: null,
      role: "owner",
      provenance: "ledger",
    });
    expect(c.display_name).toBe(UNRESOLVED_LABEL);
    expect(c.role).toBe("system");
    expect(c.unresolved).toBe(true);
    // id retained for debugging, but the LABEL is never the id.
    expect(c.entity_id).toBe("e-missing");
    expect(c.display_name).not.toBe(c.entity_id);
  });
  it("blank display name is treated as unresolved", () => {
    expect(toCanonicalEntity({ display_name: "  ", role: "actor", provenance: "thread" }).unresolved).toBe(true);
  });
});
