# PRD-05 — Feedback / Correction Learning

Area 9. Related: `PRD-02` (interruption preferences), `PRD-03` (context aliases),
Foundation `CORRECTION` capsule + `conductSession` Layer 1.

## Core rule

**Corrections are learning signals, not one-off fixes.** When a human corrects Otzar,
the system should learn where allowed — improving future interpretation for that human's
Twin, within policy.

Loop: `communication → interpretation → action → proof → feedback/correction → memory →
better future interpretation`.

## Correction types (examples → what they update)

| Correction | Updates |
|---|---|
| "No, I meant the other David." | recipient resolution preference (this human's common collaborators) |
| "Don't interrupt me for that." | interruption preference / category mute (`PRD-02`) |
| "That should be a review request, not a message." | intent classification preference |
| "When I say client note, I mean the note in the current project." | context alias (`PRD-03`) |
| "Use a warmer tone with Annie." | per-recipient tone preference |
| "This is not work-related." | work-relevance classifier signal |

## Requirements

1. Capture corrections **where allowed** (consent + policy + scope); never expose
   private correction data outside scope.
2. Apply to the current flow immediately (local interpretation) AND persist as a
   preference/correction memory for future flows (Foundation `CORRECTION` capsule;
   `conductSession` already prioritizes Layer 1 corrections).
3. Preserve audit/proof of the correction.
4. **Enterprise policy always wins over personal preference.** Preference operates
   inside policy; it never expands authority or bypasses governance.
5. Never claim "best practice learned" / "AI fixed itself" / "drift prevented" beyond
   what is real — surface only submitted/available signals (counts, last-seen).

## Persistence rail (verified 2026-06-23, Phase 3E)

Inspection of otzar-control-tower + niov-foundation found a **typed, governed
TwinCorrectionMemory rail** (EDX-5 / Foundation PR #274): `api.otzar.correctionMemory`
→ `POST/GET /otzar/my-twin/corrections` (+ `/revoke`). `CreateCorrectionRequest` takes
`scope_type` (PERSONAL/CONVERSATION/PROJECT/TEAM/ROLE/ORG), `correction_type`
(MEANING_CLARIFICATION / TERMINOLOGY_DEFINITION / PREFERENCE / TONE_PREFERENCE / … /
ASK_BEFORE_ACTING), `safe_summary`, optional sensitivity/retention/source ids. Returns a
`TwinCorrectionSafeView` (no raw payload). A generic `POST /otzar/correction`
(`incorrect_description`/`correct_behavior`, ADR-0055) also exists.

**Phase 3E uses the typed rail** — self-scoped `PERSONAL`, `correction_type` mapped from
the work-correction kind (`correctionTypeFor`), `safe_summary` = the user's correction
text only (**never the transcript/context body**), `retention_class: STANDARD`.
Persistence is **best-effort** (the local correction always applies even if it fails) and
honest: the in-session **Recent corrections** list shows "Applied here" → "Saved as
correction evidence" / "Saved as preference evidence" / "Applied here (couldn't save
evidence)". **No global-learning claims.** Live credentialed verification of the rail's
runtime behavior is gated on a real session (the standing `DEMO_SHARED_PASSWORD` smoke).

## Forward build (don't overbuild now)

Recurring-correction → preference model (`TwinAttentionPreference`: interruptionTolerance,
confirmationStyle, digestPreference, voicePreference, proofVisibility, preferredTone,
autoSendInternalMessages, draftBeforeExternalSend) is the per-Twin personalization layer
(Python preference learning + Foundation memory). Seed the shape; wire the smallest safe
capture first.

## Acceptance

1. A correction changes the current flow's behavior immediately.
2. A correction is recorded where policy allows, with proof.
3. The same mistake is less likely next time for that human's Twin.
4. No correction grants authority or bypasses policy.
5. No overclaiming of autonomous learning.
