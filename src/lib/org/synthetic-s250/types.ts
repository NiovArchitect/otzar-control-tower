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
  /** Expected role-specific report headline fragments. */
  expected_report_cues: string[];
  /** Expected handoff target team (if any). */
  handoff_team_id: string | null;
  /** Twin principal that must be attributed when AI acts. */
  expected_twin_id: string | null;
};

export type WorkChannel =
  | "chat"
  | "email"
  | "meeting"
  | "doc_comment"
  | "calendar"
  | "handoff"
  | "ai_collab";

/** One day-slice of multi-day workload (still messy NL). */
export type WorkDayEvent = {
  day: number;
  channel: WorkChannel;
  natural_language: string;
};

export type WorkScenario = {
  id: string;
  day: number;
  /** Primary composite NL (all day events joined) — extractors see only this. */
  natural_language: string;
  /** Multi-day channel events composing the scenario. */
  day_events: WorkDayEvent[];
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
  /** Emulated provider receipts (never real Google). */
  provider_receipts: Array<{
    kind: "doc" | "calendar" | "none";
    url: string | null;
    duplicate: boolean;
    executed: boolean;
  }>;
};

export type PressureMetrics = {
  scenarios_total: number;
  scenarios_pass: number;
  scenarios_fail: number;
  // Understanding
  participant_accuracy: number;
  project_resolution_accuracy: number;
  commitment_extraction: number;
  decision_extraction: number;
  final_date_accuracy: number;
  correction_recognition: number;
  source_attribution: number;
  // Collaboration
  ai_collab_safe_refusal: number;
  false_refusal: number;
  collab_depth: number;
  human_escalation: number;
  // Execution
  successful_action: number;
  duplicate_execution: number;
  false_completion: number;
  document_quality: number;
  calendar_correctness: number;
  // Organizational coherence
  lost_obligations: number;
  broken_handoffs: number;
  unresolved_conflicts: number;
  project_state_accuracy: number;
  report_accuracy: number;
  graph_disconnects: number;
  // Security
  cross_tenant_leaks: number;
  hierarchy_cycle_blocks: number;
  // Performance
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

/** Preserved failing seed for permanent regression catalog. */
export type FailingSeedRecord = {
  scenario_id: string;
  seed_org: number;
  injected_failures: string[];
  first_failure: string | null;
  root_class: string;
  day: number;
  channels: WorkChannel[];
};
