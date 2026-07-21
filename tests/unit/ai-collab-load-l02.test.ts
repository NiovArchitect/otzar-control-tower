// FILE: tests/unit/ai-collab-load-l02.test.ts
// PURPOSE: L-02 — concurrency, loop/storm, principal attribution under load.

import { describe, expect, it } from "vitest";
import {
  L02_DOCTRINE,
  admitCollabUnderLoad,
  buildSyntheticLoadScenario,
  detectCollabLoop,
  fingerprintCollabRequest,
  runCollabLoadPressure,
} from "@/lib/work-os/ai-collab-load";

describe("L-02 AI collab load", () => {
  it("states doctrine", () => {
    expect(L02_DOCTRINE).toMatch(/storm|loop|principal|load/i);
  });

  it("detects chain loops and self loops", () => {
    expect(detectCollabLoop(["a", "b"], "a").loop).toBe(true);
    expect(detectCollabLoop(["a"], "a").loop).toBe(true);
    expect(detectCollabLoop(["a", "b"], "c").loop).toBe(false);
    expect(detectCollabLoop(["a", "b", "c", "d"], "e", 4).loop).toBe(true);
  });

  it("stable fingerprints for identical intents", () => {
    const a = fingerprintCollabRequest({
      from: "t1",
      to: "t2",
      intent: "Draft note",
    });
    const b = fingerprintCollabRequest({
      from: "t1",
      to: "t2",
      intent: "draft note",
    });
    expect(a).toBe(b);
  });

  it("refuses self-loop and admits clean hop", () => {
    const refuse = admitCollabUnderLoad([], {
      at_ms: 1000,
      from_principal_id: "x",
      to_principal_id: "x",
      chain: [],
      fingerprint: "fp1",
      advanced_work: false,
    });
    expect(refuse.allow).toBe(false);

    const ok = admitCollabUnderLoad([], {
      at_ms: 1000,
      from_principal_id: "x",
      to_principal_id: "y",
      chain: ["x"],
      fingerprint: "fp2",
      advanced_work: true,
    });
    expect(ok.allow).toBe(true);
  });

  it("synthetic pressure produces refusals and loop blocks", () => {
    const events = buildSyntheticLoadScenario(42);
    const report = runCollabLoadPressure(events);
    expect(report.total_events).toBeGreaterThan(20);
    expect(report.refused).toBeGreaterThan(0);
    expect(report.loop_blocks).toBeGreaterThan(0);
    expect(report.principal_attribution_rate).toBe(1);
    expect(report.admitted).toBeGreaterThan(0);
  });
});
