# Otzar Continuity — Next-Session Handoff (no-deferral program)

**This continues the SAME autonomous no-deferral human-flow program.** It is the
sanctioned continuation-anchor: done-vs-pending is explicit; P5/P6 get real work,
not a cosmetic pass. No-fake-completion overrides "no deferral" — build truthfully.

## Baseline (verified done)

- **P0–P3 — SHIPPED + LIVE** (FND `05c1f32`, PRs #612/#613/#614). Server-side
  calendar proposal + deterministic pre-LLM yes/no + temporal grounding + idempotent
  gated write + actor/org isolation. Live-smoke: Turn 1 → `"Olivia's Event", Sat Jul
  11 2026 1:00 PM EDT`; Turn 2 "yes" → resolves + honest PROVIDER_BLOCKED.
- **Corrections #1/#2 + P4 — SHIPPED + LIVE-VERIFIED** (FND `e6fab89`, PR #615;
  deploy `dep-d98mk9beo5us73fclhbg`, live SHA `e6fab89b`, health 200; live A–G smoke
  18/18, zero residue). Follow-up log-hygiene fix (conversation-row upsert) = FND
  PR #616. **This baseline is DONE; the active build is P5A onward (below).** The
  deploy + smoke commands are retained below for re-runs.

  ```sh
  # 1. Deploy the merged commit to the live FND service (autoDeploy is OFF).
  cd "$HOME/dev/NIOV Labs/github/niov-foundation" && git checkout main && git pull
  FULL=$(git rev-parse HEAD)
  KEY=$(awk '/^RENDER_API_KEY/{getline;print;exit}' "$HOME/dev/NIOV Labs/secure/bootstrap/.niov-bootstrap-secrets" | tr -d ' \t\r')
  curl -s -X POST "https://api.render.com/v1/services/srv-d8t17sm7r5hc73ed5h6g/deploys" \
    -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    -d "{\"commitId\":\"$FULL\"}" | jq '{id,status,commit:.commit.id}'
  # 2. Wait for the deploy to go live (poll the deploy id or Render dashboard), then smoke:
  SP=$(awk '/smoke-admin@niovlabs.com password/{getline;print;exit}' "$HOME/dev/NIOV Labs/secure/bootstrap/.niov-bootstrap-secrets" | tr -d ' \t\r') \
    node "$HOME/dev/NIOV Labs/github/otzar-control-tower/docs/otzar/smoke-continuity.mjs"
  ```
  Smoke asserts: future-time propose returns a bound `conversation_id`; in-thread
  "yes" resolves (not "I don't see a previous question"); foreign-thread "yes" does
  NOT confirm (C1); past-time (6am) → truthful clarification (C2); "make it 11:30pm"
  → REVISED → "yes" (P4). Expect honest PROVIDER_BLOCKED (smoke Google not connected).

- **COMPLETE SCHEMA CONTRACT — LOCKED**:
  `niov-foundation/docs/otzar/OTZAR_CONTINUITY_SCHEMA_CONTRACT.md`. This is the single
  additive data model for all of P5/P6 (identity doctrine, thread lifecycle, corrected
  turns, atomic sequence, summary, relationship memory, org-promotion lineage,
  action-state, retention, coordinated activation staging, startup manifest). **Read
  it first — it is the roadmap.**
- **INCIDENT (recorded, recovered):** a v0 turn model (PR #617, `61c4271`) was merged
  AND activated in prod BEFORE the contract was finalized. The table is empty/unused;
  no data at risk. **P5 Stage 1 (PR #618) corrects it** (adds subject/author/twin,
  content_hash, org NOT NULL; drops the ambiguous actor + visibility; adds thread
  lifecycle + `turn_seq` atomic allocator). The v1 corrective prod script REFUSES
  unless the turns table is empty.
- **P5 Stage 1 — FND PR #618** (branch `otzar-p5-schema-contract`): corrected schema +
  typed thread lifecycle service (`otzar-threads.ts`: create/assertThreadScope/touch/
  archive/reopen/close/markThreadDeleted/allocateTurnSequence) + ownership-gated
  idempotent turn append (`otzar-conversation-turns.ts`) + corrective activation
  script. Integration 6 green; typecheck clean. Schema-first, NOT runtime-wired.

### EXACT next steps (in order) — active build

1. ✅ **DONE — #618 merged** to FND `main` as `1858de4`.
2. ✅ **DONE — v1 corrective prod schema applied + verified** (empty-draft guard passed;
   `org/subject/author/content_hash` NOT NULL, `twin` nullable, `actor_entity_id`+
   `visibility` dropped, both unique indexes + `turn_seq` present, table empty). Prod
   now exactly matches the contract's Stage 1 model. Re-runnable idempotently.
3. ✅ **DONE — P6 startup manifest** (FND PR #619, merged `bc87c44`).
   `apps/api/src/startup/schema-manifest.ts` (fail-closed, before listen; subsumes the
   identity guard) + `scripts/probe-schema-manifest.ts`. Prod probe = compatible;
   deployed (see below). Unit 9 + integration 3 green.
4. **← START HERE. Stage 1 runtime wiring** — DESIGN LOCKED below. `conductSession`
   (`apps/api/src/services/otzar/otzar.service.ts`). NOTE: `tests/unit/otzar.test.ts`
   runs against the REAL test DB (no prisma mocks) and the turn schema is present
   there, so wiring turn writes will not break mocks — add assertions instead.

   **a. Request contract** — add optional `request_id?: string` to `ConductSessionInput`
   and to the Otzar text + voice/ambient routes (`otzar.routes.ts`,
   `otzar-voice-ready.routes.ts`); validate bounded length + safe charset; pass through
   unchanged. It identifies the USER submission.

   **b. Resolve the authoritative thread FIRST** (before `handleCalendarContinuity`,
   the deterministic resolver, and the LLM call). New private
   `resolveAuthoritativeThread(input.conversation_id, owner, org, twinId, tz)`:
   - `org === null` → return null (orgless: keep legacy behavior, skip turns).
   - id present → `getThread`; if it exists → `assertThreadScope` (on throw = foreign →
     mint a fresh own thread, never leak); else `createThread({conversation_id:id,...})`.
   - no id → `createThread` (mint). Returns `{ conversationId }`.
   Then thread `conversationId` into `handleCalendarContinuity` (as `conversation_id`)
   AND the main LLM path — REPLACING the late `resolveContinuityConversationId` /
   the ~L1261 `otzarConversation` resolution, so one authoritative id is used
   everywhere and actor+org recency stops being the normal path.

   **c. Retry replay** — if `request_id` present, look up the USER turn by
   `(conversation_id, request_id)`; if found AND it has a linked ASSISTANT turn
   (`reply_to_turn_id = userTurn.turn_id`) → reconstruct a `ConductSessionSuccess`
   from the stored assistant turn (content, conversation_id, next_step from
   `action_ref`) and RETURN — no model/tool re-invocation.

   **d. Persist USER turn** before continuity/resolver/model:
   `appendConversationTurn({conversation_id, org, subject:owner, author:owner,
   role:"USER", content:input.message, request_id, source_channel})`. **Fail-closed:**
   if it throws (a non-dedup error, e.g. ThreadScopeError) → return a stable internal
   failure; do NOT invoke the model. If it dedups (retry, same content) → proceed to (c).
   `IdempotencyConflictError` (same request_id, different content) → stable conflict error.

   **e. Persist ASSISTANT turn** before returning a success (both the continuity
   short-circuit AND the LLM success path): `appendConversationTurn({..., role:
   "ASSISTANT", author:twinId, twin_entity_id:twinId, content:response,
   reply_to_turn_id:userTurn.turn_id, action_ref: continuity.ledger_entry_id ?? null,
   model_provider: safe label})`. The assistant turn carries NO request_id (the unique
   is (conversation_id, request_id); the user turn owns it). If assistant persist fails
   AFTER generation → do not claim durability; on retry (c) finds the user turn but no
   assistant → regenerate (idempotent).

   **f. Reference resolution (deterministic, turn-based)** — once turns persist, add the
   first back-references ("what were we talking about", "what did we decide", "continue",
   "send that", "tell him/her", "this/that/it", "the one David mentioned") resolved in
   the order in contract §P5D, BEFORE the LLM, never executing under ambiguity.

   Tests (real DB): user-before-model persisted; assistant-before-response; retry
   replay (no re-invoke); request conflict; ordering; cross-org/user/twin + deleted
   denial; two-device race. Then deploy + live re-check (propose via smoke, query the
   prod turn rows back, confirm subject/author/sequence/idempotency).
5. **Stage 2** — structured summary + relationship memory + org-promotion lineage
   (contract §6–§8): new tables + services + tests, coordinated activation.
6. **Stage 3** — action-state additive fields on WorkLedgerEntry (§9) + compensation.
7. **P5F/P5J/P5K/P5L/P5M** — cross-device, retention/clear/delete services, model-
   resilience envelope, temporal completion, full CT UX. Each schema-first where needed.

Activation discipline: never wire runtime code to a table before its prod schema is
applied AND the startup manifest covers it.

All calendar continuity logic lives in
`apps/api/src/services/otzar/calendar-continuity.service.ts`, wired pre-LLM in
`otzar.service.ts:conductSession` (dynamic import; short-circuits on non-null). The
main LLM path resolves its conversation row at `otzar.service.ts` ~L1261
(existence-checked as of #616) — the P5A turn persistence hooks in around there and
in `buildContinuitySuccess`.

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
