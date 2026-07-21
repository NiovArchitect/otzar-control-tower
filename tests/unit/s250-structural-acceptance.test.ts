// FILE: tests/unit/s250-structural-acceptance.test.ts
// PURPOSE: R-03 — structural S250 audit gate; SCALE_PROVEN must stay false
//          until Foundation live provision + full levels.

import { describe, expect, it } from "vitest";
import {
  assertStructuralHonesty,
  provisionS250Structural,
  runS250AcceptanceGate,
  s250ScaleProven,
  structuralCounts,
  validateOrgGraph,
  generateS250Org,
} from "@/lib/org/synthetic-s250";
import { S250_PROOF_HONESTY } from "@/lib/org/synthetic-scale-harness";

describe("R-03 S250 structural audit + acceptance", () => {
  it("classifies dataset-generated counts and exact structural inventory", () => {
    const org = generateS250Org(250_001);
    const counts = structuralCounts(org);
    expect(counts.humans).toBe(250);
    expect(counts.ai_teammates).toBe(250);
    expect(counts.teams).toBeGreaterThanOrEqual(20);
    expect(counts.project_squads).toBeGreaterThanOrEqual(30);
    expect(counts.managers).toBeGreaterThan(0);
    expect(counts.contractors).toBeGreaterThan(0);
    expect(counts.external_participants).toBeGreaterThan(0);
    expect(counts.dotted_line_relationships).toBeGreaterThan(0);
  });

  it("validates graph invariants with zero P0", () => {
    const org = generateS250Org(250_001);
    const v = validateOrgGraph(org);
    expect(v.pass).toBe(true);
    expect(v.violations.filter((x) => x.severity === "P0")).toHaveLength(0);
  });

  it("provisions STRUCTURAL_CANONICAL_FIXTURE not FOUNDATION_LIVE", () => {
    const ent = provisionS250Structural(250_001);
    expect(ent.path).toBe("STRUCTURAL_CANONICAL_FIXTURE");
    expect(ent.foundation_live_entity_count).toBe(0);
    expect(ent.memberships).toHaveLength(250);
    expect(ent.twins).toHaveLength(250);
    expect(ent.memberships.every((m) => m.source === "structural_canonical_fixture")).toBe(
      true,
    );
    expect(ent.twins.every((t) => t.org_bound && t.memory_scope === "org_bound_personal")).toBe(
      true,
    );
    expect(ent.validation.pass).toBe(true);
    expect(assertStructuralHonesty(ent)).toMatch(/foundation_live=0/);
  });

  it("runs full acceptance gate: structural pass, SCALE_PROVEN false", () => {
    const report = runS250AcceptanceGate(250_001);
    expect(report.graph.pass).toBe(true);
    expect(report.runtime.total).toBe(250);
    expect(report.runtime.fail).toBe(0);
    expect(report.runtime.pass_gate).toBe(true);
    expect(report.concurrency.pass).toBe(true);
    expect(report.l02.pass).toBe(true);
    expect(report.l02.false_admission).toBe(0);
    expect(report.l02.loop_blocks).toBeGreaterThan(0);
    expect(report.l02.duplicate_blocks).toBeGreaterThan(0);
    expect(report.v02.pass).toBe(true);
    expect(report.structural_gate_pass).toBe(true);
    expect(report.scale_proven).toBe(false);
    expect(s250ScaleProven(report.proof_levels)).toBe(false);
    expect(report.proof_summary).toMatch(/NOT_SCALE_PROVEN/);
    expect(
      report.blocking_residuals.some((r) => r.includes("FOUNDATION_LIVE_PROVISION")),
    ).toBe(true);
    // foundation level must not be fully proven
    const fp = report.proof_levels.find((l) => l.id === "foundation_provisioned");
    expect(fp?.status).not.toBe("proven");
    const ds = report.proof_levels.find((l) => l.id === "dataset_generated");
    expect(ds?.status).toBe("proven");
  });

  it("product honesty string withholds SCALE_PROVEN", () => {
    expect(S250_PROOF_HONESTY).toMatch(/SCALE_PROVEN=false/);
    expect(S250_PROOF_HONESTY).toMatch(/foundation_provisioned=partial/);
  });
});
