// FILE: tests/unit/voice-note-revoke-plan.test.ts
// PURPOSE: Phase OTZAR-RETURN-9 — lock the plan-first, non-destructive revoke
//          model: a client-built plan is ALWAYS CANNOT_IDENTIFY_GROUP with
//          apply_allowed false (no durable grouping id), never hard-deletes,
//          performs no external effects, exposes no raw audio, and is honest
//          about crypto-erasure not being ready. The typed contract encodes the
//          forward-only grouping prerequisite, per-wallet authority, soft
//          tombstone, BEAM coordinator shape, and off-chain blockchain
//          readiness.
// CONNECTS TO: src/lib/voice/voice-note-revoke-plan.ts.

import { describe, expect, it } from "vitest";
import {
  buildVoiceNoteRevokePlan,
  buildVoiceNoteRevokeContract,
  voiceNoteRevokePlanCopy,
} from "@/lib/voice/voice-note-revoke-plan";

describe("buildVoiceNoteRevokePlan — plan only, never destructive", () => {
  const plan = buildVoiceNoteRevokePlan({ capsuleIds: ["cap-obs-1", "cap-obs-2"], planLabel: "vn-1" });

  it("is PLAN_ONLY and never allows apply or hard delete", () => {
    expect(plan.mode).toBe("PLAN_ONLY");
    expect(plan.apply_allowed).toBe(false);
    expect(plan.hard_delete_allowed).toBe(false);
  });

  it("reports CANNOT_IDENTIFY_GROUP (no durable grouping id today)", () => {
    expect(plan.plan_status).toBe("CANNOT_IDENTIFY_GROUP");
    expect(plan.reason_codes).toContain("NO_DURABLE_GROUP_ID_TODAY");
    expect(plan.reason_codes).toContain("ORG_WALLET_CAPSULES_REQUIRE_ORG_AUTHORITY");
  });

  it("lists every held capsule id but with UNKNOWN wallet/authority (client can't resolve it)", () => {
    expect(plan.capsule_count).toBe(2);
    for (const c of plan.capsules) {
      expect(c.wallet_scope).toBe("unknown");
      expect(c.authority_status).toBe("UNKNOWN");
      expect(c.proposed_action).toBe("SKIP_UNAUTHORIZED");
    }
  });

  it("has no external side effects, no raw audio, and crypto-erasure not ready", () => {
    expect(plan.external_side_effects).toBe(false);
    expect(plan.raw_audio_scope).toBe("NONE");
    expect(plan.crypto_erasure_ready).toBe(false);
    expect(plan.crypto_erasure_status).toBe("NO_KEY_PATH_YET");
  });

  it("only previews an audit event; it does not assert one was written", () => {
    expect(plan.audit_preview.event_type).toBe("VOICE_NOTE_REVOKE_PLANNED");
  });

  it("an empty capsule list is still a safe, non-applicable plan", () => {
    const empty = buildVoiceNoteRevokePlan({ capsuleIds: [], planLabel: "vn-empty" });
    expect(empty.capsule_count).toBe(0);
    expect(empty.apply_allowed).toBe(false);
    expect(empty.plan_status).toBe("CANNOT_IDENTIFY_GROUP");
  });

  // [OTZAR-RETURN-10] a durable grouping id makes the group identifiable — but
  // apply is STILL not implemented and apply_allowed stays false.
  it("with a grouping id, status is GROUPING_READY_APPLY_NOT_IMPLEMENTED but apply is still not allowed", () => {
    const grouped = buildVoiceNoteRevokePlan({
      capsuleIds: ["cap-obs-1", "cap-obs-2"],
      planLabel: "turn-1",
      groupingId: "11111111-2222-3333-4444-555555555555",
    });
    expect(grouped.plan_status).toBe("GROUPING_READY_APPLY_NOT_IMPLEMENTED");
    expect(grouped.voice_note_id).toBe("11111111-2222-3333-4444-555555555555");
    expect(grouped.apply_allowed).toBe(false);
    expect(grouped.hard_delete_allowed).toBe(false);
    expect(grouped.crypto_erasure_status).toBe("NO_KEY_PATH_YET");
    expect(grouped.reason_codes).toContain("DURABLE_VOICE_NOTE_ID_PRESENT");
    expect(grouped.reason_codes).toContain("APPLY_NOT_IMPLEMENTED_IN_THIS_BUILD");
    expect(voiceNoteRevokePlanCopy(grouped).toLowerCase()).toContain("apply is not implemented yet");
    expect(voiceNoteRevokePlanCopy(grouped).toLowerCase()).toContain("no note was removed");
  });
});

describe("buildVoiceNoteRevokeContract — typed doctrine, not an implementation", () => {
  const c = buildVoiceNoteRevokeContract();

  it("requires forward-only durable grouping and never claims it can group the past", () => {
    expect(c.grouping_prerequisite.needs_durable_group_id).toBe(true);
    expect(c.grouping_prerequisite.forward_only).toBe(true);
    expect(c.grouping_prerequisite.can_group_past_observations).toBe(false);
  });

  it("forbids hard delete and external side effects; prefers revoke/tombstone", () => {
    expect(c.hard_delete_allowed).toBe(false);
    expect(c.external_side_effects_allowed).toBe(false);
    expect(c.preferred_semantics).toBe("revoke_or_tombstone");
    expect(c.raw_audio_scope).toBe("NONE");
  });

  it("encodes per-wallet authority (caller own; org capsules need org authority)", () => {
    expect(c.authority_model.per_wallet).toBe(true);
    expect(c.authority_model.caller_can_revoke_own_wallet).toBe(true);
    expect(c.authority_model.org_capsules_require_org_authority).toBe(true);
  });

  it("notes the voice-note audit events are NET-NEW (not the existing CAPSULE_DELETED)", () => {
    expect(c.audit_events.are_net_new).toBe(true);
    expect(c.audit_events.existing_soft_revoke_audits_as).toBe("CAPSULE_DELETED");
  });

  it("reports crypto-erasure not ready (no key-disable path today)", () => {
    expect(c.crypto_erasure.status).toBe("NO_KEY_PATH_YET");
    expect(c.crypto_erasure.ready).toBe(false);
  });

  it("is BEAM-ready: one supervised, idempotent, non-cascading coordinator per voice_note_id", () => {
    expect(c.beam_coordinator.one_coordinator_per).toBe("voice_note_id");
    expect(c.beam_coordinator.idempotent_plan_apply).toBe(true);
    expect(c.beam_coordinator.no_cascading_delete).toBe(true);
    expect(c.beam_coordinator.no_duplicate_jobs).toBe(true);
    expect(c.beam_coordinator.backpressure_for_large_groups).toBe(true);
    expect(c.beam_coordinator.supervised).toBe(true);
  });

  it("is blockchain-ready WITHOUT placing personal data (or its hash) on-chain", () => {
    expect(c.blockchain_readiness.personal_data_on_chain).toBe(false);
    expect(c.blockchain_readiness.hash_of_personal_data_on_chain).toBe(false);
    expect(c.blockchain_readiness.capsule_data_remains_off_chain).toBe(true);
    expect(c.blockchain_readiness.anchor_only).toBe("status_revocation_or_proof_roots");
  });
});

describe("plan copy + output hygiene", () => {
  it("the plan copy is honest that nothing was removed and apply is unavailable", () => {
    const copy = voiceNoteRevokePlanCopy(buildVoiceNoteRevokePlan({ capsuleIds: ["c1"], planLabel: "vn-2" })).toLowerCase();
    expect(copy).toContain("apply is not available");
    expect(copy).toContain("no note was removed");
  });

  it("model output contains no AVP²/Federation/blockchain-implementation references", () => {
    const blob = JSON.stringify({
      plan: buildVoiceNoteRevokePlan({ capsuleIds: ["c1"], planLabel: "vn-3" }),
      contract: buildVoiceNoteRevokeContract(),
    }).toLowerCase();
    expect(blob).not.toContain("avp");
    expect(blob).not.toContain("federation");
    expect(blob).not.toContain("cosmp");
    // No on-chain personal-data claim sneaks in.
    expect(blob).not.toContain("on_chain\":true");
    expect(blob).not.toContain("personal_data_on_chain\":true");
  });
});
