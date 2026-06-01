// FILE: src/lib/dandelion-activation/types.ts
// PURPOSE: CT-side mirror of the Foundation D6 Dandelion Stage F
//          activation runtime response shapes consumed by the
//          /onboarding admin walk surface. Mirrors Foundation's
//          apps/api/src/services/governance/dandelion-activation.
//          service.ts discriminated ActivationResult shape verbatim.
//
//          Privacy invariant preserved at the CT register:
//          - audit_event_id values are surfaced (UUIDs only — the
//            audit row content is read via the existing /platform/
//            audit and /org/audit surfaces, never re-projected here)
//          - The page renders the per-step audit_literal as a
//            human-readable label ("Envelope activation precheck")
//            keyed off the catalog's audit_literal string; no
//            details payload is fetched or echoed
//
//          Foundation source: docs/dandelion-activation/
//          starter-pilot-activation.json + apps/api/src/services/
//          governance/dandelion-activation.service.ts (PR #196).
// CONNECTS TO: src/lib/api.ts (api.dandelionActivation namespace),
//              src/pages/Onboarding.tsx (consumer surface).

export type CtActivationFailureCode =
  | "NOT_ADMIN"
  | "CALLER_ENTITY_NOT_FOUND"
  | "CALLER_NOT_IN_ORG"
  | "ARCHETYPE_UNKNOWN"
  | "CATALOG_NOT_FOUND"
  | "CATALOG_MALFORMED"
  | "AUDIT_WRITE_FAILED"
  // D6 team-archetype additions (Foundation PR #198)
  | "INVALID_SLACK_BINDING_INPUT"
  | "CONNECTOR_BINDING_FAILED";

// D6 team-archetype input mirror of Foundation's TeamActivationInput.
// secret_ref carries the env-var NAME on the deployment host (e.g.
// "SLACK_BOT_TOKEN_PROD"); the resolved env-var VALUE never crosses
// the API boundary. The CT form prompts the admin for the NAME only
// and asserts no concrete-token regex (xoxb-*) appears in the
// rendered output.
export interface CtTeamActivationInput {
  slack_display_name: string;
  slack_secret_ref: string;
  slack_workspace_id?: string;
}

export interface CtActivationStepResult {
  step_order: number;
  step_id: string;
  audit_literal: string;
  audit_event_id: string;
}

export interface CtActivationSuccess {
  ok: true;
  archetype: string;
  plan_id: string;
  steps: CtActivationStepResult[];
  activation_audit_event_id: string;
}

export interface CtActivationFailure {
  ok: false;
  code: CtActivationFailureCode;
  message: string;
}

export type CtActivationResult = CtActivationSuccess | CtActivationFailure;
