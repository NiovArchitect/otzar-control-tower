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

## BUG B — follow-up send-cards disappear after navigation — **root-caused; repair scoped**

- **Root cause:** `Comms.tsx` rebuilds send-cards only from the volatile
  ingest response; nothing reloads the durable pending follow-ups on mount.
- **Repair (smallest correct, reuses existing rails):**
  1. On Comms mount, query the caller's **durable pending follow-ups** — Work
     Ledger rows of a follow-up/commitment type in a pre-send state
     (PROPOSED/DRAFT) carrying a draft + proposed recipient. `getMyWork`
     already returns these with `routing` + `proposed_action_id`; a filtered
     read (or a small `pending-follow-ups` projection) is the source.
  2. Render those rows as ProposedActionCards (the SAME component) so Send /
     review / edit resume with the correct governed shape (now fixed by A).
  3. On send/dismiss, patch the durable row status so the card leaves the
     pending set and the change reflects in My Work/Team Work.
- **No new persistence system** — the ledger is the store. This is a CT
  read-back + a status-patch wire, plus possibly one FND `pending-follow-ups`
  filter if `getMyWork` proves too broad.

## BUG C — outside-context recipient review incomplete — **root-caused (depends on B)**

- **Root cause:** the recipient-governance "review before sending" verdict
  (`Comms.tsx:889`, `ProposedActionCard` `sendBlocked`) blocks Send but the
  card offers no durable confirm/change-recipient/approve path; and because
  the card itself is volatile (BUG B), any review state is lost on navigation.
- **Repair:** once B makes the card durable, add the review completion:
  confirm recipient / change recipient (updates the payload's
  `recipient_entity_id`) / approve → unlock Send; feed the confirmation into
  recipient governance as a correction. Confirm survives navigation via the
  same durable row.

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

1. After ingestion, follow-ups are durable. — backend ✅; **Comms read-back = BUG B**
2. Send works for valid internal drafts. — **✅ (BUG A fixed)**
3. Outside-context recipient review can be completed. — **BUG C**
4. Pending drafts survive navigation/refresh. — **BUG B**
5. Failed sends remain recoverable. — **BUG B** (row stays pending on failure)
6. All pending work appears in an obvious surface. — My Work/Team Work ✅; Comms resume = BUG B
7. No duplicate follow-up systems. — ✅ (ledger is the single store; no parallel system introduced)
8. People connectedness is accurate. — data ✅; **framing = BUG D**
9. No fake claims. — ✅
10. Customer does not need to re-ingest. — backend work persists ✅; **Comms resume UX = BUG B**

## Live-smoke checklist (run after B/C land)

ingest → see follow-ups → leave Comms → return → pending follow-ups still
shown → Send one valid → refresh → sent one gone from pending, unsent remain →
complete a recipient review → confirm items in My Work/Team Work/Action Center.
(Today: the underlying work is already verifiable in My Work; BUG A makes Send
succeed for valid drafts.)
