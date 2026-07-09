# Inbound ambient ingestion rail — PREFLIGHT / DESIGN (awaiting GO)

**Status:** Grep-first preflight COMPLETE, 2026-07-09 (Opus 4.8). Inventory across
both repos (FND runtime `95cf937`, CT `95ca323`) via 4 parallel read-only agents.
**No code written. STOP-at-design: implementation needs a separate founder GO** —
the directive requires it, and real STOP conditions fire (Cloud-console setup for
Google webhooks; caller-less org/actor mapping; event-storage product decision).

> Doctrine held throughout: an inbound event is a **signal, not truth**. Every
> signal is authenticated, scoped, deduped, permissioned, audited, and converted
> to a governed change **only after re-fetching from the source** — never by
> trusting the payload. Otzar does not broad-sync or hoard.

---

## 1. What exists (inventory — file:line evidence in the agent findings)

**The outcome/processing side is production-ready and reusable AS-IS:**
- **Source revalidation sink** — `revalidateImportedDocForCaller(callerEntityId,
  ledgerEntryId)` (`services/otzar/document-context.service.ts:335-478`): re-fetches
  from Google, hash-compares, and transitions AVAILABLE / **CHANGED_UPSTREAM**
  (snapshot preserved) / **SOURCE_DELETED** / **ACCESS_REVOKED** / CORRUPT /
  REVALIDATION_UNAVAILABLE (never silently demotes). This is the exact
  "trigger a re-fetch, don't trust the webhook" model.
- **Bounded source-health sweep** — `sourceHealthSweepForCaller`
  (`services/otzar/source-health.service.ts:91-197`): caps at 50 rows, reuses the
  per-doc probe, emits `SOURCE_HEALTH_CHANGED` notification **only on demoted
  docs** (quiet on healthy/transient).
- **Calendar org-autonomy loop** — `calendar-event.service.ts`: `closedRecipientSet`
  (actor + resolved participants + owner) → MEETING WorkLedger row → class-aware
  `fanOutInternalNotifications` (`CALENDAR_EVENT_CREATED/CANCELLED`). Reusable for
  inbound calendar deltas.
- **Ingest spine** — `ingestSourceEvent` (`services/otzar/comms-ingest.service.ts:203`)
  consuming the `WorkSourceEvent` interface (`services/otzar/source-event.ts:42-78`;
  `WEBHOOK` is already an enumerated `sourceSystem`). Org-scoped dedupe key
  `sourceSystem:<id>` via `findCaptureByExternalId(orgEntityId, dedupeKey)`. Lands
  a single `WorkLedgerEntry` (no parallel data lake).
- **Audit + notification vocab are OPEN validated Strings — NO migration to extend**
  (`schema.prisma:328` audit `event_type`; `notification.service.ts:176`
  `notification_class`). `SOURCE_CHANGED_UPSTREAM/DELETED/ACCESS_REVOKED/VERIFIED`,
  `IMPORT_QUARANTINED`, `CALENDAR_EVENT_CREATE/DELETE` audit verbs and the
  `SOURCE_HEALTH_CHANGED`/`CALENDAR_EVENT_*` notification classes **already exist**.
- **OAuth tokens are ORG-scoped + auto-refreshing** —
  `getProviderAccessTokenForOrg({provider, org_entity_id})`
  (`connector-oauth.service.ts:1002`). `drive.readonly` + `calendar.readonly` +
  `calendar.events` are already **granted** per org.
- **Security primitives present:** `verifyInboundHmac` (timing-safe, `sha256=`,
  canonical `${timestamp}.${rawBody}`, ±5-min replay window) — **built but wired to
  no route** (`services/connector/inbound-hmac.ts`); Redis `NonceStore`
  (set/has/delete TTL set, `redis.ts:18-22`); global gateway `onRequest` hook
  (IP allowlist + Redis rate-limit — auto-governs any new route); OAuth signed-state
  JWT w/ 10-min TTL (reference for bearer-less auth); org resolver `getOrgEntityId`.
- **Cron scheduler exists** — `node-cron` + `startScheduler` (`server.ts:918`),
  action/feedback schedulers; NO-OP under test.
- **CT surfaces:** "What changed" panel already exists (`AmbientWorkSurface.tsx`,
  fed by My-Day intelligence); Scheduled lane + FYI-demoted calendar classes +
  ambient cards/edge-glow + presence bus; Security & Audit event-type filter
  auto-populates from the label map (SOURCE_*/CALENDAR_* already filterable);
  bounded polling (30–90s) already pervasive.

## 2. What is missing (the entire inbound half is greenfield)

- **No inbound webhook route** anywhere; no raw-body content-type parser (so
  `verifyInboundHmac` literally cannot verify a real payload today).
- **No generic inbound-events table** (WorkSourceEvent is a runtime interface).
- **No durable queue/worker** (BullMQ) — only cron; request handling is inline.
- **No Google watch/push/channel** (Drive `files.watch`, Calendar `events.watch`),
  **no channel→org resolver**, no channel-renewal loop, no Calendar `syncToken`.
- **Dedupe is a non-atomic check-then-insert** — `MeetingCapture` has no
  `@@unique(org_entity_id, provider_meeting_id)`, so concurrent identical deliveries
  can double-insert (contrast `ActionAttempt.idempotency_key @unique`).
- **No single-use replay defense** (only the ±5-min window; the NonceStore is not
  composed for inbound).
- **No governed non-human actor** for caller-less processing (every sink needs a
  `callerEntityId` for scope + audit).
- **CT: no proactive source-changed surface** — source integrity is audit-only
  (retrospective); no "your source changed, recheck it" card; no content-recheck
  control (only OAuth connection re-verify).

## 3. Root questions — answers

| # | Question | Answer |
|---|---|---|
| 1 | Inbound webhook endpoints exist? | **No.** OAuth callback is a GET auth'd by signed-state JWT; `verifyInboundHmac` unused. |
| 2 | Generic inbound events table? | **No.** Sink = `WorkLedgerEntry`/`MeetingCapture`/`AuditEvent`. |
| 3 | Queue/job runner? | **Cron yes** (node-cron); **durable queue no**; handling inline. |
| 4 | Idempotency/dedupe infra? | `sourceDedupeKey` + org-pinned lookup — but **non-atomic** (no unique constraint). |
| 5 | Signature-verification infra? | **`verifyInboundHmac` exists** (unused) + OAuth signed-state. Replay = window, not single-use. |
| 6 | Creds scoped to org/user? | **Org-scoped**, auto-refresh (`getProviderAccessTokenForOrg`). |
| 7 | Map provider event → org safely? | Token layer **yes**; reverse index (channel/resource→org) **not built**; must come from verified `ConnectorBinding`, never the payload. |
| 8 | Drive push needs channel/watch? | **Yes** — `files.watch` + Pub/Sub + domain-verified HTTPS callback (Cloud console) + ≤7-day renewal. Scope OK. |
| 9 | Calendar watch needs channel/watch? | **Yes** — `events.watch` + `syncToken` follow-up pull + renewal. Scope OK. |
| 10 | Meet transcript events? | **No** — post-meeting pull only; honest `SCOPE_REAUTH_REQUIRED`/`NO_TRANSCRIPT`. |
| 11 | Dashboard/domain setup required? | **Yes for real Google webhooks** (Cloud-console callback + Pub/Sub topic). |
| 12 | Inbound without schema? | **Yes** for the cron-recheck + internal-signed slices (reuse sink + Redis + open-string vocab). |
| 13 | Minimal schema if required? | Additive: `@@unique(org, provider_meeting_id)` for atomic dedupe, and/or a `WatchChannel(channel_id, resource_id, org_entity_id, expires_at)` table for real webhooks. No destructive ops. |
| 14 | How events → context? | Drive → `revalidateImportedDocForCaller` → existing SOURCE_* audit + demote + quiet notify. Calendar → `closedRecipientSet` + MEETING ledger + fan-out. **Schema-free.** |
| 15 | Avoid spam/noise? | Emitters notify only on real change (skip AVAILABLE/transient); FYI classes demoted from "Needs you"; closed recipient set; per-resource not broad-sweep. |
| 16 | Prevent spoofing/replay/cross-org? | HMAC + **single-use Redis nonce** (must wire) + org from **verified binding** (not payload) + rate-limit + audit; re-fetch don't trust; no raw payload in UI. |

## 4. Inbound event model (Phase 1)

Logical envelope (maps onto the existing `WorkSourceEvent` interface + audit; a
durable `InboundEvent` table is a **product decision**, see §7):

`inbound_event_id · org_entity_id · provider · provider_event_id · provider_resource_id ·
event_type · event_time · received_at · source_actor(if any) · signature_verified ·
dedupe_key · payload_hash · processing_status · processing_result ·
scoped_subject{document|calendar_event|meeting_transcript|approval|communication|connector} ·
permission_envelope · audit_id`

States: `RECEIVED → AUTHENTICATED → DEDUPED → {IGNORED_NOOP | NEEDS_REVALIDATION →
PROCESSED} | QUARANTINED | FAILED | REPLAY_REJECTED`.

Rules (all honored by the recommended slices): raw payload never auto-trusted and
never broadly exposed in UI; forensic metadata preserved via audit; **dedupe before
processing** (atomic Redis SETNX, §6); every event maps to exactly one org **or is
quarantined**; a source signal triggers a **re-fetch/revalidation using the org's
existing token**, never trusts the payload as truth.

## 5. Provider feasibility

- **Google Drive (real push): 🛑 STOP.** Scope (`drive.readonly`) is already granted
  — no re-consent — but needs a `files.watch` channel + Pub/Sub topic + a
  **domain-verified HTTPS callback registered in the Cloud console** + a channel
  renewal loop (≤7 days) + a `channel→org` table. Dashboard + schema = STOP.
  Interim: **cron bounded recheck** (Slice 1) delivers the same detection safely.
- **Google Calendar (real watch): 🛑 STOP.** `calendar.readonly` granted; needs
  `events.watch` + `syncToken` machinery (absent) + renewal + `channel→org`. Same
  STOP. Interim: cron freebusy/context recheck of the caller's known meetings.
- **Google Meet: 🛑 BLOCKED (external).** No transcript events — post-meeting pull
  only, honestly surfaced as `SCOPE_REAUTH_REQUIRED`/`NO_TRANSCRIPT`. Keep the
  honest branch; document. If later available: selected transcript import with
  lineage + participant permission envelope + decision-rights action extraction; no
  fabrication. Out of scope now.
- **Future (Slack Events API / Gmail push / CRM):** fit the same inbound envelope;
  each needs its own signature model + dashboard app config. Not now.

## 6. Security model

Required for ANY real inbound path (built or reused):
- **HMAC signature verification** — reuse `verifyInboundHmac` (per-binding secret
  via `secret_ref`, never `process.env` in the verifier). Needs a **raw-body
  parser** (scoped to the inbound route only, so JSON parsing elsewhere is
  untouched).
- **Single-use replay defense** — the ±5-min window is NOT enough; **consume the
  signature/nonce in Redis (SETNX + TTL)** so a replay within the window is
  rejected.
- **Atomic dedupe** — **Redis SETNX** on `org:dedupe_key` (no migration), NOT the
  racy check-then-insert; OR add `@@unique(org, provider_meeting_id)` (schema).
- **Org pinned from the VERIFIED binding**, never from the payload; ambiguous →
  QUARANTINE, do not process.
- **Governed non-human actor (THE crux):** the sink needs a `callerEntityId` for
  scope + audit. Name a **designated org service/admin actor** — for the cron slice,
  iterate per-org and act as the org's system actor; for webhooks, resolve actor +
  org from the `ConnectorBinding`. This is a **product decision** (which actor,
  what audit attribution) — part of why we STOP for GO.
- **Amplification bounding:** an event that triggers an outbound Google re-fetch
  must be **per-resource debounced/coalesced + per-org rate-bounded** so a burst of
  signed events cannot exhaust the org's Google quota. (The cron slice sidesteps
  this — idempotent + self-bounded at ≤50/org.)
- **Rate-limit:** the global gateway auto-governs a new route; add an explicit
  IP-scoped policy entry for the unauthenticated inbound op.
- Audit every stage; no secrets/tokens/raw payload in logs or employee UI; no
  direct-DB writes outside the rails; no broad sync.

Audit verbs: reuse existing `SOURCE_CHANGED_UPSTREAM/DELETED/ACCESS_REVOKED/VERIFIED`
+ `CALENDAR_EVENT_CREATE/DELETE`. A distinct `INBOUND_SIGNAL_RECEIVED/AUTHENTICATED/
PROCESSED/QUARANTINED/REPLAY_REJECTED` set is **additive TS-only, no migration** if
we want an explicit inbound trace.

## 7. Schema decision

- **Slice 1 (cron recheck) and Slice 2 (internal signed rail): SCHEMA-FREE** — reuse
  `WorkLedgerEntry`/`MeetingCapture` + Redis SETNX dedupe/replay + open-string
  audit/notification vocab.
- **Slice 3 (real Google webhooks): SCHEMA required** — a `WatchChannel` table
  (`channel_id`, `resource_id`, `org_entity_id`, `expires_at`) for channel→org
  resolution, and (recommended) `@@unique(org, provider_meeting_id)` for atomic
  dedupe. All additive. → **STOP / product decision.**
- **Durable `InboundEvent` forensic table:** optional. Reusing audit + ledger is
  schema-free; a dedicated table is a **product decision** (retention, forensics
  depth) → recommend deciding at GO, not defaulting.

## 8. UX / ORGX mapping

- **What Changed** (exists) — host inbound source/calendar change summaries.
- **Needs You** (exists) — only when human action required (a PROPOSED action or an
  action-required notification); FYI stays quiet.
- **Notifications** — scoped to affected humans via the existing closed-set fan-out;
  quiet on no-op.
- **Action Center / Scheduled lane** (exists, read-only) — inbound calendar deltas
  update MEETING rows.
- **Security & Audit** (exists) — forensic inbound trace; `INBOUND_*` rows
  auto-render via the sentence-case fallback, filterable once added to the label map.
- **Data & Knowledge** (NEW surface, optional follow-on) — a proactive per-source
  "changed upstream — using last verified snapshot until reviewed" badge + a
  "recheck source" control (today source integrity is audit-only).

Copy (approved doctrine): "This source changed upstream. Otzar is using the last
verified snapshot until it is reviewed." · "The calendar event changed. Affected
attendees were notified." · "A transcript may be available, but Otzar cannot access
Meet transcripts yet." · "No action needed — source verified." · "Approval needed
before this external signal can affect project truth."

## 9. Test plan (per slice)

- **Slice 1 (cron recheck):** FND integration — a stale/changed/deleted imported doc
  → cron tick → correct SOURCE_* transition + demote + single quiet notification;
  healthy doc → no notification; transient → no demotion; per-org bounded ≤50;
  idempotent across ticks. CT — the new source-changed surface renders the demoted
  state + "last verified snapshot" copy. Live: on Meridian, verified read-only
  (no account/data mutation; the sweep already exists and is proven).
- **Slice 2 (internal signed rail):** FND integration — signed event verifies (good
  sig 200, bad sig 401, replay within window rejected via nonce, missing raw body
  fails closed); org resolved from binding, ambiguous → QUARANTINE; event → correct
  sink call; full audit chain; cross-org signed event rejected. No live (synthetic).
- **Slice 3 (webhooks):** deferred with the schema/dashboard work.

## 10. Implementation options / recommended first slice

**Slice 1 — Cron-driven bounded per-org source recheck 🟢 RECOMMENDED FIRST.**
Real ambient value *now* (source-change detection is the confirmed CT gap). Reuses
`sourceHealthSweepForCaller`/`revalidateImportedDocForCaller` on a `node-cron` tick,
per-org, bounded ≤50, quiet on no-op. **Zero new attack surface, no webhook secret,
no raw-body parser, schema-free.** Only real design decisions: the governed
per-org system actor + the tick cadence/bounding + the optional CT source-changed
surface. Ships the detection+notification the UI lacks today.

**Slice 2 — Internal HMAC-signed inbound event rail (prove the webhook model).**
A bearer-less `POST /otzar/inbound/signal` wired to `verifyInboundHmac` + raw-body
parser + Redis single-use nonce + org-from-signed-payload/binding, mapping to the
existing sink. Ships **no real external behavior** (its only real source — Google
webhooks — is STOP'd), so it processes synthetic/internal test events. Worth doing
**only when** someone will do the Slice-3 Cloud-console + schema work for real
webhooks. New inbound attack surface + a webhook secret + boot-validation entry ⇒
needs explicit GO.

**Slice 3 — Real Google Drive/Calendar webhooks 🛑 STOP (dashboard + schema).**
Cloud-console domain-verified callback + Pub/Sub + `WatchChannel` schema + channel
renewal + `syncToken`. Requires a founder dashboard action and a migration.

## 11. Deployment sequence

Foundation-first per cross-repo discipline. Slice 1: FND `[INBOUND-RECHECK]`
(cron job + per-org actor + tests) → PR/CI/squash/deploy → then CT source-changed
surface (optional) → deploy → Meridian read-only live-verify. Slice 2/3 sequence
only after their own GO.

## 12. Stop conditions (which fire)

- Schema required → **fires for Slice 3** (WatchChannel), not for Slice 1/2.
- Google webhook/dashboard setup required → **fires for Slice 3.**
- Provider signature/channel model unclear → clear for internal HMAC (Slice 2);
  **the Google channel model requires Cloud-console setup (Slice 3).**
- Org mapping unclear → clear for cron (per-org iteration) and internal-signed
  (verified binding); the webhook `channel→org` resolver is **net-new (Slice 3).**
- Queue/job runner missing → cron exists (Slice 1 fine); durable retry queue absent
  (only matters for high-volume webhooks).
- Event storage model requires product decision → **fires** (durable `InboundEvent`
  table vs reuse) — a GO-gate decision.

**Net: STOP at design. Recommend Slice 1 as the first implementation, on a separate
GO.**
