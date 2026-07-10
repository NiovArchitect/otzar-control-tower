# Otzar Continuity — Next-Session Handoff (no-deferral program)

**This continues the SAME autonomous no-deferral human-flow program.** It is the
sanctioned continuation-anchor: done-vs-pending is explicit; P5/P6 get real work,
not a cosmetic pass. No-fake-completion overrides "no deferral" — build truthfully.

## Baseline (verified done)

- **P0–P3 — SHIPPED + LIVE** (FND `05c1f32`, PRs #612/#613/#614). Server-side
  calendar proposal + deterministic pre-LLM yes/no + temporal grounding + idempotent
  gated write + actor/org isolation. Live-smoke: Turn 1 → `"Olivia's Event", Sat Jul
  11 2026 1:00 PM EDT`; Turn 2 "yes" → resolves + honest PROVIDER_BLOCKED.
- **Corrections #1/#2 + P4 — FND PR #615** (branch `otzar-continuity-corrections`,
  commits `15f324c` C2, `662359b` C1, `1bf11b7` P4). Unit 39 + integration 12 green,
  typecheck clean. **State when this handoff was written: PR open, CI running.**
  → **First next step: confirm #615 CI green → squash-merge → Render deploy by
  commitId (srv `srv-d8t17sm7r5hc73ed5h6g`, key via bootstrap secrets, NOT .env) →
  live-smoke on the dedicated smoke org → flip the doctrine doc status to LIVE.**

All continuity logic lives in
`apps/api/src/services/otzar/calendar-continuity.service.ts`, wired pre-LLM in
`otzar.service.ts:conductSession` (dynamic import; short-circuits on non-null).

## Hard constraints (unchanged — verbatim)

- `GOOGLE_OIDC_IDENTITY: OFF`. Demo org: **untouched**. Meridian: **untouched**.
- Use dedicated smoke users/orgs only. Never the demo org. Do not mutate Meridian.
- Do not repeat the code-before-schema incident: **schema lands FIRST** as a
  governed additive raw-DDL prod script (ADR-0025), frontend/consumer SECOND.
- No transcript payload warehouse. No audit table as operational authority. Do not
  store tokens, secrets, raw OAuth payloads, or unrestricted tool responses.
- FND main protected: PR + CI (5 checks) + squash-merge. CT main: direct push →
  Render → app.otzar.ai; verify via live bundle hash.

## The Correction #1 precondition — READ BEFORE ANY CT WIRING

Exact-thread binding is **active only when the client sends a PERSISTENT thread id
across turns**. Today the live CT sends none → the safe actor+org recency path runs.
When you wire CT (P5) to send `conversation_id`, it MUST reuse the id returned by the
server (now surfaced as `conversation_id` on the continuity response) and keep it
**stable across the reload/confirm turn**. A fresh id per turn would make exact-match
fall through and re-expose the original "I don't see a previous question" bug. Add a
live-smoke that reloads between propose and "yes" and asserts resolution.

## Remaining work (priority order, each: schema-first if needed → tests → deploy → live)

### P4 remainder (beyond what #615 shipped)
- **Durable conversation-turn transcript.** Server-side user+assistant turn log
  (bounded, no payload warehouse — store text with retention, not tool blobs) to
  enable free-form back-reference: "what did we decide?", "the one David mentioned",
  "send that", "move it", "continue". Schema: a `OtzarConversationTurn` table
  (conversation_id, role, text, created_at, retention). Land schema first.
- **Generalized pending-action machine** beyond calendar: the 14-state incl.
  `COMPENSATION_*`. Post-execution compensation ("undo it" after the event was
  booked) → a reversing action through the gated executor, never a silent delete.
  Model as ledger status transitions; reuse the CAS-claim pattern.

### P5 — cross-device, memory, UX, resilience
- **Cross-device / concurrent-thread races.** "Most recent" restoration is the
  documented rule today; add explicit device/session disambiguation when two
  live threads hold pending actions. Guard with a claim, surface a chooser.
- **User relationship memory** (prefs/habits with confidence + provenance) and the
  **private→organizational promotion boundary** (permissioned layers; promotion is
  an explicit, audited step, never automatic).
- **Cross-device summaries** + **model-fallback context parity** (a resilience
  envelope so a fallback model sees the same grounded temporal + pending state).
- **Full CT UX:** pending-action chip, thread restoration, clear/archive/delete +
  retention semantics. Send persistent `conversation_id` + `client_timezone`
  (backend already accepts both). Honor the precondition above.
- **Temporal/calendar completion:** admin per-user timezone management + traveling
  user (client tz already overrides per-request; add the admin surface).

### P6 — generalized startup schema manifest
- Extend the boot-time IntegrationCredential column guard to **all** runtime-required
  columns (a declared manifest checked at startup; fail-closed with a clear message).

## Failure matrix to keep green as you extend
propose→reload→yes · double-yes (idempotent) · yes-in-wrong-thread (no cross-approve)
· ambient-yes (recency + restore) · past-time (clarify, persist nothing) · multi-
pending yes (disambiguate, zero side-effect) · ordinal pick · supersede→yes ·
supersede-into-past (re-clarify) · reject→cancel · provider-blocked (intent kept) ·
expired proposal · orgless caller (inert).

## Working notes / gotchas
- Tests: run FND `test:unit` and `test:integration` **one tier at a time** (single
  local DB on 5433; concurrent runs cross-fail).
- No `console.*` in `apps/api/src` (pre-commit RULE 16 guard). Use the logger.
- Prod cleanup/DDL scripts must live **inside** the repo (module resolution); email
  column is on `entities`, not `entity_profiles`.
- Cloud-sync git corruption: if " 2" files appear, pause sync, `reset --hard
  origin/main`.
- Commit attribution: sole author `niovarchitect <sadeil@niovlabs.com>`, **no**
  Co-Authored-By trailer.
