// FILE: metrics.ts
// PURPOSE: R-03 S250 — aggregate pressure metrics from scenario runs.

import type { PressureMetrics, ScenarioRunResult, WorkScenario } from "./types";

function pct(num: number, den: number): number {
  if (den <= 0) return 0;
  return Math.round((num / den) * 1000) / 1000;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx]!;
}

export function aggregateMetrics(
  scenarios: WorkScenario[],
  results: ScenarioRunResult[],
  stageLatenciesMs: number[],
): PressureMetrics {
  const byId = new Map(results.map((r) => [r.scenario_id, r]));
  let participantHits = 0;
  let projectHits = 0;
  let commitHits = 0;
  let dateHits = 0;
  let corrHits = 0;
  let corrTotal = 0;
  let collabSafe = 0;
  let collabTotal = 0;
  let falseCompletion = 0;
  let leaks = 0;
  let cycles = 0;
  let lostObl = 0;

  for (const sc of scenarios) {
    const r = byId.get(sc.id);
    if (!r) continue;
    const stageOk = (name: string) =>
      r.stages.find((s) => s.stage === name)?.ok === true;

    if (stageOk("identity")) participantHits++;
    if (stageOk("project_context")) projectHits++;
    if (stageOk("commitment")) commitHits++;
    if (stageOk("final_date")) dateHits++;
    if (sc.oracle.corrections.length > 0) {
      corrTotal++;
      if (stageOk("correction")) corrHits++;
    }
    if (
      sc.injected_failures.includes("circular_delegation") ||
      sc.injected_failures.includes("missing_decision_owner")
    ) {
      collabTotal++;
      if (stageOk("ai_collab")) collabSafe++;
    }
    if (
      sc.injected_failures.includes("false_completion") &&
      !stageOk("execution_honesty")
    ) {
      falseCompletion++; // detected (good) — count as caught
    }
    if (
      sc.injected_failures.includes("cross_tenant_probe") &&
      !stageOk("security_isolation")
    ) {
      leaks++;
    }
    if (stageOk("hierarchy_cycle_guard")) cycles++;
    if (!stageOk("obligation_project_link")) lostObl++;
  }

  const n = scenarios.length;
  const pass = results.filter((r) => r.ok).length;
  const sorted = [...stageLatenciesMs].sort((a, b) => a - b);

  return {
    scenarios_total: n,
    scenarios_pass: pass,
    scenarios_fail: n - pass,
    participant_accuracy: pct(participantHits, n),
    project_resolution_accuracy: pct(projectHits, n),
    commitment_extraction: pct(commitHits, n),
    final_date_accuracy: pct(dateHits, n),
    correction_recognition: pct(corrHits, Math.max(1, corrTotal)),
    ai_collab_safe_refusal: pct(collabSafe, Math.max(1, collabTotal)),
    false_completion: falseCompletion,
    cross_tenant_leaks: leaks,
    hierarchy_cycle_blocks: cycles,
    lost_obligations: lostObl,
    p50_ms: percentile(sorted, 50),
    p95_ms: percentile(sorted, 95),
    p99_ms: percentile(sorted, 99),
  };
}
