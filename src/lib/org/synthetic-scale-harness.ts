// FILE: synthetic-scale-harness.ts
// PURPOSE: R-03 — internally simulatable progressive enterprise scale
//          (25→250→2500) without YC or production Google credentials.
//          Plans seeded load, hierarchy pressure checks, UI virtualization
//          thresholds, and repair-rerun loops. Real providers stay R-04/N-*.
// CONNECTS TO: EnterprisePressureCard, R-01, customer-sim docs, FOUNDER R-03.

export const R03_DOCTRINE =
  "Enterprise scale is a core Work OS proof. Progressive synthetic organizations " +
  "(25→250→2500) must run in a bounded internal harness: seeded people, hierarchy " +
  "pressure, concurrency of work objects, authorization attacks, and performance " +
  "budgets — without waiting on YC credentials or live Meet OAuth.";

export const SYNTHETIC_SCALE_LEVELS = [
  {
    id: "S25" as const,
    people_target: 25,
    label: "Synthetic team (~25)",
    plain: "Pilot cast: hierarchy assign, cycle refuse, role isolation, UI no thrash.",
    requires_external_creds: false,
  },
  {
    id: "S250" as const,
    people_target: 250,
    label: "Synthetic division (~250)",
    plain: "Bulk hierarchy, virtualization thresholds, concurrent ledger pressure.",
    requires_external_creds: false,
  },
  {
    id: "S2500" as const,
    people_target: 2500,
    label: "Synthetic enterprise (~2500)",
    plain: "Paged people, authz attack matrix, chaos/replay, p95 budgets.",
    requires_external_creds: false,
  },
] as const;

export type SyntheticScaleId = (typeof SYNTHETIC_SCALE_LEVELS)[number]["id"];

/** Checks that must run at every synthetic level (internal only). */
export const SYNTHETIC_CHECKLIST = [
  {
    id: "seed_org",
    label: "Seed org",
    plain: "Generate replayable people + hierarchy edges (no real emails required).",
  },
  {
    id: "hierarchy_pressure",
    label: "Hierarchy pressure",
    plain: "Cycle refuse, foreign person fail-closed, non-admin deny.",
  },
  {
    id: "ui_virtualization",
    label: "UI virtualization",
    plain: "People/hierarchy surfaces remain usable; windowed lists when N large.",
  },
  {
    id: "authz_isolation",
    label: "Authz isolation",
    plain: "Cross-user and cross-tenant probes fail closed (synthetic principals).",
  },
  {
    id: "repair_rerun",
    label: "Repair → re-run",
    plain: "Every defect becomes a regression case and re-runs at the same level.",
  },
] as const;

export type SyntheticRunPlan = {
  level: SyntheticScaleId;
  people_target: number;
  checks: string[];
  requires_external_creds: false;
  status: "planned" | "partial" | "proven";
};

export function planSyntheticLevel(level: SyntheticScaleId): SyntheticRunPlan {
  const def = SYNTHETIC_SCALE_LEVELS.find((l) => l.id === level)!;
  // S25: R-01 L1 + hierarchy-pressure + customer-sim partial
  // S250: synthetic-s250 seeded pressure harness (graph+scenarios+metrics+repair)
  // S2500: planned continuous expansion
  const status: SyntheticRunPlan["status"] =
    level === "S25" ? "partial" : level === "S250" ? "partial" : "planned";
  return {
    level,
    people_target: def.people_target,
    checks: SYNTHETIC_CHECKLIST.map((c) => c.id),
    requires_external_creds: false,
    status,
  };
}

export function progressiveSyntheticPlans(): SyntheticRunPlan[] {
  return SYNTHETIC_SCALE_LEVELS.map((l) => planSyntheticLevel(l.id));
}

/** Virtualization threshold guidance for UI (not a real DOM lib). */
export function virtualizationAdvice(peopleCount: number): {
  mode: "full_list" | "windowed" | "must_window";
  window_size: number;
  reason: string;
} {
  if (peopleCount <= 50) {
    return {
      mode: "full_list",
      window_size: peopleCount,
      reason: "Small org — full list acceptable",
    };
  }
  if (peopleCount <= 400) {
    return {
      mode: "windowed",
      window_size: 50,
      reason: "Division size — windowed rows recommended",
    };
  }
  return {
    mode: "must_window",
    window_size: 40,
    reason: "Enterprise size — virtualization required for admin UX",
  };
}

export function syntheticHarnessStatusLabel(plans: SyntheticRunPlan[]): string {
  const proven = plans.filter((p) => p.status === "proven").length;
  const partial = plans.filter((p) => p.status === "partial").length;
  if (proven === plans.length) return "All synthetic levels proven";
  if (partial > 0) {
    return `S25+S250 partial (seeded pressure harness); S2500 planned — internal only, no YC creds required`;
  }
  return "Synthetic progressive harness planned";
}

export const R03_RESIDUAL =
  "Wire continuous seed→pressure→virtualize→repair jobs at S250/S2500 in CI-safe synthetic " +
  "tenants. Do not block on YC credentials. Real Meet/Docs volume stays N-02/R-04.";
