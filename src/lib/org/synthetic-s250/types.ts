// FILE: types.ts
// PURPOSE: R-03 S250 — types for seeded enterprise graph, scenarios, oracles, metrics.

export type PersonKind =
  | "executive"
  | "manager"
  | "employee"
  | "contractor"
  | "consultant"
  | "external";

export type SyntheticPerson = {
  id: string;
  name: string;
  kind: PersonKind;
  team_id: string | null;
  manager_id: string | null;
  /** Matrix sponsor / dotted-line (optional). */
  sponsor_id: string | null;
  role_template: string;
  twin_id: string;
  decision_rights: string[];
  autonomy_ceiling: "observe" | "draft" | "confirm" | "execute";
};

export type SyntheticTeam = {
  id: string;
  name: string;
  lead_id: string;
};

export type SyntheticProject = {
  id: string;
  name: string;
  owner_id: string;
  member_ids: string[];
  team_ids: string[];
  status: "active" | "blocked" | "done";
};

export type SyntheticOrg = {
  seed: number;
  level: "S250";
  org_id: string;
  name: string;
  people: SyntheticPerson[];
  twins: Array<{ id: string; human_id: string; org_bound: true }>;
  teams: SyntheticTeam[];
  projects: SyntheticProject[];
  hierarchy_edges: Array<{ person_id: string; manager_id: string | null }>;
  matrix_edges: Array<{ person_id: string; sponsor_id: string; kind: string }>;
};

/** Hidden expected result — never fed to extractors. */
export type HiddenOracle = {
  scenario_id: string;
  participants: string[];
  org_id: string;
  project_id: string | null;
  decision_owner_id: string | null;
  manager_id: string | null;
  commitments: string[];
  final_agreed_date: string | null;
  rejected_dates: string[];
  obligations: string[];
  needs_document: boolean;
  needs_calendar: boolean;
  conflicts: string[];
  corrections: string[];
  allowed_disclosures: string[];
  ai_collab_expected: boolean;
  report_role: PersonKind;
};

export type WorkScenario = {
  id: string;
  day: number;
  natural_language: string;
  /** Failure classes injected into this seed (empty = clean). */
  injected_failures: string[];
  oracle: HiddenOracle;
};

export type StageResult = {
  stage: string;
  ok: boolean;
  detail: string;
};

export type ScenarioRunResult = {
  scenario_id: string;
  stages: StageResult[];
  ok: boolean;
  first_failure: string | null;
  root_class:
    | "identity"
    | "project_resolution"
    | "retrieval"
    | "authority"
    | "policy"
    | "ai_reasoning"
    | "persistence"
    | "provider"
    | "ui_projection"
    | "none";
};

export type PressureMetrics = {
  scenarios_total: number;
  scenarios_pass: number;
  scenarios_fail: number;
  participant_accuracy: number;
  project_resolution_accuracy: number;
  commitment_extraction: number;
  final_date_accuracy: number;
  correction_recognition: number;
  ai_collab_safe_refusal: number;
  false_completion: number;
  cross_tenant_leaks: number;
  hierarchy_cycle_blocks: number;
  lost_obligations: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
};

export type RepairRecord = {
  scenario_id: string;
  root_class: string;
  before_ok: boolean;
  after_ok: boolean;
  regression_id: string;
};
