# Otzar Control Tower — Section 12B context

## How to read this file (added 2026-05-28)

This file is **untracked** by repo policy — operator-tier continuity
context. Update discipline (newest-first):

1. **Newest content lives at the top.** Each closeout / status update
   is appended immediately below the Founder Directive section, above
   the previous closeout. The two-track disclaimer directly below this
   subsection + the Founder Directive are stable preamble and are not
   moved.
2. **Legacy sections are preserved verbatim** for continuity + audit;
   sections without an explicit "STILL CURRENT" stamp **must be
   treated as historical**. The legacy Section 12B operator journal
   around lines ~304 onward (cross-repo state table, architectural
   inventory pre-Wave-1, 12C-NEXT queued items) is explicitly stale
   for `main` per the two-track disclaimer below; it remains for
   reference but is **not** authoritative current state.
3. **Rule 0 — Documentation-First / No-Guessing.** When this file's
   text disagrees with Foundation or Control Tower code at the
   current HEADs, code with file:line evidence is current behavior;
   this file is architectural intent until reconciled. Do not
   silently merge the two — surface the conflict per RULE 13.
4. **Cross-repo HEADs** (current as of last closeout):
   - Foundation `main`: see top closeout sections for current HEAD
   - Control Tower `main`: see top closeout sections for current HEAD

Future Claude Code sessions: load the top three sections (this
subsection + the two-track disclaimer + the Founder Directive)
first, then the most recent closeout, then the Foundation 12C.0
status update, before reading anything below.

---

> **TWO TRACKS LIVE IN THIS REPO — read this first.**
> The sections further below (12A → 12C) document the **org-admin Control
> Tower** surface (Section 12B; `can_admin_org`). Their cross-repo table /
> HEADs predate the second track and are **stale** for `main`.
> A separate **Employee Otzar** track is what currently tops `main`
> (`can_read_capsules`, employee `/app` shell): Phase-1 shell → approvals →
> My Twin/Conversations → Wave 1 transparency → Wave 2A role-scope →
> trust-chain/CI → Wave 2B look-back → **Wave 2C correction signals**. The
> "Wave Closeout" sections immediately below are the authoritative state
> for that track (newest first). **This is NOT an MVP — see the Founder
> Directive immediately below.**

---

## 🚨 FOUNDER DIRECTIVE (2026-05-28) — production-grade, not MVP

**This is not an MVP path.** The target is a premium, production-grade
enterprise client launch. No required production section may be dismissed
as "later" merely because it is large. The correct response to complexity
is to **chunk more coherently**, not to defer.

**Method going forward:**

- Bigger but precise Claude Code prompts (QLOCKs).
- Full substrate verification before any plan recommendation (cross-repo,
  read-only grep + read of Foundation contracts, ADRs, and existing
  Control Tower surfaces).
- Clear ADRs where needed (and named).
- Exact backend contracts (route, body, response, error codes).
- Exact frontend surfaces (files, components, props, copy).
- Exact schema requirements (Prisma additions, indices, constraints).
- Exact tests (unit + integration + safety greps + scope check).
- Explicit safety / no-leak boundaries (forbidden tokens, forbidden UI).
- Branch / PR discipline (one feature branch → CI → review-status → squash
  merge → housekeeping → CONTEXT.md closeout).
- CONTEXT.md updated after every major close (newest first).

**Required production sections — none deferrable as "optional later":**

1. **Employee Intelligence Core** — observe / correction / safe context
   priority within scope. Wave 2B (look-back) + Wave 2C (correction
   signals) are the first two real-content surfaces of this core.
2. **Autonomous Execution Core** — bounded, governed, audit-aware.
3. **Hives / Team Intelligence** — multi-twin coordination under explicit
   permission bridges.
4. **MCP / Connectors** — external-tool integration under policy.
5. **Agent Playground** — safe simulation and dry-run surface.
6. **Enterprise Analytics** — read-only aggregates within sovereignty
   boundaries.
7. **Full Audit Viewer** — complete audit chain visibility for admins
   (not just clickable links from Stage-4 toasts).
8. **Billing / Entitlements** — capability gating + metered usage.
9. **Admin / Governance Control Tower** — reconcile the stale Section
   12B org-admin track table below against the current Employee track;
   land the org-admin surface as production-grade not MVP.
10. **Deployment / Security / Go-Live Operations** — environments,
    secrets, observability, IR, DR, compliance posture.

**Do NOT** describe hives, Agent Playground, MCP/connectors, billing,
enterprise analytics, full audit viewer, or autonomous execution as
"later optional features." They are required production sections.
Sequencing may be staged; the architecture must account for all of them.

**Recommended next authorization:**

> **`[OTZAR-PRODUCTION-GO-LIVE-MASTER-GAP-AUDIT-QLOCK]`**

A read-only cross-repo audit (`niov-foundation` + `otzar-control-tower`)
that determines, per required production section:

- what is implemented (commit hashes)
- what is documentation-only (ADRs without code)
- what is mocked (MSW fixtures only, no Foundation contract)
- what is missing entirely
- what is unsafe to claim today
- what is required before enterprise go-live
- missing ADRs
- missing backend contracts (route + body + response + errors)
- missing frontend surfaces (files + components + copy)
- missing schema / audit / security / testing gaps
- what can run in parallel vs what must be sequential
- the exact production build order

---

## 🔧 Foundation 12C.0 batch — STATUS UPDATE (2026-05-28)

Cross-repo planning round (`[ADMIN-RECONCILIATION-AND-12C0-FOUNDATION-BATCH-PLANNING-QLOCK]`)
verified that **all four 12C.0 Foundation backend items are LIVE** on
Foundation at HEAD `c56bd5764eb23d3b762b84b672c6d3bb26c37fcf` per Rule 0
file:line evidence. The "Section 12C — NEXT" / "12C.0 Foundation
extension batch (queued)" content at ~L468–478 of this file is
**stale** for items (a)(b)(c)(d). Item (e) cross-wallet capsules +
member-consent remains queued (ADR-first; not yet implemented).

**Foundation 12C.0 D1–D4 — LIVE at HEAD `c56bd57`:**

- **D1 — `DELETE /api/v1/org/ai-teammates/:id/skills/:packageId`** at
  `apps/api/src/routes/org.routes.ts:1877` ("12C.0 (Item 1)" comment
  marker); response `{ ok: true, audit_event_id }`; audit emits
  `ADMIN_ACTION details.action="TWIN_SKILL_REMOVED"` at L1973.
  Integration: `tests/integration/audit-event-id-surfacing.test.ts:563-626`.
  → Closes 12B.3 Q5 RemoveSkillButton deferral on Foundation side.
- **D2 — `PATCH /api/v1/org/entities/:id` returns `audit_event_id`**
  at `apps/api/src/routes/org.routes.ts:585-676` (response shape at
  L673; "Closes the last sentinel" comment at L654); audit emits
  `ADMIN_ACTION details.action="ORG_ENTITY_UPDATE"`. → Closes the
  `"pending-foundation-extension"` sentinel on the Foundation side.
- **D3 — `GET /api/v1/org/audit?event_type=&actor_entity_id=&target_entity_id=`**
  server-side filters at `apps/api/src/routes/org.routes.ts:1020-1100+`
  ("12C.0 (Item 3) added 3 optional filters" at L1023); filters
  AND-narrow within org-scope (never widen); `event_type` validated
  against `AUDIT_EVENT_TYPE_VALUES` (51 literals); UUIDs validated
  at the route layer. Integration:
  `tests/integration/admin-routes.test.ts:483-619` (5 cases incl.
  cross-org leak guard at L596 "DRIFT 9").
- **D4 — `GET /api/v1/org/permissions?bridge_id=`** server-side
  filter at `apps/api/src/routes/org.routes.ts:915-985+` ("12C.0
  (Item 4) added optional ?bridge_id= filter" at L918); AND-narrows
  within org-scope; never widens. Integration:
  `tests/integration/admin-routes.test.ts:629+`.

**Remaining 12C.0 work is Control Tower consumer migration** (Lane B
of the planning packet) — separate CT-side feature branches:

- **B1**: `api.org.aiTeammates.removeSkill(twinId, packageId)` client
  method + audit-list JSDoc refresh at `src/lib/api.ts` (currently
  carries stale "ignores `event_type` and `actor_entity_id`" at L469).
- **B2**: `RemoveSkillButton` wired into
  `src/components/ai-teammates/TwinDetailDrawer.tsx` Skills tab.
- **B3**: Migrate audit consumers to pass server-side filters:
  - `src/components/ai-teammates/TwinDetailDrawer.tsx:236` (currently
    "Decision #23: client-side actor_entity_id filter until 12D"
    — Foundation has extended; remove client-side filter)
  - `src/components/users/MemberDetailDrawer.tsx:141` (same)
  - `src/pages/Home.tsx` recent-activity surface (if applicable)
- **B4**: Migrate `src/components/access-control/BridgeDetailDrawer.tsx:20-21`
  to pass `bridge_id` server-side; remove client-side filter.
- **B5**: Sentinel sweep — no remaining `"pending-foundation-extension"`
  strings in `src/**`.
- **B6**: Update CT MSW handlers to honor `?event_type=`,
  `?actor_entity_id=`, `?bridge_id=` filtering.

**Item (e) cross-wallet capsules + member-consent** remains queued
and is **ADR-first**, not implementation-ready. Patent-relevant claim
per L475 of the legacy 12C-NEXT section below. Forward-queued QLOCK:
`[ADR-0056-CROSS-WALLET-MEMBER-CONSENT-WRITE-AND-ACCEPT-AUTH]`.

**Cross-repo HEAD summary (current):**

| Repo | Branch | HEAD | Status |
|---|---|---|---|
| niov-foundation | main | `c56bd5764eb23d3b762b84b672c6d3bb26c37fcf` | Wave 2C + 12C.0 D1-D4 live |
| otzar-control-tower | main | `d0c9bcb6294ce1b9f126bb1400416780d42c7f36` | Wave 2C UI live; 12C.0 consumer migration pending |

**Substrate-honest correction surfaced in this planning round**
(RULE 13):

1. **ADR-0050 BG.2 is LIVE** (not "missing" — prior master audit
   was wrong); `apps/api/src/middleware/dual-control.middleware.ts:454`
   calls `markBreakGlassUsed`; ADR-0050 Status: Accepted 2026-05-22.
2. **12C.0 D1-D4 backend is LIVE** on Foundation (not "queued" — the
   legacy 12C-NEXT block at L468–478 below is stale for those four
   items).
3. **GAP-C1 self-approval block is CLOSED** at service tier
   (`apps/api/src/services/governance/escalation.service.ts:397`);
   **Phase E target-resolution remains OPEN** at L316 (placeholder
   `target_entity_id: callerEntityId`). Risk is **liveness**, not
   self-approval — auto-created PENDING dual-control escalations
   cannot be approved by anyone because GAP-C1 blocks
   caller-as-source and the placeholder collapses other identities
   to caller or null.
4. **GOVSEC.5 phase is CLOSED** per Foundation `docs/CURRENT_BUILD_STATE.md`
   2026-05-28 refresh + commit `3a9cce6`; ADR-0049 GOVSEC umbrella
   remains Proposed (GOVSEC.5 is one of 10 phases). ADR-0050 §BG.3
   carries "GOVSEC.5 remains OPEN" prose that pre-dates `3a9cce6`
   and is now stale; reconciliation queued as separate ADR-0050
   minor-amendment QLOCK.

**Forward-queued QLOCKs (Foundation-side, sequenced):**

- `[ADR-0026-AMENDMENT-1-PHASE-E-TARGET-RESOLUTION-WRITE-AND-ACCEPT-AUTH]`
- Phase E code + tests EXECUTE-VERIFY
- `[CI-NO-LEAK-GUARD-EXECUTE-VERIFY-AUTH]`
- `[ADR-0056-CROSS-WALLET-MEMBER-CONSENT-WRITE-AND-ACCEPT-AUTH]`
- `[ADR-0050-MINOR-AMENDMENT-BG3-RECONCILIATION-WRITE-AND-ACCEPT-AUTH]`

**Control Tower-side queue:** Lane B (B1–B5 above), each on its own
feature branch under the standard CT discipline (typecheck 0 +
lint 0 + tests pass + build pass + dev HTTP 200 → branch → CI →
review-status → squash merge → housekeeping → CONTEXT.md closeout
at top, above this 12C.0 status update).

---

## ✅ Wave 2C — Correction Signals · CLOSED (2026-05-28)

End-to-end across Foundation and Control Tower. An employee can submit a
correction from an active Chat conversation that links to the
`conversation_id`; the Conversation Detail Drawer surfaces a safe,
scoped correction-signals count + last-seen + locked notes for any prior
conversation. Authoritative current `main` for the employee track is
**`d0c9bcb`**.

**1. Foundation — commit + backend contracts**
- `niov-foundation` main: **`c56bd5764eb23d3b762b84b672c6d3bb26c37fcf`** — *Add Otzar correction-to-conversation linkage*
- Foundation Wave 2C shipped: **ADR-0055 — Otzar Correction Signals and
  Drift-Prevention Continuity**, additive nullable
  `MemoryCapsule.conversation_id String? @db.Uuid` with composite index
  `@@index([wallet_id, capsule_type, conversation_id])`,
  `processCorrection` self-scope validation when `conversation_id` is
  provided (backward-compatible when omitted), CORRECTION-capsule
  `conversation_id` persistence, pure `projectConversationCorrections`
  mapper, `getConversationCorrections` service, barrel exports, unit +
  integration tests.
- Contracts consumed by Control Tower:
  - **`POST /api/v1/otzar/correction`** — body now accepts optional
    `conversation_id?: string`. Omitted ⇒ backward-compatible (capsule
    persists with `conversation_id: null`). Valid + caller-owned ⇒
    linkage persisted. Unknown ⇒ `CONVERSATION_NOT_FOUND` (404).
    Cross-caller ⇒ `NOT_CONVERSATION_OWNER` (403).
  - **`GET /api/v1/otzar/conversations/:id/corrections`** — **flat**
    response (fields at top level per ADR-0055 §Decision 5):
    `{ ok: true, conversation_id, corrections_count, has_corrections,
      last_correction_at: string|null, drift_prevention_note,
      continuity_note }`. Notes are LOCKED at the Foundation mapper and
    contain the two required anti-overclaim phrases verbatim.

**2. Control Tower — commit + frontend consumer**
- `otzar-control-tower` main: **`d0c9bcb6294ce1b9f126bb1400416780d42c7f36`** — *Add correction signals UI* (squash of PR #5; parent `0ae4620`)
- Added (8 files):
  - `src/lib/types/foundation.ts` — `CorrectionRequest.conversation_id?`;
    new `ConversationCorrectionsResponse` (flat shape, not nested).
  - `src/lib/api.ts` — `api.otzar.conversations.corrections(id)` →
    `GET /otzar/conversations/${encodeURIComponent(id)}/corrections`.
  - `src/components/employee/ConversationDetailDrawer.tsx` —
    `Correction signals` section with parallel `useQuery`. Renders
    count + last-seen + locked notes when `has_corrections`; "Not
    enough correction history yet." zero state; safe 403/404/generic
    error copy. **Corrections failure does not blank the drawer.**
  - `src/pages/app/Chat.tsx` — inline "Correct this conversation"
    affordance, visible only while `conversationId !== null`. Submits
    `incorrect_description` + `correct_behavior` + active
    `conversation_id`. No `target_capsule_id` exposed. Reset on close.
  - `tests/msw/handlers.ts` — `GET /otzar/conversations/:id/corrections`
    handler with `has_corrections` / zero / 403 / 404 / 500 fixtures;
    extended `otzarCorrectionHandler` with body recorder
    (`getRecordedCorrectionCalls` / `resetRecordedCorrectionCalls`) and
    403/404 self-scope sub-cases.
  - `tests/unit/otzar-api.test.ts` (+3): `correction` omits/includes
    `conversation_id`; `conversations.corrections` path + encoding.
  - `tests/unit/conversation-detail-drawer.test.tsx` (+5):
    has-corrections, zero, 403, 404, 500; renders the two anti-
    overclaim phrases; never renders any of the 12 forbidden fields.
  - `tests/unit/chat.test.tsx` (+2): affordance hidden until a
    conversation is active; submit passes `conversation_id`.
- **`src/pages/app/Corrections.tsx` deliberately UNCHANGED** —
  standalone surface, no conversation context, continues to omit
  `conversation_id`.
- Verification at merge: typecheck 0, lint 0, **test 88 passed / 21
  files**, build pass, install clean, dev HTTP 200. CI `verify` green
  on PR #5.

**3. Safety boundaries preserved**
- No raw correction payloads (`payload_summary`, `payload_content`).
- No `target_capsule_id`, `correction_capsule_id`, `storage_location`,
  `content_hash`, vectors, or embeddings rendered.
- No `employee_score`, `drift_score`, `manager_visibility`, or
  `best_practice_learned` fields rendered.
- No transcript UI, no raw message replay, no full conversation history.
- No surveillance / manager-monitoring / org-wide-aggregation framing.
- The Foundation mapper locks `drift_prevention_note` and
  `continuity_note`; the consumer renders them as-is, and the locked
  prose already contains the verbatim phrases **"This does not expose
  raw messages."** and **"This is not an employee score."**

**4. Safe to claim now**
- Otzar supports **safe correction-to-conversation linkage end-to-end**.
- Employees can submit a correction from an active Chat conversation;
  Control Tower passes `conversation_id` automatically.
- Foundation persists correction signals scoped to the caller-owned
  conversation.
- The Conversation Detail Drawer can show correction-signal count,
  last-correction relative time, the drift-prevention note, and the
  continuity note.
- The feature is governed — no raw messages, transcripts, correction
  payloads, capsule IDs, vectors, scores, manager visibility, or
  org-wide analytics are exposed.
- Corrections help the Twin prioritize future context within scope.

**5. Still NOT safe to claim**
- "best practice learned" / behavior permanently fixed
- autonomous drift prevention / full drift detection
- employee scoring / manager monitoring
- org-wide correction analytics
- raw transcript replay / raw message replay
- listener execution is live
- MCP / connectors are live
- hives / team collaboration is live
- Agent Playground is live
- autonomous execution is live
- enterprise reporting is complete
- billing / entitlements are complete
- full audit viewer is complete

**6. Founder directive** — see the **🚨 FOUNDER DIRECTIVE (2026-05-28)**
section above. Wave 2C is the second real-content surface of the
**Employee Intelligence Core** required production section. The next
authorization is the production go-live master gap audit, not a fresh
wave.

**Housekeeping (done):** Foundation + Control Tower Wave 2C feature
branches deleted locally and remotely; Foundation main synced at
`c56bd57`; Control Tower main synced at `d0c9bcb`; both working trees
clean; `AGENTS.md` and `CONTEXT.md` remain untracked in Control Tower
and were untouched during build operations.

---

## ✅ Wave 2B — Conversation Look-back · CLOSED (2026-05-27)

End-to-end across Foundation and Control Tower. An employee can open a prior
conversation and see a safe, self-scoped look-back. Authoritative current
`main` for the employee track is **`0ae4620`**.

**1. Date:** 2026-05-27

**2. Wave:** Wave 2B — Conversation Look-back (safe scoped continuity surfacing)

**3. Foundation — commit + exact backend contract**
- `niov-foundation` main: **`1ffa01d98e1842cc7a2f8123f8a7b9c2c277a68b`** — *Add Otzar conversation look-back detail*
- Contract: **`GET /api/v1/otzar/conversations/:id`** (Bearer, self-scoped)
  - Success `{ ok: true, conversation }` where `conversation` =
    `conversation_id, twin_id, source_type, status, started_at, closed_at,
    message_count, summary, topics[], summary_available, summary_capsule_id,
    detail_availability, transparency_available:false, continuity_note`
  - `detail_availability` ∈ `SUMMARY_AVAILABLE | NO_SUMMARY_YET | ACTIVE_NOT_CLOSED`
  - Errors: `404 CONVERSATION_NOT_FOUND`, `403 NOT_CONVERSATION_OWNER`
  - Foundation shipped: ADR-0054, additive `summary_capsule_id` on
    `OtzarConversation`, `closeConversation`/`degradedClose` setting it, a pure
    `projectConversationDetail` mapper, `getConversationDetail` service, the
    route, barrel exports, unit + integration tests. No transcript persistence,
    no raw message replay, no fake retrospective transparency, no fake
    `corrections_count`, no raw internals exposed.

**4. Control Tower — commit + exact frontend consumer**
- `otzar-control-tower` main: **`0ae4620c5b10f8bd29af6fcf16f149d0601fce98`** — *Add conversation look-back UI* (squash of PR #4; parent `537bfe9`)
- Added (8 files):
  - `src/lib/types/foundation.ts` — `ConversationDetailAvailability`,
    `ConversationDetail`, `ConversationDetailResponse`
  - `src/lib/api.ts` — `api.otzar.conversations.detail(conversationId)`
    (`GET /otzar/conversations/${encodeURIComponent(id)}`)
  - `src/components/employee/ConversationDetailDrawer.tsx` — right-side Sheet,
    fetches on open, per-availability + 403/404/generic states
  - `src/pages/app/Conversations.tsx` — list rows are now accessible buttons
    that open the drawer (no route change)
  - `tests/msw/handlers.ts` — `:id` fixtures for
    `SUMMARY_AVAILABLE / ACTIVE_NOT_CLOSED / NO_SUMMARY_YET / 403 / 404 / 500`
  - `tests/unit/otzar-api.test.ts` — `conversations.detail` path + encoding
  - `tests/unit/conversations.test.tsx` — list row → drawer open-detail
  - `tests/unit/conversation-detail-drawer.test.tsx` — state-matrix (6 states)
- Verification at merge: typecheck 0, lint 0, **test 79 passed / 21 files**,
  build pass, install clean. CI `verify` green on PR #4.

**5. Safety boundaries preserved**
- No transcript UI, no raw message replay, no full conversation history.
- No raw prompts / chain-of-thought / raw context / vectors / embeddings.
- No permission-envelope internals, bridge IDs, capability flags.
- No retrospective transparency history, no corrections count, no listener memory.
- No raw internal IDs rendered; `summary_capsule_id` exists in the type
  contract + MSW fixtures for fidelity but is **never rendered as visible UI**.
- Transcript language bounded to "This is not a transcript." + the existing
  governance notice. `transparency_available` is always `false` (live
  transparency is response-time only, not persisted per conversation).

**6. Safe to claim now**
- Otzar has safe, scoped conversation look-back **end-to-end**.
- Employees can open a prior conversation and view metadata, close summary,
  topics, detail availability, and a continuity note.
- Foundation exposes `GET /api/v1/otzar/conversations/:id`.
- Control Tower consumes it through a right-side drawer.
- The feature is governed and avoids transcript / raw-message exposure.

**7. Still NOT safe to claim**
- transcripts are stored or replayable
- listener execution is live
- MCP / connectors are live
- AI twins coordinate autonomously
- hives / team collaboration is live
- Agent Playground is live
- correction / drift linkage is live
- retrospective transparency history is stored
- enterprise reporting is complete
- full production monetization readiness

**8. Recommended next wave options**
- **A. Wave 2C — Corrections / drift linkage** (consume/expose correction
  signals safely; requires Foundation-first contract per cross-repo discipline)
- **B. Admin/Governance Control Tower rebaseline** (reconcile the stale 12B
  org-admin track table below against current `main`)
- **C. Session/token continuity + live smoke hardening**
- **D. Listener/transcript policy ADR** before any listener implementation

**Housekeeping (done):** Foundation + Control Tower Wave 2B feature branches
deleted locally and remotely; Foundation main synced at `1ffa01d`; Control
Tower main synced at `0ae4620`; both working trees clean; `AGENTS.md` and
`CONTEXT.md` remain untracked in Control Tower.

---

Skim before starting 12C.0 / Section 12C. Updated 2026-05-04 (post 12B closure).

> **⚠️ STALE BELOW for `main` (2026-05-28 marker).** Everything from this
> point onward is the legacy Section 12B operator journal preserved
> verbatim for continuity + audit. Per the "How to read this file"
> subsection at the very top and the two-track disclaimer: cross-repo
> HEAD tables, "12C — NEXT" queued items (items (a)(b)(c)(d) of which
> are LIVE on Foundation — see the **Foundation 12C.0 batch — STATUS
> UPDATE (2026-05-28)** section near the top), architectural inventory
> from before Wave 1, and any phrase implying authoritative current
> state must be treated as **historical only** unless cross-referenced
> by a top-section closeout. Rule 0 ground truth is current code
> with file:line evidence, not the prose below.

## Cross-repo state

| Repo | Branch | HEAD | Tests |
|---|---|---|---|
| niov-foundation | main | `ee4dafb` (TwinDetail read endpoint) | **443 passed + 1 skipped** |
| otzar-control-tower | main | `0a28f90` (Section 12B.4 — CLOSES 12B) | **12 passed** |
| otzar-control-tower | lovable-archive | `2b4c349` | preserved backup |

Reference (read-only design archive): `/Users/genghishameha/Desktop/NIOV Labs/github/otzar-control-tower-lovable-reference/`

## Committed substrate (NEW — read these first)

- **`docs/SECTION_12_DISCIPLINE.md`** — strategic frame for Section 12 sub-boxes 12B.2 → 12F. 28 architectural decisions, customer vocabulary, audit-aware 4-stage spec, primitive inventory, discipline cadence, cross-repo discipline. Plans reference this rather than restate.
- **`CLAUDE.md`** — operational rules for Section 12 in progress. Non-negotiable cadence (pre-flight grep → plan → approve → sequenced build → 6 verifications → alignment review → user-approved commit). Reach-for-these primitive list.
- **`CONTEXT.md`** — this file. Untracked per its purpose.

## Architectural inventory (REACH FOR THESE FIRST)

12B.1 + 12B.2 + 12B.3 + 12B.4 landed the reusable surface every Section 12C-12F screen consumes. Before writing any new component in a screen plan, check this list. If a screen needs a privileged action, use AuditAwareButton — not a fresh component. If it needs a list, use DataTable. If it needs a wallet display, use WalletProvenanceBadge. If it needs an admin-twin indicator, use ExecutiveOverrideBadge. If it needs a Behavior Policy label, use getAutonomyLevelLabel. If it needs a heatmap matrix over schema-honest 3-tuples, reach for PermissionsMatrix's pattern (DataTable-style + MatrixCell + a pure aggregator). If it needs a single-purpose drilldown drawer (no tabs), reach for BridgeDetailDrawer's pattern (distinct from MemberDetailDrawer/TwinDetailDrawer's 4/5-tab pattern).

**Audit-aware UI** (`src/components/audit/`):
- `AuditAwareButton` — 4-stage state machine (subtext → optional confirm → in-flight → success toast w/ clickable audit link)
- `AuditAwareForm` — same 4-stage pattern wrapped around react-hook-form + zod
- `AuditEventTooltip` — small inline subtext + hover description

**Sovereignty** (`src/components/sovereignty/`):
- `WalletProvenanceBadge` — pass `(walletType, entityType)`; variant derivation handled internally
- `DataSovereigntyInline` — page-top "Source: Your enterprise wallet" callout

**Data presentation** (`src/components/data/`):
- `DataTable<T>` — generic 4-state table with URL state via `useSearchParams`, debounced search, `onRetry` prop
- `MatrixCell` — schema-honest 3-tuple cell. **First real consumer at 12B.4** (PermissionsMatrix) — proven across loading/empty/single-bridge/multi-bridge cell renders.

**Bulk actions + utilities** (12B.2 additions):
- `src/components/users/BulkActionsBar.tsx` — Promise.allSettled fan-out, per-item progress, "Retry failed only" CTA. Justified across 12B.2 + 12B.3 + 12B.4 (bulk autonomy / bulk revoke).
- `src/lib/auth/random-password.ts` — `generateRandomPassword()` returning 32 chars from `crypto.getRandomValues()`. Used by `api.org.members.create` to inject placeholder; never displayed/logged/stored.
- `src/lib/utils/relative-time.ts` — `formatRelativeTime(iso)` wrapping date-fns `formatDistanceToNow`. Powers "Last Updated" columns + audit timestamp displays + bridge expires_at displays.

**Member detail composition** (12B.2):
- `src/components/users/MemberDetailDrawer.tsx` — Sheet (side="right") with 5 tabs: Profile · Hierarchy · Recent Audit · Permissions Granted · AI Teammates Owned. Profile tab includes inline `job_title` edit via `AuditAwareForm`. Pattern reusable for entity-scoped drawers needing tabbed surface.

**AI Teammate composition** (12B.3 additions):
- `src/components/ai-teammates/TwinDetailDrawer.tsx` — Sheet (side="right") with 4 tabs (Overview · Activity · Skills · Settings). Single-fetch architecture: ONE TanStack Query against `api.org.aiTeammates.get` returns `TwinDetailResponse`.
- `src/components/ai-teammates/ExecutiveOverrideBadge.tsx` — orange pill + tooltip surfacing admin-twin status. Driven by `TwinConfig.is_admin_twin === true`.
- `src/components/ai-teammates/AssignSkillButton.tsx` — popover-backed AuditAwareButton.
- `src/components/ai-teammates/CreateTwinDialog.tsx` — Dialog wrapping AuditAwareForm. Body shape posted is exactly the 12B.0 contract.
- `src/components/ai-teammates/BulkAutonomyAction.ts` — adapter returning three `BulkAction<string>` entries.

**Access Control composition** (12B.4 additions — bridge-aware substrate):
- `src/lib/access-control/aggregate-matrix.ts` — pure join + 3-tuple aggregation. `aggregateMatrix(permissions, capsules, grantees)` produces `{ rows, columns, cell, retained, droppedCount }`. Schema-honest invariants enforced in pure code: max-scope, OR-of-can_share_forward, distinct(bridge_id) bridge count. Cross-wallet drop-out documented + counted. `MATRIX_TOP_CAPSULE_TYPES = 8` (Q3 ceiling).
- `src/components/access-control/PermissionsMatrix.tsx` — DataTable-style heatmap wrapper around `aggregateMatrix`. **First real consumer of MatrixCell.** Multi-fetch (permissions + capsules + persons + ai-teammates) joined via `useMemo`. Selection model tracks `bridge_ids` (NOT cells, NOT capsule_ids) — bridges are the unit of revocation.
- `src/components/access-control/BridgeDetailDrawer.tsx` — Sheet (side="right") **single-purpose, NO tabs** — distinct from MemberDetail/TwinDetail's 4/5-tab pattern. Use this pattern when the drawer's content is a focused list of items each independently actionable. Header: `"Permission Bridge: {grantee} ← {org}"` + bridge_id truncated to 8 chars + clipboard copy CTA. Per-bridge revoke via AuditAwareButton (real audit_event_id from RevokeResponse).
- `src/components/access-control/GrantPermissionDialog.tsx` — Dialog wrapping AuditAwareForm with **6 fields**. On submit: `capsule_ids.map(id => ({ capsule_id, scope, can_share_forward, duration_type, ...(expires_at ? { expires_at } : {}) }))` produces `capsule_grants[]` per Foundation contract. `write_reason` omitted from body when blank/whitespace (Drift 7). Heterogeneous-bridge collapse pattern documented in JSDoc; **Advanced Grant Mode deferred to 12E Policies** (where per-capsule heterogeneity becomes first-class).

**Shadcn primitives now installed** (`src/components/ui/`):
- 12A: button, card, input, label, badge, separator, skeleton, sonner, tooltip, scroll-area, sheet
- 12B.1: avatar, checkbox, command, dialog, form, popover, radio-group, select, switch, tabs, textarea
- 12B.4 used: textarea (write_reason field), select (scope + duration), command (grantee Combobox)

**API client** (`src/lib/api.ts`):
- `api.org.entities.{ list, get, update }` · `api.org.members.{ create, bulk }` · `api.org.hierarchy.get` · `api.org.onboarding.{ start, invite, reorder, status }` · `api.org.aiTeammates.{ list, get, create, update, getStats, addSkill }` · `api.org.skillPackages.list` · `api.org.hives.list` · `api.org.permissions.list` · **`api.org.capsules.list` (12B.4 NEW — org-wallet-only by Foundation design)** · `api.org.audit.list` · `api.org.analytics`
- `api.cosmp.{ share, revoke }`
- All inherit `ApiResult<T>`. Each method's JSDoc names the Foundation route.

**Type contract** (`src/lib/types/foundation.ts`):
- 11 enums/unions: `EntityType` (6), `EntityStatus`, `WalletType`, `CapsuleType` (20), `AccessScope`, `PermissionLevel` (client-side superset), `DurationType`, `PermissionStatus`, `AuditEventType` (30), `AuditOutcome`, `TwinAutonomyLevel`
- 14 models + ~14 request/response shapes
- 12B.4 additions: **`OrgCapsuleListItem`** (slim 10-field shape returned by GET /org/capsules — 10 fields including `relevance_score` per Foundation route SELECT)

**Label maps** (`Record<T, string>` exhaustiveness):
- `getCapsuleTypeLabel(type)` — 20 entries
- `getEntityTypeLabel(type)` — 6 entries
- `getAuditEventLabel(type)` — 30 entries
- `getAutonomyLevelLabel(level)` — 3 entries (12B.3)
- **`getPermissionScopeLabel(scope)` — 3 entries (12B.4)** · `PERMISSION_SCOPE_LABELS: Record<AccessScope, string>` exactly 3 entries (METADATA_ONLY · SUMMARY · FULL). NONE rendered via hardcoded "No access" copy in MatrixCell, NOT this map (Drift 3).
- **`getDurationTypeLabel(d)` — 6 entries (12B.4)** · `DURATION_TYPE_LABELS: Record<DurationType, string>` exactly 6 entries (NONE → "No access (block)" — Foundation-honest per permission.ts:45-46) · `DURATION_TYPE_DROPDOWN_OPTIONS: readonly DurationType[]` exactly 5 entries (NONE filtered for grant-flow strict sub-domain — UI scope choice, NOT type subset; decision #18 holds) · `DURATION_TYPES_WITH_EXPIRES_AT: ReadonlySet<DurationType>` = {TEMPORARY, SHORT_TERM, LONG_TERM} (Foundation's DURATION_MS-with-fixed-expiry sub-domain).

**Test infrastructure**:
- `tests/msw/handlers.ts` — extended in 12B.4 with `revokeHandler` + `capsulesHandler` + expanded `permissionsHandler` (mixed bridges/scopes/durations + cross-wallet capsule_id fixture for drop-out test). Recorders extended: `getRecordedShareCalls() / resetRecordedShareCalls()` + `getRecordedRevokeCalls() / resetRecordedRevokeCalls()` returning `{ count, lastBody, allBodies }` and `{ count, lastBridgeId, allBridgeIds }` respectively. `GRANTEE_NO_TAR_FIXTURE_ID` exported for fail-path tests.
- `tests/msw/server.ts` — MSW Node server
- `tests/setup.ts` — jest-dom matchers + RTL cleanup + MSW lifecycle + setPointerCapture polyfill (12B.1) + ResizeObserver polyfill (12B.2 — Radix react-use-size needs it) + scrollIntoView polyfill (12B.3 — cmdk Command primitive needs it). **12B.4: no new polyfills needed** — Sheet + Dialog + Combobox + Select + Textarea all covered by existing polyfills.

**Architecture anchor tests** (current floor — do not break, 12 total):
- 12A: api.test.ts (Bearer attach, 401 logout) · auth-guard.test.tsx (redirect, access denied)
- 12B.1: audit-aware-button.test.tsx (4-stage state machine) · data-table.test.tsx (4 states)
- 12B.2: invite-wizard.test.tsx (3-endpoint sequence + password discipline) · home-recent-activity.test.tsx (client-side ADMIN_ACTION filter)
- 12B.3: twin-detail-drawer.test.tsx (single-fetch architecture + is_admin_twin × autonomy_level independence) · create-twin-dialog.test.tsx (12B.0 body shape exact + real audit_event_id surfacing)
- **12B.4: permissions-matrix.test.tsx (top-N column join + cross-wallet drop-out + MatrixCell 3-tuple aggregation invariants) · grant-permission-dialog.test.tsx (capsule_grants[] body shape + write_reason omit-when-blank discipline + GRANTEE_NO_TAR fail-path 12B.0 contract)**

## audit_event_id contract (from 12B.0 + 12B-FOUNDATION skills audit)

Every audit-aware write endpoint on Foundation surfaces `audit_event_id` (snake_case) on its **success** response. Foundation routes that emit but don't yet return it:
- `PATCH /org/entities/:id` — used by Users bulk Suspend/Reactivate + drawer's job_title edit. 12B.2 surfaces sentinel `"pending-foundation-extension"` in the toast pending Foundation extension. **Last remaining sentinel in the codebase** — queued as 12C.0 batch item (b).

**7 endpoints currently surfacing audit_event_id (no change in 12B.4 — POST /cosmp/share + DELETE /cosmp/share/:bridgeId were already counted at 12B.0):**
1. `POST /api/v1/org/members` → ADMIN_ACTION (action=ORG_MEMBER_ADDED) — 12B.0
2. `POST /api/v1/org/onboarding/invite` → ADMIN_ACTION (action=ONBOARDING_INVITE_ACCEPTED) — 12B.0
3. `POST /api/v1/org/ai-teammates` → ADMIN_ACTION (action=TWIN_CREATED) — 12B.0
4. `PATCH /api/v1/org/ai-teammates/:id` → ADMIN_ACTION (action=AI_TEAMMATE_UPDATE) — 12B.0
5. `POST /api/v1/cosmp/share` → PERMISSION_CREATED summary — 12B.0 (consumed by 12B.4 GrantPermissionDialog)
6. `DELETE /api/v1/cosmp/share/:bridgeId` → PERMISSION_REVOKED summary — 12B.0 (consumed by 12B.4 BridgeDetailDrawer + bulk revoke)
7. `POST /api/v1/org/ai-teammates/:id/skills` → ADMIN_ACTION (action=TWIN_SKILLS_ASSIGNED) — Foundation HEAD `ca6e982`

**Failure paths intentionally omit `audit_event_id`** — denied operations still write audit rows server-side for compliance, but client never sees those ids. Test 12 anchors this contract for the GRANTEE_NO_TAR path.

## 12B.2 closed (commit `16bd02d`)

Home extension + Users screen + 3-step Dandelion invite wizard + Section 12 discipline substrate.

## 12B.3 closed (commit `b4f17e2`)

AI Teammates screen + EXECUTIVE_OVERRIDE indicator (driven by `is_admin_twin`, NOT autonomy_level literal) + Skill Package management (lazy popover-gated query — Test 9 anchors no-N+1-from-drawer at runtime). Bulk autonomy via adapter pattern with zero edits to BulkActionsBar.tsx.

## 12B.4 closed (commit `0a28f90`)

Bridge-aware Access Control matrix + 6-step grant dialog + per-bridge + bulk revoke + section close. First real MatrixCell consumer (12B.1 → 12B.4). Single-purpose Sheet drawer pattern (no tabs) added to substrate. Cross-wallet drop-out documented in pure code (aggregate-matrix.ts) and anchored by Test 11. NONE sub-decision resolved Option B: `Record<DurationType, string>` exhaustive at 6 entries (decision #18 holds), `DURATION_TYPE_DROPDOWN_OPTIONS` filters NONE for the grant-flow strict sub-domain — UI scope choice, NOT type subset. Drifts 1 + 7 anchored by Test 12 (capsule_grants[] body shape + write_reason omit-when-blank). Sentinel grep for "pending-foundation-extension" returns ZERO matches in 12B.4 surface (the one remaining sentinel is 12B.2 PATCH /org/entities/:id job_title edit, queued for 12C.0 batch).

## Q1-Q7 + 12B.x resolutions baked in

- **Q1** (12B.0 audit_event_id): DONE
- **Q2** (Phase 2 display): focused slice w/ "View full propagation order" expand
- **Q3** (matrix columns): one column per `capsule_type`; top-8 by frequency; labels via `capsule-types.ts` — DONE in 12B.4
- **Q4** (HIPAA toggle): always show, default off; refine in 12E
- **Q5** (drawers): Sheet side="right" consistent — single-purpose pattern (no tabs) added in 12B.4
- **Q6** (MSW): DONE
- **12B.2 Q1** (audit filter): client-side; 12C extends Foundation
- **12B.2 Q2** (Last Active column): `Entity.updated_at` labeled "Last Updated"
- **12B.2 Q3** (bulk actions): Suspend/Reactivate only; defer Change Role
- **12B.2 C1** (entity_type filter): PERSON only on Users screen
- **12B.2 C2** (cancellation copy): exact approved copy in InviteWizard
- **12B.3 Q1** (Skills tab remove UI): omit; 12C.0 batch
- **12B.3 Q2** (Bulk autonomy change): adapter pattern; zero edits to BulkActionsBar.tsx
- **12B.3 Q3** (Drawer Overview avatar): initials fallback only via shadcn Avatar
- **12B.3 Q4** (`is_admin_invite` gate): always-enabled checkbox
- **12B.3 Q5** (RemoveSkillButton stub): OMITTED; 12C.0 batch
- **12B.4 Drift 1** (capsule_grants[] heterogeneity): collapse-to-one-tuple in dialog UX, map to `capsule_grants[]` on submit. Advanced Grant Mode → 12E
- **12B.4 Drift 2 / NONE sub-decision** (Option B): `Record<DurationType, string>` exhaustive at 6 (decision #18 holds); `DURATION_TYPE_DROPDOWN_OPTIONS` filters NONE for grant-flow sub-domain (UI scope choice, NOT type subset). NONE labeled "No access (block)" per Foundation permission.ts:45-46
- **12B.4 Drift 3** (PermissionLevel client-side superset): `Record<AccessScope, string>` exactly 3 entries; NONE in MatrixCell rendered via hardcoded "No access" copy
- **12B.4 Drift 4** (no power-user wallet toggle): dropped entirely from 12B.4. Cross-wallet capsules + member-consent flow → 12C.0 Foundation extension + 12E Policies
- **12B.4 Drift 5** (no per-bridge GET): client-side `bridge_id` filter against `api.org.permissions.list({ take: 250 })`. 12C.0 Foundation candidate (`?bridge_id=` filter)
- **12B.4 Drift 6** (no embedded capsule_type on Permission): two-fetch + `useMemo` join. Permissions referencing capsule_ids outside `/org/capsules` slice silently dropped from matrix
- **12B.4 Drift 7** (write_reason free-text): surfaced as optional textarea after duration step. Trimmed before serializing; OMITTED from body when blank (NEVER `""`)

## Foundation endpoint surface confirmed wired (no 12B-Foundation work needed)

`GET /org/entities` (with `?type` filter) · `GET /org/entities/:id` · `PATCH /org/entities/:id` · `GET /org/hierarchy` · `POST /org/onboarding/{start,invite,reorder,status}` · `GET /org/ai-teammates` · `GET /org/ai-teammates/:id` · `POST /org/ai-teammates` · `PATCH /org/ai-teammates/:id` · `GET /org/ai-teammates/:id/stats` · `POST /org/ai-teammates/:id/skills` · `GET /org/skill-packages` · `GET /org/hives` · `GET /org/permissions` · **`GET /org/capsules` (12B.4 — org-wallet-only by design)** · `GET /org/audit` · `POST /org/members` · `POST /org/members/bulk` · `POST /cosmp/share` · `DELETE /cosmp/share/:bridgeId`

## Section 12 sub-box progress

- [x] **12A** — scaffolding + auth + 16-screen layout (4 tests, vocabulary-corrected) — `b08881b`
- [x] **12B.0** — Foundation audit_event_id surfacing (439 + 1 tests) — `6151812`
- [x] **12B.1** — frontend foundation lock-in (6 tests) — `9140220`
- [x] **12B.2** — Home extension + Users screen + Section 12 discipline substrate (8 tests) — `16bd02d`
- [x] **12B.3** — AI Teammates screen + EXECUTIVE_OVERRIDE indicator + Skill Package management (10 tests) — `b4f17e2`
- [x] **12B.4** — Access Control matrix bridge-aware with grant/revoke flows (12 tests) — `0a28f90`
- [x] **🎯 SECTION 12B CLOSED** — bridge-aware org-identity + permissioning surface complete

## Section 12C — NEXT

Section 12C is split into two boxes per the cross-repo discipline pattern:

- [ ] **12C.0** — Foundation extension batch (two-commit Foundation-first pattern continues). Lands BEFORE 12C.1.
- [ ] **12C.1** — Playground + Intelligence dashboard frontend. Consumes 12C.0 endpoints.

### 12C.0 Foundation extension batch (queued)

  a. `DELETE /org/ai-teammates/:id/skills/:package_id` — 12B.3 Q5 remove-skill (Skills tab needs this for symmetry with assign)
  b. `PATCH /org/entities/:id` audit_event_id surfacing — eliminates the last `"pending-foundation-extension"` sentinel in the codebase (12B.2 job_title edit + Suspend/Reactivate)
  c. `GET /org/audit` `?event_type=` + `?actor_entity_id=` filters — lifts the 12B.2 decision #23 client-side filter pattern server-side
  d. `GET /org/permissions` `?bridge_id=` filter — lifts the 12B.4 BridgeDetailDrawer client-side filter pattern server-side
  e. **Cross-wallet capsules endpoint + consent-flow architecture** — substantial; patent-relevant claim about Member consent for PERSONAL wallet capsule sharing; 12E Policies consumes this; 12B.4 explicitly deferred-forward
  f. Compound score / patterns / dimensions / vocabulary / external-entities endpoints — 12C.1 Playground + Intelligence dashboard frontend dependencies

### 12C.0 pre-primer architectural questions (USER FLAGGED — resolve before 12C.0 build starts)

These are NOT blocking 12B.4 close. They are open for the 12C.0 primer Q&A bundle:

1. **Glonari scope** — confirm Otzar-only scope for 12C.0 / Section 12 vs any cross-product surface
2. **Compliance tier** — commercial enterprise (current default) vs FedRAMP/IL4-IL6 (changes Foundation extension architecture significantly — auth, audit retention, encryption-at-rest, etc.)
3. **12C.0 sequencing** — right after 12B.4 vs deferred until after 12F (the trade-off is whether to keep moving frontend forward with the one remaining sentinel + the queued client-side filters as known debt, or to clear Foundation debt before the next frontend sub-box)

## Pending architectural anchors for 12C-12F

- **`pending_approvals_count` is stub-0** through 12B-12D. Real source in Section 14 (EscalationRequest table).
- **Sharing rules editor + Advanced Grant Mode (heterogeneous CapsuleGrant per bridge) → Policies (12E)**.
- **Code-split optimization** (chunk-size warning, 683 kB main chunk after 12B.4) → 12F polish.
- **Cross-wallet permissions surface** (12D Security & Audit) — currently silently dropped from Access Control matrix per the patent's three-wallet portability boundary.
