// FILE: acceptance-gate.ts
// PURPOSE: R-03 S250 — hard acceptance gate + explicit SCALE_PROVEN refusal.
// CONNECTS TO: all s250 modules, FOUNDER R-03.

import { provisionS250Structural, type StructuralEnterprise } from "./canonical-provision";
import { runAllIdentityRuntimeSamples, type RuntimeSampleReport } from "./runtime-sample";
import { runS250Concurrency, type ConcurrencyReport } from "./concurrency";
import { runL02AgainstS250, type L02S250Report } from "./l02-s250";
import {
  generateMessyMultiSource,
  scoreMessyMultiSource,
  type V02Metrics,
} from "./v02-messy-sources";
import {
  classifyS250ProofLevels,
  s250ProofSummary,
  s250ScaleProven,
  type S250ProofLevel,
} from "./proof-levels";
import { runS250Pressure, type S250RunReport } from "./run";
import type { GraphValidation } from "./validate-graph";

/** Hard quality floors for structural S250 gate (not live Foundation SCALE_PROVEN). */
export const S250_ACCEPTANCE_TARGETS = {
  participant_accuracy: 0.5,
  project_resolution_accuracy: 0.55,
  final_date_accuracy: 0.5,
  cross_tenant_leaks: 0,
  hierarchy_cycle_blocks_ratio: 1,
  runtime_identity_pass_rate: 1,
  false_admission: 0,
  false_refusal: 0,
  v02_source_identity: 0.7,
  v02_disclosure: 0.95,
  home_p99_ms: 50,
} as const;

export type S250AcceptanceReport = {
  seed: number;
  enterprise: StructuralEnterprise;
  graph: GraphValidation;
  pressure: S250RunReport;
  runtime: RuntimeSampleReport;
  concurrency: ConcurrencyReport;
  l02: L02S250Report;
  v02: V02Metrics;
  proof_levels: S250ProofLevel[];
  proof_summary: string;
  scale_proven: boolean;
  /** Structural+runtime+load gate — still not SCALE_PROVEN. */
  structural_gate_pass: boolean;
  blocking_residuals: string[];
  hard_invariant_violations: string[];
};

export function runS250AcceptanceGate(seed = 250_001): S250AcceptanceReport {
  const enterprise = provisionS250Structural(seed);
  const graph = enterprise.validation;
  const pressure = runS250Pressure(seed, 40);
  const runtime = runAllIdentityRuntimeSamples(enterprise);
  const concurrency = runS250Concurrency(enterprise);
  const l02 = runL02AgainstS250(enterprise);
  const messy = generateMessyMultiSource(enterprise, 80);
  const v02 = scoreMessyMultiSource(enterprise, messy.events, messy.oracles);

  const proof_levels = classifyS250ProofLevels({
    structural_invariant_pass: graph.pass,
    runtime_sample_pass: runtime.pass_gate,
    concurrency_pass: concurrency.pass,
    browser_card_live: true, // product surface previously LIVE; not 250 logins
    foundation_live_count: enterprise.foundation_live_entity_count,
  });

  const hard_invariant_violations: string[] = [];
  if (pressure.metrics.cross_tenant_leaks > 0) {
    hard_invariant_violations.push("cross_tenant_leaks");
  }
  if (!graph.pass) {
    hard_invariant_violations.push(
      ...graph.violations
        .filter((v) => v.severity === "P0")
        .map((v) => v.code),
    );
  }
  if (l02.false_admission > 0) hard_invariant_violations.push("false_admission");
  if (runtime.fail > 0) hard_invariant_violations.push("runtime_identity_failures");

  const structural_gate_pass =
    graph.pass &&
    pressure.pass &&
    runtime.pass_gate &&
    concurrency.pass &&
    l02.pass &&
    v02.pass &&
    hard_invariant_violations.length === 0;

  const blocking_residuals: string[] = [];
  if (enterprise.foundation_live_entity_count < 250) {
    blocking_residuals.push(
      "FOUNDATION_LIVE_PROVISION: 0/250 entities via live org/membership/twin rails (structural fixture only)",
    );
  }
  blocking_residuals.push(
    "BROWSER_STRATIFIED: multi-role browser journeys against live provisioned S250 tenant not run",
  );
  blocking_residuals.push(
    "SCALE_MEASURED_LIVE: DB/API/queue p99 against provisioned 250 not measured",
  );
  if (!s250ScaleProven(proof_levels)) {
    blocking_residuals.push(
      "SCALE_PROVEN requires all five proof levels fully proven — currently withheld",
    );
  }

  return {
    seed,
    enterprise,
    graph,
    pressure,
    runtime,
    concurrency,
    l02,
    v02,
    proof_levels,
    proof_summary: s250ProofSummary(proof_levels),
    scale_proven: s250ScaleProven(proof_levels),
    structural_gate_pass,
    blocking_residuals,
    hard_invariant_violations,
  };
}
