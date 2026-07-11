# Otzar Continuity — Next-Session Handoff (no-deferral program)

**This continues the SAME autonomous no-deferral human-flow program.** It is the
sanctioned continuation-anchor: done-vs-pending is explicit; P5/P6 get real work,
not a cosmetic pass. No-fake-completion overrides "no deferral" — build truthfully.

## EXECUTABLE PLAN — remaining Stage 1 corrections (do these next, in order)

Grep-first, then plan-review per CLAUDE.md, then build. All touch `conductSession` in
`apps/api/src/services/otzar/otzar.service.ts` — sequence them so each compiles + tests
before the next. Each lands as its own PR (CI-green) — prod stays safe until deploy.

### DEPLOY VERIFIED — 2026-07-11 14:0x UTC (founder dashboard-triggered)
- **CT: PROVEN LIVE.** Bundle flipped `index-Du-OPqJg.js` → **`index-D-roLuru.js`** (Render's own hash — do NOT expect the local `D_c_pwVO`), `last-modified` advanced to **14:00:18 UTC**, `cf-cache-status: MISS`. Fetched bundle contains the governed-builder markers: `client_timezone`, `request_id`, `Retry`, `ct-` prefix. CT §11-§12 is live.
- **FND: LIVE + HEALTHY.** `api.otzar.ai/api/v1/health` → 200, `database: connected`; boot schema-manifest is fail-closed so 200 proves `otzar_conversation_requests` present/correct on prod. **Exact SHA NOT readable read-only** (no `/version` route — all 404; no build-SHA header; Render API 401 in-session). Deployed code IS `bf868ea` per the founder's dashboard action; behavioral SHA confirmation needs an authed conductSession probe (see §14-blocked below).
- **§14 LIVE PROOF — EXTERNALLY BLOCKED.** Needs the smoke-admin password `SP` (harness `docs/otzar/smoke-continuity.mjs` logs in `smoke-admin@niovlabs.com` via `process.env.SP`) AND a prod DB/admin read channel for the request/turn/lease invariants — **neither is in this session's env** (`SP`, `DATABASE_URL` all absent; Render key 401). Unblock: founder runs `SP=… node <harness>` via `!`, or exports `SP` (+ a prod read DB URL) into the agent session. The §14 INVARIANTS ARE INTEGRATION-PROVEN (§9 real-barrier + §10 failure-injection, CI-green on the same `bf868ea` code + real Postgres). A NEW §14 live harness (concurrency barrier, replay, response-loss, retryable-fail, ambient ordering, dynamic past-time, source channels) still needs writing — the existing smoke is the A–G/Corrections harness, not the request-spine proof.

### C1 — SHIPPED (FND PR #627, CI running) — 2026-07-11
Every accepted org-scoped DEFERRED (ambient) turn is now request-gated: non-mutating acts
(disambiguate / clarify_past / generic-LLM) mint a per-turn thread + persist the USER turn
+ claim the request BEFORE handleCalendarContinuity/the model. USER-turn thread kept
separate from continuity's org-wide pending lookup (findActorPendingProposals scoping
verified). New test: ambient generic org turn is gated (request 1:1 with USER turn,
COMPLETED, canonical linked). Full otzar regression green. **C1-ext follow-on:** ambient
turns WITHOUT a shared client thread mint a fresh thread each attempt → concurrent/retried
duplicates don't dedup on request_id. Fix = deterministic thread id from sha256(org:actor:
request_id) formatted as a UUID, WITH `createThread` idempotency (verify it's IF-NOT-EXISTS/
P2002-tolerant first) + persistDeferredUserTurn dedup on the stable thread. Gating holds
regardless; only cross-attempt dedup is limited.

### C1 (superseded) — VERIFIED DESIGN (kept for reference)
CRITICAL CONSTRAINT (verified in code): `handleCalendarContinuity` → `findActorPendingProposals` SCOPES pending-obligation lookup to the passed `conversation_id` when present, else falls to ACTOR+ORG recency. Therefore the USER-turn thread (for durability + request record) MUST stay decoupled from the `conversation_id` passed to continuity: for deferred NON-mutating turns (disambiguate / clarify_past / generic), persist the USER turn to a minted thread + gate, but STILL pass `undefined` (recency) as continuity's `conversation_id` — else ambient confirm/ordinal/revise breaks and #620 recurs. Steps: (a) after the Phase-B mutating block, add a branch `if (turnCtx.deferred && orgEntityId!==null && requestLease===null)`: mint `ambientThreadId=randomUUID()`, `createThread`, `persistDeferredUserTurn(ambientThreadId)` → `ambientUserTurnId`, `openRequestGate` → `requestLease`; keep `ambientContinuityConvId` = `resolution.continuity_conversation_id` (undefined for non-mutating) so continuity stays org-wide. (b) Route `ambientThreadId` into the LLM path's conversation resolution (replace the mint at ~line 1457 for deferred-org) and into the continuity block's persist target, so the assistant turn + finalize use the same thread + the now-non-null `requestLease`. (c) Remove the late `ambientUserTurnId ?? persistDeferredUserTurn(...)` fallbacks (turn is now always pre-persisted for deferred-org). (d) Generate a server logical request identity for null client `request_id` (C4) — a request record already exists 1:1 with the USER turn; document that cross-network retry dedup needs the client key. TESTS: two concurrent ambient generic duplicates (same request_id) → one USER turn/one request/one winner; ambient generic claimed BEFORE the model call; disambiguate + clarify_past each produce a request record; a #620 REGRESSION test (two separate ambient proposals stay in separate threads; a later "the first one" still disambiguates across BOTH). Then C2/C3/C5/C6/C7 per below.

**C1 (original note) — Request-gate EVERY org-scoped accepted path (highest priority).**
Today `requestLease` is set only on supplied-id + ambient-mutating. Ungated: ambient
non-mutating continuity (disambiguate/clarify), ambient-generic (LLM fallback), and any
org path reaching persist/model with `requestLease===null`. Design: for the deferred
(ambient) branch, resolve a thread + persist the USER turn + `openRequestGate` BEFORE
`handleCalendarContinuity` and BEFORE the LLM — NOT after. The #620/#621 recency
behavior is about which THREAD continuity resolves, which is separable from making the
USER turn durable + claiming the request. Concretely: after the Phase-B block, if
`turnCtx.deferred && orgEntityId!==null && requestLease===null`, resolve the ambient
target thread (reuse `resolveContinuityThread`'s recency resolution WITHOUT forcing a
new proposal thread), persist the USER turn there, then `openRequestGate`. Then remove
the late per-path `persistDeferredUserTurn` calls in the continuity + LLM branches (they
become the already-persisted `ambientUserTurnId`). Add wiring tests: two concurrent
ambient duplicates (same request_id) → one USER turn / one request / one winner; ambient
generic LLM path claimed before the model call.

**⚠️ C2↔C5 COUPLING — CONFIRMED (do NOT ship a naive C2 alone).** Evidence: `openRequestGate`
(otzar.service.ts ~2049) replays ONLY when `request.state==='COMPLETED'` AND
`canonical_assistant_turn_id!==null`. If a continuity ACTION already executed (proposal
created/executed via the `claimProposalForExecution` CAS) and only the assistant-turn
persist fails, a naive C2 (abort→FAILED_RETRYABLE→return failure) makes the retry reclaim
+ re-enter `handleCalendarContinuity`, which now finds NO pending proposal (it's executed)
→ falls through to the generic LLM → WRONG response. So C2 for the continuity path REQUIRES
action-aware reconstruction (C5/#4): (a) persist `action_ref` onto the request record at
mutation time (partial update, before the assistant turn), (b) add a `reconstructFromAction`
path (rebuild the response from the durable ledger status via `action_ref`, like
`reconstructFromAssistantTurn` already does), (c) extend `openRequestGate` replay to
reconstruct from `action_ref` when the request has one even if NOT COMPLETED. THEN C2 is
safe: continuity path → abort FAILED_RETRYABLE + store action_ref → retry reconstructs from
the action WITHOUT re-executing; LLM path (no action) → abort FAILED_RETRYABLE → retry
regenerates (exclusive ownership prevents dup USER turns/actions). Ship C2+C5 as ONE PR.
Route maps to add `OTZAR_ASSISTANT_TURN_PERSIST_FAILED`: otzar.routes.ts ~78 +
otzar-voice-ready.routes.ts ~90 (alongside OTZAR_TURN_PERSIST_FAILED → retryable/503).

**C2 — Strict assistant durability (§6).** Replace best-effort assistant persistence:
if `persistAssistantTurn` fails BEFORE the provider result is durable, return a real
failure `OTZAR_ASSISTANT_TURN_PERSIST_FAILED` + `abortRequest(lease, false, ...)`
(FAILED_RETRYABLE). For a POST-provider persist failure on a pure-LLM answer (no durable
action to reconstruct from), the honest ceiling is: retry re-invokes the provider — but
for an ACTION turn, reconstruct from `action_ref`/ledger status without provider replay
(already implemented in `reconstructFromAssistantTurn`; extend `openRequestGate`'s
replay to also reconstruct from action state when the canonical assistant turn is
missing but the request is COMPLETED-with-action). Add the failure code to the
OtzarFailure union + both route maps.

**C3 — Atomic canonical completion (§6, one transaction).** Wrap the
`response_to_turn_id` set + `completeRequest` in a single `prisma.$transaction`. Do NOT
`.catch(() => undefined)` a uniqueness/finalization failure — a `response_to_turn_id`
@unique clash means a second assistant turn raced; surface it (distinct log + leave the
request non-COMPLETED so a retry reconciles). Add a test injecting a finalization
failure → request not COMPLETED → retry reconciles.

**C4 — Null/absent client `request_id` (§ older-client).** A request record already
exists 1:1 with the USER turn (via `createOrGetRequest` on `user_turn_id`) even without
a client key — but STRONG concurrency dedup needs the client `request_id` (the USER-turn
dedup is keyed on it). Document this ceiling honestly in code; CT already sends one (§11)
so real clients are covered. Optionally: for null client keys, derive a per-turn logical
id so the request is still queryable by a stable handle.

**C5 — Exact continuity snapshot (§4-§5).** Replace broad Phase-A output with a typed
read-only snapshot (candidate action IDs + versions, normalized proposal args, lease
identity). Lease-bound atomic `commitCalendarContinuity` verifying request state/version
+ candidate status/version via CAS; stale → `OTZAR_CONTINUITY_STATE_CHANGED`, no
mutation. NOTE: the proposal-level CAS (`claimProposalForExecution`) already backstops
duplicate EXECUTION (verified) — C5 adds explicit version/state verification + the
typed snapshot, not a new execution guard.

**C6 — Server thread restoration (§11 remainder).** Add a read API: active/recent thread
+ authorized recent turns + unresolved request/action state; CT restores the active
thread on refresh/login FROM THE SERVER (not localStorage) + two-tab reconcile. Only
claim active-thread restoration once this exists and is proven.

**C7 — Full CT text/voice/ambient parity** using the single `buildConductRequest` helper.

## RESUME ANCHOR — 2026-07-11 (request-spine wired into the hot path)

**SHIPPED + CI-green + merged (FND main `bf868ea`, PR #626):** the request-processing
spine is wired into `conductSession` for the **supplied-id** (CHAT/VOICE) and
**ambient-mutating** paths. Every such accepted org turn now: durable USER turn →
`createOrGetRequest` (1:1) → atomic `claimRequestProcessing` BEFORE any continuity
mutation/LLM/tool/provider → on response, link the ONE canonical assistant turn
(`response_to_turn_id` + `canonical_assistant_turn_id`) + `completeRequest` with a typed
`response_class`. Post-claim early returns transition explicitly:
`INVALID_HISTORY`/`TOKEN_BUDGET_EXCEEDED` → `FAILED_FINAL`; `LLM_UNAVAILABLE` →
`FAILED_RETRYABLE`. `failRequest(final=false)` now RELEASES the lease immediately so a
retry reclaims at once (previously reclaim needed the full 60s TTL). Tests: **§9 real
barrier** (gated provider parks the winner → concurrent duplicate provably sees
PROCESSING → one provider call / one USER turn / one canonical ASSISTANT / one COMPLETED
request; loser replays or is refused) + **§10 failure injection** (provider fails after
claim → FAILED_RETRYABLE → same-`request_id` retry reclaims + succeeds). Turn-wiring 10 +
requests 6 green; unit tier green (only a pre-existing local-env `connector-oauth` case
fails on this box because Slack creds are present; green in clean CI); root typecheck 0.

**COMMITTED LOCALLY, NOT PUSHED (CT `1713cc2`):** §11-§12 CT builder
`src/lib/otzar/conduct-request.ts` (the ONE governed-turn builder — stable `request_id`
+ live IANA `client_timezone`) + `Chat.tsx` mints one `request_id` per submission and
RETAINS it across an explicit Retry (idempotent replay). typecheck + build + lint green.

**DEPLOY-PENDING (needs founder approval — auto-mode classifier gates the specific prod
target):**
- FND Render deploy of `bf868ea`: `POST api.render.com/v1/services/srv-d8t17sm7r5hc73ed5h6g/deploys`
  body `{"commitId":"bf868ea","clearCache":"do_not_clear"}` (Bearer `$RENDER_API_KEY` —
  never printed/committed). autoDeploy is OFF, so prod stays on the prior SHA until run.
- CT push of `1713cc2` to `main` → Render auto-deploys `app.otzar.ai`.
- **§14 live proof is deploy-gated** (must run against the new FND SHA).

**INTERNAL BACKLOG — honestly tracked, NOT claimed complete (do next):**
1. Request-gate the **ambient-non-mutating** (disambiguate/clarify), **ambient-generic**
   (LLM-fallback), and **orgless** paths — currently reach persist/model with
   `requestLease===null` (no request record). Ambient is where webhook-retry duplicates
   happen, so this matters. Gate requires persisting the ambient USER turn + claiming
   BEFORE the LLM, which tensions with the deliberate #620/#621 recency behavior — design
   carefully.
2. §6 strict `OTZAR_ASSISTANT_TURN_PERSIST_FAILED` — assistant-turn persist is currently
   best-effort (null → finalize no-ops → lease decays → retry replays/reprocesses). Make
   a pre-provider persist failure an explicit `FAILED_RETRYABLE` + code.
3. §11 remainder: server thread-restoration READ API (restore active thread on
   refresh/login from the server, not localStorage) + two-tab reconcile.
4. §4-§5 — **VERIFIED SAFE (no work needed):** `claimProposalForExecution` is an atomic
   CAS (`status='EXECUTING' WHERE status='NEEDS_CALLER_CONFIRMATION'`, exactly one
   winner). So if a turn exceeds the 60s request lease mid-provider and a retry reclaims
   the request + re-enters continuity, the proposal-level CAS still admits only ONE
   execution — no double-booking. The request-lease self-heal is backstopped.

## Schema provenance note (request table) — HONEST, unresolved

The prod `otzar_conversation_requests` objects **pre-existed** the governed activation
run (it reported `Before: true`). Investigated and **could not definitively prove** the
mechanism: the Render deploy does NOT auto-push schema (start = `tsx src/server.ts`; the
boot manifest guard is read-only, never `db push`); no earlier activation run appears in
this session's history; the test-DB DDL used `.env.test` (localhost, confirmed, not
prod). The governed script ran WITH the approval phrase and confirmed additive-only +
catalog-correct (22 cols, 4 unique indexes, 0 rows). **Operational note:** add explicit
schema-change AUDIT capture (who/when/how) to every future `activate-*-prod-schema.ts`
run so provenance is always provable. Current prod catalog is verified correct and safe.

### Runtime-wiring plan (§5–§10) — precise, primitives proven + live
`conductSession` integration of the request spine. `userTurnId` is available at three
points that must all route through the request record: `beginTurnPersistence` (supplied
id), Phase B `ambientUserTurnId` (ambient mutating), and the deferred persist in the
continuity/LLM path (ambient non-mutating). UNIFY idempotency onto the request record
(§2 — do not keep the turn `(conversation_id, request_id)` dedup AND the request
`(conversation_id, client_request_id)` dedup as two decisions that can disagree; the
request record is canonical, the turn unique is a backstop). Flow: after the USER turn →
`createOrGetRequest` → `claimRequestProcessing` (loser → replay if COMPLETED via
`canonical_assistant_turn_id`, else `OTZAR_REQUEST_IN_PROGRESS`) → process → on the ONE
canonical assistant turn, set `response_to_turn_id` + `completeRequest(canonical_assistant_turn_id,
response_class)` in one transaction (§6) → durability-gate + action-aware recovery
(§7/§9/§10). Add `OTZAR_REQUEST_IN_PROGRESS` + `OTZAR_ASSISTANT_TURN_PERSIST_FAILED` +
`OTZAR_CONTINUITY_STATE_CHANGED` to the failure union + both route maps. Real barrier
concurrency tests (§9) + failure injection (§10) + CT client contract (§11/§12) + live
race/response-loss proof (§14). Proven primitives (LIVE): `createOrGetRequest`,
`claimRequestProcessing` (atomic CAS, exactly-one-winner), `completeRequest`,
`failRequest`, `getRequestByUserTurn` in `@niov/database`.

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
   wiring 4 + full regression (128). **LIVE-VERIFIED on `084540e`: A–G smoke 18/18,
   turn-proof 9/9 (durable turns `1:USER 2:ASSISTANT…`, human=subject=author / Twin
   author, R1 retry → exactly one user turn + replayed response, contiguous sequence,
   org NOT NULL), zero residue** (smoke-admin swept via the cleanup script — dedicated
   smoke user only; never demo/Meridian).

### Stage 1 CORRECTNESS CLOSURE (founder directive — required invariants, in progress)

- ✅ **§7 explicit foreign-thread errors + §8 accurate source_channel — SHIPPED + LIVE**
  (FND PR #622, merged `383b14d`, deployed, health 200). Foreign/deleted supplied thread
  → typed `OTZAR_THREAD_FORBIDDEN`(403)/`OTZAR_THREAD_CLOSED`(409) (no silent mint, no
  existence leak, integration-proven); `CHAT|VOICE|AMBIENT` carried into every durable
  turn (live DB proof: text route → CHAT lineage). Propose→yes regression spot-check
  green (continuity unaffected). **Live runtime is now `383b14d`.**
  NOTE: `otzar-voice-ready.routes.ts` has its own `statusForCode` that does not yet map
  the new codes (they fall to 400 there) — align it in the next correctness PR.
- ✅ **§1A phase-split (USER turn BEFORE mutation) + voice statusForCode — SHIPPED + LIVE**
  (FND PR #623, merged `cba4d66`, deployed, health 200; **A–G re-verified live 16/16**,
  D past-time correctly skipped at 00:55 EDT — 6am was future; ordinal proven in a clean
  focused live test: "the first one" → Strategy). Live runtime is now `cba4d66`.
  READ-ONLY `resolveContinuityThread` (Phase A: classify
  + resolve target thread, NO write — proven) → conductSession persists the ambient USER
  turn to that thread (Phase B) → `handleCalendarContinuity` mutates (Phase C).
  New-proposal mints a fresh thread id (not written); ordinal runs continuity ambient so
  the index maps across all pending (no #620 pile-up). Voice route `statusForCode` now
  matches text. Tests: read-only + `user.created_at <= proposal.created_at`; 126
  regression green. **A–G re-verified live after deploy (hot-path change).**
- ✅ **§1 fail-closed ambient mutating path — SHIPPED + LIVE** (FND PR #624, `abc5c6a`).
  createThread errors no longer suppressed; a non-durable USER turn → OTZAR_TURN_PERSIST_
  FAILED with ZERO mutation. Live-verified (ambient propose→yes, turns USER-first). §13
  smoke past-time now uses a dynamically-computed guaranteed-past time.
- ✅ **§2–§4 durable request-processing SCHEMA + atomic-claim query layer — SHIPPED + LIVE**
  (FND PR #625, merged `12fce13`, prod schema activated + catalog-verified [22 cols, 4
  unique idx, 0 rows], deployed, clean boot = manifest passed with the request table now
  gating startup). Live runtime is now `12fce13`. Schema-first, still inert (no runtime
  wiring). New
  `OtzarConversationRequest` (state machine + lease + canonical link) +
  `otzar_conversation_turns.response_to_turn_id` unique. `createOrGetRequest` /
  `claimRequestProcessing` (atomic CAS → EXACTLY ONE of 12 concurrent winners, proven) /
  `completeRequest` / `failRequest`. Manifest guards it; approval-gated activation script
  `activate-otzar-conversation-requests-prod-schema.ts`. Integration 6 + manifest 12 green.
- **§1 remaining (deeper split)** — Phase C still calls monolithic
  `handleCalendarContinuity`. A fuller split returns the FULL candidate action-id set
  from Phase A and passes exact candidate identity/version into a
  `commitCalendarContinuity` that atomically revalidates using the §3 request lease.
- **§5-§10 RUNTIME WIRING (the big remaining piece)** — wire the request record into
  conductSession: after the USER turn, `createOrGetRequest` → `claimRequestProcessing`
  (only the lease owner runs Phase C / model / provider; a concurrent duplicate →
  `OTZAR_REQUEST_IN_PROGRESS` or bounded wait/replay) → atomic Phase-C commit with
  candidate revalidation → `completeRequest` linking the ONE canonical assistant turn →
  durability-gated assistant (§9) → action-aware recovery (§10). Concurrency + response-
  lost live proof (§13). Query layer + schema are DONE; this is the conductSession
  integration.
- **§2 durability-gated assistant turn** — `persistAssistantTurn` returns a result, not
  best-effort: fail before any external action → `OTZAR_ASSISTANT_TURN_PERSIST_FAILED`
  (keep user turn); fail AFTER provider success → controlled failure but retain the
  action/provider result; retry reconstructs, never re-executes. Add the code to the
  failure union + route map.
- **§3 durable request-processing state (NEW SCHEMA)** — `OtzarConversationRequest`
  (1:1 with the USER turn) or bounded fields on it: state
  `RECEIVED|PROCESSING|COMPLETED|FAILED_RETRYABLE|FAILED_FINAL`, processing
  lease/version, `assistant_turn_id`, `action_ref`, `response_class`, attempt
  timestamps. Atomic CAS claim; only the owner invokes model/tool/provider; concurrent
  identical → `OTZAR_REQUEST_IN_PROGRESS` or bounded wait; stale lease can't double-
  execute. Contract §→ manifest → ADR-0025 activate → deploy (schema-first).
- **§4 retry recovery inspects action state** — resolve in order: request-processing
  state → linked action → provider attempt/result → assistant turn → then decide if
  regeneration is safe (only via the durable lease). Exact response-lost-after-provider-
  success test.
- **§5 one canonical result per request** — DB-enforced: `response_to_turn_id` unique on
  assistant turns (or `request.assistant_turn_id` unique). Distinguish canonical result
  from follow-up/correction/compensation turns. Concurrency tests: one model call, ≤1
  provider call, one canonical assistant result. (NEW constraint → manifest.)
- **§6 CT client request contract** — find the real CT text/voice/ambient submit
  clients; one `request_id` per logical submission (retained across retry/reconnect/
  timeout), store + send the server `conversation_id` every turn, send IANA tz, restore
  the active thread from the server on refresh/login, localStorage never authoritative.
  CT tests + deploy CT + verify live bundle.
- **§9** smoke turn/thread deletion is OPERATOR-ONLY test teardown (dedicated smoke
  actor) — NOT product Clear/Delete/Retention proof; that is built in P5J lifecycle.
- **§10/§12** full 28-item matrix + live completion gate (CT text submit sends
  request_id+thread_id, retry replays, one USER + one canonical ASSISTANT, no second
  model/provider call, ambient user turn precedes mutation, source_channel correct,
  A–G 18/18, no errors, residue cleaned) before Stage 1 is marked fully closed.

5. **After correctness closure: Deterministic turn-based references** (contract §P5D):
   "what were we talking about", "what did we decide", "continue", "send that",
   "tell him/her", "this/that/it", "the one David mentioned" — resolved BEFORE the LLM,
   in the §P5D
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
