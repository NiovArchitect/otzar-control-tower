# PRD-02 — Ambient Visibility / Interruption

Area 3. Code: `lib/work-os/ambient-visibility.ts` (`decideAmbientVisibility`,
`findBackendTermLeak`). Tests: `tests/unit/ambient-visibility.test.ts`.

## Core rule

**Visibility is intelligence.** The question is never "what text do we show?" but
"what does the human actually need to see, feel, approve, know, or do right now?"
Backend real ≠ frontend loud. Otzar decides per event: stay silent / confirm /
interrupt / digest / show details on demand.

## Visibility levels (shipped)

`silent | confirmation | interrupt | digest | detail_on_demand`. Plus importance:
`routine | useful | requires_attention | urgent | blocked | approval_required |
sensitive`. The decision carries `shouldSpeak / shouldShowInline / shouldNotify /
shouldBadge / shouldGroupIntoDigest / shouldPersistToLedger / shouldShowInAuditOnly /
shouldInterruptFocus / shouldAskClarification / detailLabel`. `quietMode` suppresses a
spoken low-risk success; `focusMode` folds a routine confirmation into a digest; neither
ever silences an interrupt.

## Interrupt rule

Interrupt only when **expected benefit exceeds attention cost**, OR policy/safety/
authority requires it. Target feeling: "I would have missed that. I'm glad Otzar caught
it." Interruptions: timely, concise, useful, respectful, role-aware, easy to act on,
easy to dismiss, never needy/noisy/technical-unless-asked.

**Bad interruptions (→ silent / digest):** login success, proof/audit events, every
message, every Work Ledger write, backend status, low-value FYIs, repetitive reminders,
anything that can wait for a digest.

**Good interruptions (→ interrupt):** approval needed, blocker detected, deadline risk,
someone waiting on the user, sensitive/policy-gated action, ambiguity / missing context,
a teammate reply that changes the next action, an urgent client/investor/team issue, a
small human decision that unblocks meaningful work.

## Event → level mapping (shipped table in `ambient-visibility.ts`)

MESSAGE_SENT / COLLABORATION_SENT / SELF_WORK_SAVED → confirmation; LEDGER_PROOF →
silent (audit-only); APPROVAL_NEEDED → interrupt (+badge); BLOCKED_DENIED → interrupt;
AMBIGUOUS_TARGET / MISSING_CONTEXT / NEEDS_CLARIFICATION → interrupt + askClarification;
ACTION_FAILED → interrupt; DIGEST_READY → digest.

## Copy enforcement

`findBackendTermLeak(copy)` flags machine forms (UPPER_SNAKE codes, hyphenated route
segments, id/type field names, page-handoff phrasing) and must return null for all
normal-flow user copy. No route/rail names, request ids, policy codes, CROSS_ORG_DENIED,
"participant unresolved", "Open X to route it" in normal UX.

## Role-aware feeds

Don't show everyone the same feed. CEO → strategic blockers/approvals/team-movement/
changes/risks/readiness. Tech Lead → eng blockers/reviews/architecture/incidents/
follow-ups. GTM/CMO → campaign/messaging/customer-feedback/external-approvals. AI/NLP →
transcript/extraction/model-data issues/assigned-summaries. General → assigned work /
needs-response / relevant context / digest / relevant approvals-blockers.

## Acceptance

1. Login = no popup, audited silently.
2. Send = simple confirmation, no backend details.
3. Proof exists but is not a notification.
4. Approval-needed interrupts clearly + reason.
5. Low-risk success silent/summarized in focus mode.
6. Notifications group by usefulness; dismissible.
7. "Why" = human relevance, not mechanics.
8. Audit/proof on demand, not forced.
9. `findBackendTermLeak` passes on all shipped normal-flow strings.
