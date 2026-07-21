// FILE: run.ts
// PURPOSE: R-03 S250 — entrypoint for full pressure run + metrics + repair.

import { generateS250Org, orgStats } from "./seed-org";
import { generateS250Scenarios } from "./scenarios";
import { runScenarioPipeline } from "./pipeline";
import { aggregateMetrics } from "./metrics";
import { runRepairLoop } from "./repair";
import type {
  FailingSeedRecord,
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
  failing_seed_records: FailingSeedRecord[];
  pass: boolean;
};

export function runS250Pressure(
  seed = 250_001,
  scenarioCount = 40,
): S250RunReport {
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
  const failing_seed_records: FailingSeedRecord[] = failedPairs.map((f) => ({
    scenario_id: f.scenario.id,
    seed_org: org.seed,
    injected_failures: [...f.scenario.injected_failures],
    first_failure: f.result.first_failure,
    root_class: f.result.root_class,
    day: f.scenario.day,
    channels: f.scenario.day_events.map((e) => e.channel),
  }));

  // Acceptance for S250 depth slice:
  // graph integrity + security/hierarchy guards + understanding floors.
  // Injected failures are allowed to fail before repair.
  const graphOk =
    org.people.length === 250 &&
    org.twins.length === 250 &&
    org.teams.length >= 20 &&
    org.projects.length >= 30;

  const criticalOk =
    metrics.hierarchy_cycle_blocks === scenarios.length &&
    metrics.cross_tenant_leaks === 0;

  const multiDayOk = scenarios.every(
    (s) => s.day_events.length >= 3 && s.natural_language.length > 120,
  );

  const pass =
    graphOk &&
    criticalOk &&
    multiDayOk &&
    metrics.project_resolution_accuracy >= 0.55 &&
    metrics.participant_accuracy >= 0.5 &&
    metrics.document_quality >= 0.7 &&
    metrics.decision_extraction >= 0.7;

  return {
    org,
    stats: orgStats(org),
    scenarios,
    results,
    metrics,
    repairs,
    failing_seeds,
    failing_seed_records,
    pass,
  };
}
