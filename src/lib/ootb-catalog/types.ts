// FILE: types.ts
// PURPOSE: Type definitions for the CT-side mirror of the ADR-0080
//          Wave 2 OOTB static seed catalog. The Foundation canonical
//          catalog lives at docs/ootb-catalog/*.json in the
//          niov-foundation repo (PR #166); these types describe the
//          compact derived shape the CT /onboarding Dandelion Preview
//          consumes.
//          Read-only template metadata. NEVER live permissions.
//          NEVER live connectors.
// CONNECTS TO: src/lib/ootb-catalog/data.ts, src/pages/Onboarding.tsx.

export interface EnvelopeDefaults {
  object_type: string;
  human_readable_summary: string;
  model_usage_notes: string;
  scope_defaults: string[];
  permission_defaults: string[];
  audit_expectations: string[];
  policy_purpose: string;
  allowed_consumers: string[];
  forbidden_consumers: string[];
  sensitivity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface CatalogCounts {
  roles: number;
  departments: number;
  company_variants: number;
  tools: number;
  workflows: number;
  connector_presets: number;
  dandelion_flows: number;
  total_items: number;
}

export interface RoleSummary {
  id: string;
  role_name: string;
  role_family: string;
  department: string;
  seniority_level: string;
  is_deepest_example: boolean;
}

export interface ExecutiveAssistantSpotlight {
  id: string;
  role_name: string;
  likely_reports_to: string[];
  possible_direct_reports: string[];
  common_workflows: string[];
  common_tools: string[];
  permission_bundles: Array<{ name: string; default_state: string }>;
  aha_moments: string[];
  safe_fallback_tiers: Array<{ tier: string; description: string }>;
  forbidden_inferences: string[];
  preview_only_notice: string;
}

export interface ToolSummary {
  id: string;
  tool_name: string;
  category: string;
  connector_priority_tier:
    | "TIER_1_CRITICAL"
    | "TIER_2_HIGH"
    | "TIER_3_MEDIUM"
    | "TIER_4_LOWER";
  data_sensitivity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  safe_default_permissions: string[];
  risky_permissions: string[];
}

export interface WorkflowSummary {
  id: string;
  workflow_name: string;
  triggering_role_families: string[];
  required_tools: string[];
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  automation_level:
    | "NONE"
    | "SUGGEST_ONLY"
    | "HUMAN_CONFIRMED"
    | "GOVERNED_AUTO";
  approvals_required: string[];
  safe_fallback: string;
}

export interface ConnectorPresetSummary {
  id: string;
  connector_name: string;
  tool_category: string;
  read_capabilities: string[];
  risky_write_actions_disabled_by_default: string[];
  audit_requirements_summary: string;
  no_leak_rules_summary: string;
  production_enablement_checklist: string[];
}

export interface DandelionFlowTier {
  tier_name: string;
  example_questions: string[];
  expected_outputs: string[];
}

export interface DandelionFlowSummary {
  id: string;
  flow_name: string;
  tiers: DandelionFlowTier[];
  governance_review_points: string[];
}

export type RoleDepthStatus =
  | "DEEP"
  | "STARTER"
  | "NOT_YET_MODELED"
  | "SUBSUMED";

export interface RoleDepthStatusRow {
  role_label: string;
  status: RoleDepthStatus;
  catalog_id?: string;
  subsumed_under?: string;
  note?: string;
}

export interface CollaborationMapEntry {
  direction:
    | "upward"
    | "downward"
    | "peer"
    | "cross_functional"
    | "external"
    | "approval_path"
    | "escalation_path";
  description: string;
  partner_roles: string[];
}

export interface CollaborationMap {
  role_id: string;
  role_name: string;
  entries: CollaborationMapEntry[];
}

export interface DmwEducation {
  user_facing_line: string;
  architecture_line: string;
  bullet_points: string[];
}

export interface OotbCatalogMirror {
  source_doctrine: string[];
  envelope_defaults_summary: EnvelopeDefaults;
  counts: CatalogCounts;
  role_summaries: RoleSummary[];
  executive_assistant_spotlight: ExecutiveAssistantSpotlight;
  tool_summaries: ToolSummary[];
  workflow_summaries: WorkflowSummary[];
  connector_preset_summaries: ConnectorPresetSummary[];
  dandelion_flow_summary: DandelionFlowSummary;
  // Per Founder Wave 3 addendum [FOUNDER-ADR-0080-WAVE-3-ADDENDUM-DEEP-ROLE-EXAMPLES-AND-COLLABORATION-MAPS]:
  role_depth_roadmap: RoleDepthStatusRow[];
  ea_collaboration_map: CollaborationMap;
  dmw_education: DmwEducation;
}
