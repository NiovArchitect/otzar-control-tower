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
| 8 | Drive push needs channel/watch? | **Yes** — `changes.watch`/`files.watch` `web_hook` channel → **domain-verified HTTPS callback directly** (⚠️ **no Pub/Sub** — corrected 2026-07-09 vs Google docs; Pub/Sub is Gmail-only) + ≤7-day renewal + `changes.list` page token. Scope OK. |
| 9 | Calendar watch needs channel/watch? | **Yes** — `events.watch` + `syncToken` follow-up pull + renewal. Scope OK. |
| 10 | Meet transcript events? | **No** — post-meeting pull only; honest `SCOPE_REAUTH_REQUIRED`/`NO_TRANSCRIPT`. |
| 11 | Dashboard/domain setup required? | **Yes for real Google webhooks** (domain-verified HTTPS callback in Search Console / Cloud Console; ⚠️ **no Pub/Sub topic** — corrected 2026-07-09). |
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
  — no re-consent — but needs a `changes.watch`/`files.watch` **`web_hook` channel
  posting directly to a domain-verified HTTPS callback** (⚠️ **no Pub/Sub** —
  corrected 2026-07-09 vs Google docs; Pub/Sub is Gmail-only) + a channel renewal
  loop (≤7 days) + a `channel→org` table + a `changes.list` page-token cursor.
  Dashboard (domain verify) + schema = STOP.
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

**Slice 1 — Cron-driven bounded per-org source recheck ✅ SHIPPED + LIVE (FND
`1d63b66`, 2026-07-09).** Implemented exactly as designed: fail-closed
`SOURCE_RECHECK_TARGETS` allowlist, governed ACTIVE actor + actor→org guard,
bounded, transition-gated audit + notification (no SOURCE_VERIFIED spam), reusing
`sourceHealthSweepForCaller`/`revalidateImportedDocForCaller`; node-cron daily;
ops `POST /drive/docs/recheck-run` (admin, own-org). Tests `source-recheck.test.ts`
(9) + regression (6), 5 CI checks green (PR #601); live recheck-run 200 + quiet +
zero residue on Meridian. **ENABLED for Meridian only (2026-07-09, ops config):**
`SOURCE_RECHECK_TARGETS` = Meridian sim org : ACTIVE admin actor on the FND Render
env (single target, demo org NOT listed), re-read via same-SHA redeploy `c550d30`;
CRON/MAX at defaults (daily 03:00, ≤10). (Original recommendation below.)
Real ambient value *now* (source-change detection is the confirmed CT gap). Reuses
`sourceHealthSweepForCaller`/`revalidateImportedDocForCaller` on a `node-cron` tick,
per-org, bounded ≤50, quiet on no-op. **Zero new attack surface, no webhook secret,
no raw-body parser, schema-free.** Only real design decisions: the governed
per-org system actor + the tick cadence/bounding + the optional CT source-changed
surface. Ships the detection+notification the UI lacks today.

**Slice 2 — Internal HMAC-signed inbound event rail ✅ SHIPPED + LIVE (FND
`2c8b8de`, 2026-07-09).** `POST /api/v1/otzar/inbound/signal` — bearer-less, HMAC
over the raw body is the SOLE auth (route-scoped raw parser via a custom
content-type `application/otzar-signal`, so global JSON is untouched). Single-use
Redis nonce (anti-replay) + per-resource debounce/dedupe (dedupe persists only on a
definitive result — a transient sink releases it) + per-org quota. Org/actor from
the fail-closed `SOURCE_RECHECK_TARGETS` allowlist (NOT the payload) + actor
ACTIVE + `getOrgEntityId(actor)===org`; demo org structurally untargetable.
`source_*` → `revalidateImportedDocForCaller` (re-fetch, never imports from a
signal); `calendar_*` → quarantine-deferred; unknown → quarantine. Additive audit
vocab (no migration); `INBOUND_SIGNAL_SECRET` optional (fail-closed at the route).
Tests: `inbound-signal.test.ts` (18) + regression (38); PR #604. Live synthetic
proof on Meridian: valid→202, bad-sig→401, replay→409, no-source→202-quarantine,
unlisted-org→403 — no demo touch, no leak, no business-data or source mutation (only
the expected audit evidence was written). **This is a synthetic
internal rail — no real external events flow yet** (its only real source, Google
webhooks, is Slice 3 / STOP).

### Slice 3 preflight — Real Google Drive/Calendar webhooks — 🛑 STOP (dashboard + schema)

**Verdict: BLOCKED — do not implement.** The stop conditions "Cloud-console /
domain callback setup required" and "schema migration required" both fire. The
processing model is already proven (Slices 1–2); what remains is external-provider +
schema work that only a human/founder can do. Exact checklist:

> **Note (corrected 2026-07-09 vs. Google's live docs):** Drive push does **NOT**
> use Cloud Pub/Sub. Drive `changes.watch`/`files.watch` **and** Calendar
> `events.watch` both use the same **`web_hook` push channel** — you register a
> channel with `type:"web_hook"` + `address:<your HTTPS callback>` and Google POSTs
> notifications directly to that verified URL. (Cloud Pub/Sub is a **Gmail-API**
> requirement — `users.watch` → topic — not Drive/Calendar.) So there is **no
> Pub/Sub topic, subscription, or `pubsub.publisher` grant to create** for this
> slice.

1. **Google Cloud Console setup (founder/human action):** in the project owning the
   OAuth client (`GOOGLE_OAUTH_CLIENT_ID`), no API-enable step beyond the
   already-enabled Drive + Calendar APIs is needed — the work is registering
   `web_hook` **watch channels** (below) pointing at a verified HTTPS callback. Both
   providers deliver directly to that callback; no Pub/Sub.
2. **Domain / callback verification:** the webhook callback host (e.g.
   `https://api.otzar.ai/api/v1/otzar/inbound/google/...`) must be a **verified
   domain** in Google Search Console / Cloud Console (Google refuses to register a
   `web_hook` channel to an unverified callback) with a valid (non-self-signed) SSL
   cert. This is a one-time DNS/site-verification action.
3. **Watch-channel registration (replaces the old "Pub/Sub" step):** call
   `drive.changes.watch` (or `files.watch`) and `calendar.events.watch` with a
   Channel `{ id, type:"web_hook", address:<callback URL>, token:<per-channel
   secret> }`. Persist the returned `id`/`resourceId`/`expiration` in `WatchChannel`
   (below). This is a code action taken **after** the domain is verified; it is not
   a console-only step.
4. **Required callback URL:** a new bearer-less route (reuse the Slice-2 pattern).
   Authenticate the notification via the **`X-Goog-Channel-Token`** you set at
   watch-creation (same mechanism for BOTH Drive and Calendar — no Pub/Sub JWT
   involved) plus the `X-Goog-*` headers. It must be reachable over verified HTTPS.
5. **Required schema (additive migration — a STOP):** a `WatchChannel` table:
   `channel_id` (PK), `resource_id`, `provider` (GOOGLE_DRIVE|GOOGLE_CALENDAR),
   `org_entity_id`, `actor_entity_id` (or `binding_id`), `channel_token`,
   `expiration` (ms), `renewal_status`, and a **provider-specific incremental
   cursor**: Drive uses a **page token** (`startPageToken`/`pageToken` via
   `changes.list`) and Calendar uses a **`sync_token`** (`events.list` syncToken) —
   store both columns (`drive_page_token`, `calendar_sync_token`) or one nullable
   `cursor` + a `cursor_kind`. This is the **channel→org resolver** (Slice 2 uses
   the allowlist; real webhooks carry only a channel id / resource id + token, so the
   org MUST be resolved from this row written at watch-creation).
6. **Channel renewal design:** `web_hook` channels expire (Drive/Calendar typically
   ≤7 days; Google returns `expiration`). A `node-cron` job (reuse the Slice-1
   scheduler pattern) re-`watch`es channels approaching expiry and re-persists the
   new `channel_id`/`expiration`; a failed renewal marks `renewal_status=STALE` and
   falls back to the Slice-1 cron recheck.
7. **Header→binding→org mapping:** on a notification, read `X-Goog-Channel-Id` /
   `X-Goog-Resource-Id` / `X-Goog-Resource-State` / `X-Goog-Channel-Token` (same
   headers for Drive and Calendar) → verify the token → look up `WatchChannel` →
   resolve org/actor → then reuse the Slice-2 processing (verify → dedupe →
   revalidate). Never trust the notification body.
8. **Expired/revoked channels:** `X-Goog-Resource-State: sync` (handshake) is a
   no-op; a 404/`SOURCE_DELETED` on re-fetch demotes the source; a channel whose
   `WatchChannel` row is gone → quarantine + a renewal attempt.
9. **Avoid broad sync:** a Drive change notification says only "something changed" —
   call `changes.list` with the stored **page token** to get exactly the changed
   file ids, resolve to the specific imported doc(s), and revalidate ONLY those
   (Calendar `events.list` with the stored **syncToken** returns only changed
   events). Never list/crawl all of Drive.
10. **Testing without the demo org:** watch-registration is per-resource + the
    `WatchChannel` row is org-scoped; integration-test the header→token→org mapping +
    cursor advance + renewal with injected fixtures (no real Google), and live-verify
    on Meridian only after the founder completes steps 1–2. The demo org is never
    watched.

**Exact next human action to unblock Slice 3:** (a) verify `api.otzar.ai` as a
domain in Google Search Console / Cloud Console (with a valid SSL cert); (b) approve
the additive `WatchChannel` schema migration; (c) then the engineering work is to
register `web_hook` watch channels + build the bearer-less callback route. **No
Pub/Sub topic/subscription is required** (that was a Gmail-only assumption, now
corrected). Until (a)–(b) are done, Slice 3 stays STOP'd and the Slice-1 cron +
Slice-2 signed rail cover ambient detection.

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
