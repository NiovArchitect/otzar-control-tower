# Lineage-Aware Clarity Escalation — Model (audit-first, no code yet)

Status: **DESIGN ACCEPTED-PENDING** · 2026-07-03 · follows Gap J Slice 1
(`fbc3615` / `f0e561c`). Companion docs:
`OTZAR_OPERATIONAL_GAP_LEDGER.md` §J ("Lineage is not clutter — lineage
powers clarity") and
[`OTZAR_ORG_READY_AND_PORTABLE_TWIN_DOCTRINE.md`](./OTZAR_ORG_READY_AND_PORTABLE_TWIN_DOCTRINE.md)
(the governing org-ready + portable-twin boundary this model must obey).

## 1. Customer story

> "As an employee, I want Otzar to keep me in flow. If I understand the
> work, I should not see extra audit clutter. If I am confused, I can ask
> Otzar why something is here, where it came from, who knows, and what to
> do next. If Otzar is unsure, it should route a clarification to the right
> human source — not automatically my manager, and not more homework."

Desired feeling: *"Otzar keeps collaboration clear without making me manage
the system."* The word to preserve: **HARMONIZE** — fewer repeated
questions, fewer "who owns this?" moments, fewer unnecessary approvals.

## 2. The experience (quiet → on demand → governed)

1. **Card face** (exists, Gap J): one calm fragment — "From Slack".
2. **View/Why** (exists, Gap J): "Came from / Shared by / Received /
   Owner / Requester" + routing why + evidence quote.
3. **Ask Otzar** (this design): "Why is this here?" / "Who can clarify
   this?" answered **from truth** — lineage + ledger + people graph —
   never vibes. When Otzar can answer, that is the end: no action created.
4. **Governed clarification request** (this design): only when truth runs
   out, Otzar offers — never auto-sends — "Ask Samiksha to clarify"
   (the *best-known* clarifier, laterally ranked). One explicit human
   click creates a tracked, expiring, audited request that lands in the
   clarifier's existing Review Center queue and notifies their inbox.
5. **Resolution feeds learning** (existing convention): the answer is
   recorded so the same question declines over time.

Copy vocabulary to add (one label map, honest states):
"Otzar is unsure who owns this" · "Samiksha was the source of this work —
she can clarify" · "Ask David to confirm ownership" · "Clarification
requested from David — waiting" · "The source author is outside your
organization" · "Clarified by Samiksha".

## 3. Substrate audit — what already exists (verified, file:line)

**The spine exists: `EscalationRequest`** (FND `schema.prisma:2099`).
It already carries an **arbitrary lateral `target_entity_id`**, free-text
`description` (the question), `resolution_metadata` (the answer), a full
PENDING→APPROVED/REJECTED/EXPIRED lifecycle with expiry, the
source≠resolver self-approval gate (`escalation.service.ts:610`), and a
**dormant `HUMAN_REVIEW_REQUIRED` type documented as the AI-uncertainty
trigger** (`schema.prisma:570`) — created today only by playground code.
`createEscalationForCaller` (`escalation.service.ts:131`) writes it
audited; `listEscalationsPendingForCaller` + `GET /escalations/pending`
already render the clarifier's queue (Review Center / Approvals page,
self-scoped).

**Candidate truth exists, deterministically** (no new models):
work-item owner/requester/target + `source_lineage`
(`work-ledger.service.ts:1033`); project **OWNER/REVIEWER** roles
(`schema.prisma:2985`, `work-project.service.ts:317`); action/escalation
approver (`resolved_by_entity_id`, `escalation.service.ts:292`); meeting
participants (`meeting-capture.service.ts:537`); the full org roster with
shared-project/collab counts already injected into every conversation
(`identity-context.ts:70` `org_roster`); person→person manager edges
(`hierarchy.service.ts:17`); and the strict name→entity bridge
`resolveTokenToEntities` / `classifyRecipient`
(`recipient-governance.ts:177/314`) that turns decision-rights party
strings into governed entity candidates.

**The clarity-need signal exists**: `computeDecisionRights`
(`decision-rights.ts:119`) → `requiresClarificationReason` /
`escalationTarget` (party-string level);
`recommendDirection` (`decision-recommendation.ts:70`) already emits
`nextBestAction: "ask_one_question"`; `projectRoutingDecision`
(`routing-decision.ts:310`) → `owner_status: "needs_review" | "unowned"`.

**Governed delivery exists two ways**: the policy-gated Action rail
(`SEND_INTERNAL_NOTIFICATION`, `action.service.ts:486` →
`evaluatePolicy` ALLOW/REQUIRE_DUAL_CONTROL/DENY) and direct inbox
delivery (`deliverHumanInternalMessage`, `internal-message.service.ts:73`,
DIRECT_MESSAGE class).

**CT affordance patterns to copy, not invent**: the "Ask Otzar to handle"
button flow (`WorkLedgerItem.tsx:107` — busy state, one governed call,
three honest outcomes); the BUG-C verdict→affordance pattern
(`Comms.tsx:1035` `RecipientReviewActions` — Confirm / Choose from
id-based candidates / honest no-override); the deterministic composer
intercept (`thread-query.ts` + AmbientOtzarBar dispatch ~:3026); the
PersonCockpit governed "Request help" / message composer
(`PersonCockpit.tsx:205`); the AskYourTwin OTHER_TWIN honest refusal →
governed collaboration deep-link (`MyTwin.tsx:297`).

### 3b. Otzar-native communication paths — durable vs UI/session-only

Internal Otzar communication is itself a truth source for clarity, but the
paths differ in durability and only durable paths may carry a governed
clarification:

**Durable (real records, org-scoped, auditable):**
`EscalationRequest` (lifecycle + resolution); governed Actions
(`SEND_INTERNAL_NOTIFICATION` via the policy evaluator); the notification
inbox (`DIRECT_MESSAGE` / `ACTION_REQUIRED` / `OTZAR_INTERNAL_NOTE`
classes); internal message threads (`deliverHumanInternalMessage` →
`api.workOs.thread`); collaboration requests
(`api.otzar.collaboration.create`); WorkLedger FOLLOW_UP rows (which are
also the learn-loop correction store).

**UI/session-only (never a system of record):**
`pending-clarification.ts` — explicitly ephemeral in-session working
memory with a 5-minute TTL, rendered only as the ambient bar's memory
chip; `current-surface-context` (explicit selection capture);
`action-details-store` local detail cache. A clarification that matters
must never live only here — the ephemeral chip may *carry the user to*
the durable create, never substitute for it.

## 4. What is genuinely missing (the whole build surface)

1. **A production writer for `HUMAN_REVIEW_REQUIRED`** — a governed
   create path for a clarification escalation (no general POST create
   route exists by design, `escalation.routes.ts:113`).
2. **`rankClarifiers(ledger_entry_id)`** — the candidate queries exist
   individually; nothing composes them into one ranked, reasoned list.
3. **Answer-path wiring** — `conductSession`/COE retrieve wallet capsules
   only (`coe.service.ts:229`); they do not consult WorkLedger owner +
   lineage for "why is this assigned to me?". A wiring gap, not a data gap
   (`org-query.service.ts:283 groundContextForAgent` already exists).
4. **Notify-the-clarifier glue** — the closest confirm flow
   (`resolveFollowUpRecipient`, `comms-artifacts.service.ts:322`) audits
   but notifies no one.
5. **A clarity query type** — no "why is this here / who can clarify"
   intent exists in any CT classifier (`thread-query.ts:65` is
   person-scoped only), and no "Otzar is unsure" copy exists anywhere.
6. **Lineage→entity resolution for source authors** — `source_actor` is a
   display name; resolution via roster is strict and may honestly fail for
   external/connector authors ("outside your organization" state).

## 5. Architecture decision (one spine, no fourth primitive)

**Use `EscalationRequest` as the clarification spine.** It is the only
tracked, answerable route (lifecycle + pending queue + resolver gate +
expiry). `SEND_INTERNAL_NOTIFICATION` / DIRECT_MESSAGE is fire-and-forget
delivery — used ONLY as the pointer that tells the clarifier "a
clarification is waiting", never as the state machine. The
twin-collaboration inbox (`twin-collaboration.service.ts`) is a third
human-routing surface that already exists — this design deliberately does
NOT add a fourth: clarifications are escalations, full stop. Resolution
text lands in `resolution_metadata`; the asking employee sees it on the
work item's Why; the learn-loop reads it through the existing
FOLLOW_UP-rows-are-the-store convention (`work-graph-learning.ts:210`) —
no parallel clarification table.

## 6. Lateral ranking doctrine (deterministic, org-truth-driven)

Ranked candidate order for "who can clarify X", computed per work item:

1. **Source author** — `source_lineage.source_actor` resolved via
   `resolveTokenToEntities` against the org roster (strict; ambiguous →
   choose-from-candidates, unresolvable-external → honest copy).
2. **Work owner** (`owner_entity_id`) when the asker is not the owner.
3. **Requester** (`requester_entity_id`).
4. **Project OWNER** (then REVIEWER) of the item's project.
5. **Approver** — `resolved_by_entity_id` of a paired escalation/action.
6. **Meeting participant / teammate named in the evidence quote**
   (roster-resolved).
7. **Manager — ONLY when authority is the question**: gate on
   `DecisionRights.alignmentState === "needs_authority_decision"` (or the
   item's status ∈ NEEDS_AUTHORITY/NEEDS_APPROVAL). Hierarchy is a route
   for authority, not a default for knowledge.

Every candidate carries a human reason ("She sent the Slack message this
came from"). Earned-autonomy rule: Otzar **suggests, a human sends** — no
auto-send at any autonomy level in slice 1; the create path runs the
existing policy evaluator regardless.

## 7. Proposed build slices (each independently shippable, GO required)

**CE-1 — Clarity read projection (read-only, zero writes).**
FND: `rankClarifiers` composition + `GET /work-os/ledger/:id/clarity`
returning `{ can_answer, answer (ViewWhy-shaped rows from lineage/owner/
routing), candidates: [{entity_id, display_name, reason_label, rank}],
authority_question: boolean }`. Org-scoped, party-only, safe scalars, no
secrets, no raw ids beyond entity references the caller may already see.
CT: none yet, or Ask-Otzar clarity intent answered read-only.

**CE-2 — Governed clarification request (the durable object).**
FND: `createClarificationForCaller` → `createEscalationForCaller` with
`HUMAN_REVIEW_REQUIRED`, chosen `target_entity_id` from CE-1 candidates,
`capsule/ledger` linkage in metadata, expiry, audit-first; paired
DIRECT_MESSAGE pointer to the clarifier; resolution writes
`resolution_metadata` + notifies the asker. CT: "Request clarification"
button in the existing WorkLedgerItem action row (Ask-Otzar-button
pattern), BUG-C verdict→affordance for candidate choice, clarifier sees it
in the existing Review Center queue with `getEscalationTypeLabel` copy
("Clarification requested"). No new panels.

**CE-3 — Answer-path wiring (ambient clarity).**
FND: inject the work item's owner+lineage+routing truth into
`conductSession` context (via `groundContextForAgent`), so "why is this
assigned to me?" is answered conversationally from the same truth. CT: a
clarity query type in the deterministic composer intercept
(`classifyThreadQuery` extension) answering from the item's ViewWhyModel.

**CE-4 — Clarity learn-loop.** Resolved clarifications feed
`correctionsForContext` so repeat questions decline; manager-exception
visibility ("ownership unclear on 3 items from this sync") lands on
Team Work, not on employee cards.

Smallest safe first slice: **CE-1** — pure read, provable with unit +
integration tests, no behavior risk, and it makes CE-2's button honest
(the affordance exists only when a real ranked candidate does).

## 7b. Visibility levels (employee / manager / admin — never collapsed)

- **Employee**: the calm card fragment, the Why answer, the Ask-Otzar
  clarity answer, and — only when truth runs out — the offered
  clarification request. Nothing to manage, no queues created for them.
- **Manager**: exceptions only — "ownership unclear on N items from this
  sync", clarifications pending past expiry, blockers — on Team Work,
  never per-event feeds (CE-4).
- **Admin/security**: the full escalation + audit trail on the existing
  Security & Audit surfaces; nothing new needed — the spine already
  audits.

## 7c. Portability boundary (governing doctrine applied to clarity)

Per `OTZAR_ORG_READY_AND_PORTABLE_TWIN_DOCTRINE.md`: **the employee can
take the shape of how they work; they cannot take the company's work.**
Applied here:

- Clarification requests, their resolutions, source excerpts quoted in
  them, escalation records, and every audit event this model creates are
  **org-bound, never portable** — they are Company A's operational record.
- Lineage itself (`source_lineage`, source excerpts, source ids) is
  org-bound source truth — it powers clarity inside the org and never
  crosses into a personal wallet.
- What MAY someday become portable from this feature is only the
  **derived personal method pattern** — e.g. "this person resolves
  ambiguity by asking the source author first", "prefers one focused
  question over broadcast" — stripped of company names, coworker
  identities, transcripts, and excerpts, and only through the future
  derivation rail the doctrine defines (Category C → A). No such
  derivation exists today and none is built in CE-1..CE-4.
- The learn-loop this model feeds (`correctionsForContext`) stays
  org-scoped — prior corrections reduce repeated questions inside
  Company A and are not employee-exportable.

## 8. Governance invariants (all slices)

Audit-first writes; source≠resolver preserved; org-scoped everything
(cross-org candidates impossible by construction — roster/membership
queries are org-keyed); no secrets/tokens/raw payloads in any projection;
no raw UUIDs or backend enums as copy (label maps only); no fake
affordances (the button renders only when the route will succeed); quiet
by default (nothing new on card faces; clarity lives behind Ask/Why and
the explicit button); DMs/private-channel content never quoted in
clarification text beyond the already-safe evidence excerpt.

## 9. Risks and honest limits

- **Name→entity ambiguity**: strict resolution only; ambiguity surfaces
  the BUG-C chooser, never a guess.
- **External source authors**: honestly unresolvable — "The source author
  is outside your organization" with the lateral list continuing.
- **Noise regression risk**: clarification requests are employee-initiated
  in slice CE-2; Otzar never mass-creates them. Watch the Review Center
  count in smokes — a clarity feature that inflates approval queues has
  failed its own doctrine.
- **Overlap risk**: twin-collaboration inbox and internal messages must
  not become alternate clarification stores — escalation is the spine.

## 10. Tests that lock the design (when built)

FND: rank order per doctrine (source author first, manager gated on
authority); ambiguous author → candidates, external author → honest
state; clarity route org-scoped + party-only; HUMAN_REVIEW_REQUIRED
create audited + policy-evaluated + source≠resolver; resolution notifies
asker + persists metadata; no secrets in projections; cross-org isolation.
CT: button only with real candidates; candidate copy human (reasons, no
enums); Review Center renders "Clarification requested" with existing
labels; asker sees "Clarified by X" on the item's Why; card faces
unchanged (quiet-by-default regression tests); live smoke read-only for
CE-1, reversible single-request round-trip for CE-2.
