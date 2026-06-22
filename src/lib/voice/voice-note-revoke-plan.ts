// FILE: voice-note-revoke-plan.ts
// PURPOSE: Phase OTZAR-RETURN-9 — make voice-note undo logically correct,
//          blockchain-ready, BEAM-ready, and non-cascading BEFORE any real undo
//          execution. This is a SAFETY / ARCHITECTURE phase: it defines the
//          revoke PLAN shape and the typed revoke CONTRACT, but performs NO
//          revoke, NO delete, and calls NO endpoint.
//
// WHY PLAN-ONLY, AND WHY NO FOUNDATION ENDPOINT THIS PHASE (audit findings):
//   1. A single observe NOTE fans out to MULTIPLE capsules across the caller's
//      AND the org wallet. There is NO durable grouping id persisted today
//      (no observation_id / source_id / correlation_id / group_id on
//      MemoryCapsule). So the full capsule group CANNOT be re-identified later.
//   2. The existing revoke (POST /cosmp/capsules/:id/revoke) is a SOFT tombstone
//      (sets deleted_at), audit-aware (CAPSULE_DELETED), owner-scoped
//      (NOT_OWNER) — but per-capsule and caller-wallet-only. The caller CANNOT
//      revoke org-wallet (decision) capsules.
//   3. There is NO crypto-erasure / key-disable path today.
//   Therefore a correct plan/apply needs forward-only durable grouping +
//   per-wallet authority + a coordinator — all FUTURE, governed work. Until
//   then, any plan honestly reports CANNOT_IDENTIFY_GROUP and apply_allowed
//   false, and the UI keeps "undo requires a governed revoke path".
//
// DOCTRINE (encoded as a typed contract, NOT implemented here):
//   - Capsules are intentional. Undo means revoke access + tombstone + disable
//     future use + PRESERVE audit/proof history — never hard delete, never claim
//     "removed" unless the entire note group was truly revoked.
//   - Blockchain-ready: capsule data stays OFF-CHAIN, encrypted, governed. A
//     future chain anchors only non-personal status / revocation / proof ROOTS.
//   - BEAM-ready: a future supervised revoke coordinator (saga) owns one
//     voice_note_id, applies idempotent plan/apply commands with per-wallet
//     authority, no duplicate jobs, no cascading delete, and backpressure.
//   - Otzar product infra — not AVP², no protocol artifact, no network here.

export type VoiceNoteWalletScope = "caller" | "org" | "unknown";

export type VoiceNoteCapsuleAuthority =
  | "CAN_REVOKE"
  | "REQUIRES_ORG_AUTHORITY"
  | "NOT_OWNER"
  | "UNKNOWN";

export type VoiceNoteCapsuleProposedAction =
  | "SOFT_REVOKE"
  | "NOOP_ALREADY_REVOKED"
  | "SKIP_UNAUTHORIZED";

export type VoiceNoteRevokePlanStatus =
  | "COMPLETE_CAN_APPLY"
  | "PARTIAL_REQUIRES_AUTHORITY"
  | "CANNOT_IDENTIFY_GROUP"
  // [OTZAR-RETURN-10] a durable voice_note_id now groups this note's capsules, so
  // a future governed plan CAN identify the group — but apply is still not
  // implemented (no governed revoke-plan/apply endpoint, no coordinator yet).
  | "GROUPING_READY_APPLY_NOT_IMPLEMENTED"
  | "UNSAFE_TO_APPLY";

export type VoiceNoteCryptoErasureStatus =
  | "NO_KEY_PATH_YET"
  | "KEY_DISABLE_READY"
  | "NOT_APPLICABLE";

export interface VoiceNoteRevokeCapsulePlan {
  capsule_id: string;
  wallet_scope: VoiceNoteWalletScope;
  current_status: "ACTIVE" | "REVOKED";
  authority_status: VoiceNoteCapsuleAuthority;
  proposed_action: VoiceNoteCapsuleProposedAction;
}

export interface VoiceNoteRevokePlan {
  ok: true;
  mode: "PLAN_ONLY";
  voice_note_id: string;
  event_type: "NOTE";
  capsule_count: number;
  capsules: VoiceNoteRevokeCapsulePlan[];
  plan_status: VoiceNoteRevokePlanStatus;
  apply_allowed: false;
  hard_delete_allowed: false;
  external_side_effects: false;
  raw_audio_scope: "NONE";
  crypto_erasure_ready: boolean;
  crypto_erasure_status: VoiceNoteCryptoErasureStatus;
  audit_preview: { event_type: "VOICE_NOTE_REVOKE_PLANNED" };
  reason_codes: string[];
}

/** The typed contract a SAFE governed undo would require. This proposes; it
 *  neither implements nor calls anything. */
export interface VoiceNoteRevokeContract {
  contract_schema: "OTZAR_VOICE_NOTE_REVOKE_CONTRACT";
  schema_version: "0.1";
  route: "note_capture";
  // The forward-only prerequisite: capsules from one observe NOTE must share a
  // durable grouping id persisted at CREATION (no claim it can group the past).
  grouping_prerequisite: {
    needs_durable_group_id: true;
    candidate_field: "voice_note_id_or_observation_group_id";
    forward_only: true;
    can_group_past_observations: false;
  };
  proposed_plan_endpoint: string;
  proposed_apply_endpoint: string;
  method: "POST";
  requires_auth: true;
  audit_required: true;
  preferred_semantics: "revoke_or_tombstone";
  hard_delete_allowed: false;
  raw_audio_scope: "NONE";
  external_side_effects_allowed: false;
  authority_model: {
    per_wallet: true;
    caller_can_revoke_own_wallet: true;
    org_capsules_require_org_authority: true;
  };
  // Net-new audit events. NOTE: today's per-capsule soft revoke audits as the
  // existing CAPSULE_DELETED literal; these voice-note events do NOT exist yet.
  audit_events: {
    planned: "VOICE_NOTE_REVOKE_PLANNED";
    applied: "VOICE_NOTE_REVOKE_APPLIED";
    are_net_new: true;
    existing_soft_revoke_audits_as: "CAPSULE_DELETED";
  };
  crypto_erasure: {
    status: VoiceNoteCryptoErasureStatus;
    ready: boolean;
  };
  // BEAM/Elixir-ready: how a future supervised coordinator (saga) would own this.
  beam_coordinator: {
    one_coordinator_per: "voice_note_id";
    idempotent_plan_apply: true;
    per_wallet_authority_checks: true;
    no_duplicate_jobs: true;
    no_cascading_delete: true;
    backpressure_for_large_groups: true;
    supervised: true;
    explicit_status_transitions: true;
  };
  // Blockchain-ready WITHOUT placing personal data on-chain.
  blockchain_readiness: {
    personal_data_on_chain: false;
    capsule_data_remains_off_chain: true;
    anchor_only: "status_revocation_or_proof_roots";
    hash_of_personal_data_on_chain: false;
  };
  reason_codes: string[];
}

const NO_GROUP_REASONS = [
  "NO_DURABLE_GROUP_ID_TODAY",
  "NOTE_FANS_OUT_ACROSS_CALLER_AND_ORG_WALLETS",
  "ORG_WALLET_CAPSULES_REQUIRE_ORG_AUTHORITY",
  "APPLY_DEFERRED_TO_GOVERNED_COORDINATOR",
] as const;

// [OTZAR-RETURN-10] a durable voice_note_id groups this note's capsules, so a
// future governed plan CAN identify the group — but apply still requires the
// governed revoke-plan/apply endpoints + per-wallet authority + a coordinator.
const GROUPING_READY_REASONS = [
  "DURABLE_VOICE_NOTE_ID_PRESENT",
  "GROUP_IDENTIFIABLE_FOR_FUTURE_PLAN",
  "APPLY_REQUIRES_GOVERNED_ENDPOINTS_AND_PER_WALLET_AUTHORITY",
  "APPLY_NOT_IMPLEMENTED_IN_THIS_BUILD",
] as const;

/** Build an HONEST plan from the capsule ids a client happens to hold. Because
 *  there is no durable grouping id, the plan can never claim it identified the
 *  full group — it is always CANNOT_IDENTIFY_GROUP with apply_allowed false, and
 *  each capsule's wallet/authority is UNKNOWN from the client (only the backend
 *  could resolve it). It mutates nothing and calls nothing. */
export interface BuildVoiceNoteRevokePlanInput {
  capsuleIds: string[];
  /** A correlation label for the plan (e.g. the source turn id). */
  planLabel: string;
  /** [OTZAR-RETURN-10] the durable grouping id, when the backend returned one.
   *  Present -> the group is identifiable (apply still not implemented).
   *  Absent  -> CANNOT_IDENTIFY_GROUP (old responses / no-grouping backend). */
  groupingId?: string;
}

export function buildVoiceNoteRevokePlan(
  input: BuildVoiceNoteRevokePlanInput,
): VoiceNoteRevokePlan {
  const hasGrouping = typeof input.groupingId === "string" && input.groupingId.length > 0;
  const capsules: VoiceNoteRevokeCapsulePlan[] = input.capsuleIds.map((capsule_id) => ({
    capsule_id,
    wallet_scope: "unknown",
    current_status: "ACTIVE",
    // Even with a grouping id, the CLIENT can't resolve per-capsule wallet
    // authority — that stays a future governed (server-side) plan.
    authority_status: "UNKNOWN",
    proposed_action: "SKIP_UNAUTHORIZED",
  }));
  return {
    ok: true,
    mode: "PLAN_ONLY",
    voice_note_id: hasGrouping ? (input.groupingId as string) : input.planLabel,
    event_type: "NOTE",
    capsule_count: capsules.length,
    capsules,
    plan_status: hasGrouping
      ? "GROUPING_READY_APPLY_NOT_IMPLEMENTED"
      : "CANNOT_IDENTIFY_GROUP",
    apply_allowed: false,
    hard_delete_allowed: false,
    external_side_effects: false,
    raw_audio_scope: "NONE",
    crypto_erasure_ready: false,
    crypto_erasure_status: "NO_KEY_PATH_YET",
    audit_preview: { event_type: "VOICE_NOTE_REVOKE_PLANNED" },
    reason_codes: hasGrouping
      ? [...GROUPING_READY_REASONS]
      : [...NO_GROUP_REASONS],
  };
}

/** The typed revoke contract a safe undo would require. Pure; proposes only. */
export function buildVoiceNoteRevokeContract(): VoiceNoteRevokeContract {
  return {
    contract_schema: "OTZAR_VOICE_NOTE_REVOKE_CONTRACT",
    schema_version: "0.1",
    route: "note_capture",
    grouping_prerequisite: {
      needs_durable_group_id: true,
      candidate_field: "voice_note_id_or_observation_group_id",
      forward_only: true,
      can_group_past_observations: false,
    },
    proposed_plan_endpoint: "/api/v1/otzar/voice-notes/:voice_note_id/revoke-plan",
    proposed_apply_endpoint: "/api/v1/otzar/voice-notes/:voice_note_id/revoke-apply",
    method: "POST",
    requires_auth: true,
    audit_required: true,
    preferred_semantics: "revoke_or_tombstone",
    hard_delete_allowed: false,
    raw_audio_scope: "NONE",
    external_side_effects_allowed: false,
    authority_model: {
      per_wallet: true,
      caller_can_revoke_own_wallet: true,
      org_capsules_require_org_authority: true,
    },
    audit_events: {
      planned: "VOICE_NOTE_REVOKE_PLANNED",
      applied: "VOICE_NOTE_REVOKE_APPLIED",
      are_net_new: true,
      existing_soft_revoke_audits_as: "CAPSULE_DELETED",
    },
    crypto_erasure: {
      status: "NO_KEY_PATH_YET",
      ready: false,
    },
    beam_coordinator: {
      one_coordinator_per: "voice_note_id",
      idempotent_plan_apply: true,
      per_wallet_authority_checks: true,
      no_duplicate_jobs: true,
      no_cascading_delete: true,
      backpressure_for_large_groups: true,
      supervised: true,
      explicit_status_transitions: true,
    },
    blockchain_readiness: {
      personal_data_on_chain: false,
      capsule_data_remains_off_chain: true,
      anchor_only: "status_revocation_or_proof_roots",
      hash_of_personal_data_on_chain: false,
    },
    reason_codes: [
      "PLAN_FIRST_NOT_DESTRUCTIVE_FIRST",
      "FORWARD_ONLY_GROUPING_REQUIRED_BEFORE_APPLY",
      "PER_WALLET_AUTHORITY_REQUIRED",
      "SOFT_TOMBSTONE_PRESERVES_AUDIT_PROOF",
      "CRYPTO_ERASURE_NOT_READY",
    ],
  };
}

/** Honest one-line plan-status copy for the UI (read-only; never implies apply). */
export function voiceNoteRevokePlanCopy(plan: VoiceNoteRevokePlan): string {
  switch (plan.plan_status) {
    case "COMPLETE_CAN_APPLY":
      return "A complete, authorized revoke plan is available.";
    case "PARTIAL_REQUIRES_AUTHORITY":
      return "A revoke would be partial — some capsules need organization authority. Apply is not available.";
    case "GROUPING_READY_APPLY_NOT_IMPLEMENTED":
      return "This note's capsule group is now identifiable (grouping id recorded). Apply is not implemented yet — no note was removed.";
    case "UNSAFE_TO_APPLY":
      return "A safe revoke plan can't be formed yet. Apply is not available.";
    case "CANNOT_IDENTIFY_GROUP":
    default:
      return "The full capsule group from this note can't be identified yet (no durable grouping id). Apply is not available — no note was removed.";
  }
}
