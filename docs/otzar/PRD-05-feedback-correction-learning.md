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
