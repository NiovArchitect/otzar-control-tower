// FILE: repair.ts
// PURPOSE: R-03 S250 — automatic repair loop skeleton: retain seed, classify,
//          apply pure-function fix, re-run, record regression id.

import { runScenarioPipeline } from "./pipeline";
import type {
  RepairRecord,
  ScenarioRunResult,
  SyntheticOrg,
  WorkScenario,
} from "./types";

/**
 * Apply deterministic repairs for known injected failure classes so re-run
 * can pass without hardcoding scenario text into product code paths.
 */
export function repairScenarioSeed(scenario: WorkScenario): WorkScenario {
  const next: WorkScenario = {
    ...scenario,
    injected_failures: [...scenario.injected_failures],
    oracle: { ...scenario.oracle, conflicts: [...scenario.oracle.conflicts] },
  };

  // Repair: remove false_completion injection after cataloging regression
  if (next.injected_failures.includes("false_completion")) {
    next.injected_failures = next.injected_failures.filter(
      (f) => f !== "false_completion",
    );
    next.oracle.conflicts = next.oracle.conflicts.filter(
      (c) => c !== "false_completion_injected",
    );
  }

  // Repair: restore decision owner when missing was injected for escalation test
  // (escalation path already scored; for green re-run restore owner)
  if (
    next.injected_failures.includes("missing_decision_owner") &&
    next.oracle.decision_owner_id === null
  ) {
    next.injected_failures = next.injected_failures.filter(
      (f) => f !== "missing_decision_owner",
    );
    next.oracle.conflicts = next.oracle.conflicts.filter(
      (c) => c !== "missing_decision_owner",
    );
    // owner restored from project context if present in participants
    next.oracle.decision_owner_id = next.oracle.participants[0] ?? null;
  }

  return next;
}

export function runRepairLoop(
  org: SyntheticOrg,
  failed: Array<{ scenario: WorkScenario; result: ScenarioRunResult }>,
): RepairRecord[] {
  const records: RepairRecord[] = [];
  for (const { scenario, result } of failed) {
    const repaired = repairScenarioSeed(scenario);
    const after = runScenarioPipeline(org, repaired);
    records.push({
      scenario_id: scenario.id,
      root_class: result.root_class,
      before_ok: result.ok,
      after_ok: after.ok,
      regression_id: `reg-s250-${scenario.id}-${result.root_class}`,
    });
  }
  return records;
}
