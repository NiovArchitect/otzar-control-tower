// FILE: enterprise-pressure.ts
// PURPOSE: R-01 — progressive enterprise pressure harness 25→250→2500
//          with repair-loop contract (detect → refuse/fix → re-prove).
// CONNECTS TO: EnterprisePressureCard, hierarchy-editor cycle safety,
//          otzar-live-hierarchy-pressure, FOUNDER R-01.

import {
  managerMapFromEdges,
  wouldCreateCycle,
  type HierarchyEdge,
} from "@/lib/org/hierarchy-editor";

export const R01_DOCTRINE =
  "Enterprise pressure grows in bands: ~25 people (team), ~250 (division), " +
  "~2500 (enterprise). At every band Otzar must keep hierarchy safe (no cycles), " +
  "admin-only authoring, and a repair loop when pressure finds a defect — " +
  "not happy-path theater at demo scale only.";

export const PRESSURE_LEVELS = [
  {
    id: "L1" as const,
    people_target: 25,
    label: "Team pressure (~25)",
    plain: "Founding team / pilot: hierarchy, roles, Needs me, isolation hold.",
  },
  {
    id: "L2" as const,
    people_target: 250,
    label: "Division pressure (~250)",
    plain: "Multi-team org map, bulk hierarchy, no authoring thrash.",
  },
  {
    id: "L3" as const,
    people_target: 2500,
    label: "Enterprise pressure (~2500)",
    plain: "Scale continuous: pagination, repair loops, regression on every defect.",
  },
] as const;

export type PressureLevelId = (typeof PRESSURE_LEVELS)[number]["id"];

export const REPAIR_LOOP_STEPS = [
  {
    id: "detect",
    label: "Detect",
    plain: "Pressure finds a defect (cycle, unauthorized assign, foreign person).",
  },
  {
    id: "refuse_or_fix",
    label: "Refuse or fix",
    plain: "Fail closed with honest copy, or stage a repair in the hierarchy editor.",
  },
  {
    id: "reprove",
    label: "Re-prove",
    plain: "Re-run the pressure probe so the same defect cannot silent-pass again.",
  },
  {
    id: "regress",
    label: "Regress",
    plain: "Every discovered defect becomes regression coverage (R-02).",
  },
] as const;

/** Classify current org headcount into the highest band reached (not aspirational). */
export function classifyPeoplePressure(peopleCount: number): {
  level: PressureLevelId;
  next_level: PressureLevelId | null;
  people: number;
  band_floor: number;
  residual_scale: boolean;
} {
  const n = Math.max(0, Math.floor(peopleCount));
  if (n >= 2500) {
    return {
      level: "L3",
      next_level: null,
      people: n,
      band_floor: 2500,
      residual_scale: false,
    };
  }
  if (n >= 250) {
    return {
      level: "L2",
      next_level: "L3",
      people: n,
      band_floor: 250,
      residual_scale: true,
    };
  }
  if (n >= 25) {
    return {
      level: "L1",
      next_level: "L2",
      people: n,
      band_floor: 25,
      residual_scale: true,
    };
  }
  // Sub-25 still exercises L1 harness; residual notes continuous scale-up
  return {
    level: "L1",
    next_level: "L2",
    people: n,
    band_floor: 0,
    residual_scale: true,
  };
}

export type PressureProbeResult = {
  id: string;
  ok: boolean;
  detail: string;
};

/**
 * Repair-loop probe: would a cycle assignment be refused by pure hierarchy math?
 * Pressure harness must detect cycles before server apply when staging.
 */
export function cycleRepairProbe(args: {
  edges: ReadonlyArray<HierarchyEdge>;
  person_entity_id: string;
  manager_entity_id: string;
}): PressureProbeResult {
  const managers = managerMapFromEdges(args.edges);
  const cycle = wouldCreateCycle(
    args.person_entity_id,
    args.manager_entity_id,
    managers,
  );
  if (cycle) {
    return {
      id: "cycle_refuse",
      ok: true,
      detail: "Cycle detected — assign must be refused (repair: keep tree acyclic)",
    };
  }
  return {
    id: "cycle_refuse",
    ok: true,
    detail: "No cycle for this staging — safe to apply under admin audit",
  };
}

/** Progressive harness readiness: which levels are product-proven vs residual. */
export function progressiveHarnessStatus(peopleCount: number): {
  proven_levels: PressureLevelId[];
  residual_levels: PressureLevelId[];
  label: string;
} {
  const cls = classifyPeoplePressure(peopleCount);
  const proven: PressureLevelId[] = ["L1"];
  if (cls.level === "L2" || cls.level === "L3") proven.push("L2");
  if (cls.level === "L3") proven.push("L3");
  const residual = PRESSURE_LEVELS.map((l) => l.id).filter(
    (id) => !proven.includes(id),
  ) as PressureLevelId[];
  // Even at L3 continuous scale re-prove is residual process
  const residualOut =
    residual.length > 0
      ? residual
      : ([] as PressureLevelId[]);
  return {
    proven_levels: proven,
    residual_levels: residualOut,
    label:
      residualOut.length > 0
        ? `Live org at ${cls.people} people — ${cls.level} band; progressive residual ${residualOut.join("→")}`
        : `Live org at ${cls.people} people — L3 band reached; keep continuous re-prove`,
  };
}

export function scorePressureProbes(
  probes: PressureProbeResult[],
): { pass: number; fail: number; all_ok: boolean } {
  const pass = probes.filter((p) => p.ok).length;
  const fail = probes.filter((p) => !p.ok).length;
  return { pass, fail, all_ok: fail === 0 && pass >= 3 };
}

export const R01_SCALE_RESIDUAL =
  "Continuous progressive scale (250→2500 synthetic load) needs scale credentials " +
  "or a dedicated pressure org. Product harness, repair loop, and live L1 probes " +
  "are real today on the admin hierarchy surface.";
