// FILE: tests/unit/hierarchy-editor.test.ts
// PURPOSE: F-02 hierarchy draft/cycle/undo + F-04 authority separation copy.

import { describe, expect, it } from "vitest";
import {
  HIERARCHY_NOT_AUTHORITY_COPY,
  buildUndoEntry,
  clearDrafts,
  effectiveManager,
  managerMapFromEdges,
  moveFocusIndex,
  stageDraftChange,
  undoAsAssigns,
  wouldCreateCycle,
  windowSlice,
} from "@/lib/org/hierarchy-editor";

const edges = [
  { person_entity_id: "a", manager_entity_id: null as string | null },
  { person_entity_id: "b", manager_entity_id: "a" },
  { person_entity_id: "c", manager_entity_id: "b" },
];

describe("F-02 hierarchy editor model", () => {
  it("detects cycles", () => {
    const m = managerMapFromEdges(edges);
    expect(wouldCreateCycle("a", "c", m)).toBe(true); // c→b→a, a→c cycle
    expect(wouldCreateCycle("c", "a", m)).toBe(false);
    expect(wouldCreateCycle("b", null, m)).toBe(false);
    expect(wouldCreateCycle("b", "b", m)).toBe(true);
  });

  it("stages drafts and effective manager", () => {
    const m = managerMapFromEdges(edges);
    let drafts = clearDrafts();
    drafts = stageDraftChange(drafts, {
      person_entity_id: "c",
      from_manager_entity_id: "b",
      to_manager_entity_id: "a",
    });
    expect(drafts).toHaveLength(1);
    expect(effectiveManager("c", m, drafts)).toBe("a");
    // same as from → remove
    drafts = stageDraftChange(drafts, {
      person_entity_id: "c",
      from_manager_entity_id: "b",
      to_manager_entity_id: "b",
    });
    expect(drafts).toHaveLength(0);
  });

  it("undo reverses applied edges", () => {
    const entry = buildUndoEntry(
      [
        {
          person_entity_id: "c",
          from_manager_entity_id: "b",
          to_manager_entity_id: "a",
        },
      ],
      ["audit-1"],
      "2026-07-20T00:00:00.000Z",
    );
    const rev = undoAsAssigns(entry);
    expect(rev[0]?.to_manager_entity_id).toBe("b");
    expect(rev[0]?.from_manager_entity_id).toBe("a");
  });

  it("keyboard focus wraps", () => {
    expect(moveFocusIndex(0, -1, 3)).toBe(2);
    expect(moveFocusIndex(2, 1, 3)).toBe(0);
  });

  it("virtual window around focus", () => {
    const w = windowSlice(100, 50, 40);
    expect(w.end - w.start).toBe(40);
    expect(w.start).toBeLessThanOrEqual(50);
    expect(w.end).toBeGreaterThan(50);
  });

  it("F-04 hierarchy is not authority copy", () => {
    expect(HIERARCHY_NOT_AUTHORITY_COPY.toLowerCase()).toMatch(
      /not access control|not.*rbac|tar|tool authority/i,
    );
  });
});
