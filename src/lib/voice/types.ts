// FILE: types.ts
// PURPOSE: VF.4b CT-side mirror of the Foundation voice-intent
//          substrate shapes consumed by the /voice talk surface
//          per ADR-0085 §5 + §8.
//
//          The CT page submits typed transcripts to the Foundation
//          route POST /api/v1/voice/intents (VF.4a LIVE per
//          Foundation PR #213); the route returns a SAFE envelope
//          projection that this file mirrors verbatim.
//
//          PRIVACY INVARIANT preserved at the CT register:
//          The shape NEVER carries transcript_text /
//          caller_entity_id / tenant_org_entity_id — those are
//          Foundation-internal. The CT page renders the typed
//          transcript locally (the operator typed it, so they
//          already see it); the Foundation route only confirms
//          the envelope was constructed + audited.
//
//          The shape NEVER carries raw audio bytes — VF.4b is
//          text-only per ADR-0085 §8 VF.4 out-of-scope.
//
// CONNECTS TO: src/lib/voice/labels.ts (customer-admin vocab),
//              src/lib/api.ts (api.voice namespace),
//              src/pages/VoiceTwin.tsx.

export type CtVoiceSourceSurface =
  | "ONBOARDING"
  | "ADMIN_TWIN"
  | "AI_TWIN"
  | "AI_TEAMMATE"
  | "WORKFLOW_RECOMMENDATION"
  | "PROPOSED_ACTION"
  | "APPROVAL_REQUEST"
  | "CONNECTOR_QUESTION"
  | "MEETING_FOLLOWUP"
  | "HIVE"
  | "AGENT_PLAYGROUND"
  | "AUDIT_EXPLANATION"
  | "EXECUTIVE_BRIEFING";

export type CtVoiceIntentClass = "LOW" | "MEDIUM" | "HIGH";

export type CtVoiceConfirmationState =
  | "NOT_NEEDED"
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "EXPIRED";

export type CtVoiceApprovalChainState =
  | "NONE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type CtVoiceRetentionClass =
  | "STANDARD"
  | "AGGREGATE_ONLY"
  | "EPHEMERAL";

export type CtVoiceRedactionReason =
  | "NON_WORK"
  | "PROTECTED_ATTRIBUTE"
  | "FORBIDDEN_INTENT"
  | null;

export interface CtVoiceIntentSubmitInput {
  source_surface: CtVoiceSourceSurface;
  transcript_text: string;
  intent_class: CtVoiceIntentClass;
  transcript_redacted?: boolean;
  transcript_redaction_reason?: CtVoiceRedactionReason;
  retention_class?: CtVoiceRetentionClass;
}

/**
 * SAFE response shape per Foundation VF.4a (apps/api/src/routes/
 * voice.routes.ts L268-282). The CT page consumes ONLY these
 * fields; transcript_text is never returned (the operator typed
 * it locally — they already see the prose).
 */
export interface CtVoiceIntentSubmitSuccess {
  ok: true;
  intent_id: string;
  audit_event_id: string;
  source_surface: CtVoiceSourceSurface;
  intent_class: CtVoiceIntentClass;
  confirmation_state: CtVoiceConfirmationState;
  approval_chain_state: CtVoiceApprovalChainState;
  transcript_redacted: boolean;
  retention_class: CtVoiceRetentionClass;
  created_at: string;
}

export type CtVoiceIntentFailureCode =
  | "SESSION_INVALID"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "OPERATION_NOT_PERMITTED"
  | "NO_ORG_FOR_CALLER"
  | "INVALID_FIELD"
  | "INVALID_SOURCE_SURFACE"
  | "INVALID_INTENT_CLASS"
  | "INVALID_RETENTION_CLASS"
  | "INVALID_REDACTION_REASON"
  | "INTERNAL_ERROR";

export interface CtVoiceIntentSubmitFailure {
  ok: false;
  code: CtVoiceIntentFailureCode;
  message?: string;
  invalid_fields?: string[];
}

export type CtVoiceIntentSubmitResult =
  | CtVoiceIntentSubmitSuccess
  | CtVoiceIntentSubmitFailure;
