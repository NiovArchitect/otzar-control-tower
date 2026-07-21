// FILE: tests/unit/enterprise-pressure.test.ts
// PURPOSE: R-01 — progressive pressure bands + cycle repair probe.

import { describe, expect, it } from "vitest";
import {
  PRESSURE_LEVELS,
  R01_DOCTRINE,
  R01_SCALE_RESIDUAL,
  REPAIR_LOOP_STEPS,
  classifyPeoplePressure,
  cycleRepairProbe,
  progressiveHarnessStatus,
  scorePressureProbes,
} from "@/lib/org/enterprise-pressure";

describe("R-01 enterprise pressure", () => {
  it("documents 3 progressive levels and repair loop", () => {
    expect(R01_DOCTRINE).toMatch(/25|250|2500|repair/i);
    expect(PRESSURE_LEVELS.map((l) => l.people_target)).toEqual([25, 250, 2500]);
    expect(REPAIR_LOOP_STEPS.map((s) => s.id)).toEqual([
      "detect",
      "refuse_or_fix",
      "reprove",
      "regress",
    ]);
    expect(R01_SCALE_RESIDUAL).toMatch(/scale|2500|residual/i);
  });

  it("classifies people pressure bands", () => {
    expect(classifyPeoplePressure(10).level).toBe("L1");
    expect(classifyPeoplePressure(25).level).toBe("L1");
    expect(classifyPeoplePressure(250).level).toBe("L2");
    expect(classifyPeoplePressure(2500).level).toBe("L3");
    expect(classifyPeoplePressure(2500).residual_scale).toBe(false);
    expect(classifyPeoplePressure(40).residual_scale).toBe(true);
  });

  it("lists progressive proven vs residual levels", () => {
    const s = progressiveHarnessStatus(30);
    expect(s.proven_levels).toContain("L1");
    expect(s.residual_levels).toEqual(expect.arrayContaining(["L2", "L3"]));
    const mid = progressiveHarnessStatus(300);
    expect(mid.proven_levels).toEqual(expect.arrayContaining(["L1", "L2"]));
  });

  it("detects cycle repair probe for A→B when B reports to A", () => {
    const edges = [
      { person_entity_id: "a", manager_entity_id: null },
      { person_entity_id: "b", manager_entity_id: "a" },
    ];
    // Assign a → b would cycle (b already under a)
    const r = cycleRepairProbe({
      edges,
      person_entity_id: "a",
      manager_entity_id: "b",
    });
    expect(r.ok).toBe(true);
    expect(r.detail).toMatch(/Cycle detected/i);
  });

  it("scores pressure probes", () => {
    const s = scorePressureProbes([
      { id: "a", ok: true, detail: "" },
      { id: "b", ok: true, detail: "" },
      { id: "c", ok: true, detail: "" },
    ]);
    expect(s.all_ok).toBe(true);
    expect(
      scorePressureProbes([{ id: "x", ok: false, detail: "fail" }]).fail,
    ).toBe(1);
  });
});
