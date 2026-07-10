# Otzar Inbound Ambient — Slice 3 Technical Contract (Real Google Drive/Calendar Webhooks)

> **STATUS: DESIGN-ONLY · REVIEW-READY · NOT IMPLEMENTED · NOT APPROVED · NOT APPLIED**
>
> This document is the implementation-ready contract for Slice 3. **No code, schema,
> migration, Render change, Google Cloud/Search-Console action, secret, or deployment
> has been performed.** It exists to be reviewed and explicitly approved by the founder
> *before* any Slice-3 code is written. Author: Opus 4.8, 2026-07-09. Grounded against
> Foundation `main` (`b92da46`) via read-only reconnaissance — every consumed symbol
> below is a real, cited primitive.
>
> Prereqs already shipped + live: **Slice 1** (cron per-org source recheck, FND
> `1d63b66`) and **Slice 2** (internal HMAC-signed event rail, FND `2c8b8de`). Slice 3
> reuses their patterns; it does **not** re-derive them.

---

## 0. Correction carried in from the Slice 2 closeout

The Slice 2 live-proof statement previously read "zero residue." That is imprecise and
has been replaced everywhere with the exact claim:

> **"No business-data or source mutation; only the expected audit evidence was written."**

That is the standard this contract holds Slice 3 to as well: a webhook that quarantines,
dedupes, or fails must write only audit evidence and mutate no source/business row.

---

## 1. Design summary + the load-bearing decisions

Slice 3 turns the **proven** internal processing model (Slice 2) into a real Google
receiver. Four decisions define the safe shape; each is defended in its section.

| # | Decision | Why (grounded) |
|---|----------|----------------|
| **D1** | **Drive v1 uses `changes.watch` — one channel per org's Google connection** (NOT `files.watch`). On a notification, `changes.list(pageToken)` returns the **bounded delta of changed file IDs**, which we **intersect against the org's already-imported source set** (a filter over a small set — NOT a Drive crawl) and revalidate only the matches. | **Verified against Google's docs (2026-07-09):** `changes.watch` is Google's recommended, reliable mechanism for detecting **content edits to native Google Docs**; a single-file `files.watch` does **not** reliably fire on Doc content edits, so it would silently miss the exact event ambient detection exists to catch. `changes.list` is a bounded *change delta* (not a file listing), so intersecting it with our imported set is safe by construction. Lost-cursor recovery resumes forward via `getStartPageToken` (any gap is backstopped by the Slice-1 daily cron) or re-checks only the imported file ids individually — **never a full-Drive enumeration** (§7). |
| **D2** | **Real Calendar webhooks are a HARD STOP inside Slice 3** (product/security decision). | The only sealed-token calendar read that exists is `getCalendarFreeBusyForOrg` — **busy intervals only, no event content**. There is no wired sealed-token `events.list?syncToken` content read, and a `syncToken` 410 forces a *full* calendar resync = broad-sync doctrine violation. So Calendar stays exactly where Slice 2 leaves it: `calendar_sink_not_wired` quarantine. (§6) |
| **D3** | **One `WatchChannel` table + Redis for delivery dedupe** — NOT a durable delivery-event warehouse. | A durable per-delivery table drifts toward the explicitly-forbidden "general-purpose durable InboundEvent warehouse." Delivery dedupe reuses the Slice-2 Redis substrate (`claimOnce`), which is exactly what Slice 2 already does. |
| **D4** | **Channel token stored as a keyed HMAC hash, never plaintext, never sealed token.** | Google echoes the token back in `X-Goog-Channel-Token`; we only ever *verify* it. A keyed `HMAC-SHA256(token)` hex compared in constant time needs no decrypt path and leaks nothing at rest. (The AES-GCM `ContentEncryption` substrate exists and is the fallback if a recoverable token is ever required — but it is not, so a hash is strictly safer.) |

**Registration authority = the Slice-1 allowlist.** A channel may be registered ONLY
for an `org:actor` pair present in `SOURCE_RECHECK_TARGETS` (`parseRecheckTargets`). The
demo org is never listed ⇒ **structurally ineligible for watch registration** — the same
fail-closed doctrine that already protects Slices 1 and 2. The webhook itself carries no
actor; the `WatchChannel` row supplies the governed ACTIVE org-admin actor the sinks
require.

---

## 2. Foundation reality this contract consumes (grounded symbols)

| Concern | Real symbol · file | Shape |
|---------|--------------------|-------|
| Sealed Google token pull | `getProviderAccessTokenForOrg({provider:"GOOGLE_WORKSPACE", org_entity_id})` · `apps/api/src/services/connector/connector-oauth.service.ts:1002` | `{ok:true, access_token} \| {ok:false, code:"NOT_CONNECTED"\|"TOKEN_REFRESH_FAILED"}`; loads AES-GCM envelope from `IntegrationCredential.webhook_secret`, refresh+reseal, raw token never leaves server |
| Drive doc pull | `fetchGoogleDocTextForOrg({actor_entity_id, org_entity_id, file_id})` · `connector-data-read.service.ts:492` | Drive REST metadata+export on the sealed token; ≤20k chars; returns `content_sha256` |
| Drive revalidation sink | `revalidateImportedDocForCaller(callerEntityId, ledgerEntryId, {fetchDocText?, auditMode})` · `document-context.service.ts:347` | `{ok:true, ledger_entry_id, state, changed, transitioned} \| {ok:false, code}`; **snapshot-preserving**; transient→`REVALIDATION_UNAVAILABLE`, never demotes |
| Bulk sink (renewal fallback) | `sourceHealthSweepForCaller(callerEntityId, opts?, {notifyMode})` · `source-health.service.ts:91` | org's recent non-CANCELLED DOCUMENT_CONTEXT rows, capped `SOURCE_HEALTH_SWEEP_MAX`; never lists Drive |
| Imported source row | `WorkLedgerEntry` (`work_ledger_entries`) · `schema.prisma:4367` | `ledger_type:"DOCUMENT_CONTEXT"`, file_id at `details.document.external_source.file_id`, integrity at `details.source_integrity.state` (`SOURCE_INTEGRITY_STATES`); indices `@@index([org_entity_id,status])`, `@@index([org_entity_id,ledger_type])` — **no JSON-path index** |
| Calendar sealed read (only one) | `getCalendarFreeBusyForOrg(...)` · `connector-data-read.service.ts:221` | busy intervals only — **no event content** |
| Allowlist | `parseRecheckTargets(process.env.SOURCE_RECHECK_TARGETS)` · `source-recheck.service.ts:75` | `{orgEntityId, actorEntityId}[]`; blank/malformed dropped, never guessed |
| Actor ACTIVE + org guard | `prisma.entity.findUnique({where:{entity_id},select:{status}})` + `getOrgEntityId(actor)` · `source-recheck.service.ts:128`, `governance/org.ts:104` | `status==="ACTIVE"` AND `getOrgEntityId(actor)===org` |
| Org connector binding | `ConnectorBinding` (`connector_bindings`) · `schema.prisma:2538` | `binding_id @db.Uuid` PK, `org_entity_id`, `type` (provider String), `@@unique([org_entity_id,type,display_name])` — **holds no token** |
| Encryption substrate (fallback) | `makeContentEncryption()` / `sha256Hex` · `packages/auth/src/crypto.ts:74,94` | AES-256-GCM `encrypt/decrypt`; unkeyed SHA-256 hex |
| Constant-time compare precedent | `constantTimeHexEqual` (private) + `createHmac`/`timingSafeEqual` · `inbound-hmac.ts:118` | wraps `timingSafeEqual` on equal-length hex; false on length mismatch |
| Redis dedupe substrate | `NonceStore.claimOnce(key, ttl)` / `incr(key, ttl)` · `redis.ts:22` | Redis `SET NX EX` / `INCR`+`EXPIRE`; `MemoryNonceStore` for tests |
| Rate-limit gateway | `OPERATION_RULES` + `DEFAULT_LIMITS{perMinute,scope}` · `gateway.middleware.ts` | bearer-less ⇒ IP-scoped key |
| Audit write | `writeAuditEvent({event_type, outcome, actor_entity_id, target_entity_id, details})` · `packages/database/src/queries/audit.ts:1523` | `event_type` is a **validated String** (not a DB enum) — new literals are additive, no migration |
| Slice-1 cron | `parseRecheckTargets` + `tickSourceRecheck(targets, opts)` · `source-recheck.service.ts:107` | in-process non-overlap guard; renewal-failure fallback |

---

## 3. `WatchChannel` schema

**One table.** Delivery dedupe is Redis (D3). Follows every schema convention confirmed
in Foundation (`uuid()@db.Uuid` PKs, raw `org_entity_id @db.Uuid` with no `@relation`,
`created_at`/`updated_at`/`deleted_at` trio, snake_case `@@map`, validated-String status).

### 3.1 Fields (exact)

| Field | Type | Null | Default | Notes |
|-------|------|------|---------|-------|
| `channel_id` | `String @db.Uuid` | no | — (PK; **app-generated**, not `@default`) | The id we send to Google as the channel id and read back as `X-Goog-Channel-Id`. Generated app-side so it is persisted **before** the provider call (see rollback §7). Primary callback resolver. |
| `provider` | `String` | no | — | Validated closed vocab: `"GOOGLE_DRIVE" \| "GOOGLE_CALENDAR"`. Not a DB enum (connector-era precedent). |
| `watched_resource_kind` | `String` | no | — | `"DRIVE_CHANGES"` (v1) · reserved: `"CALENDAR"` (deferred), `"DRIVE_FILE"` (rejected — unreliable for Doc content edits). |
| `watched_resource_external_id` | `String` | no | — | App-side scope key. For v1 `DRIVE_CHANGES` this is the org's Google-connection scope key (the `connector_binding_id`, since it is one changes-feed channel per org connection — there is no single file). Reserved: `calendar_id` for Calendar. |
| `google_resource_id` | `String` | no | — | Opaque provider-side id returned by `changes.watch()` and echoed as `X-Goog-Resource-Id`. Verified on every callback. Indexed for reverse lookup. |
| `org_entity_id` | `String @db.Uuid` | no | — | **Authoritative tenant.** Set from the allowlist at registration; never from a callback. No `@relation` (Foundation convention). |
| `actor_entity_id` | `String @db.Uuid` | no | — | The governed ACTIVE org-admin actor the webhook lacks; supplies the caller the sinks require. Re-validated ACTIVE on every callback. |
| `connector_binding_id` | `String @db.Uuid` | no | — | FK-by-convention → `ConnectorBinding.binding_id` (the org's Google binding) for governed attribution/audit. NB: the *token* is pulled by `(provider, org)` via `getProviderAccessTokenForOrg`, not by this id. |
| `callback_token_hash` | `String` | no | — | **Keyed** `HMAC-SHA256(channel_token, WATCH_CHANNEL_TOKEN_HMAC_KEY)` hex. Never the plaintext token, never a sealed token. Constant-time compared. |
| `drive_page_token` | `String?` | yes | `null` | **Active in v1** — the `changes.list` cursor for a `DRIVE_CHANGES` channel; seeded from `changes.getStartPageToken` at registration and advanced transactionally only after a notification is fully processed (§6 step 14). Null for non-Drive kinds. |
| `calendar_sync_token` | `String?` | yes | `null` | **Reserved for Calendar mode** — deferred (§6); null in v1. |
| `expires_at` | `DateTime` | no | — | From the `watch()` response `expiration`. Drives renewal. |
| `state` | `String` | no | `"PENDING"` | Validated: `PENDING \| ACTIVE \| EXPIRED \| REVOKED \| REPLACED \| FAILED`. |
| `renewal_status` | `String` | no | `"NONE"` | Validated: `NONE \| DUE \| IN_PROGRESS \| OK \| STALE`. `STALE` = renewal exhausted → Slice-1 cron covers the resource. |
| `last_notification_at` | `DateTime?` | yes | `null` | Last accepted callback. |
| `last_successful_pull_at` | `DateTime?` | yes | `null` | Last successful sealed-token revalidation. |
| `consecutive_failure_count` | `Int` | no | `0` | Bounded failure tracking; drives `STALE`. |
| `last_failure_code` | `String?` | yes | `null` | Closed vocab, e.g. `TOKEN_REFRESH_FAILED`, `REVALIDATION_UNAVAILABLE`, `PROVIDER_STOP_FAILED`. |
| `replaced_by_channel_id` | `String? @db.Uuid` | yes | `null` | Self-reference: the replacement channel created at renewal. |
| `created_at` | `DateTime` | no | `now()` | |
| `updated_at` | `DateTime` | no | `@updatedAt` | |
| `revoked_at` | `DateTime?` | yes | `null` | Set when connector revoked / channel stopped. Soft-delete marker. |

### 3.2 Constraints, indexes, and the uniqueness nuance

- **PK / unique:** `channel_id` (PK) is the only DB-unique key. It is the callback
  resolver and is inherently unique.
- **Reverse-lookup indexes:**
  - `@@index([org_entity_id, state])` — operator/ops queries + renewal scans per org.
  - `@@index([expires_at, state])` — the renewal scheduler selects `state=ACTIVE AND expires_at < now()+window`.
  - `@@index([google_resource_id])` — defense-in-depth reverse lookup / audit.
  - `@@index([provider, watched_resource_kind, watched_resource_external_id, org_entity_id])` — **non-unique** scope lookup (see below).
- **The uniqueness nuance (directive-critical):** we must prevent two *accidental* active
  channels claiming the same `(provider, kind, external_id, org)` scope, **but must ALLOW
  the intentional renewal-overlap window** where an old `REPLACED` (still briefly
  delivering) and a new `ACTIVE` channel coexist. A DB `@@unique` on the active scope
  would **break** renewal overlap, so it is deliberately **NOT** used. Instead:
  - Single-authoritative-ACTIVE is enforced at the **application layer** inside the
    registration transaction: `SELECT ... FOR UPDATE` on the scope index, refuse a *new*
    registration if an `ACTIVE` non-expired channel already exists for that scope (unless
    the caller is the renewal path, which links via `replaced_by_channel_id`).
  - Cross-channel duplicate *delivery* for the same resource during overlap is absorbed by
    the per-resource **debounce** (`claimOnce("watch_debounce:"+org+":"+external_id, ttl)`),
    reused verbatim from Slice 2 — so the same file change arriving on both the old and
    new channel revalidates at most once.
  - **Optional hardening (raw SQL, not schema-expressible):** a Postgres *partial* unique
    index `CREATE UNIQUE INDEX watch_channels_active_scope ON watch_channels (provider,
    watched_resource_kind, watched_resource_external_id, org_entity_id) WHERE state =
    'ACTIVE';` would enforce it in the DB — but it would forbid the overlap window, so it
    is listed as an **open decision**, not adopted. If adopted, renewal must flip the old
    row out of `ACTIVE` (→`REPLACED`) *before* inserting the new `ACTIVE` row in the same
    transaction. (Prisma cannot express partial indexes in `schema.prisma`; this would be
    a raw-SQL addendum applied via the guarded `db push` escape hatch.)
- **Retention / deletion:** rows are **never hard-deleted** on revoke — set
  `state=REVOKED`, `revoked_at=now()`; the row stays as governed audit provenance
  (channel_id ↔ org/actor/binding). A bounded compaction job MAY purge `REVOKED`/`REPLACED`
  rows older than, say, 90 days; v1 keeps them (volume is one row per watched resource, tiny).

---

## 4. Migration artifact — **PROPOSED — NOT APPROVED — NOT APPLIED**

> The Foundation schema ships via **guarded `db push`** (`bash scripts/prisma-db-push-guard.sh`,
> ADR-0025), not migration files — there is no `prisma/migrations` directory. This is the
> exact additive block to append to `packages/database/prisma/schema.prisma`. **It is
> reproduced here for review only. Do not paste it into the schema, do not run `db push`,
> do not generate a client, do not commit it.** It is purely additive (a new model + one
> new nullable relation-less table); it drops/alters nothing.

```prisma
// PROPOSED — NOT APPROVED — NOT APPLIED  (Slice 3 · Inbound ambient real Google webhooks)
// Additive only. New table. No column drop/alter on any existing model.
model WatchChannel {
  channel_id                    String    @id @db.Uuid          // app-generated; persisted before the provider call
  provider                      String                          // "GOOGLE_DRIVE" | "GOOGLE_CALENDAR" (validated String)
  watched_resource_kind         String                          // "DRIVE_CHANGES" (v1) | reserved "CALENDAR" | rejected "DRIVE_FILE"
  watched_resource_external_id  String                          // v1: org connection scope key (connector_binding_id) | calendar_id
  google_resource_id            String                          // X-Goog-Resource-Id from changes.watch(); verified per callback
  org_entity_id                 String    @db.Uuid              // authoritative tenant (from allowlist at registration)
  actor_entity_id               String    @db.Uuid              // governed ACTIVE org-admin actor the webhook lacks
  connector_binding_id          String    @db.Uuid              // -> ConnectorBinding.binding_id (attribution; token pulled by org+provider)
  callback_token_hash           String                          // keyed HMAC-SHA256(channel_token) hex — never plaintext/sealed token
  drive_page_token              String?                         // ACTIVE in v1: changes.list cursor; advanced only after successful processing
  calendar_sync_token           String?                         // reserved for Calendar mode (deferred; null in v1)
  expires_at                    DateTime                        // from watch() response expiration
  state                         String    @default("PENDING")   // PENDING|ACTIVE|EXPIRED|REVOKED|REPLACED|FAILED
  renewal_status                String    @default("NONE")      // NONE|DUE|IN_PROGRESS|OK|STALE
  last_notification_at          DateTime?
  last_successful_pull_at       DateTime?
  consecutive_failure_count     Int       @default(0)
  last_failure_code             String?
  replaced_by_channel_id        String?   @db.Uuid              // renewal replacement chain (self-reference by id)
  created_at                    DateTime  @default(now())
  updated_at                    DateTime  @updatedAt
  revoked_at                    DateTime?

  @@index([org_entity_id, state])
  @@index([expires_at, state])
  @@index([google_resource_id])
  @@index([provider, watched_resource_kind, watched_resource_external_id, org_entity_id])
  @@map("watch_channels")
}
```

**Optional DB-level scope hardening (raw SQL — NOT adopted, open decision §12):**
```sql
-- Enforces single ACTIVE channel per scope in the DB, but FORBIDS renewal overlap.
-- Only apply if renewal is changed to flip old->REPLACED before inserting new ACTIVE.
CREATE UNIQUE INDEX watch_channels_active_scope
  ON watch_channels (provider, watched_resource_kind, watched_resource_external_id, org_entity_id)
  WHERE state = 'ACTIVE';
```

**Additive audit vocab (no migration — validated Strings, add to BOTH the union and
`AUDIT_EVENT_TYPE_VALUES`; the `satisfies` clause enforces parity):**
`WATCH_CHANNEL_REGISTERED`, `WATCH_CHANNEL_RENEWED`, `WATCH_CHANNEL_REVOKED`,
`WATCH_CHANNEL_STOPPED`, `WATCH_CHANNEL_REGISTRATION_FAILED`, `WATCH_CHANNEL_RENEWAL_STALE`,
`WATCH_NOTIFICATION_PROCESSED`, `WATCH_NOTIFICATION_REPLAY_REJECTED`,
`WATCH_NOTIFICATION_DEDUPED`, `WATCH_NOTIFICATION_QUARANTINED`,
`WATCH_NOTIFICATION_FAILED`. The actual source revalidation continues to emit the
existing `SOURCE_REVALIDATION_TRIGGERED`.

---

## 5. Callback route contract

**Route shape decision:** **two provider-explicit routes**, resolving the binding entirely
from the persisted channel — NOT one shared route.
- `POST /api/v1/otzar/inbound/google/drive`
- `POST /api/v1/otzar/inbound/google/calendar` *(registered but returns `202
  quarantined{calendar_sink_not_wired}` in v1 — see §6; present so the surface is stable
  when Calendar is later un-blocked)*

Rationale: the route's provider is a second, independent assertion that must agree with the
persisted `WatchChannel.provider` (defends "valid token used against the wrong provider" —
§8). A single shared route would make provider entirely payload/binding-derived, removing
that cross-check.

| Aspect | Contract |
|--------|----------|
| Method | `POST` only. Any other → 405. |
| Content type / body | Google Drive/Calendar `web_hook` notifications carry an **empty or tiny body**; the signal is entirely in `X-Goog-*` headers. Register a **route-scoped** parser (mirror Slice 2's `addContentTypeParser` guarded by `hasContentTypeParser`) that accepts the notification content type as an opaque small buffer. **The global JSON parser is untouched** (a Slice-2-proven invariant). |
| Required headers | `X-Goog-Channel-Id`, `X-Goog-Resource-Id`, `X-Goog-Resource-State`, `X-Goog-Channel-Token`. Optional: `X-Goog-Message-Number` (monotonic, for dedupe), `X-Goog-Changed`, `X-Goog-Channel-Expiration`. Missing any *required* header → `400`, `WATCH_NOTIFICATION_QUARANTINED{reason:"missing_google_headers"}`. |
| Max sizes | Header total ≤ 8 KB; body ≤ 8 KB (notifications are tiny). Oversized → `413`, quarantine `{reason:"oversized"}`. Enforced before any lookup. |
| Rate-limit scope | New `OPERATION_RULES` entries for both routes → a new `DEFAULT_LIMITS` op (e.g. `google_webhook: {perMinute: 120, scope:"ip"}`). Bearer-less ⇒ **IP-keyed** (gateway already keys IP when no bearer resolves). |
| **Auth sequence** | (1) The **`X-Goog-Channel-Token` is the sole auth**, verified in constant time against `callback_token_hash`. (2) A Bearer header or cookie is **ignored for authority** — never a substitute for the channel token + persisted binding. (3) No claimed org / actor / provider / resource id / event type from *any* body or query establishes authority. |
| Token verification | Compute `HMAC-SHA256(presentedToken, WATCH_CHANNEL_TOKEN_HMAC_KEY)` and `timingSafeEqual` vs stored `callback_token_hash`. Mismatch/absent → `401`, **no channel mutation**, `WATCH_NOTIFICATION_QUARANTINED{reason:"token_mismatch"}` (details carry channel_id only, never the token). |
| Binding lookup | By `X-Goog-Channel-Id` = `channel_id` (PK). Unknown → `404`/`202` (retry-neutral), quarantine `{reason:"unknown_channel"}`. |
| Provider/resource checks | `WatchChannel.provider` must equal the route's provider AND `google_resource_id` must equal `X-Goog-Resource-Id` — else quarantine `{reason:"provider_route_mismatch"\|"resource_id_mismatch"}`, no processing. |
| Expiration / revocation | `state ∈ {REVOKED, EXPIRED}` or `expires_at < now()` → quarantine `{reason:"channel_inactive"}`; **best-effort `channels.stop`** on a still-delivering expired/revoked channel. `state=REPLACED` within the overlap grace → accept (dedup absorbs the duplicate); outside grace → quarantine. |
| Handshake / sync | `X-Goog-Resource-State: sync` (the registration handshake) → **`200`/`202` no-op**, `WATCH_NOTIFICATION_PROCESSED{reason:"handshake"}`, no pull. |
| Dedupe | `claimOnce("google_msg:"+channel_id+":"+(messageNumber ?? resourceState), ttl)` → duplicate delivery → `200`, `WATCH_NOTIFICATION_DEDUPED`. Plus the per-resource debounce for cross-channel overlap. |
| Minimal response | `{ ok, status, reason? }` — same minimal shape as Slice 2. **No provider/source detail, no token, no payload.** |
| Retry-safe status codes | Transient (token refresh fail, provider 5xx on pull) → **`503`** so Google retries; the cursor/debounce is released so the retry re-processes. Definitive quarantines → `202` (accepted, won't be retried into a loop). Auth failures → `401`. Bad request → `400`. |
| Audit | Every terminal outcome writes exactly one leak-safe audit row (channel_id / reason / resource_state / state / code only). |
| Log redaction | Never log the channel token, `callback_token_hash`, sealed token, access token, or raw body. Mirror the Slice-2 no-leak invariant (enforced by the existing `no-leak-guard` unit test — extend it to the new surfaces). |

---

## 6. Processing state machine (callback receipt → done)

Ordered; each step's failure is terminal with the noted status. Steps 1–11 are pure
guard/resolve (no side effect); side effects begin at 13.

1. **Route bound** — gateway IP rate-limit (`google_webhook`, IP-scoped). Over limit → `429`.
2. **Header + size validation** — required `X-Goog-*` present; header/body ≤ 8 KB. Fail → `400`/`413` quarantine.
3. **Channel lookup** by `X-Goog-Channel-Id` (PK). Unknown → `202` quarantine `unknown_channel`.
4. **Provider agreement** — route provider === `WatchChannel.provider`. Mismatch → `202` quarantine `provider_route_mismatch`.
5. **Token verify** — constant-time HMAC hash compare vs `callback_token_hash`. Fail → `401` (no mutation).
6. **Resource-id match** — `X-Goog-Resource-Id` === `google_resource_id`. Mismatch → `202` quarantine `resource_id_mismatch`.
7. **State gate** — reject `REVOKED`/`EXPIRED`/expired; `REPLACED` only within overlap grace; else best-effort stop + `202` quarantine `channel_inactive`.
8. **Dedupe** — `claimOnce("google_msg:"+channel_id+":"+messageNumber, ttl)`. Duplicate → `200` deduped.
9. **Resolve org + actor** — **exclusively from the `WatchChannel` row** (`org_entity_id`, `actor_entity_id`). Never from headers/body.
10. **Re-validate actor + org** — `entity.status==="ACTIVE"` AND `getOrgEntityId(actor_entity_id)===org_entity_id` (the Slice-1 guard). Fail → `202` quarantine `actor_guard_failed` (and mark the channel for review; a suspended actor's channel should be revoked by the renewal job).
11. **Quota + debounce** — per-org quota (`incr`, reuse Slice-2 bound) and per-resource debounce (`claimOnce("watch_debounce:"+org+":"+external_id, ttl)`). Over quota → `429` quarantine; debounced → `200` deduped.
12. **Signal-only** — the notification is treated purely as "changes are available"; **its body is never trusted** and is not read for content.
13. **Pull the change delta, then provider truth (Drive v1):** call `changes.list(drive_page_token)` on the **sealed org token** → a bounded list of changed file IDs + the `newStartPageToken`. **Intersect** the changed IDs with the org's imported `DOCUMENT_CONTEXT` file_ids (org-scoped JSON-path lookup — a filter over the small imported set, **never a Drive file enumeration**). For each match, `revalidateImportedDocForCaller(actor, ledger_entry_id, {auditMode:"on_transition"})`, which internally pulls via `fetchGoogleDocTextForOrg`. Zero intersecting imported rows → `202` quarantine `no_matching_imported_source` (still advance the cursor — the changes were real, just not to our sources). Bound the number of `changes.list` pages per notification (`MAX_CHANGES_PAGES_PER_NOTIFICATION`); if exceeded, process what was fetched, advance the cursor to there, and let the Slice-1 daily cron backstop the remainder (amplification bound). Calendar → `202` quarantine `calendar_sink_not_wired` (§6-block; no sealed content read exists).
14. **Advance cursor transactionally only after processing** — persist `drive_page_token = newStartPageToken` in the **same transaction** that records the processed results. Never advance before a successful `changes.list` + revalidation pass. A transient `changes.list` / pull failure (§16) leaves the cursor **unadvanced** so the Google retry re-fetches the same delta (idempotent — the sink is snapshot-preserving).
15. **Route only changed/trusted records into existing sinks** — the revalidation itself is the sink; it is snapshot-preserving and only transitions integrity state on a real upstream change. No new sink is introduced.
16. **Audit** — `SOURCE_REVALIDATION_TRIGGERED` + `WATCH_NOTIFICATION_PROCESSED` (leak-safe). Transient pull failure → **release debounce**, `WATCH_NOTIFICATION_FAILED`, `503`.
17. **Minimal response** — `{ok, status, reason?}`, retry-safe code.

---

## 7. Drive-specific contract

- **`changes.watch` (one channel per org's Google connection), NOT `files.watch` — for v1.**
  **Verified against Google's Drive change-tracking docs (2026-07-09):** `changes.watch` +
  `changes.list` is Google's recommended, *reliable* mechanism for detecting content edits to
  native Google Docs; `files.watch` on a single file does **not** reliably fire on Doc
  content edits and would silently miss the target event. One `DRIVE_CHANGES` channel covers
  the org's whole Drive change feed, so channel count is **one per org** (far fewer than a
  per-file scheme) and renewal is per-org.
- **Cursor:** `drive_page_token`, seeded at registration from `changes.getStartPageToken`,
  advanced transactionally only after a notification is fully processed (§6 steps 13–14).
- **Intersection with imported/trusted sources (the "not a crawl" guarantee):** a
  notification says only "changes are available." We call `changes.list(pageToken)` — which
  returns a **bounded delta of changed file IDs** (a change feed, *not* a `files.list`
  enumeration) — and **intersect** those IDs with the org's non-CANCELLED `DOCUMENT_CONTEXT`
  file_ids (the exact org-scoped query `source-health.service.ts` uses). Only intersecting
  (already-imported, already-trusted) files are revalidated. We never list Drive files and
  never touch a file we did not already import.
- **Removed / trashed / access-revoked files:** a change to an imported file triggers
  revalidation; `revalidateImportedDocForCaller` already maps 404→`SOURCE_DELETED`,
  403→`ACCESS_REVOKED`, changed-hash→`CHANGED_UPSTREAM` — snapshot-preserving, never
  destructive. (`changes.list` also flags `removed`/`trashed`; those map to the same
  revalidation, which records the demotion.)
- **Pagination bound:** cap `changes.list` at `MAX_CHANGES_PAGES_PER_NOTIFICATION` pages per
  notification; on overflow, process the fetched pages, advance the cursor to that point, and
  let the Slice-1 daily cron backstop the remainder. This bounds amplification from a burst
  of Drive activity.
- **Quota amplification bound:** per-org quota (`incr`) + per-resource debounce (reused from
  Slice 2) + the page cap above. Only imported-set intersections ever cause a pull, so a busy
  Drive with no imported-file changes costs one `changes.list` and zero pulls.
- **Duplicate notifications:** message-number dedupe + per-resource debounce (§6 steps 8, 11);
  the cursor also makes re-delivery idempotent (a replayed notification re-lists from the same
  token and finds the same, already-processed delta).
- **Renewal:** Google channels **cannot be "renewed" in place** — renewal = **create a new
  channel (new `channel_id`) with a fresh expiration, carrying the *current* `drive_page_token`
  forward, then `channels.stop` the old one** (§9). Confirmed, not assumed.
- **Replacement overlap:** the new channel is `ACTIVE`; the old is linked via
  `replaced_by_channel_id` → `REPLACED`. During overlap both may deliver; both list from the
  same shared cursor and the per-resource debounce + cursor idempotency collapse it to one
  revalidation.
- **Old-channel stop:** best-effort `channels.stop(channel_id, resource_id)`; failure →
  `last_failure_code="PROVIDER_STOP_FAILED"`, retried by the renewal job, surfaced to ops.
- **Invalid Drive page token (a real v1 case — and it is SAFE, not a hard stop):** if
  `changes.list` returns HTTP 410 / an invalid-token error, recovery is **bounded**, never a
  full-Drive enumeration:
  1. **Resume forward** — `changes.getStartPageToken` to obtain a fresh "from now on" cursor.
     This *skips* the changes between the invalid token and now (a detection **gap**, not an
     enumeration), and that gap is **backstopped by the Slice-1 daily cron** which re-hashes
     every imported doc. Preferred default.
  2. **Close the gap immediately (optional)** — re-check only the org's *already-imported*
     file ids individually via the existing sweep (`sourceHealthSweepForCaller`) — bounded to
     the imported set, safe.
  The only forbidden path is a `files.list`-style enumeration of all Drive files, which this
  design never performs. (`changes.list` from a fresh start token is a delta feed, not an
  enumeration.) Emit `WATCH_NOTIFICATION_FAILED{code:"cursor_reset"}` for forensics.

---

## 6-block (Calendar). Calendar-specific contract — **HARD STOP in v1**

Defined for completeness and to fix the boundary; **not implemented in v1**.

- **Scope that would be watched:** the org's primary calendar via `events.watch` on the
  sealed org token.
- **`events.watch` registration + initial sync:** register a `web_hook` channel; initial
  sync would call `events.list` with no `syncToken`, then store the returned `syncToken`.
- **`syncToken` storage/advancement:** `calendar_sync_token` column, advanced transactionally
  only after successful processing (§6 step 14).
- **Attendee-response / cancellation / deletion / recurring instances:** each is an
  `events.list?syncToken` delta the handler would fan into the existing MEETING sink
  (`closedRecipientSet` + `fanOutInternalNotifications` + `cancelMeetingSideEffects`).
- **Reassignment / access revocation:** revoke the channel, fall back to nothing (calendar
  is not swept by Slice 1).
- **HTTP 410 / invalid syncToken:** Google requires a **full re-synchronization** (drop the
  token, `events.list` from scratch). **This is broad sync of the calendar** — a direct
  conflict with the "no broad sync/crawl" doctrine.
- **Why HARD STOP (two independent blockers):**
  1. **No sealed-token event-content read exists.** The only sealed-token calendar read is
     `getCalendarFreeBusyForOrg` (busy intervals, no titles/attendees/content). There is no
     wired `events.list` content read on the sealed org token — so there is nothing safe to
     revalidate a calendar change *into*. Building one is new provider-read surface + a
     product decision about how much calendar content Otzar should custody.
  2. **410 forces broad sync.** Even with a content read, `syncToken` invalidation mandates a
     full calendar resync, which the doctrine forbids for a governed/selected scope.
- **Consequence:** the `/google/calendar` route exists but returns `202
  quarantined{calendar_sink_not_wired}` — **identical to Slice 2** — until a founder
  product/security decision resolves both blockers. This is surfaced as **Open Decision
  OD-1 (§12)**.

---

## 8. Channel registration + renewal service contracts (design-only)

**Registration service** (`registerWatchChannel`, design-only):
1. **Authority gate** — the `(org, actor)` MUST be in `parseRecheckTargets(SOURCE_RECHECK_TARGETS)`; else refuse. Demo org is never listed ⇒ ineligible. Actor must be `ACTIVE` and `getOrgEntityId(actor)===org`.
2. **Scope guard** — inside a transaction, `SELECT ... FOR UPDATE` on the scope index; refuse if an `ACTIVE` non-expired channel already covers `(provider, kind, external_id, org)` (unless renewal).
3. **Token generation** — generate a high-entropy channel token (crypto random), compute `callback_token_hash = HMAC-SHA256(token, WATCH_CHANNEL_TOKEN_HMAC_KEY)`. **The plaintext token is sent to Google and then discarded** — only the hash is persisted.
4. **Persist PENDING first** — insert the `WatchChannel` row (`state=PENDING`, `channel_id` app-generated) **before** the provider call, so a callback arriving mid-registration can still be authenticated and the channel is always tracked.
5. **Provider request** — call `changes.watch` (Drive v1; seed `drive_page_token` from `changes.getStartPageToken` first) / `events.watch` (Calendar, deferred) with `{id: channel_id, type:"web_hook", address: WATCH_CALLBACK_BASE_URL + route, token}` on the sealed org token.
6. **Persistence order + rollback:**
   - If `watch()` **fails** → set `state=FAILED`, `last_failure_code`; surface to ops. (No live Google channel exists.)
   - If `watch()` **succeeds** → update the row with `google_resource_id`, `expires_at`, `state=ACTIVE`. If **that update fails**, a live Google channel now exists but is under-recorded: the row still has `channel_id`+`callback_token_hash` (so callbacks authenticate), retry the update; if it permanently fails, set `state=FAILED` and emit `WATCH_CHANNEL_REGISTRATION_FAILED` with `channel_id` so ops can `channels.stop` it manually. **Documented residual risk** — a transactional "call provider inside DB tx" is impossible (the provider is external), so PENDING-first + reconcile is the safest achievable ordering.
7. Audit `WATCH_CHANNEL_REGISTERED` (leak-safe).

**Renewal scheduler** (`node-cron`, reuse the Slice-1 scheduler pattern; in-process
non-overlap guard):
- Select `state=ACTIVE AND expires_at < now()+RENEWAL_WINDOW` (index `[expires_at,state]`).
- For each: set `renewal_status=IN_PROGRESS`; **create a replacement channel** (registration
  path, new `channel_id`); on success link `old.replaced_by_channel_id=new.channel_id`, set
  `old.state=REPLACED`, `renewal_status=OK`, then **best-effort `channels.stop(old)`**.
- **Overlap window** — keep the old channel deliverable until the replacement's first
  successful handshake/notification or a short grace TTL; the per-resource debounce prevents
  double-processing.
- **Max renewal retries** — `MAX_RENEWAL_RETRIES` (e.g. 3) with `consecutive_failure_count`;
  on exhaustion set `renewal_status=STALE`, `state=EXPIRED`, emit `WATCH_CHANNEL_RENEWAL_STALE`.
- **Fallback** — a `STALE`/`EXPIRED` resource is still covered by the **Slice-1 daily cron
  recheck** (`sourceHealthSweepForCaller`), so loss of a channel degrades to slower detection,
  never to blindness. This is the graceful-degradation guarantee.
- **Operator-visible failure state** — `state`, `renewal_status`, `consecutive_failure_count`,
  `last_failure_code` are all queryable; an ops read-model (`GET /api/v1/otzar/watch-channels`,
  admin own-org) can surface them. (Read-only; no CT bundle change required for v1 — audit
  rows already surface outcomes.)

**Renewal ≠ in-place refresh** — explicitly: a Google channel is **replaced**, not renewed;
the new channel has a new id and the old is retired. The schema's `replaced_by_channel_id`
encodes exactly this.

---

## 9. Threat model

| Threat | Defense |
|--------|---------|
| Forged `X-Goog-*` headers | Headers establish nothing on their own; authority is the `X-Goog-Channel-Token` verified against `callback_token_hash` + the persisted binding. A forged header set without the matching token → `401`. |
| Leaked channel token | Token is per-channel, high-entropy, stored only as a keyed HMAC hash; a leak lets an attacker replay *that one channel's* notifications (which only trigger a re-fetch of an already-trusted, snapshot-preserving source — no mutation, no data exfil). Mitigation: rotate by revoking + re-registering the channel (new token); the HMAC key can be rotated org-wide. |
| Channel-id guessing | `channel_id` is a UUIDv4 (122 bits); knowing it still requires the matching token. |
| Replayed notification | `claimOnce("google_msg:"+channel_id+":"+messageNumber, ttl)` single-use; replay → `200 deduped`, no re-processing. |
| Resource-id substitution | `X-Goog-Resource-Id` must equal the persisted `google_resource_id` (§6 step 6); mismatch quarantines before any pull. |
| Valid token, wrong route/provider | Route provider must equal `WatchChannel.provider` (§6 step 4) — a Drive token replayed at `/calendar` is rejected. |
| Expired-but-still-delivering channel | State/`expires_at` gate (§6 step 7) + best-effort `channels.stop`. |
| Duplicate delivery during renewal overlap | Per-resource debounce collapses old+new channel deliveries of the same change to one revalidation. |
| Actor suspended after channel creation | Re-validated ACTIVE **on every callback** (§6 step 10); a suspended actor's callback quarantines and the channel is flagged for revoke. |
| Connector revoked after channel creation | `getProviderAccessTokenForOrg` returns `NOT_CONNECTED` → `revalidateImportedDocForCaller` yields `REVALIDATION_UNAVAILABLE` (never demotes) → `503` transient; renewal job revokes the now-unusable channel. |
| Cross-org channel collision | Org is resolved **only** from the `WatchChannel` row bound at registration under the allowlist; a callback cannot assert a different org. Channel scope guard prevents a second org registering the same channel_id (PK unique). |
| Timing attacks | Constant-time HMAC hash compare (`timingSafeEqual`, length-checked) — the `inbound-hmac.ts` precedent. |
| Log leakage | No-leak invariant: token/hash/sealed-token/access-token/raw-body never logged or put in audit details; extend the existing `no-leak-guard` unit test to the new service + route. |
| Callback amplification | IP rate-limit (`google_webhook`) + per-org quota + per-resource debounce; a flood of forged callbacks is bounded and never reaches a pull (fails at token verify). |
| Cursor rollback / skip | `drive_page_token` advances **only in the same transaction as the processed result** (§6 step 14). A failed `changes.list`/pull leaves it unadvanced → the Google retry re-lists the same delta (idempotent sink). An invalid-token reset resumes *forward* (never backward) and the skipped gap is backstopped by the Slice-1 cron — a cursor can never silently skip an imported-file change without a backstop. |
| Partial processing then retry | Debounce marker is released on a transient failure so the Google retry re-processes; the revalidation sink is idempotent + snapshot-preserving, so a re-run cannot corrupt a source. |
| Malicious attempt to target the demo org | Demo org is not in `SOURCE_RECHECK_TARGETS` ⇒ **no channel can be registered for it** (registration authority gate) ⇒ no callback can ever resolve to it. Structural, not a runtime check. |

---

## 10. Test matrix

**A. Integration-proven (no real Google; injected fixtures + `MemoryNonceStore` + injected
`fetchDocText`/provider seams):**
1. Valid Drive callback (known channel, correct token) → `changes.list` delta intersects an imported file → `SOURCE_REVALIDATION_TRIGGERED` + cursor advanced + `200`.
2. Valid Calendar callback → `202 calendar_sink_not_wired` (v1 boundary).
3. Missing `X-Goog-Channel-Token` → `401`, no mutation.
4. Wrong token → `401`, constant-time path.
5. Stale/revoked/expired channel → `202 channel_inactive` (+ stop attempted).
6. Unknown channel id → `202 unknown_channel`.
7. Mismatched `X-Goog-Resource-Id` → `202 resource_id_mismatch`.
8. Provider/route mismatch (Drive token at `/calendar`) → `202 provider_route_mismatch`.
9. Replay (same message number) → `200 deduped`.
10. Renewal-overlap duplicate (old+new channel, same file change) → one revalidation (debounce).
11. Actor suspended after creation → `202 actor_guard_failed`.
12. Connector revoked after creation → `503 transient`, no demotion.
13. Org mismatch impossible-by-construction — assert org is read only from the row (a body-supplied org is ignored).
14. **Demo-org registration rejected** — `registerWatchChannel` for the demo org → refused (allowlist).
15. Cursor advancement only after success — a valid callback advances `drive_page_token` to `newStartPageToken` in the same tx as the processed result.
15b. `changes.list` delta with **no** intersecting imported file → `202 no_matching_imported_source` **and cursor still advanced** (changes were real, just not ours).
15c. Invalid page token (410) → forward reset via `getStartPageToken` (no `files.list` enumeration), `WATCH_NOTIFICATION_FAILED{cursor_reset}`, Slice-1 backstop asserted.
15d. Changes-page overflow (`> MAX_CHANGES_PAGES_PER_NOTIFICATION`) → bounded processing + cursor advanced to fetched point + remainder left to cron.
16. Transient `changes.list`/pull failure → cursor NOT advanced + debounce released → retry re-processes.
17. Malformed headers → `400 missing_google_headers`.
18. Oversized body/header → `413 oversized`.
19. Cookie-only request → `401` (cookie is not authority).
20. Bearer-only request → `401` (bearer is not authority).
21. No sensitive log/audit leakage — extend `no-leak-guard`.
22. Handshake `X-Goog-Resource-State: sync` → `200/202` no-op.
23. Registration rollback: `watch()` succeeds but DB update fails → row `FAILED`, `channel_id` recorded for manual stop.
24. Renewal creates replacement + links `replaced_by_channel_id` + stops old (best-effort).

**B. Synthetic live callback proof (deployed, Meridian only — no real Google watch):**
- Hand-craft signed `X-Goog-*` requests (we hold the HMAC key, so we can mint valid tokens
  for a test channel we insert) and POST to the live route — proving auth/replay/dedupe/
  quarantine/provider-mismatch live, exactly as Slice 2 was synthetically proven. **No real
  Google channel, no demo-org row, no source mutation.**

**C. Real Google watch proof (requires external founder setup — gated):**
- After (a) domain verification and (b) schema approval + a real `changes.watch` registered
  for the Meridian org connection: edit an imported doc in Drive → observe the real callback
  → `changes.list` delta intersects that imported file → observe the `CHANGED_UPSTREAM`
  transition on the Meridian `WorkLedgerEntry` + cursor advance → confirm no demo-org touch,
  no token leak, snapshot preserved. **This tier cannot run until the founder completes the
  external actions.**

Separation is explicit: **A** is CI-gated and fully achievable now (post-approval); **B** is
a live synthetic proof needing only the deploy + secret; **C** needs the external Google
setup and is the true end-to-end acceptance.

---

## 11. Approval packet

**Proposed migration:** the additive `WatchChannel` model in §4 (one new table, no
alter/drop), shipped via guarded `db push` (ADR-0025). Optional raw partial-unique index is
**not** adopted (OD-3).

**External founder actions (only a human can do these):**
1. **Verify `api.otzar.ai`** (or the chosen callback host) as a domain in Google Search
   Console / Cloud Console, with a valid (non-self-signed) SSL cert. Google refuses to
   register a `web_hook` channel to an unverified callback.
2. **Approve the additive `WatchChannel` schema** for a guarded `db push` against the
   production DB.
3. Approve **Drive-v1 scope = `changes.watch` (one channel per org connection) + `changes.list` intersected with the imported source set**, Calendar deferred. *(Verified: `changes.watch` is Google's reliable mechanism for Doc content edits; `files.watch` is not.)*

**Secrets / configuration required:**
- `WATCH_CHANNEL_TOKEN_HMAC_KEY` — **new secret**, generated once, set on FND Render.
  Optional-at-boot / **fail-closed at registration + callback** (unset ⇒ no registration and
  all callbacks `401`), mirroring `INBOUND_SIGNAL_SECRET`.
- `WATCH_CALLBACK_BASE_URL` — the verified HTTPS base (e.g. `https://api.otzar.ai`).
- Registration authority reuses the existing `SOURCE_RECHECK_TARGETS` (no new allowlist).
- No Google OAuth scope change (Drive/Calendar scopes already granted).
- **No Pub/Sub** (corrected 2026-07-09 — Drive/Calendar `web_hook` post directly to the callback).

**Expected code files (Slice 3 implementation, when GO'd):**
- `packages/database/prisma/schema.prisma` — `WatchChannel` model (schema STOP).
- `packages/database/src/queries/audit.ts` — additive `WATCH_*` vocab (union + array).
- `packages/database/src/queries/watch-channel.ts` — typed WatchChannel queries.
- `apps/api/src/services/otzar/watch-channel.service.ts` — register / renew / stop / revoke.
- `apps/api/src/services/otzar/inbound-google-webhook.service.ts` — the §6 state machine.
- `apps/api/src/routes/inbound-google-webhook.routes.ts` — the two provider routes + parser.
- `apps/api/src/services/otzar/watch-renewal.cron.ts` — renewal scheduler (or fold into the Slice-1 scheduler).
- `apps/api/src/middleware/gateway.middleware.ts` — `google_webhook` rate-limit entries.
- `apps/api/src/server.ts` — route registration + `BuildAppConfig` store threading.
- `tests/integration/inbound-google-webhook.test.ts` + `watch-channel.test.ts` — matrix A.

**Deployment sequence (Foundation-first, per cross-repo discipline):**
1. Founder: domain verify + schema approval + generate `WATCH_CHANNEL_TOKEN_HMAC_KEY`.
2. Guarded `db push` of `WatchChannel` (approved).
3. FND PR with code + matrix-A tests → 5 CI checks green → squash-merge.
4. Set `WATCH_CHANNEL_TOKEN_HMAC_KEY` + `WATCH_CALLBACK_BASE_URL` on FND Render → manual deploy → poll live.
5. Matrix **B** synthetic live proof on Meridian.
6. Register a real `changes.watch` for the Meridian org connection → matrix **C** end-to-end.

**Rollback sequence:**
1. Disable registration (unset the allowlist entry / feature flag) — no new channels.
2. `channels.stop` all live channels (loop over `state=ACTIVE`), set `state=REVOKED`.
3. Route returns `404`/inert (or unregister it).
4. `WatchChannel` table can remain (inert) or be dropped via guarded `db push`. **Snapshot-
   preserving sinks are untouched, so there is no business-data to roll back.**

**Unresolved product / security decisions:**
- **OD-1 — Real Calendar webhooks (HARD STOP).** Requires a founder decision on (a) building
  a sealed-token `events.list` *content* read and how much calendar content Otzar custodies,
  and (b) accepting or bounding the 410 full-resync broad-sync implication. Until resolved,
  Calendar stays `calendar_sink_not_wired`.
- **OD-2 — `files.watch` per-file mode (rejected, recorded for completeness).** Considered
  and rejected: `files.watch` does not reliably fire on Google Doc content edits (verified
  vs Google docs), so v1 uses `changes.watch`. No action needed unless Google's behavior
  changes.
- **OD-3 — DB partial-unique active-scope index.** Stronger DB guarantee vs. renewal-overlap
  friction. Default: **not adopted** (app-layer guard + debounce suffice).
- **OD-4 — Callback host + DNS ownership** (which verified domain; who holds DNS).
- **OD-5 — HMAC key scope** (one global `WATCH_CHANNEL_TOKEN_HMAC_KEY` vs per-org) and
  rotation policy.
- **OD-6 — Optional ops read-model / CT surface** for channel health (audit rows already
  surface outcomes; a dedicated view is optional).

**Explicit GO required from the founder:** Slice 3 implementation may begin **only** after
the founder states, in substance:

> "GO Slice 3 Drive v1: I approve the additive `WatchChannel` schema for guarded `db push`,
> I have (or will) verify `<callback host>` as a Google domain, generate
> `WATCH_CHANNEL_TOKEN_HMAC_KEY`, and I approve Drive scope = `changes.watch` (one channel
> per org connection, `changes.list` intersected with the imported source set) with Calendar
> deferred (OD-1)."

Absent that, this remains design-only. **No Slice-3 code, schema, migration, secret, Render
change, Google Cloud/Search-Console action, or deployment is to be performed.**
