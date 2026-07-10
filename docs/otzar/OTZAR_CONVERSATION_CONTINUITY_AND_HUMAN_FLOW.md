# Otzar Conversation Continuity & Human Flow

**Status: P0 SHIPPED + LIVE-VERIFIED (2026-07-10). FND `05c1f32`.** The reported
continuity failure is fixed end-to-end in production. Broader continuity subsystems
(below) are **not yet built** — internally achievable, not blocked.

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
  baseline; the live device timezone (sent per request) handles travel.
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

## Verification

- **Unit (35):** time parsing incl. "at one o'clock", DST (EST vs EDT), current-year
  correctness, title extraction, confirmation classification, **+ pre-fix reproduction**
  (the old extractor forms no calendar proposal — the proven loss point).
- **Integration (7, real DB):** temporal correctness · propose→persist→bare-"yes"
  resolves · CREATED via injected provider · idempotency (no duplicate) · cross-user
  isolation · reject→cancel · no-false-interception.
- **Synthetic-live (smoke org, dedicated test tenant):** Turn 1 → `"Olivia's Event",
  Sat Jul 11 2026 1:00 PM EDT` (correct); Turn 2 "yes" → resolves + honest
  PROVIDER_BLOCKED (smoke Google not connected). Zero residue; 0 new live errors.
- **Live ceiling:** real-provider calendar write is **BLOCKED — EXTERNAL** (the smoke
  org's Google is `READY_FOR_CONSENT`; connecting Google / OIDC is out of scope this
  arc). The CREATED path is **integration-proven** with an injected provider.
- Safety: `GOOGLE_OIDC_IDENTITY` OFF; demo org untouched; Meridian untouched; zero
  schema change.

## Not yet built this pass (internally achievable, NOT blocked)

These build on the P0 substrate and did not block the reported flow:
- **Durable conversation-turn transcript** (server-side user+assistant turn
  persistence) for reference resolution ("what did we decide?", "the one David
  mentioned"). P0 needs only the pending-proposal store, which is built.
- **Broader references/corrections:** "make it 2 PM" (supersede), "the second one",
  "move it", "cancel it", "continue". The confirmation resolver + supersession states
  are the extension point.
- **User relationship memory** (prefs/habits with confidence/provenance/promotion
  rules) and the **private→organizational promotion boundary**.
- **Cross-device summaries + full CT UX** (pending-action chip, thread restoration,
  clear/archive/delete semantics) and **model-fallback context parity**.
- **CT wiring** to send `conversation_id` + `client_timezone` and render the pending
  state (the backend already accepts both; the ambient "yes" already routes through
  the resolver, so the reported flow works without a CT change).
- **Generalized startup schema manifest** (extends the boot-time
  IntegrationCredential guard to all runtime-required columns).
