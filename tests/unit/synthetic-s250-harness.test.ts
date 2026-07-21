// FILE: tests/unit/synthetic-s250-harness.test.ts
// PURPOSE: R-03 S250 — seeded enterprise pressure: graph, scenarios, metrics, repair.

import { describe, expect, it } from "vitest";
import {
  generateS250Org,
  generateS250Scenarios,
  orgStats,
  runS250Pressure,
  runScenarioPipeline,
} from "@/lib/org/synthetic-s250";

describe("R-03 S250 synthetic enterprise pressure", () => {
  it("generates deterministic 250-person org graph with teams and projects", () => {
    const a = generateS250Org(250_001);
    const b = generateS250Org(250_001);
    expect(a.people.length).toBe(250);
    expect(a.twins.length).toBe(250);
    expect(a.teams.length).toBeGreaterThanOrEqual(20);
    expect(a.projects.length).toBeGreaterThanOrEqual(30);
    expect(a.people.map((p) => p.id)).toEqual(b.people.map((p) => p.id));
    const stats = orgStats(a);
    expect(stats.managers).toBeGreaterThan(0);
    expect(stats.employees).toBeGreaterThan(0);
    expect(stats.contractors).toBeGreaterThan(0);
    expect(stats.matrix_edges).toBeGreaterThan(0);
  });

  it("builds messy NL scenarios with hidden oracles not equal to raw text labels", () => {
    const org = generateS250Org(250_001);
    const scenarios = generateS250Scenarios(org, 40);
    expect(scenarios.length).toBe(40);
    for (const sc of scenarios) {
      expect(sc.natural_language.length).toBeGreaterThan(80);
      expect(sc.oracle.scenario_id).toBe(sc.id);
      expect(sc.oracle.org_id).toBe(org.org_id);
      // Oracle is structured — not a copy of the utterance
      expect(sc.oracle).not.toEqual(sc.natural_language);
      expect(Array.isArray(sc.oracle.commitments)).toBe(true);
    }
    // Some scenarios inject failures
    expect(scenarios.some((s) => s.injected_failures.length > 0)).toBe(true);
  });

  it("runs full pressure loop with metrics and repair records", () => {
    const report = runS250Pressure(250_001, 40);
    expect(report.stats.people).toBe(250);
    expect(report.metrics.scenarios_total).toBe(40);
    expect(report.metrics.hierarchy_cycle_blocks).toBe(40);
    expect(report.metrics.cross_tenant_leaks).toBe(0);
    expect(report.metrics.p95_ms).toBeGreaterThanOrEqual(0);
    // Repair loop produces records for failures
    expect(Array.isArray(report.repairs)).toBe(true);
    for (const r of report.repairs) {
      expect(r.regression_id).toMatch(/^reg-s250-/);
      expect(r.before_ok).toBe(false);
    }
    expect(report.pass).toBe(true);
  });

  it("fails false_completion honesty stage when injected", () => {
    const org = generateS250Org(250_001);
    const scenarios = generateS250Scenarios(org, 40);
    const fc = scenarios.find((s) =>
      s.injected_failures.includes("false_completion"),
    );
    if (!fc) {
      // force one
      const s = scenarios[0]!;
      s.injected_failures = ["false_completion"];
      s.oracle.conflicts.push("false_completion_injected");
      const r = runScenarioPipeline(org, s);
      expect(r.stages.find((x) => x.stage === "execution_honesty")?.ok).toBe(
        false,
      );
      return;
    }
    const r = runScenarioPipeline(org, fc);
    expect(r.stages.find((x) => x.stage === "execution_honesty")?.ok).toBe(
      false,
    );
  });
});
