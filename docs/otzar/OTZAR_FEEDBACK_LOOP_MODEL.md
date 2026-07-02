# Otzar feedback-loop model (ETL stage 10)

**Status:** Phase 4 (2026-07-01). Where corrections actually go today
(grep-verified), and the exact missing wires.

## Shipped correction stores

| Correction | Where it lands | Consumed by |
|---|---|---|
| Recipient/routing corrections | `work-graph-learning.ts` — closed-loop correction memory | `recipient-governance.ts` proof-path gate (corrections FEED the gate) |
| Personal working preferences | `twin-personal-preferences.ts` (+ Preferences/Corrections pages) | twin behavior |
| Hierarchy corrections | `POST /org/hierarchy/assign` (audited) — this pass proved the loop live: 10 wrong roles corrected through the product | routing context, notifications (sender role_title live), org map |
| Seed verdicts | Dandelion approve/hold/reject with reasons (audited) | org structure; rejected fixtures stay rejected |
| Work-state corrections | patchLedger status changes (audited) + reconcile-execution | surfaces + waiting-on |
| Decision recommendations | `decision-recommendation.ts` | recommendation layer |

## The Talk-to-Otzar correction commands (§18 target)

Wired today: teach/correct via Preferences + Corrections + conversation.
**Missing wires (exact):**
1. "Walter is video production, not sales" → needs a conversational intent
   that calls `hierarchy/assign` (admin-gated; the API exists — the voice
   intent route does not).
2. "That went to the wrong person" → needs an intent mapping to the
   work-graph-learning correction write (store exists; intent missing).
3. "This should escalate to Will" → needs reroute intent → ledger patch +
   notification (rails exist; intent missing).
These are voice-command-router additions (CT `voice-command-router.ts` +
FND conduct intents), not new systems — queued for the §18 command-surface
pass.

## No-owner / cannot-route escalation (§20 status)

Today: no-owner → `identity_review` lane + NEEDS_OWNER status + person-setup
seed (held for admin review) — the ADMIN is the escalation target via
Seeding + urgent-blind-spot surfacing (§21, shipped this pass). Manager-chain
escalation (owner's manager first, then admin) is now POSSIBLE because
manager edges exist; the escalation-target selection does not consult them
yet — named gap for the routing pass.
