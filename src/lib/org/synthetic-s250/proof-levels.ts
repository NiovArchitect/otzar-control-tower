// FILE: proof-levels.ts
// PURPOSE: R-03 — honest classification of what S250 currently proves.
//          Never collapse dataset-generated into SCALE_PROVEN.
// CONNECTS TO: run.ts, SyntheticScaleHarnessCard, FOUNDER R-03.

export type S250ProofLevelId =
  | "dataset_generated"
  | "foundation_provisioned"
  | "runtime_active"
  | "browser_sampled"
  | "scale_measured";

export type ProofLevelStatus =
  | "proven"
  | "partial"
  | "not_started"
  | "blocked_external";

export type S250ProofLevel = {
  id: S250ProofLevelId;
  label: string;
  status: ProofLevelStatus;
  plain: string;
  evidence: string[];
  residual: string;
};

/**
 * Controlling honesty: pure seed graph + scenario pipeline is DATASET_GENERATED.
 * STRUCTURAL_CANONICAL_FIXTURE is contract-shaped (membership/twin/project) but
 * is NOT Foundation live provision of 250 entities.
 */
export function classifyS250ProofLevels(input?: {
  structural_invariant_pass?: boolean;
  runtime_sample_pass?: boolean;
  concurrency_pass?: boolean;
  browser_card_live?: boolean;
  foundation_live_count?: number;
}): S250ProofLevel[] {
  const structural = input?.structural_invariant_pass === true;
  const runtime = input?.runtime_sample_pass === true;
  const concurrency = input?.concurrency_pass === true;
  const browser = input?.browser_card_live === true;
  const foundationN = input?.foundation_live_count ?? 0;

  return [
    {
      id: "dataset_generated",
      label: "Dataset-generated",
      status: "proven",
      plain:
        "250 human + 250 twin records exist in deterministic in-process seed state with teams, hierarchy, projects, multi-day NL scenarios, and hidden oracles.",
      evidence: [
        "src/lib/org/synthetic-s250/seed-org.ts",
        "src/lib/org/synthetic-s250/scenarios.ts",
        "tests/unit/synthetic-s250-harness.test.ts",
      ],
      residual: "None for count existence — not operational rails.",
    },
    {
      id: "foundation_provisioned",
      label: "Foundation-provisioned",
      status:
        foundationN >= 250
          ? "proven"
          : foundationN > 0
            ? "partial"
            : structural
              ? "partial"
              : "not_started",
      plain: structural
        ? `Structural canonical fixture builds contract-shaped memberships, twins, projects, decision rights, policies (${foundationN} live Foundation entities).`
        : "Not provisioned through live Foundation organization rails at S250 size.",
      evidence: structural
        ? [
            "src/lib/org/synthetic-s250/canonical-provision.ts",
            "src/lib/org/synthetic-s250/validate-graph.ts",
          ]
        : [],
      residual:
        foundationN >= 250
          ? "None"
          : "Live Foundation bulk provision of 250 entities via org/membership/twin rails remains open (customer-sim proved ~16 on Meridian, not 250).",
    },
    {
      id: "runtime_active",
      label: "Runtime-active",
      status: runtime ? "partial" : "not_started",
      plain: runtime
        ? "Session-equivalent runtime samples run for all 250 identities (role, twin, project allow/deny, obligations, collab admission)."
        : "No per-identity runtime samples.",
      evidence: runtime
        ? ["src/lib/org/synthetic-s250/runtime-sample.ts"]
        : [],
      residual:
        "Authenticated HTTP sessions for all 250 against live Foundation API not required for this partial; full live session gate remains residual.",
    },
    {
      id: "browser_sampled",
      label: "Browser-sampled",
      status: browser ? "partial" : "not_started",
      plain: browser
        ? "Product surface (synthetic scale card + related Work OS cards) browser-proven; not 250 distinct logins."
        : "No browser proof for scale surfaces.",
      evidence: browser
        ? ["tests/e2e/otzar-live-synthetic-scale-r03.spec.ts"]
        : [],
      residual:
        "Stratified multi-role browser journeys against a live provisioned S250 tenant remain residual.",
    },
    {
      id: "scale_measured",
      label: "Scale-measured",
      status: concurrency ? "partial" : "not_started",
      plain: concurrency
        ? "In-process concurrency pressure + p50/p95/p99 on pure runtime samples measured."
        : "No load measurement.",
      evidence: concurrency
        ? ["src/lib/org/synthetic-s250/concurrency.ts"]
        : [],
      residual:
        "DB pool, queues, live API p99 against provisioned 250 remain residual for SCALE_PROVEN.",
    },
  ];
}

/** SCALE_PROVEN requires all five levels proven (not partial). */
export function s250ScaleProven(levels: S250ProofLevel[]): boolean {
  return levels.every((l) => l.status === "proven");
}

export function s250ProofSummary(levels: S250ProofLevel[]): string {
  const parts = levels.map((l) => `${l.id}=${l.status}`);
  const scale = s250ScaleProven(levels) ? "SCALE_PROVEN" : "NOT_SCALE_PROVEN";
  return `${scale} · ${parts.join(" · ")}`;
}
