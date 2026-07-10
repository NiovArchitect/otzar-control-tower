# Otzar Inbound Ambient — Slice 3 Technical Contract **V2** (Real Google Drive/Calendar Webhooks)

> **STATUS: DESIGN-ONLY · REVIEW-READY · NOT IMPLEMENTED · NOT APPROVED · NOT APPLIED**
>
> **No code, schema, migration, `db push`, Render change, Google Cloud/Search-Console
> action, secret, or deployment has been performed.** This is the implementation-ready
> contract to be reviewed and explicitly approved by the founder *before* any Slice-3 code.
> Author: Opus 4.8, 2026-07-09. Grounded against Foundation `main` (`b92da46`) by read-only
> reconnaissance — every consumed symbol is a real, cited primitive.
>
> **V2 changes vs V1** (correction pass): (1) real Google callback transport (zero-byte
> body, header-driven, no Slice-2 raw-body HMAC); (2) **two-table split**
> `WatchSubscription`(cursor+lease) + `WatchChannel`(delivery instance); (3) exact-credential
> binding + the **account-identity prerequisite**; (4) source-lineage gap; (5) correct
> `nextPageToken`/`newStartPageToken` cursor semantics + crash-recovery; (6) **honest
> transaction boundaries** (the sink is not tx-composable today → lease + idempotent replay);
> (7) initial-sync/registration race; (8) bounded chunked reconciliation on cursor loss;
> (9) DB-enforced concurrency/uniqueness; (10) expanded threat/test matrix; (11) **revised,
> un-softened verdict.**
>
> Prereqs shipped + live: **Slice 1** (cron per-org source recheck, FND `1d63b66`), **Slice
> 2** (internal HMAC-signed rail, FND `2c8b8de`).

---

## 0. Correction carried from the Slice-2 closeout
"Zero residue" was replaced everywhere with the exact claim: **"No business-data or source
mutation; only the expected audit evidence was written."** Slice 3 holds to the same standard.

---

## 1. Design summary + load-bearing decisions

| # | Decision | Grounded reason |
|---|----------|-----------------|
| **D1** | **Drive v1 = `changes.watch`** (one logical subscription per org Google connection), NOT `files.watch`. On a notification, `changes.list` returns a **bounded change delta** intersected against the org's imported source set (a filter, not a crawl). | **Verified vs Google docs (2026-07-09):** `changes.watch`+`changes.list` is Google's reliable mechanism for Doc **content** edits; `files.watch` does not reliably fire on content edits. `changes.list` is a change delta, not a `files.list` enumeration. |
| **D2** | **Two tables:** `WatchSubscription` (the logical governed watch + the **authoritative cursor** + the processing **lease**) and `WatchChannel` (an **ephemeral, expiring Google delivery instance**). Many channels may point at one subscription during renewal overlap. | Renewal produces two live Google channels that must share **one** cursor. A cursor copied into two channel rows diverges / loses updates. The cursor is a property of the *logical watch*, not of any single expiring delivery channel. This split also makes a real DB `@@unique` scope key expressible (§3, §9). |
| **D3** | **Real Calendar webhooks = HARD STOP** (product/security decision **OD-1**). | The only sealed-token calendar read is `getCalendarFreeBusyForOrg` — busy intervals, **no event content**; there is no wired sealed-token `events.list` content read, and a `syncToken` 410 forces a full calendar resync (broad-sync violation). Same boundary Slice 2 already draws. |
| **D4** | **One subscription + one channel table + Redis for delivery dedupe** — NOT a durable inbound-payload warehouse. A small processing **lease/checkpoint** lives on the subscription row only. | A durable per-delivery table drifts toward the forbidden "general-purpose InboundEvent warehouse." Delivery dedupe reuses the Slice-2 Redis `claimOnce`. |
| **D5** | **Channel token stored as a keyed HMAC hash** (`HMAC-SHA256(token, WATCH_CHANNEL_TOKEN_HMAC_KEY)`), constant-time compared; never plaintext, never a sealed token. | Google echoes the token in `X-Goog-Channel-Token`; we only verify it. A keyed hash needs no decrypt path and leaks nothing at rest. Pattern exists (`createHmac`+`timingSafeEqual`, `inbound-hmac.ts`). |
| **D6** | **Exact-credential anchor = `integration_credential_id`** (→ `IntegrationCredential.credential_id`), NOT `connector_binding_id`. | **Verified:** the Google OAuth flow creates **no `ConnectorBinding`** — the connection is an `IntegrationCredential` (`@@unique([org, tool])`). `connector_binding_id` would dangle. |
| **D7** | Cursor safety = **subscription lease + idempotent page replay**, NOT one atomic transaction. | **Verified:** `revalidateImportedDocForCaller` accepts no `tx` and writes ledger-update + audit as two independent writes — it cannot join a transaction with a cursor-advance today (§6). |

**Registration authority = the Slice-1 allowlist** (`SOURCE_RECHECK_TARGETS`). Demo org is
never listed ⇒ **structurally ineligible for watch registration**. The webhook carries no
actor; the subscription supplies the governed ACTIVE org-admin actor the sinks require.

**Verdict pointer:** Slice 3 Drive is **NOT a clean GO** — see §11. It is **READY ONLY AFTER
an account-identity prerequisite** (or an explicit, documented founder risk-acceptance),
because a silent Google-account swap is currently undetectable and would cause spurious mass
source demotion (§9, §11).

---

## 2. Foundation reality this contract consumes (grounded)

| Concern | Real symbol · file | Shape / finding |
|---------|--------------------|-----------------|
| Sealed Google token | `getProviderAccessTokenForOrg({provider:"GOOGLE_WORKSPACE", org_entity_id})` · `connector-oauth.service.ts:1002` → `loadEnvelope` `:684` | Keyed by **`(org_entity_id, tool)` only** (`integrationCredential.findUnique` `org_entity_id_tool`). **No binding_id / credential_id selector exists.** |
| Credential store | `IntegrationCredential` · `schema.prisma:1829` | `@@unique([org_entity_id, tool])` ⇒ **exactly one Google credential row per org**; a second connect **upserts** over it. Sealed token in `webhook_secret` (AES-GCM). |
| Google account identity | — | **NOT captured anywhere.** `TokenEnvelope` = `{access_token, refresh_token?, token_type?, expires_at?}`; `exchangeCode` never parses `id_token`/`sub`/email/userinfo; `account_label` is Slack-only. **This is the load-bearing gap (§8b, §11).** |
| ConnectorBinding | `ConnectorBinding` · `schema.prisma:2538` | `@@unique([org, type, display_name])` — many per org possible, but **the Google OAuth flow creates none**. No FK to IntegrationCredential. |
| Drive doc pull | `fetchGoogleDocTextForOrg({actor_entity_id, org_entity_id, file_id})` · `connector-data-read.service.ts:492` | Resolves token by `(provider, org)` (`:500`); `actor_entity_id` used only for audit. Account-blind. |
| Drive revalidation sink | `revalidateImportedDocForCaller(callerEntityId, ledgerEntryId, {fetchDocText?, auditMode?})` · `document-context.service.ts:347` | Returns `{ok, ledger_entry_id, state, changed, transitioned}`\|`{ok:false, code}`. **Snapshot-preserving; transient→`REVALIDATION_UNAVAILABLE`, never demotes.** Takes **no `tx`**; does ledger-update (`:479`) + `writeAuditEvent` (`:491`) as **two independent writes** — not atomic. |
| Bulk sink | `sourceHealthSweepForCaller(callerEntityId, opts?, {notifyMode})` · `source-health.service.ts:91` | Caps at `SOURCE_HEALTH_SWEEP_MAX` (**50**), `orderBy created_at desc`; never lists Drive. Chunking past 50 is **not** built (§8, reconcile). |
| Imported source | `WorkLedgerEntry`(DOCUMENT_CONTEXT) · `document-context.service.ts:171` | Lineage = `details.document.external_source = {system, file_id, modified_time, web_view_link, content_sha256}` + `org_entity_id`. **No binding/credential/account/driveId; no My-vs-Shared-Drive.** Ownerless (`provided_by` = NIOV importer entity, not the Google account). |
| Calendar sealed read (only one) | `getCalendarFreeBusyForOrg(...)` · `connector-data-read.service.ts:221` | Busy intervals only — **no event content**. |
| Allowlist | `parseRecheckTargets(process.env.SOURCE_RECHECK_TARGETS)` · `source-recheck.service.ts:75` | `{orgEntityId, actorEntityId}[]`; blank/malformed dropped. |
| Actor ACTIVE + org guard | `entity.findUnique({select:{status}})` + `getOrgEntityId(actor)` · `source-recheck.service.ts:128`, `governance/org.ts:104` | `status==="ACTIVE"` AND `getOrgEntityId(actor)===org`. |
| Audit write | `writeAuditEvent(input, tx?)` · `audit.ts:1523` | **`tx`-composable** (joins caller's interactive tx if provided; else self-transacts). event_type is a validated String (additive, no migration). |
| Row locking | `SELECT … FOR UPDATE SKIP LOCKED` · `action/executor.ts:133` (inside `$transaction(async tx=>…)` `:198`) | Real, idiomatic (ADR-0057 §11). No Prisma `{lock}` API; raw SQL. |
| Advisory lock | `pg_advisory_xact_lock(hashtext($1))` · `audit.ts:1436` | Real, tx-scoped (auto-release at commit). No session-scoped variant used. |
| Non-overlap today | `source-recheck.service.ts:88` `running` boolean | **In-process only, single-instance assumption** (`plan: starter`); no durable/distributed lock. No lease/cursor/job table exists anywhere. |
| Redis dedupe | `NonceStore.claimOnce(key, ttl)` / `incr` · `redis.ts:22` | `SET NX EX` / `INCR`+`EXPIRE`; `MemoryNonceStore` for tests. |
| Rate-limit gateway | `OPERATION_RULES` + `DEFAULT_LIMITS{perMinute,scope}` · `gateway.middleware.ts` | bearer-less ⇒ IP-keyed. |

---

## 3. Schema — two tables

Both follow Foundation conventions (`uuid()@db.Uuid` PKs, raw `org_entity_id @db.Uuid` no
`@relation`, `created_at`/`updated_at`/`revoked_at`, snake_case `@@map`, validated-String
status). References between the two are **id-by-convention** (Foundation does not use Prisma
relations across these models).

### 3.1 `WatchSubscription` — the logical governed watch (owns the cursor + lease)

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `subscription_id` | `String @db.Uuid` | no | `uuid()` | PK. |
| `provider` | `String` | no | — | `"GOOGLE_DRIVE"` (v1) · reserved `"GOOGLE_CALENDAR"`. |
| `org_entity_id` | `String @db.Uuid` | no | — | Authoritative tenant (allowlist at registration). |
| `actor_entity_id` | `String @db.Uuid` | no | — | Governed ACTIVE org-admin actor; supplies the caller the sinks require. Re-checked ACTIVE per callback. |
| `integration_credential_id` | `String @db.Uuid` | no | — | → `IntegrationCredential.credential_id` — the **exact sealed-credential anchor** (D6). |
| `google_account_id` | `String?` | yes | `null` | The connected Google account identity (`sub`/email). **NULL today** — capturing + pinning it is the **prerequisite** (§8b). When present, compared at pull/reconcile; mismatch ⇒ fail-closed. |
| `watched_resource_kind` | `String` | no | — | `"DRIVE_CHANGES"` (v1) · reserved `"CALENDAR"`. |
| `watched_resource_scope` | `String` | no | `"MY_DRIVE"` | Drive change-feed scope. `"MY_DRIVE"` (the user corpus) v1; a **Shared Drive** would be its `driveId` — a **distinct subscription** with its own cursor (§8c). |
| `drive_page_token` | `String?` | yes | `null` | **Committed, durable start cursor** — the resumable position at a clean change-list boundary. Seeded from `changes.getStartPageToken` at registration. Only replaced by `newStartPageToken` after a change list is **fully** consumed (§7). |
| `drive_continuation_token` | `String?` | yes | `null` | **In-progress** `nextPageToken` — set when a notification's change list spans more pages than one bounded batch; drives scheduled continuation. `null` when idle at a start-token boundary. |
| `calendar_sync_token` | `String?` | yes | `null` | Reserved (Calendar deferred, OD-1). |
| `state` | `String` | no | `"PENDING"` | `PENDING \| ACTIVE \| DEGRADED_RECONCILING \| REVOKED \| FAILED`. |
| `processing_lease_owner` | `String?` | yes | `null` | The worker/instance id currently processing this subscription's cursor. |
| `processing_lease_expires_at` | `DateTime?` | yes | `null` | Lease TTL; an expired lease is reclaimable (crash recovery). |
| `reconcile_progress_cursor` | `String?` | yes | `null` | Chunk progress during `DEGRADED_RECONCILING` (e.g. last processed `created_at`/`ledger_entry_id`), so bounded reconciliation continues across chunks past the 50 cap (§8). |
| `consecutive_failure_count` | `Int` | no | `0` | Bounded failure tracking. |
| `last_failure_code` | `String?` | yes | `null` | Closed vocab. |
| `last_successful_pull_at` | `DateTime?` | yes | `null` | |
| `created_at` | `DateTime` | no | `now()` | |
| `updated_at` | `DateTime` | no | `@updatedAt` | |
| `revoked_at` | `DateTime?` | yes | `null` | |

- **`@@unique([provider, watched_resource_kind, watched_resource_scope, org_entity_id])`** —
  **one logical subscription per scope** (DB-enforced; expressible precisely because renewal
  overlap lives on `WatchChannel`, not here). This is the registration race guard (§9).
- `@@index([state, processing_lease_expires_at])` — lease-reclaim + renewal scans.
- `@@index([org_entity_id, state])` — ops.

### 3.2 `WatchChannel` — the expiring Google delivery instance

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `channel_id` | `String @db.Uuid` | no | — (PK; **app-generated** pre-registration) | The id we send to Google + read back as `X-Goog-Channel-Id`. Primary callback resolver. |
| `subscription_id` | `String @db.Uuid` | no | — | → `WatchSubscription.subscription_id`. |
| `google_resource_id` | `String` | no | — | `X-Goog-Resource-Id` from `watch()`; verified per callback (deferred for a PENDING handshake — §8a). |
| `callback_token_hash` | `String` | no | — | Keyed `HMAC-SHA256(token)` hex (D5). |
| `expires_at` | `DateTime` | no | — | From the `watch()` response `expiration`. |
| `state` | `String` | no | `"PENDING"` | `PENDING \| ACTIVE \| EXPIRED \| REVOKED \| REPLACED \| FAILED`. |
| `replaced_by_channel_id` | `String? @db.Uuid` | yes | `null` | Renewal supersession chain. |
| `message_number_watermark` | `BigInt?` | yes | `null` | Highest `X-Goog-Message-Number` seen (monotonic-drop hint; primary dedupe is Redis `claimOnce("google_msg:"+channel_id+":"+n)`). |
| `last_notification_at` | `DateTime?` | yes | `null` | |
| `registration_failure_code` | `String?` | yes | `null` | e.g. `WATCH_CALL_FAILED`, `PROVIDER_STOP_FAILED`. |
| `created_at` | `DateTime` | no | `now()` | |
| `updated_at` | `DateTime` | no | `@updatedAt` | |
| `revoked_at` | `DateTime?` | yes | `null` | |

- **PK `channel_id`** is the only DB-unique key here. **No scope unique** — multiple `ACTIVE`
  channels per subscription are legal during renewal overlap (that is the whole point of the
  split).
- `@@index([subscription_id, state])`; `@@index([expires_at, state])` (renewal scan).

**Why the cursor belongs to the subscription, not the channel:** a Google channel is an
expiring *delivery* endpoint (≤7 days). Renewal creates a **new** channel (new id) while the
old one may still deliver briefly — two channels, one logical watch. The change-feed position
(`drive_page_token`/`drive_continuation_token`) is a property of *that one logical watch*: both
channels' notifications must advance the **same** cursor under a **single** serialized
processor. Storing the cursor on the channel would (a) fork it across the two overlap channels
and (b) lose it when the old channel is retired. On the subscription, it is single,
authoritative, lease-serialized, and survives channel replacement.

---

## 4. Migration artifact — **PROPOSED — NOT APPROVED — NOT APPLIED**

> Foundation ships schema via **guarded `db push`** (`scripts/prisma-db-push-guard.sh`,
> ADR-0025) — no `prisma/migrations` dir. Below is the exact additive block for review only.
> **Do not paste, do not `db push`, do not generate a client, do not commit.** Purely additive
> (two new tables); alters/drops nothing.

```prisma
// PROPOSED — NOT APPROVED — NOT APPLIED  (Slice 3 · real Google Drive webhooks)
model WatchSubscription {
  subscription_id             String    @id @default(uuid()) @db.Uuid
  provider                    String                          // "GOOGLE_DRIVE" (v1) | reserved "GOOGLE_CALENDAR"
  org_entity_id               String    @db.Uuid              // authoritative tenant (allowlist at registration)
  actor_entity_id             String    @db.Uuid              // governed ACTIVE org-admin actor
  integration_credential_id   String    @db.Uuid              // -> IntegrationCredential.credential_id (exact sealed-credential anchor)
  google_account_id           String?                         // sub/email — NULL today; capturing+pinning it is the prerequisite (§8b)
  watched_resource_kind       String                          // "DRIVE_CHANGES" (v1) | reserved "CALENDAR"
  watched_resource_scope      String    @default("MY_DRIVE")  // "MY_DRIVE" | a Shared Drive's driveId (distinct subscription)
  drive_page_token            String?                         // committed durable start cursor (newStartPageToken at end-of-list)
  drive_continuation_token    String?                         // in-progress nextPageToken (mid-list continuation)
  calendar_sync_token         String?                         // reserved (Calendar deferred)
  state                       String    @default("PENDING")   // PENDING|ACTIVE|DEGRADED_RECONCILING|REVOKED|FAILED
  processing_lease_owner      String?                         // current cursor-processor id
  processing_lease_expires_at DateTime?                       // lease TTL; expired => reclaimable (crash recovery)
  reconcile_progress_cursor   String?                         // chunk progress during DEGRADED_RECONCILING
  consecutive_failure_count   Int       @default(0)
  last_failure_code           String?
  last_successful_pull_at     DateTime?
  created_at                  DateTime  @default(now())
  updated_at                  DateTime  @updatedAt
  revoked_at                  DateTime?

  @@unique([provider, watched_resource_kind, watched_resource_scope, org_entity_id])
  @@index([state, processing_lease_expires_at])
  @@index([org_entity_id, state])
  @@map("watch_subscriptions")
}

// PROPOSED — NOT APPROVED — NOT APPLIED
model WatchChannel {
  channel_id                String    @id @db.Uuid            // app-generated pre-registration; = X-Goog-Channel-Id
  subscription_id           String    @db.Uuid                // -> WatchSubscription.subscription_id
  google_resource_id        String                            // X-Goog-Resource-Id from watch()
  callback_token_hash       String                            // keyed HMAC-SHA256(channel_token) hex
  expires_at                DateTime
  state                     String    @default("PENDING")     // PENDING|ACTIVE|EXPIRED|REVOKED|REPLACED|FAILED
  replaced_by_channel_id    String?   @db.Uuid                // renewal supersession chain
  message_number_watermark  BigInt?                           // highest X-Goog-Message-Number seen (Redis is primary dedupe)
  last_notification_at      DateTime?
  registration_failure_code String?
  created_at                DateTime  @default(now())
  updated_at                DateTime  @updatedAt
  revoked_at                DateTime?

  @@index([subscription_id, state])
  @@index([expires_at, state])
  @@map("watch_channels")
}
```

**Additive audit vocab (no migration — validated Strings; add to BOTH the union and
`AUDIT_EVENT_TYPE_VALUES`, the `satisfies` clause enforces parity):**
`WATCH_SUBSCRIPTION_REGISTERED`, `WATCH_SUBSCRIPTION_REVOKED`, `WATCH_SUBSCRIPTION_DEGRADED`,
`WATCH_SUBSCRIPTION_RECONCILED`, `WATCH_CHANNEL_REGISTERED`, `WATCH_CHANNEL_RENEWED`,
`WATCH_CHANNEL_STOPPED`, `WATCH_CHANNEL_REGISTRATION_FAILED`, `WATCH_NOTIFICATION_PROCESSED`,
`WATCH_NOTIFICATION_REPLAY_REJECTED`, `WATCH_NOTIFICATION_DEDUPED`,
`WATCH_NOTIFICATION_QUARANTINED`, `WATCH_NOTIFICATION_FAILED`, `WATCH_ACCOUNT_MISMATCH_BLOCKED`.
Actual source revalidation continues to emit `SOURCE_REVALIDATION_TRIGGERED`.

---

## 5. Callback route contract (real Google transport)

**Two provider-explicit routes**, provider resolved from the persisted subscription (a second,
independent assertion that must agree — defends token-at-wrong-provider):
- `POST /api/v1/otzar/inbound/google/drive`
- `POST /api/v1/otzar/inbound/google/calendar` *(registered but returns `202
  calendar_sink_not_wired` in v1 — §7b)*

| Aspect | Contract |
|--------|----------|
| Method | `POST` only; else `405`. |
| **Body** | **Accepts a zero-byte body.** Google Drive/Calendar `web_hook` notifications are header-driven; the `sync` handshake POST is empty. **The route requires no body and no custom content type.** It does **NOT** reuse the Slice-2 `application/otzar-signal` parser, does **NOT** compute a body HMAC, and does **NOT** require a body hash. A small permissive parser accepts empty/absent/any-content-type input as an ignored buffer (≤ the size cap). |
| Max sizes | Header block ≤ 8 KB; body ≤ 8 KB. Oversized → `413` quarantine `oversized`, before any lookup. |
| **Authentication** | **Solely** the persisted channel binding + `X-Goog-Channel-Token` (keyed-hash, constant-time) — plus `X-Goog-Channel-Id` to locate the row. A **Bearer header or cookie is ignored for authority** and never substitutes for the token. |
| Headers consumed | `X-Goog-Channel-Id`, `X-Goog-Channel-Token`, `X-Goog-Resource-Id`, `X-Goog-Resource-State`, `X-Goog-Message-Number`, and `X-Goog-Channel-Expiration` / `X-Goog-Changed` when supplied. Missing a *required* one → `400` quarantine `missing_google_headers`. |
| **Body/query authority** | **Any org, actor, provider, resource id, event type, or cursor supplied in a body or query string is ignored.** Authority and identity come only from headers + the persisted subscription/channel. |
| Rate-limit | New `OPERATION_RULES` entries → a `google_webhook` `DEFAULT_LIMITS{perMinute:120, scope:"ip"}`. Bearer-less ⇒ IP-keyed. |
| Token verify | `HMAC-SHA256(presented, WATCH_CHANNEL_TOKEN_HMAC_KEY)` `timingSafeEqual` vs `callback_token_hash`. Mismatch/absent → `401`, no mutation, `WATCH_NOTIFICATION_QUARANTINED{reason:"token_mismatch"}` (details carry channel_id only). |
| Minimal response | `{ ok, status, reason? }`. No provider/source detail, no token, no payload. |
| Retry-safe codes | transient (token refresh / provider 5xx / lease-held) → `503` (Google retries); definitive quarantine → `202`; auth → `401`; bad request → `400`/`413`. |
| Audit | one leak-safe row per terminal outcome (channel_id / reason / resource_state / state / code only). |
| Log redaction | never log token / `callback_token_hash` / sealed token / access token / body. Extend the existing `no-leak-guard` unit test to the new surfaces. |

---

## 6. Processing state machine + honest transaction boundaries

**Transaction reality (verified):** `revalidateImportedDocForCaller` accepts no `tx` and does
its ledger-update and `writeAuditEvent` as **two independent writes** — so a source transition,
its audit, and a cursor advance **cannot be one atomic transaction today.** The safe model is
therefore **subscription lease + idempotent page replay + a durable cursor commit** (not
atomicity). `writeAuditEvent(input, tx)` *is* tx-composable, so if the founder approves the
small **recommended** refactor to thread a `tx` through `revalidateImportedDocForCaller`, the
per-source transition+audit become atomic; even without it, cursor correctness holds by replay
(see the audit-completeness residual below).

**Lease (single cursor processor):** processing external HTTP under a held DB row lock is
unsafe (long tx). Instead: **claim a lease** in a short tx (`SELECT … FOR UPDATE` the
subscription row; proceed only if `processing_lease_expires_at` is null/expired or owner=self;
set owner+TTL; commit) → do the slow work lease-free → **commit the cursor + release the lease**
in a short tx. A crashed worker's lease expires → another reclaims → idempotent replay. Old and
new renewal channels both resolve to the **same** subscription and contend on the **same** lease
→ serialized (the loser returns `202 lease_held`, Google retries later).

Ordered steps (1–8 are pure guards; side effects from 11):
1. **Route bound** — IP rate-limit (`google_webhook`).
2. **Header + size** — required `X-Goog-*` present; ≤ 8 KB. Fail → `400`/`413`.
3. **Channel lookup** by `X-Goog-Channel-Id` (PK). Unknown → `202 unknown_channel`.
4. **Load subscription** (`subscription_id`) + **provider agreement** (route === `subscription.provider`). Mismatch → `202 provider_route_mismatch`.
5. **Token verify** — constant-time hash compare. Fail → `401`.
6. **Resource-id match** — `X-Goog-Resource-Id` === `channel.google_resource_id`. **Deferred for a `sync` handshake on a `PENDING` channel** (§8a): capture + reconcile instead. Otherwise mismatch → `202 resource_id_mismatch`.
7. **State gate** — channel `REVOKED/EXPIRED`/past `expires_at` → best-effort stop + `202 channel_inactive`; `REPLACED` within overlap grace → accept (dedupe absorbs).
8. **Handshake** — `X-Goog-Resource-State: sync` → **ack-only `200`**, `WATCH_NOTIFICATION_PROCESSED{reason:"handshake"}`, **no pull, no cursor change** (plus §8a reconciliation if the channel was PENDING).
9. **Delivery dedupe** — `claimOnce("google_msg:"+channel_id+":"+messageNumber, ttl)` → duplicate → `200 deduped`. (`message_number_watermark` is a secondary monotonic-drop hint.)
10. **Resolve org + actor + credential exclusively from the subscription** — never headers/body. Re-check actor `ACTIVE` + `getOrgEntityId(actor)===org`. Fail → `202 actor_guard_failed` (+ flag subscription for revoke). **Account-identity gate (§8b):** if `google_account_id` is set, it must still match the connected account; mismatch → `202`/`WATCH_ACCOUNT_MISMATCH_BLOCKED`, **no pull** (defends the silent-swap threat).
11. **Claim the subscription lease** (short tx, `FOR UPDATE`). Held by another → `202 lease_held` (retry). Per-org quota (`incr`) + per-resource debounce also apply.
12. **Signal-only** — the notification means "changes available"; its body is never read for content.
13. **Pull the change delta:** `changes.list(cursor)` on the sealed org token, where `cursor = drive_continuation_token ?? drive_page_token`. Process **one bounded batch** of ≤ `MAX_CHANGES_PAGES_PER_BATCH` pages. For each changed file id, **intersect** with the org's imported `DOCUMENT_CONTEXT` file_ids (org-scoped JSON-path — a filter, never a `files.list`) and `revalidateImportedDocForCaller(actor, ledger_entry_id, {auditMode:"on_transition"})` (pulls via the sealed token). No intersecting rows in the batch → still advance the cursor.
14. **Advance the cursor per correct pagination semantics (§7):**
    - If the batch ended on a **`nextPageToken`** (more pages remain): persist it to `drive_continuation_token`, keep `state=ACTIVE`, and **schedule immediate continuation** (re-enter at step 11 for the same subscription). **Never skip the remaining pages; never jump to a fresh start token.**
    - If the batch reached **end-of-list** (Google returned `newStartPageToken`): set `drive_page_token = newStartPageToken`, clear `drive_continuation_token`.
    - Commit the cursor change + release the lease in one short tx.
15. **Sinks** — the revalidation *is* the sink (snapshot-preserving; transitions integrity state only on a real upstream change). No new sink.
16. **Audit** — `SOURCE_REVALIDATION_TRIGGERED` (per real transition) + `WATCH_NOTIFICATION_PROCESSED`. **Audit-completeness residual (honest):** because the sink's ledger-update and its audit are not atomic today, a crash *between* them applies the transition but drops its audit row — and a cursor replay with `auditMode:"on_transition"` sees no transition on re-run, so it will not re-emit that audit. **Cursor correctness is preserved by replay; audit completeness is not, until the recommended `tx` refactor lands.** Documented, not hidden.
17. **Transient failure** (changes.list / pull 5xx, token refresh fail) → **do not advance the cursor**, release the lease, `WATCH_NOTIFICATION_FAILED`, `503` → Google retry re-lists the same delta (idempotent sink).
18. **Minimal response** `{ok, status, reason?}`.

**Crash-recovery at every boundary (idempotent, no skipped change entries):**
| Crash point | On replay |
|-------------|-----------|
| Before `changes.list` | cursor unchanged → re-list from `drive_continuation_token ?? drive_page_token` → same delta. |
| After page fetch, before any revalidate | nothing persisted → re-list same delta → revalidate (idempotent). |
| After partial source revalidation | cursor unadvanced → re-list same delta → re-revalidate all (idempotent, snapshot-preserving); *audit-completeness residual per step 16*. |
| After all sources in batch, before continuation persist | cursor unadvanced → re-list same delta → re-revalidate → re-derive same `nextPageToken` → persist. No skip. |
| After continuation persist | resume from `drive_continuation_token` → next page. |
| After final-page sources, before `newStartPageToken` commit | re-list final page (from continuation/start) → re-revalidate → re-derive `newStartPageToken` → commit. |
The subscription lease guarantees only one worker is at any of these boundaries at a time.

---

## 7. Drive-specific contract

- **`changes.watch` (one subscription per org connection), verified reliable for Doc content
  edits; `files.watch` rejected** (unreliable on content edits — OD-2).
- **Cursor semantics (corrected):** `changes.list` returns **`nextPageToken`** while more pages
  remain and **`newStartPageToken` only after the change list is fully consumed.** Therefore we
  keep **two** fields: `drive_page_token` (committed durable start cursor) and
  `drive_continuation_token` (in-progress `nextPageToken`). We process a bounded batch, persist
  `nextPageToken` + schedule continuation if pages remain, and **replace `drive_page_token` with
  `newStartPageToken` only at end-of-list.** We never skip remaining pages, never jump to a fresh
  start token mid-list, and never rely on the daily cron to mop up deliberately abandoned pages.
- **Intersection (the "not a crawl" guarantee):** changed file ids from the delta ∩ the org's
  imported `DOCUMENT_CONTEXT` file_ids. We never enumerate Drive; a busy Drive with no imported
  changes costs one `changes.list` and zero pulls.
- **Removed/trashed/revoked files:** `revalidateImportedDocForCaller` maps 404→`SOURCE_DELETED`,
  403→`ACCESS_REVOKED`, changed-hash→`CHANGED_UPSTREAM` — snapshot-preserving.
- **Amplification bound:** bounded batch pages + per-org quota + per-resource debounce.
- **Renewal:** channels are **replaced, not renewed** — create a new `WatchChannel` (new id,
  fresh `expires_at`) pointing at the **same subscription** (cursor carries forward untouched on
  the subscription), then best-effort `channels.stop` the old (`PROVIDER_STOP_FAILED` retried).
- **Invalid page token (410):** → §8 reconciliation (bounded, chunked; never a `files.list`).
- **My Drive vs Shared Drive:** v1 watches `MY_DRIVE` scope only. A Shared Drive requires
  `changes.watch`/`changes.list` with its `driveId` and is a **separate subscription** with its
  own cursor (`watched_resource_scope = <driveId>`). Deferred; recorded in §8c.

### 7b. Calendar — **HARD STOP in v1 (OD-1)**
Two independent, verified blockers: (1) **no sealed-token event-content read exists** (only
`getCalendarFreeBusyForOrg`, busy intervals) — nothing safe to revalidate a change *into*;
(2) a `syncToken` **410 forces a full calendar resync** = broad-sync doctrine violation. The
`/google/calendar` route exists but returns `202 calendar_sink_not_wired` until a founder
product/security decision resolves both. `events.watch` + `calendar_sync_token` + the MEETING
sink (`closedRecipientSet`/`fanOutInternalNotifications`/`cancelMeetingSideEffects`) are the
future path.

---

## 8. Registration, renewal, initial-sync race, and concurrency

### 8a. Initial-sync / registration race
Google may POST the `sync` handshake **before** the `watch()` response is persisted. To make
this safe, registration is **PENDING-first**: we insert the `WatchChannel` (`state=PENDING`,
app-generated `channel_id`, `callback_token_hash`, `subscription_id`) **before** calling Google,
so the row can authenticate a handshake even though `google_resource_id`/`expires_at` are not yet
known. On a `sync` handshake:
- **Auth** works (channel_id + token hash are already persisted).
- The **resource-id check (step 6) is deferred** for a `PENDING` channel: capture the header's
  `X-Goog-Resource-Id` as `pending_resource_id`.
- When the `watch()` call returns, reconcile: if the response `resourceId` equals the captured
  header id → set `google_resource_id`, `expires_at`, `state=ACTIVE`. **If they disagree →
  fail-closed:** mark the channel `FAILED`, best-effort `channels.stop` both ids, emit
  `WATCH_CHANNEL_REGISTRATION_FAILED{reason:"resource_id_disagreement"}`.
- Handshake return status: **`200` ack-only, no pull, no cursor change** (avoids both false
  rejection and premature polling before the subscription cursor is seeded).
- A handshake arriving for an already-`ACTIVE` channel is a normal ack-only no-op.

### 8b. Exact credential binding + the account-identity prerequisite *(load-bearing)*
- The subscription anchors on **`integration_credential_id`** (D6). At pull time the callback
  path resolves `WatchChannel → WatchSubscription → integration_credential_id → org` and uses the
  sealed credential. **Today the only token resolver is `(provider, org)`** (`getProviderAccessTokenForOrg`);
  there is exactly one Google `IntegrationCredential` per org (unique constraint), so `(provider,
  org)` and `integration_credential_id` resolve to the **same** row.
- **But this is exactness of the *row*, not of the *account*.** No Google account identity
  (`sub`/email) is captured, and a disconnect→reconnect of a **different** Google account
  **upserts the same credential row** — `credential_id` is unchanged, the token is silently
  swapped. Comparing `integration_credential_id` (or `(provider,org)`) detects nothing. So a
  `google_account_id` on the subscription is currently **NULL and cannot be asserted against**.
- **Required prerequisite** (the minimal token-resolver/lineage work): capture the Google
  account identity at connect time (parse the `id_token` `sub`/email — or call `userinfo` — in
  `exchangeCode`), persist it on the `IntegrationCredential` and stamp it on the subscription's
  `google_account_id`, and **compare at every pull/reconcile, failing closed on mismatch**
  (`WATCH_ACCOUNT_MISMATCH_BLOCKED`). Without this, the silent-account-swap threat (§9) is
  undetectable. **Stale credential id:** a disconnect that creates a *new* `credential_id`
  (rather than upsert) → the subscription's `integration_credential_id` no longer resolves →
  revoke the subscription, let Slice-1 cover.

### 8c. Source-lineage prerequisite
`DOCUMENT_CONTEXT` stores only `file_id` + `org` — no binding/credential/account/`driveId`. So a
changed file id is intersected against imported rows **by `(org, file_id)` only.** Under the
one-Google-credential-per-org invariant + the §8b account pin, that is safe (the org's single
connection is the only source of both the change feed and the imports). For **multi-Google-
account-per-org** it is **not** safe and would require the **smallest additive lineage change**:
stamp `external_source.integration_credential_id` (and `google_account_id`, and `driveId` for
shared drives) at import (`document-context.service.ts` import path) so the intersection can
require `(org, credential/account, file_id)`. My-Drive vs Shared-Drive is not distinguished
today; each Shared Drive is a distinct subscription+cursor (§7). Recorded as a prerequisite for
multi-account and as recommended defense-in-depth.

### 8d. Registration + renewal service (design-only)
- **Authority gate** — `(org, actor)` MUST be in `parseRecheckTargets(SOURCE_RECHECK_TARGETS)`;
  actor `ACTIVE`; `getOrgEntityId(actor)===org`. Demo org never listed ⇒ ineligible.
- **Concurrency/uniqueness (DB-enforced):** the **`WatchSubscription` scope `@@unique`** serializes
  registration — two concurrent registrations for the same scope: one insert wins, the other hits
  the unique violation and reads the existing row (an app-layer `SELECT … FOR UPDATE` on the
  *existing* subscription row handles the renewal path). This fixes the V1 gap that "locking a
  nonexistent `WatchChannel` row proves nothing" — we lock/uniquely-key the **subscription**,
  which is one-per-scope.
- **Token generation** — high-entropy channel token; persist only `HMAC-SHA256(token)`; the
  plaintext is sent to Google and discarded.
- **PENDING-first ordering + rollback:** insert subscription (if absent) + PENDING channel →
  call `changes.watch` → on success update channel to ACTIVE with `google_resource_id`/`expires_at`
  and seed `subscription.drive_page_token` from `changes.getStartPageToken` (if not already set).
  If `watch()` fails → channel `FAILED`. If `watch()` succeeds but the DB update fails → the
  PENDING row still authenticates callbacks; retry the update; if permanently failed, `FAILED` +
  `WATCH_CHANNEL_REGISTRATION_FAILED` with `channel_id` for manual `channels.stop`. (A provider
  call cannot be inside a DB tx; PENDING-first + reconcile is the safest achievable ordering.)
- **Renewal scheduler** (`node-cron`, Slice-1 pattern, in-process guard *plus* the per-subscription
  lease for cursor work): select channels `state=ACTIVE AND expires_at < now()+RENEWAL_WINDOW`;
  create a replacement channel on the same subscription; link `replaced_by_channel_id`, old→
  `REPLACED`; best-effort `channels.stop(old)`. `MAX_RENEWAL_RETRIES` → on exhaustion the
  subscription degrades and Slice-1 covers.
- **Fallback** — a lost/stale subscription degrades to the **Slice-1 daily cron** — slower
  detection, never blindness.

### 8e. Invalid-cursor recovery (bounded, chunked — never enumeration)
On a `changes.list` **410 / invalid token**:
1. Set `subscription.state = DEGRADED_RECONCILING`; emit `WATCH_SUBSCRIPTION_DEGRADED`.
2. **Capture a fresh `changes.getStartPageToken` NOW, before reconciliation** — so any change
   landing *during* reconciliation is covered by the new token (capture-after would drop
   mid-reconcile changes). Hold it; do not install it yet.
3. **Bounded, chunked reconciliation of every imported source tied to this exact
   subscription/credential:** iterate the org's non-CANCELLED `DOCUMENT_CONTEXT` file_ids in
   `SOURCE_HEALTH_SWEEP_MAX`-sized chunks (advancing `reconcile_progress_cursor` per chunk),
   `revalidateImportedDocForCaller` each. **This requires continuation past the 50 cap** — the
   existing `sourceHealthSweepForCaller` caps at 50 and does **not** chunk, so Slice 3 must add a
   chunked driver (a thin loop over the same sink, resumable via `reconcile_progress_cursor`).
   Notifications during `DEGRADED_RECONCILING` are **deferred** (return `202`, Google retries),
   not dropped.
4. Only after **all** chunks complete: install the captured token as `drive_page_token`, clear
   `drive_continuation_token` + `reconcile_progress_cursor`, set `state=ACTIVE`, emit
   `WATCH_SUBSCRIPTION_RECONCILED`.
5. If reconciliation cannot complete (repeated failure) → keep `DEGRADED_RECONCILING`, surface
   operator state; Slice-1 daily cron still re-hashes everything. **Do not return ACTIVE, and do
   not claim the gap is closed by a 50-capped sweep** — it is closed only by the full chunked
   pass.

---

## 9. Threat model

| Threat | Defense |
|--------|---------|
| **Silent Google-account swap** (reconnect account B over A; token swapped, `credential_id` stable) | **Not defensible today — this drives the verdict.** Prerequisite §8b: capture + pin `google_account_id`, compare at pull/reconcile, fail-closed (`WATCH_ACCOUNT_MISMATCH_BLOCKED`). Without it, A's notifications get pulled with B's token → wrong feed / 404s → **spurious mass `SOURCE_DELETED`**. Until the prerequisite lands, this is an accepted+documented risk or a blocker (§11). |
| Cross-account / cross-connection revalidation | Under one-credential-per-org + §8b pin: the org's single connection is the only feed+import source. Multi-account requires §8c lineage. |
| Forged `X-Goog-*` headers | Authority is the channel token vs `callback_token_hash` + persisted binding; forged headers without the token → `401`. |
| Leaked channel token | Per-channel, high-entropy, stored only as keyed hash; a leak only replays that channel's "re-fetch an already-trusted, snapshot-preserving source." Rotate by revoke+re-register. |
| Channel-id guessing | UUIDv4 (122 bits) + the token still required. |
| Replayed notification | Redis `claimOnce` per `channel_id+message_number` + `message_number_watermark`. |
| Resource-id substitution | `X-Goog-Resource-Id` must equal `channel.google_resource_id` (step 6; deferred+reconciled for a PENDING handshake, fail-closed on disagreement). |
| Token at wrong route/provider | route provider === `subscription.provider` (step 4). |
| Expired-but-delivering channel | state/`expires_at` gate + best-effort stop (step 7). |
| **Concurrent old/new renewal channels** | Both resolve to one subscription and contend on the **one lease** → serialized; the loser returns `202 lease_held`. The cursor is advanced by whoever holds the lease, once. |
| Concurrent registration for one scope | `WatchSubscription` scope `@@unique` (DB) + `SELECT … FOR UPDATE` on the existing subscription for renewal (§8d). |
| Actor suspended after creation | re-checked ACTIVE per callback (step 10). |
| Connector revoked / token refresh fail | `getProviderAccessTokenForOrg` → `NOT_CONNECTED`/`TOKEN_REFRESH_FAILED` → `503`, no demotion; renewal revokes the dead subscription. |
| Cross-org channel collision | org resolved only from the subscription; channel_id PK-unique. |
| Timing attacks | constant-time hash compare (`timingSafeEqual`, length-checked). |
| Log/audit leakage | no token/hash/sealed/access-token/body in logs or audit details; extend `no-leak-guard`. |
| Callback amplification | IP rate-limit + per-org quota + per-resource debounce + bounded batch pages; forged floods fail at token verify before any pull. |
| **Cursor rollback / skipped pages** | cursor advances only after a batch is durably handled; `nextPageToken` is persisted + continued (never skipped); `newStartPageToken` only at end-of-list; a transient failure re-lists the same delta; an invalid-token reset captures a fresh token **before** a full chunked reconcile → no silent gap. |
| Partial processing then retry | lease + idempotent snapshot-preserving revalidation; the *audit-completeness* residual (step 16) is the one honest exception, closed by the recommended `tx` refactor. |
| Malicious demo-org targeting | demo org not in `SOURCE_RECHECK_TARGETS` ⇒ no subscription/channel can be registered for it ⇒ no callback resolves to it. Structural. |

---

## 10. Test matrix

**A. Integration-proven (no real Google; `MemoryNonceStore` + injected provider/`changes.list`
/`fetchDocText` seams):**
1. **Empty-body Google callback, no custom content type** → processed on header auth alone.
2. Content-type absent entirely → accepted (headers are the signal).
3. Body/query-supplied org/actor/provider/resource/event → **ignored**; authority only from subscription/headers.
4. **Exact credential selected** — the pull uses the subscription's `integration_credential_id`-resolved token.
5. **Second Google account in same org cannot cross-process** — with `google_account_id` set, a swapped account → `WATCH_ACCOUNT_MISMATCH_BLOCKED`, no pull *(asserts the prerequisite behavior)*.
6. **Source imported through another binding/account not revalidated** — intersection requires matching credential/account when lineage present (§8c) *(multi-account guard)*.
7. Valid Drive callback → `changes.list` delta intersects an imported file → `SOURCE_REVALIDATION_TRIGGERED` + cursor advanced + `200`.
8. Missing/wrong `X-Goog-Channel-Token` → `401`, no mutation.
9. Unknown channel / provider-route mismatch / resource-id mismatch → `202` with the exact reason.
10. Replay (same message number) → `200 deduped`.
11. **Two concurrent callbacks for old+new renewal channels** → one lease winner processes, the other `202 lease_held`; cursor advanced once.
12. **Cursor lease prevents concurrent processing** — a second worker cannot advance the cursor while the lease is held/unexpired.
13. **Intermediate page cap persists `nextPageToken`** — a multi-page delta persists `drive_continuation_token` + schedules continuation; no page skipped.
14. **Final page commits `newStartPageToken`** — end-of-list replaces `drive_page_token`, clears continuation.
15. **Crash after partial page processing replays safely** — re-list same delta, re-revalidate (idempotent), no skipped entry.
16. **Crash after processing but before cursor commit replays safely** — cursor unadvanced → same delta re-processed → then advanced.
17. **Initial `sync` before watch() persistence** — PENDING channel authenticates the handshake, ack-only, no pull.
18. **Initial-sync resource mismatch** — captured header resource-id ≠ watch() resourceId → channel `FAILED`, fail-closed.
19. **Concurrent registration attempts** for one scope → subscription scope `@@unique` yields one subscription.
20. **Invalid cursor triggers full bounded connector-scoped reconciliation** — 410 → `DEGRADED_RECONCILING` → fresh token captured before reconcile.
21. **Reconciliation larger than 50 sources continues across chunks** — `reconcile_progress_cursor` advances past the 50 cap to completion.
22. **Subscription does not return ACTIVE until reconciliation completes** — partial reconcile stays `DEGRADED_RECONCILING`; notifications deferred `202`.
23. Actor suspended after creation → `202 actor_guard_failed`.
24. Transient provider pull → cursor NOT advanced + `503`; retry re-processes.
25. Oversized body/header → `413`. Cookie-only / Bearer-only → `401` (not authority). Handshake `sync` → `200` ack-only no-op. No sensitive log/audit leakage (`no-leak-guard`).

**B. Synthetic live callback proof (deployed, Meridian only — no real Google watch):** insert a
test subscription+channel (we hold the HMAC key → mint valid `X-Goog-*` requests) and POST the
live route — proving auth/replay/dedupe/quarantine/provider-mismatch/lease live, exactly as
Slice 2 was synthetically proven. No real Google channel, no demo-org row, no source mutation.

**C. Real Google watch proof (external founder setup required — gated):** after domain
verification + schema approval + the account-identity prerequisite (§8b) + a real
`changes.watch` on the Meridian connection: edit an imported doc → real callback →
`changes.list` delta intersects that file → `CHANGED_UPSTREAM` transition + cursor advance →
verify no demo-org touch, no token leak, snapshot preserved. Cannot run until the founder
completes the external actions.

---

## 11. Approval verdict + packet

> **UPDATE 2026-07-09 — the account-identity prerequisite is now BUILT + tested (FND PR
> #607, commit `371542f`, merge-ready).** The §8b blocker below is closed at the code level:
> exactly one pinned Google account per org, OIDC `sub` as authority, cryptographic id_token
> verification, an atomic compare-and-set swap guard (different-account reconnect fails
> closed, token byte-unchanged; concurrent-first race → one pins, other refused), an
> exact-credential-by-id resolver, and additive import lineage. Tests: 13 verifier + 10
> real-DB (incl. concurrency + byte-unchanged). **Two founder gates remain before Slice-3
> Drive can be built on top:** (a) flip `GOOGLE_OIDC_IDENTITY=on` (OIDC scope/consent —
> capture+verify+pin is always-on, only the env flip is needed); (b) apply the additive
> `IntegrationCredential` identity migration to prod (ADR-0025 pipeline; the `db push` guard
> is fail-closed to localhost). Once both clear + a Google account is pinned, the WatchSubscription
> rail (still unbuilt) can require `isGoogleCredentialIdentityPinned` and bind pulls to the
> exact credential. Recommended small follow-up: thread a `tx` through
> `revalidateImportedDocForCaller` (closes the audit-completeness residual, §6 step 16).

### Verdict (original, pre-prerequisite) — **READY ONLY AFTER A PREREQUISITE (account-identity pin); NOT a clean GO.**

The mechanical design (two-table subscription/channel model, header-driven callback, correct
cursor semantics, lease + idempotent replay, DB-enforced uniqueness, bounded chunked
reconciliation) is implementation-ready. **But** one verified gap blocks a clean GO:

- **Google account identity is not captured, and a silent account swap is undetectable.** A
  reconnect of a *different* Google account upserts the same credential row (stable
  `credential_id`, swapped token). Anchoring on `integration_credential_id` or `(provider,org)`
  gives **false exactness** — nothing to assert against. The concrete failure is **spurious mass
  `SOURCE_DELETED` demotion** of good sources (and cross-account reads) when A's channel is
  pulled with B's token. This cannot be coded around today; it is a **required prerequisite**, not
  a runtime check.

Therefore Slice 3 Drive is **(b) READY ONLY AFTER the account-identity prerequisite** (§8b):
capture + persist the Google account `sub`/email at connect, pin it on the subscription, compare
at every pull/reconcile, fail-closed. **Or (c)** the founder explicitly accepts and documents the
risk ("reconnecting a different Google account requires manual watch teardown + source re-import;
until then a swap can mass-demote sources"). **Multi-Google-account-per-org is a larger,
separate prerequisite** (per-account credential storage + §8c source lineage) — an
**unresolved product decision (OD-3)**, not required for the single-account path.

### External founder actions (only a human can do)
1. **Verify** the callback host (e.g. `api.otzar.ai`) as a Google Search-Console/Cloud-Console domain (valid SSL). No Pub/Sub (Drive `web_hook` posts directly).
2. **Approve** the additive `WatchSubscription` + `WatchChannel` schema for guarded `db push`.
3. **Decide** the account model (OD-3: single vs multi Google account per org) and the §8b prerequisite (build it, or risk-accept (c)).
4. Approve **Drive scope = `changes.watch` (`MY_DRIVE`)**, Calendar deferred (OD-1).

### Secrets / configuration
- `WATCH_CHANNEL_TOKEN_HMAC_KEY` — **new secret**, generated once, fail-closed at registration+callback (unset ⇒ no registration + all callbacks `401`), mirroring `INBOUND_SIGNAL_SECRET`.
- `WATCH_CALLBACK_BASE_URL` — the verified HTTPS base.
- Registration authority reuses `SOURCE_RECHECK_TARGETS`. No Google scope change. **No Pub/Sub.**

### Expected code files (when GO'd)
- `schema.prisma` — `WatchSubscription` + `WatchChannel` (schema STOP).
- `packages/database/src/queries/audit.ts` — additive `WATCH_*` vocab.
- `packages/database/src/queries/watch-subscription.ts` / `watch-channel.ts` — typed queries + the `FOR UPDATE` lease claim.
- `apps/api/src/services/otzar/watch-registration.service.ts` — register/renew/stop/reconcile.
- `apps/api/src/services/otzar/inbound-google-webhook.service.ts` — the §6 state machine.
- `apps/api/src/routes/inbound-google-webhook.routes.ts` — the two routes + permissive parser.
- `apps/api/src/services/otzar/watch-renewal.cron.ts` — renewal + degraded-reconcile driver.
- **(prerequisite)** `connector-oauth.service.ts` — capture Google `sub`/email in `exchangeCode`; **(recommended)** thread `tx` through `revalidateImportedDocForCaller` for audit atomicity; **(multi-account only)** `external_source` lineage stamp in `document-context.service.ts`.
- `gateway.middleware.ts` (rate-limit) + `server.ts` (registration/threading).
- `tests/integration/inbound-google-webhook.test.ts` + `watch-subscription.test.ts` — matrix A.

### Deployment sequence (Foundation-first)
1. Founder: domain verify + schema approval + account-model decision + generate the HMAC key.
2. Build the §8b account-identity prerequisite (+ recommended `tx` refactor) → its own tests.
3. Guarded `db push` of the two tables.
4. FND PR with Slice-3 code + matrix-A tests → 5 CI green → squash-merge.
5. Set `WATCH_CHANNEL_TOKEN_HMAC_KEY` + `WATCH_CALLBACK_BASE_URL` on Render → manual deploy → poll live.
6. Matrix **B** synthetic live proof on Meridian.
7. Register a real `changes.watch` for the Meridian connection → matrix **C** end-to-end.

### Rollback sequence
1. Unset the allowlist entry / feature flag → no new subscriptions.
2. `channels.stop` all live channels; set channels+subscriptions `REVOKED`.
3. Route returns `404`/inert.
4. Tables may remain inert or be dropped via guarded `db push`. Snapshot-preserving sinks are untouched ⇒ no business-data rollback.

### Unresolved product / security decisions
- **OD-1 — Real Calendar webhooks (HARD STOP):** needs a sealed-token `events.list` content read + acceptance/bounding of the 410 full-resync.
- **OD-2 — `files.watch` per-file mode:** rejected (unreliable for Doc content edits); recorded only.
- **OD-3 — Single vs multi Google account per org:** gates whether §8b (account pin) alone suffices, or §8c source-lineage + per-account credential storage are also required. **This is the decision that sets the verdict path.**
- **OD-4 — Callback host + DNS ownership.**
- **OD-5 — HMAC key scope + rotation** (one global vs per-org).
- **OD-6 — Optional ops read-model / CT surface** for subscription/channel health (audit rows already surface outcomes).

### The precise GO statement — **do not issue until §8b is built or risk-accepted (c)**
> "GO Slice 3 Drive v1: I approve the additive `WatchSubscription` + `WatchChannel` schema for
> guarded `db push`; I have (or will) verify `<callback host>` as a Google domain and generate
> `WATCH_CHANNEL_TOKEN_HMAC_KEY`; I approve Drive scope = `changes.watch` (`MY_DRIVE`) with
> Calendar deferred (OD-1); and on the account model I [ **(b)** require the Google
> account-identity pin (§8b) to be built and merged FIRST / **(c)** accept and document the
> silent-account-swap risk that reconnecting a different Google account can mass-demote sources
> until manual teardown ] — single Google account per org (OD-3), multi-account deferred."

Absent that, this remains design-only. **No Slice-3 code, schema, migration, secret, Render
change, Google action, or deployment is to be performed.**
