// FILE: tests/unit/project-graph.test.ts
// PURPOSE: J-04 — project graph inventory + disconnect detection.

import { describe, expect, it } from "vitest";
import {
  J04_DOCTRINE,
  buildProjectGraphInventory,
  detectProjectGraphDisconnects,
  projectGraphHealth,
} from "@/lib/work-os/project-graph";

describe("J-04 project graph", () => {
  it("states doctrine and builds inventory facets", () => {
    expect(J04_DOCTRINE).toMatch(/project_id|mission heart/i);
    const inv = buildProjectGraphInventory({
      project_id: "p1",
      name: "Launch Atlas",
      owner_names: ["Ada Owner"],
      member_names: ["Ben Member"],
      open_work_titles: ["Draft brief"],
      blocker_titles: [],
      meeting_titles: ["Kickoff"],
      doc_titles: ["Brief doc"],
      obligation_titles: ["Send brief"],
      ai_notes: ["Twin drafting"],
      next_best: "Confirm owners",
    });
    expect(inv.facets.objective.present).toBe(true);
    expect(inv.facets.people.present).toBe(true);
    expect(inv.facets.open_work.count).toBe(1);
    const h = projectGraphHealth(inv);
    expect(h.ok).toBe(true);
    expect(h.score).toBeGreaterThan(0.5);
  });

  it("flags P0 disconnects for no people and orphan obligations", () => {
    const empty = buildProjectGraphInventory({
      project_id: "p2",
      name: "",
      objective: "",
    });
    const d1 = detectProjectGraphDisconnects(empty);
    expect(d1.some((x) => x.code === "no_people")).toBe(true);

    const orphan = buildProjectGraphInventory({
      project_id: "p3",
      name: "X",
      obligation_titles: ["Do thing"],
    });
    const d2 = detectProjectGraphDisconnects(orphan);
    expect(d2.some((x) => x.code === "orphan_obligations")).toBe(true);
  });
});
