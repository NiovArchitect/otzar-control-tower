# Otzar Comms ingestion — ETL durability & wiring repair (P0)

**Status:** 2026-07-02 (Fable 5). Grounded in grep + live probes against
production. **BUG A is FIXED + shipping; B/C/D are root-caused with exact
repair points below.** No fake claims: every "durable/volatile" statement is
verified against the code.

## The correct ETL loop (target)

transcript → extracted facts → decisions/commitments/blockers → proposed
follow-ups → **durable pending actions** → recipient/owner review →
send/approve/edit/dismiss → audit/proof → work ledger / org memory / Data-360
feedback. **No extracted work may live only in volatile page state.**

## What is durable vs volatile today (verified)

- **Durable (backend, WorkLedger):** `POST /otzar/comms/ingest`
  (`otzarService.ingestComms`) persists the conversation AND creates per-owner
  Work Ledger rows. These already appear in My Work / Team Work / Blind Spots
  and survive navigation/refresh. **The extracted work IS durable.**
- **Volatile (CT only):** `Comms.tsx` holds the ingest/extraction **response**
  in `useState` (`extraction`, `ingest`) and renders the follow-up
  **send-cards** (ProposedActionCard) from it. The mount effect
  (`Comms.tsx:166`) only wires cleanup — it does **not** reload pending
  follow-ups. So the *send-cards* vanish on navigate-away, even though the
  underlying work persists. **This is BUG B: a read-back gap, NOT missing
  persistence.**

## BUG A — invalid follow-up send shape — **FIXED (CT `c3a4c14`)**

- **Root cause:** Foundation's `SEND_INTERNAL_NOTIFICATION` validator
  (`action-payload-validators.ts:339`) caps `body_summary` at
  `NOTIFICATION_BODY_SUMMARY_MAX_CHARS = 200` — it is the recipient-visible
  summary line. CT (`api.ts sendInternalNotification`) sent the **entire
  drafted follow-up** as `body_summary`, so any draft > 200 chars was rejected
  `INVALID_FIELD` → "Otzar could not send that — the request shape is invalid."
- **Fix:** `body_summary = summarizeNotificationBody(draft)` (trim + clamp
  ≤200 on a word boundary) and the **full draft** preserved in
  `body_redacted.body` (bounded Json the validator already accepts). No
  backend change, no governance bypass, no content loss. Tests:
  `notification-body.test.ts` (5).

## BUG B — follow-up send-cards disappear after navigation — **IMPLEMENTED (FND `85fdfbe` merged+deployed; CT reload slice code-complete). Closes on CT deploy + live smoke.**

Traced end-to-end through `comms-ingest.service.ts` + `comms-extract.service.ts`
+ `work-ledger.service.ts` + `Comms.tsx`:
- The follow-up **send-cards** render from `extraction.suggested_actions`
  (`Comms.tsx:611` → `FollowUpCard` → `ProposedActionCard`), held in volatile
  `useState`.
- `ingestComms` → `ingestTranscript` **persists work_items** (durable
  WorkLedger rows: owners, commitments, tasks — these already show in My
  Work/Team Work and survive refresh) **and returns** `suggested_actions`,
  **but does NOT persist the drafted follow-up notes.** The ledger row carries
  `proposed_action_id`/`details`/title/owner — **not** the follow-up
  `draft_text` or its recipient.
- `work_items` and `suggested_actions` are **separate collections with no join
  key**, so a draft cannot attach to a work_item row.
- **Therefore the drafted follow-up note text is genuinely the one ephemeral
  thing.** Everything else (the conversation via `MeetingCapture`, the work
  via WorkLedger) is already durable.

**Pinned repair (single store = the Work Ledger; ZERO migration) — corrected
2026-07-02.** The earlier note here proposed a new `MeetingCapture.extraction
Json?` column. That was **wrong and self-contradicting**: this repo's own
data-flow contract (line 38 + load-bearing rule 2) already designates the
durable home for a follow-up draft as a **`WorkLedgerEntry` with
`ledger_type "FOLLOW_UP"`**, and forbids a second follow-up store. A capture
column WOULD be that forbidden second store. Confirmed against the schema:

- `WorkLedgerEntry.ledger_type` is a **free `String`** (no enum) — `"FOLLOW_UP"`
  needs **no migration**. The row already carries every field required:
  `conversation_id` (= the `meeting_capture_id`), `target_entity_id` (the
  recipient), `owner_entity_id`/`requester_entity_id` (the drafter/sender),
  `proposed_action_id`, `audit_event_id`, `status` (DRAFT→EXECUTED/CANCELLED),
  and `details`/`evidence` Json for the send-card payload.
- A durable projection over exactly these rows **already exists**
  (`comms-artifacts.service.ts` `getRecentCommsArtifacts`, route
  `/work-os/comms/recent-artifacts`) and already maps a `FOLLOW_UP` artifact
  type — the architecture always intended FOLLOW_UP ledger rows to be the store.
  **The only gap is that ingest never writes them, and the projection doesn't
  carry the send-card payload.**

**The fix (service-only):** (1) at ingest, persist each `suggested_action` as a
`FOLLOW_UP` ledger row (`conversation_id` = capture, owner/requester = caller,
`target_entity_id` = resolved recipient, `status "DRAFT"`, `details.follow_up`
= `{ local_id, action_type, draft_text, source_excerpt, reason,
resolution_status, target, recipient_governance, autonomy }`); (2) a
caller-scoped `getPendingFollowUps` projection + route
`GET /work-os/comms/follow-ups` returning pending FOLLOW_UP rows with that
payload; (3) exclude `FOLLOW_UP` from My Work / Team Work / Blind Spots (the
COMMITMENT row already carries the obligation — the draft is the sender's
private pending send, not double-counted work); (4) CT re-renders the SAME
ProposedActionCards from the durable rows on mount. Send (fixed by A) →
`PATCH /work-os/ledger/:id` status `EXECUTED` + `audit_event_id` (the existing
transition; the caller owns the row so the authority guard passes); dismiss →
`CANCELLED`; failed sends stay `DRAFT` and reappear on return.

**Why it's still a reviewed cross-repo PR sequence (but NOT a migration):**
FND service + projection + route + tests land first as a reviewed PR → CI →
merge → deploy; the CT reload PR consumes it second — the #519/#520/#521
pattern. The earlier "protected-repo schema migration / cloud-sync hazard"
justification is retracted: there is no schema change.

## BUG C — outside-context recipient review incomplete — **FIXED + LIVE-VERIFIED (FND `d280cfc` / PR #523; CT `fcb2a2a`)**

- **Root cause:** the recipient-governance verdict blocked Send but the card
  offered no completion path; and (pre-B) any review state was volatile.
- **Fix (governance rule ratified):** on the durable FOLLOW_UP row,
  `POST /work-os/comms/follow-ups/:id/resolve-recipient` —
  **confirm** unlocks `out_of_scope`/`likely` (the caller vouches; proof source
  becomes the distinct `caller_confirmed`, `autonomyEligibility: draft_only`,
  audited via `ADMIN_ACTION`/`FOLLOW_UP_RECIPIENT_RESOLVED`, pointer on the
  row); **select** resolves `ambiguous` to a server-supplied id-based candidate
  (`select_candidates` — employees can't read `/org/entities`, and display
  names never resolve identity); **`unauthorized` and
  `cross_team_needs_approval` are NEVER caller-overridable** (honest human
  copy; API 403; no fake approval completion). The decision lives on the same
  WorkLedger row → survives navigation/refresh (live-smoked: confirm → leave →
  return → still confirmed, Send unlocked; approval boundary intact).
- **Learn-loop (honest):** `classifyRecipient` accepts aliases/excludeEntityIds
  but ingest does not load corrections yet, so confirm/select does NOT write
  correction memory — server-side TODO(learn-loop) only.

## BUG D — People & Collaboration "not connected" framing — **root-caused (live-probed); FND copy fix**

- **Truth (probed):** `/otzar/dandelion/org-growth` returns `CONNECT_TEAMMATE`
  recommendations for Shweta/Annie/Walter/Sadeil/Samiksha. The backend is
  **correct** that they have no **project/workspace** membership — it is NOT
  reading the wrong source.
- **The defect is the COPY:** "isn't connected to any project or workspace
  yet" reads as *disconnected from the org*, but they ARE connected via
  hierarchy/team/manager (seeded Phase 1). Per rule D.4, the UI must not imply
  disconnection. The recommendation text is **server-generated**
  (`dandelionOrgGrowth`), so the fix is an FND copy change: reframe to
  acknowledge the existing connection ("On David's team, no project yet —
  add them to a project so Otzar has work context") + keep the actionable
  next step. Dismiss persistence (currently session-local) should also become
  durable.

## Customer acceptance criteria

1. After ingestion, follow-ups are durable. — **✅ (BUG B fixed + live-verified)**
2. Send works for valid internal drafts. — **✅ (BUG A fixed)**
3. Outside-context recipient review can be completed. — **✅ (BUG C fixed + live-verified)**
4. Pending drafts survive navigation/refresh. — **✅ (BUG B)**
5. Failed sends remain recoverable. — **✅** (live-proven: governance-rejected send stays DRAFT)
6. All pending work appears in an obvious surface. — ✅ (My Work/Team Work + Comms resume)
7. No duplicate follow-up systems. — ✅ (ledger is the single store; no parallel system introduced)
8. People connectedness is accurate. — data ✅; **framing = BUG D (open)**
9. No fake claims. — ✅
10. Customer does not need to re-ingest. — ✅

## Live-smoke checklist (run after B/C land)

ingest → see follow-ups → leave Comms → return → pending follow-ups still
shown → Send one valid → refresh → sent one gone from pending, unsent remain →
complete a recipient review → confirm items in My Work/Team Work/Action Center.
(Today: the underlying work is already verifiable in My Work; BUG A makes Send
succeed for valid drafts.)
