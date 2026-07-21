// FILE: run.ts
// PURPOSE: R-03 S250 — entrypoint for full pressure run + metrics + repair.

import { generateS250Org, orgStats } from "./seed-org";
import { generateS250Scenarios } from "./scenarios";
import { runScenarioPipeline } from "./pipeline";
import { aggregateMetrics } from "./metrics";
import { runRepairLoop } from "./repair";
import type {
  PressureMetrics,
  RepairRecord,
  ScenarioRunResult,
  SyntheticOrg,
  WorkScenario,
} from "./types";

export type S250RunReport = {
  org: SyntheticOrg;
  stats: Record<string, number>;
  scenarios: WorkScenario[];
  results: ScenarioRunResult[];
  metrics: PressureMetrics;
  repairs: RepairRecord[];
  failing_seeds: string[];
  pass: boolean;
};

export function runS250Pressure(seed = 250_001, scenarioCount = 40): S250RunReport {
  const org = generateS250Org(seed);
  const scenarios = generateS250Scenarios(org, scenarioCount);
  const results: ScenarioRunResult[] = [];
  const latencies: number[] = [];

  for (const sc of scenarios) {
    const t0 = performance.now();
    const r = runScenarioPipeline(org, sc);
    latencies.push(performance.now() - t0);
    results.push(r);
  }

  const metrics = aggregateMetrics(scenarios, results, latencies);
  const failedPairs = scenarios
    .map((scenario, i) => ({ scenario, result: results[i]! }))
    .filter((x) => !x.result.ok);

  const repairs = runRepairLoop(org, failedPairs);
  const failing_seeds = failedPairs.map((f) => f.scenario.id);

  // Acceptance for first S250 slice: graph integrity + majority scenarios +
  // security/hierarchy guards always on; allow some injected-failure fails
  // that are intentionally scored as fail-before-repair.
  const graphOk =
    org.people.length === 250 &&
    org.twins.length === 250 &&
    org.teams.length >= 20 &&
    org.projects.length >= 30;

  const criticalOk =
    metrics.hierarchy_cycle_blocks === scenarios.length &&
    metrics.cross_tenant_leaks === 0;

  const pass =
    graphOk &&
    criticalOk &&
    metrics.project_resolution_accuracy >= 0.7 &&
    metrics.participant_accuracy >= 0.5;

  return {
    org,
    stats: orgStats(org),
    scenarios,
    results,
    metrics,
    repairs,
    failing_seeds,
    pass,
  };
}
