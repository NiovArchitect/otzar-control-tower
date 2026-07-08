// FILE: labels.ts
// PURPOSE: VF.4b customer-admin vocabulary mapping for voice
//          surface labels per ADR-0085 §1 + §7. The Foundation
//          enum values (canonical surface IDs + intent classes +
//          state names) are technical; this file translates each
//          into customer-admin prose for the CT page.
//
//          PRIVACY INVARIANT preserved: the labels never reference
//          the raw transcript prose, nor any caller identifier;
//          they describe the surface and the risk tier.
// CONNECTS TO: src/lib/voice/types.ts (canonical enums),
//              src/pages/VoiceTwin.tsx (renders these labels).

import type {
  CtVoiceApprovalChainState,
  CtVoiceConfirmationState,
  CtVoiceIntentClass,
  CtVoiceIntentFailureCode,
  CtVoiceSourceSurface,
} from "./types";

/**
 * Customer-admin display label for each of the 13 canonical
 * VoiceSourceSurface enum values per ADR-0085 §7 interaction map.
 * The descriptions are operator-facing prose explaining what the
 * voice surface is for.
 */
export const VOICE_SOURCE_SURFACE_LABELS: Readonly<
  Record<CtVoiceSourceSurface, { display: string; description: string }>
> = {
  ONBOARDING: {
    display: "Onboarding & Dandelion",
    description:
      "Walk through your governed company setup, role templates, and starter envelope.",
  },
  ADMIN_TWIN: {
    display: "Admin AI Teammate",
    description:
      "Pending approvals, audit chain summaries, and policy posture briefings.",
  },
  AI_TWIN: {
    display: "Your AI Teammate",
    description:
      "Daily work questions — meetings, commitments, drafts, and personal context.",
  },
  AI_TEAMMATE: {
    display: "AI Teammate",
    description:
      "Role-scoped agents that help review work and summarize project context.",
  },
  WORKFLOW_RECOMMENDATION: {
    display: "Workflow recommendations",
    description:
      "Proposed workflows for the week — sprint risk, triage, release readiness.",
  },
  PROPOSED_ACTION: {
    display: "Proposed actions",
    description:
      "Create proposed actions that require explicit confirmation before execution.",
  },
  APPROVAL_REQUEST: {
    display: "Approval requests",
    description:
      "Approve or reject workflow runs and proposed actions that are pending your review.",
  },
  CONNECTOR_QUESTION: {
    display: "Connector questions",
    description:
      "Health checks and recent activity for your registered connectors.",
  },
  MEETING_FOLLOWUP: {
    display: "Meeting follow-ups",
    description:
      "Draft action items and follow-ups from meetings you attended.",
  },
  HIVE: {
    display: "Team intelligence (Hives)",
    description:
      "Team focus, coordination across the hive, and blockers.",
  },
  AGENT_PLAYGROUND: {
    display: "Agent Playground",
    description:
      "Run governed simulations of workflows and compare candidate outcomes.",
  },
  AUDIT_EXPLANATION: {
    display: "Audit explanations",
    description:
      "Ask why a policy denied an action or how a chain link was constructed.",
  },
  EXECUTIVE_BRIEFING: {
    display: "Executive briefing",
    description:
      "Aggregate compliance posture, risk signals, and quarterly summaries.",
  },
};

/**
 * Customer-admin display label for the 3 risk tiers per ADR-0085
 * §3 risk-tiered action model.
 */
export const VOICE_INTENT_CLASS_LABELS: Readonly<
  Record<
    CtVoiceIntentClass,
    {
      display: string;
      tagline: string;
      governance_note: string;
    }
  >
> = {
  LOW: {
    display: "Low risk — voice is the confirmation",
    tagline: "Read-only or draft-only. No external system side effects.",
    governance_note:
      "Audit only. The voice intent is the confirmation; no extra modal required.",
  },
  MEDIUM: {
    display: "Medium risk — explicit confirmation required",
    tagline:
      "Proposes a state change or external-system-facing action. Requires explicit confirmation.",
    governance_note:
      "Foundation creates a proposed action; you confirm before it enters the Action runtime.",
  },
  HIGH: {
    display: "High risk — confirmation + governance gate",
    tagline:
      "Sends a message, modifies permissions, approves spending, changes settings.",
    governance_note:
      "Confirmation + the standard Section 2 governance gate (policy decision, dual-control where applicable, audit).",
  },
};

/**
 * Customer-admin display label for the confirmation states per
 * ADR-0085 §5 envelope state machine.
 */
export const VOICE_CONFIRMATION_STATE_LABELS: Readonly<
  Record<CtVoiceConfirmationState, string>
> = {
  NOT_NEEDED: "No confirmation required",
  PENDING: "Awaiting your confirmation",
  CONFIRMED: "Confirmed by you",
  REJECTED: "You rejected this",
  EXPIRED: "Confirmation window expired",
};

/**
 * Customer-admin display label for the approval chain states per
 * ADR-0085 §5 envelope state machine.
 */
export const VOICE_APPROVAL_CHAIN_STATE_LABELS: Readonly<
  Record<CtVoiceApprovalChainState, string>
> = {
  NONE: "No approval chain required",
  PENDING: "Awaiting approval from the governance chain",
  APPROVED: "Approved by the governance chain",
  REJECTED: "Rejected by the governance chain",
};

/**
 * Closed-vocab failure-code → customer-admin message mapping.
 * The Foundation route returns canonical failure codes (per
 * apps/api/src/routes/voice.routes.ts VoiceIntentFailureCode);
 * this file translates each into operator-facing prose that does
 * NOT echo the failure code itself or reveal backend internals.
 */
export const VOICE_FAILURE_CODE_LABELS: Readonly<
  Record<CtVoiceIntentFailureCode, string>
> = {
  SESSION_INVALID:
    "Your session is no longer valid. Please sign in again to continue.",
  SESSION_EXPIRED:
    "Your session expired. Please sign in again to continue.",
  SESSION_REVOKED:
    "Your session was revoked. Please sign in again to continue.",
  OPERATION_NOT_PERMITTED:
    "Your role does not include the permissions needed to submit voice intents from this surface.",
  NO_ORG_FOR_CALLER:
    "You are not currently part of an organization. Voice intents require an organization context.",
  INVALID_FIELD:
    "One of the fields you provided is missing or malformed. Please check the form and try again.",
  INVALID_SOURCE_SURFACE:
    "The voice surface you selected is not recognized. Please pick from the available options.",
  INVALID_INTENT_CLASS:
    "The risk tier you selected is not recognized. Please pick low, medium, or high.",
  INVALID_RETENTION_CLASS:
    "The retention class you selected is not recognized.",
  INVALID_REDACTION_REASON:
    "The redaction reason you selected is not recognized.",
  INTERNAL_ERROR:
    "Foundation could not record the voice intent. Please try again in a moment.",
};
