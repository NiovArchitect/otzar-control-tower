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
3. ✅ **DONE + LIVE — P6 startup manifest** (FND PR #619, merged `bc87c44`, DEPLOYED
   `dep-d98qk06cjfls73f4mv00`, live SHA `bc87c44`, health 200, clean boot
   "NIOV API listening" = manifest passed before listen). `schema-manifest.ts`
   (fail-closed; subsumes identity guard) + `scripts/probe-schema-manifest.ts`
   (uncommitted local convenience tool — recreate/commit with the wiring PR). Prod
   probe = compatible. Unit 9 + integration 3 green. **Live runtime is now bc87c44.**
4. ✅ **DONE + LIVE — Stage 1 runtime wiring** (FND #620 `24eaa58` + ambient-defer fix
   #621 `084540e`, DEPLOYED, live SHA `084540e`, health 200). `conductSession` resolves
   ONE authoritative thread + persists durable USER/ASSISTANT turns + `request_id`
   idempotency + retry-replay. **Key design lesson (do not undo):** for a SUPPLIED
   thread id (the normal CT contract) the thread is resolved up front + user turn
   persisted before the model + retry-replay + strict idempotency. For an AMBIENT
   (no-id) turn it **DEFERS** — continuity receives `undefined` and keeps its shipped
   recency behaviour (multi-pending disambiguation / obligation restore); turns persist
   to continuity's own resolved thread afterward. Passing a resolved thread into
   continuity for the no-id case REGRESSES (pulls unrelated proposals into one thread —
   the #620→#621 bug). Modules: `thread-resolution.service.ts`, `otzar.service.ts`
   (`beginTurnPersistence`/`persistDeferredUserTurn`/`persistAssistantTurn`/
   `reconstructFromAssistantTurn`), routes carry `request_id`. Tests: resolver 7 +
   wiring 4 + full regression (128). **Live: A–G smoke green + turn-proof (durable
   turns, human/Twin identity, R1 idempotent, contiguous sequence).** smoke-admin
   residue cleaned via `docs/otzar/…` cleanup (dedicated smoke user only).

5. **← START HERE. Deterministic turn-based references** (contract §P5D): "what were we
   talking about", "what did we decide", "continue", "send that", "tell him/her",
   "this/that/it", "the one David mentioned" — resolved BEFORE the LLM, in the §P5D
   order (actor/org/Twin → thread → obligation → active action → recent turns → summary
   → memory → org truth → LLM last), never executing under ambiguity. Turns are now
   durable (query `listConversationTurns`), so the recent-turns candidate source exists.
6. **Stage 2** — structured summary + relationship memory + org-promotion lineage
   (contract §6–§8): new tables + services + tests, coordinated activation (manifest
   updated first).
7. **Stage 3** — action-state additive fields on WorkLedgerEntry (§9) + compensation.
8. **P5F/P5J/P5K/P5L/P5M** — cross-device, retention/clear/delete services, model-
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
