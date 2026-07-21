// FILE: tests/unit/synthetic-s250-harness.test.ts
// PURPOSE: R-03 S250 — seeded enterprise pressure: graph, multi-day, metrics, repair.

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

  it("builds multi-day multi-channel NL with hidden oracles", () => {
    const org = generateS250Org(250_001);
    const scenarios = generateS250Scenarios(org, 40);
    expect(scenarios.length).toBe(40);
    for (const sc of scenarios) {
      expect(sc.natural_language.length).toBeGreaterThan(120);
      expect(sc.day_events.length).toBeGreaterThanOrEqual(3);
      expect(sc.oracle.scenario_id).toBe(sc.id);
      expect(sc.oracle.org_id).toBe(org.org_id);
      expect(sc.oracle).not.toEqual(sc.natural_language);
      expect(Array.isArray(sc.oracle.commitments)).toBe(true);
      expect(sc.oracle.expected_report_cues.length).toBeGreaterThan(0);
      // Channels span more than one medium
      const channels = new Set(sc.day_events.map((e) => e.channel));
      expect(channels.size).toBeGreaterThanOrEqual(2);
    }
    expect(scenarios.some((s) => s.injected_failures.length > 0)).toBe(true);
  });

  it("runs full pressure loop with multi-category metrics and repair records", () => {
    const report = runS250Pressure(250_001, 40);
    expect(report.stats.people).toBe(250);
    expect(report.metrics.scenarios_total).toBe(40);
    expect(report.metrics.hierarchy_cycle_blocks).toBe(40);
    expect(report.metrics.cross_tenant_leaks).toBe(0);
    expect(report.metrics.p95_ms).toBeGreaterThanOrEqual(0);
    expect(report.metrics.decision_extraction).toBeGreaterThanOrEqual(0.5);
    expect(report.metrics.document_quality).toBeGreaterThanOrEqual(0.5);
    // Failing seeds preserved with structure
    expect(Array.isArray(report.failing_seed_records)).toBe(true);
    for (const f of report.failing_seed_records) {
      expect(f.scenario_id).toMatch(/^sc-/);
      expect(Array.isArray(f.injected_failures)).toBe(true);
    }
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

  it("detects orphan obligation as project_context failure", () => {
    const org = generateS250Org(250_001);
    const scenarios = generateS250Scenarios(org, 60);
    const orphan = scenarios.find((s) =>
      s.injected_failures.includes("orphan_obligation"),
    );
    if (!orphan) {
      const s = scenarios[0]!;
      s.injected_failures = ["orphan_obligation"];
      s.oracle.project_id = null;
      s.oracle.conflicts.push("orphan_obligation");
      const r = runScenarioPipeline(org, s);
      expect(r.stages.find((x) => x.stage === "project_context")?.ok).toBe(
        false,
      );
      expect(r.stages.find((x) => x.stage === "obligation_project_link")?.ok).toBe(
        false,
      );
      return;
    }
    const r = runScenarioPipeline(org, orphan);
    expect(r.ok).toBe(false);
    expect(r.stages.find((x) => x.stage === "project_context")?.ok).toBe(false);
  });

  it("emits provider receipts without real Google calls", () => {
    const org = generateS250Org(250_001);
    const scenarios = generateS250Scenarios(org, 20);
    const clean = scenarios.find((s) => s.injected_failures.length === 0) ?? scenarios[0]!;
    const r = runScenarioPipeline(org, clean);
    expect(r.provider_receipts.length).toBeGreaterThan(0);
    for (const rec of r.provider_receipts) {
      if (rec.url) expect(rec.url.startsWith("emu://")).toBe(true);
    }
  });
});
