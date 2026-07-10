# Otzar Conversation Continuity & Human Flow

**Status: P0 + Corrections #1/#2 + P4 human-loop closure — SHIPPED + LIVE-VERIFIED
(2026-07-10). FND `e6fab89` (PR #615) deployed to `otzar-api` / `api.otzar.ai`
(deploy `dep-d98mk9beo5us73fclhbg`, live SHA `e6fab89b`, health 200). Live A–G smoke
on the dedicated smoke org: 18/18 PASS, zero residue, honest PROVIDER_BLOCKED. A
follow-up log-hygiene fix (continuity conversation-row upsert; kills a
`prisma:error` + a latent 500) is FND PR #616.** Remaining P5/P6 subsystems (below)
are the active build — internally achievable, not blocked.

## The failure this fixes

> User: "Put on my calendar that at one o'clock I'll be at Olivia's event." → Otzar
> proposed it dated **January 9, 2025** and asked to confirm → User: "yes" → Otzar:
> *"I don't see a previous question or context to respond 'yes' to."*

Two defects, both proven by read-only reconnaissance (file:line):
1. **No server-side continuity.** The chat path (`otzar.service.ts:conductSession`)
   persisted **no turns and no proposal** — only a `message_count` counter on
   `OtzarConversation`. The assistant proposal was ephemeral text. There was **no
   server-side confirmation resolver**; the only "yes" handling was client React
   state scoped to internal-message drafts (wiped on reload). So a bare "yes" reached
   a **stateless LLM call** with no prior turn.
2. **No temporal grounding.** The chat system prompt injected **no current
   date/time/timezone**, and the LLM is tool-less — so it **invented** the date from
   training priors ("January 2025"). The correct substrate (`moment-context`,
   per-user `EntityProfile.timezone`) existed but was never wired into the prompt.

## Doctrine

- **Conversation is a governed, continuous relationship** — not isolated prompts. An
  assistant question creates an obligation preserved until answered, superseded,
  rejected, completed, or expired.
- **Approval language is resolved against active governed state BEFORE the LLM.** The
  model is never asked whether "yes" means approval.
- **Tool proposals are not completed actions.** Otzar never says "added" unless the
  provider returned an event id.
- **Time is a server-grounded fact**, never a model guess. Per-user timezone is the
  baseline; the live device timezone (sent per request) handles travel. A time that
  has already passed today is **asked about, never silently rolled to tomorrow**
  (Correction #2).
- **A pending action is bound to the exact thread it was proposed in** (Correction
  #1). A confirmation resolves only within that thread (or, when the client sends no
  thread, within the caller's own actor+org recency, restoring the proposal's bound
  thread). Another thread cannot silently approve it.
- **Private relationship memory and shared organizational truth are separate
  permissioned layers.** (Layer built as substrate; promotion rules not yet wired —
  see "Not yet built".)

## What SHIPPED (P0) — `apps/api/src/services/otzar/calendar-continuity.service.ts`

Zero schema. The pending proposal reuses `WorkLedgerEntry(ledger_type=MEETING,
status=NEEDS_CALLER_CONFIRMATION)` — the state already exists.

- **Temporal grounding.** `resolveTemporalContext` resolves the real now +
  timezone (priority: **client live tz → per-user `EntityProfile.timezone` →
  documented org fallback**, flagged), DST-correct via `Intl`. The calendar date is
  computed **server-side** (never the model); a sanity guard rejects a past/invented
  year; a past-today time infers tomorrow **with a correction hint**. A grounded
  current-date line is also injected into the LLM system prompt.
- **Pending-proposal state machine.** `detectCalendarProposal` (server-resolved
  date/time) → persist `NEEDS_CALLER_CONFIRMATION` → confirm `EXECUTING` → `EXECUTED`
  / back-to-pending on provider block / `CANCELLED` on reject.
- **Deterministic pre-LLM confirmation resolver.** A bare "yes"/"no" resolves the
  caller's **single unexpired pending proposal**. **Invariant 1:** never side-effects
  on ambiguity — multiple pending → ask which; none → fall through to normal
  handling. Isolation is **actor + org scoped** (not conversation-scoped), so it
  works even when the ambient surface sends no conversation_id.
- **Idempotency.** An **atomic compare-and-set claim**
  (`NEEDS_CALLER_CONFIRMATION → EXECUTING`, rowcount 1) precedes the non-idempotent
  `createCalendarEvent`; a second "yes"/retry finds nothing claimable → no duplicate.
- **Honest provider states.** CREATED / PROVIDER_BLOCKED (kept-ready, connect Google) /
  CANCELLED — the approved intent is preserved, never a false "added".

### Corrections + P4 (FND PR #615 — pending merge/deploy/live)

- **Correction #1 — exact thread binding.** The proposal is bound to a
  server-authoritative thread (the existing `WorkLedgerEntry.conversation_id` UUID
  column — zero schema) resolved BEFORE persistence. A "yes" carrying a thread id
  resolves only that thread's proposal; a "yes" with no thread (the live ambient
  case) resolves by actor+org recency and **restores** the proposal's bound thread
  to the client. **Precondition (honest):** the exact-thread guarantee is only
  *active* once the client sends a **persistent** thread id across turns. The live
  CT sends none today → recency path (safe). CT wiring (P5) must send a **stable**
  id, not a fresh one per turn, or it re-exposes the original bug.
- **Correction #2 — truthful past-time clarification.** A past-today time persists
  nothing and asks tomorrow-or-another-time; never a silent tomorrow.
- **P4 — human-loop closure.** Multi-pending disambiguation now *resolves* ("the
  first one" / "number 2" / "cancel the second"; deterministic oldest→newest order).
  Single-pending **supersession** ("make it 3pm", "no, 2pm") revises the proposal in
  place on the same row (thread binding + idempotency preserved); a later "yes" books
  the revised time; a past revised time re-clarifies.

## Verification

- **Unit (39):** time parsing incl. "at one o'clock", DST (EST vs EDT), current-year
  correctness, past-time→clarify, title extraction, confirmation classification,
  ordinal selection, time-revision parsing, **+ pre-fix reproduction** (the old
  extractor forms no calendar proposal — the proven loss point).
- **Integration (12, real DB):** temporal correctness · propose→persist→bare-"yes"
  resolves · CREATED via injected provider · idempotency (no duplicate) · cross-user
  isolation · reject→cancel · no-false-interception · **cross-thread negative +
  ambient-still-resolves (Correction #1)** · **past-time clarify persists nothing
  (Correction #2)** · **two-pending "yes"→DISAMBIGUATE (zero side-effect) then "the
  first one" books the oldest** · **"make it 3pm"→REVISED in place→"yes" books
  19:00Z (P4 supersession)**.
- **Synthetic-live (smoke org, dedicated test tenant):** Turn 1 → `"Olivia's Event",
  Sat Jul 11 2026 1:00 PM EDT` (correct); Turn 2 "yes" → resolves + honest
  PROVIDER_BLOCKED (smoke Google not connected). Zero residue; 0 new live errors.
- **Live A–G smoke (deployed `e6fab89`, smoke org, 18/18):** A thread-bound propose
  returns a stable `conversation_id` + in-thread "yes" resolves + echoes the thread ·
  B a foreign-thread "yes" does not act, original stays resolvable · C ambient "yes"
  resolves + restores the bound thread · D past-time (6am) → truthful clarification,
  stray "yes" inert · E two-pending "yes" → disambiguation, "the first one" resolves
  the oldest, "cancel the second one" cancels only the second, the first survives ·
  F "make it 11:30pm" revises then "yes" resolves the revised time · G honest
  PROVIDER_BLOCKED, no false "created". Every phase self-cancelled → zero residue
  (post-run ambient "yes" correctly inert). Harness: `docs/otzar/smoke-continuity.mjs`.
- **Live ceiling:** real-provider calendar write is **BLOCKED — EXTERNAL** (the smoke
  org's Google is `READY_FOR_CONSENT`; connecting Google / OIDC is out of scope this
  arc). The CREATED path is **integration-proven** with an injected provider.
- Safety: `GOOGLE_OIDC_IDENTITY` OFF; demo org untouched; Meridian untouched; zero
  schema change.

## Not yet built this pass (internally achievable, NOT blocked)

These build on the P0 + corrections substrate and did not block the reported flow.
**P4 closed** in-thread supersession + multi-pending disambiguation resolution
(above). Still open:
- **Durable conversation-turn transcript** (server-side user+assistant turn
  persistence) for reference resolution ("what did we decide?", "the one David
  mentioned", "send that", "move it"). P0 needs only the pending-proposal store,
  which is built; free-form back-reference needs the turn log.
- **Generalized pending-action machine** beyond calendar (the 14-state incl.
  COMPENSATION_* / post-execution compensation "undo it after it was booked").
- **User relationship memory** (prefs/habits with confidence/provenance/promotion
  rules) and the **private→organizational promotion boundary**.
- **P5 — cross-device summaries + full CT UX** (pending-action chip, thread
  restoration, clear/archive/delete + retention semantics) and **model-fallback
  context parity**. Includes the **CT wiring** to send a *persistent*
  `conversation_id` + `client_timezone` and render the pending state — see the
  Correction #1 precondition: the thread id must be **stable across turns**, or
  exact-thread binding falls through to the (safe) recency path and, if a fresh id
  is sent per turn, could re-expose the original bug.
- **P6 — generalized startup schema manifest** (extends the boot-time
  IntegrationCredential guard to all runtime-required columns).

See `docs/otzar/OTZAR_CONTINUITY_HANDOFF.md` for the exact next-session plan.
