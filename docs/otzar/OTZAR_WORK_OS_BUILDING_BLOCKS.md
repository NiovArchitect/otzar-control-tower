# Otzar Work OS — the canonical building blocks

**Status:** 2026-07-02 (Fable 5). Authored immediately after the approval loop
closed, so the hard-won shape is preserved before anyone drifts. State at
authoring: CT `main` `6e3e973` · FND `main` `9dce631` · live bundle
`index-tEAqSQ1x.js`.

**Who this is for:** every future Fable / Claude Code session, and every
human, that touches this product. Read this before building anything. If a
plan contradicts this document, the plan is wrong or this document must be
deliberately amended — never silently drifted past.

---

## Core statement

Otzar is **not a dashboard**. Otzar is **not a chatbot**. Otzar is **not a
Salesforce clone**.

**Otzar is an ambient AI Work OS.** It watches real workstreams (with
consent), turns communication into durable governed work, routes that work to
the right human or AI twin at the right boundary, asks only for the judgment
it genuinely lacks, executes under approval, proves everything in an audit
chain, and learns from every correction — while every surface reads the same
organizational truth.

The failure modes this document exists to prevent: generic SaaS pages,
disconnected "AI features," and chatbot-style flows that don't move work.

## Why compare to Agentforce

Agentforce made its architecture teachable in one line:

> **Agent → Topics → Instructions → Data Library → Actions → Reasoning
> Engine → Trust Layer**

Otzar needs the same teachability — but Otzar's chain is deeper, because an
ambient Work OS has durable work, org structure, human approval boundaries,
and a feedback loop that Agentforce's request/response agent model doesn't:

> **Human / AI Twin → Workstream Context → Role Template / Memory /
> Permissions → Data 360 ETL / Org Truth Graph → WorkLedger → Routing
> Decision Layer → Governed Actions → Approvals / Escalations → Audit /
> Proof → Feedback Memory Loop → Ambient UX**

## The canonical Otzar loop

Every meaningful flow in the product is an instance of this loop. If a
feature doesn't land somewhere on it, question the feature.

1. **Capture** workstream signal (Comms capture, import, meeting ingest,
   voice, future observation).
2. **Extract** decisions, commitments, blockers, people, follow-ups.
3. **Normalize** source, participants, timestamps, permissions, confidence.
4. **Resolve** people, managers, teams, projects, workspaces, AI twins,
   tools, external participants — by **stable id**, never display name.
5. **Govern** — RBAC / ABAC / TAR / policy / recipient governance / approval
   rules decide what may happen and who must sign off.
6. **Persist** durable work: WorkLedger rows, Dandelion seeds, audit events,
   memory candidates. *Nothing meaningful lives only in page state.*
7. **Route** to owner, requester, approver, manager, admin, AI twin, or tool.
8. **Surface** in Comms, My Work, Team Work, Action Center, People,
   Approvals, Audit, Reports — the same truth from each page's angle.
9. **Ask** only for the missing human judgment (confirm a recipient, approve
   a boundary crossing, pick an owner) — never re-ask what's known.
10. **Execute** governed actions (scheduler → executor → provider).
11. **Prove** — audit events, execution attempts, receipts, hash chain.
12. **Learn** from corrections, confirmations, dismissals, approvals, and
    routing misses.
13. **Improve** future routing and the ambient surfaces themselves.

---

# The twelve building blocks

## 1. Human / AI Twin

**An AI Twin is not a generic chatbot.** It represents a *specific real
person*: their role, hierarchy position, department, manager, tools,
permissions, memory, and — critically — a *governed* slice of their
authority. A twin can never do what its human couldn't be approved to do.

**Where it lives:** `Entity` (`AI_AGENT`) + `TwinConfig` (FND);
AI Teammates page (owner/title→role-template mapping); People/Members +
`/org/hierarchy` (the human side); role templates
(`OTZAR_TWIN_ROLE_TEMPLATE_MODEL.md`); twin memory via governed capsules
(consent-gated `RECORD_CAPSULE` actions — nothing remembered silently).

**Works today:** twin registration/prepared states; owner+title→template
display; twin-scope panel (context health); consent-gated memory writes;
hierarchy-aware identity.

**Honest gaps:** full role-template→twin *behavior* wiring is still partial —
templates label and scope, they don't yet fully drive per-twin conduct;
portable memory (Digital Work Wallet) vs. company data needs a stronger
customer experience (the personal-value framing exists, the deep product
doesn't yet).

## 2. Workstream Context

Otzar starts from **living work**, not from forms: Comms captures, meetings,
transcripts, imported notes, docs/tools, projects, decisions, commitments,
blockers, corrections — and, later, consented workflow observation
(`OTZAR_WORKFLOW_OBSERVATION_MODEL.md`, consent layer shipped, capture not).

**Where it lives:** `comms-ingest.service.ts` (the governed ingest),
`MeetingCapture` (the durable conversation record), Comms page (capture /
import / resume), meeting-ingest door on Organization Seeding (honest
not-configured path until Zoom OAuth lands).

**Recent proof (BUG B, live-verified):** Comms no longer loses follow-ups.
The drafted send-cards are durable `FOLLOW_UP` WorkLedger rows served by
`GET /work-os/comms/follow-ups`; they survive navigation and refresh; dismiss
is a durable `CANCELLED`. Work extracted from a conversation is durable the
moment ingest returns.

## 3. Role Template / Instructions / Memory

Agentforce has flat *instructions*. Otzar's instructions are **layered**, and
the layers have different owners and different mutation paths:

| Layer | Owner | Where |
|---|---|---|
| Role template | admin | AI Teammates / role templates |
| Org policy | admin/governance | Policies, collaboration policy |
| Access permissions | admin + grants | Access Control (3-tuple: access_scope, can_share_forward, duration_type) |
| Memory | the person (consent-gated) | governed capsules, Digital Work Wallet |
| Corrections | humans reviewing Otzar's work | `TwinCorrectionMemory`, `OrgRecipientCorrection` |
| Work methods | observed + configured (future) | workflow observation |
| Twin behavior | template + all of the above | twin conduct paths |

**Amended 2026-07-03 (learn-loop read-path v1 SHIPPED, FND `8a45de2`):** the
recipient-correction learn-loop IS now wired into ingest. The BUG C resolved
FOLLOW_UP rows are the correction store (no new table; no TwinCorrectionMemory
routing writes — that column is free-text by design). Every ingest loads the
org's caller-resolved decisions: prior SELECT resolves the same name collision
for the same stable entity (`likely`, evidence `correction_memory`); prior
CONFIRM softens `out_of_scope → likely` only (evidence `caller_confirmed`).
Never past unauthorized / cross_team_needs_approval / hard exclusions; never
send-ready by correction alone. Taxonomy + boundaries: FND
`docs/otzar/OTZAR_CORRECTION_MEMORY_LEARN_LOOP.md`. Remaining honest gap:
provenance is not yet customer-visible (ledger gap A), and only recipient
corrections are read — owner/approval/tool corrections stay future (gap Q).

## 4. Data 360 ETL / Org Truth Graph

Salesforce Data 360 unifies *data*. Otzar must unify **work meaning**: every
communication becomes an agent-readable event that can become work, memory,
or policy-bound knowledge.

The pipeline (vocabulary is **ETL**, never "ATO"):

> **Extract → Transform → Resolve → Govern → Load → Feedback**

**Canonical objects** (full source-of-truth table:
`OTZAR_AGENTIC_DATA_FLOW_CONTRACT.md`): Person · AI Twin · Org ·
Department/Team · Manager edge · Project/Workspace · External participant /
Dandelion seed · Communication capture (`MeetingCapture`) · Decision ·
Commitment · Blocker · Follow-up · Work item (`WorkLedgerEntry`) · Approval
(`Action`) · Escalation (`EscalationRequest`) · Tool connection
(`ConnectorBinding`) · Access grant · Policy · Audit event (`AuditEvent`) ·
Memory item (capsule) · Report/metric (derived) · Observation session
(prototype).

**HARD RULE — no page invents its own truth.** Every customer-facing page
reads a canonical object or a *documented projection* of one
(`OTZAR_PAGE_PROJECTION_MATRIX.md` is the ledger of who reads what). The two
pages that violated this (Comms' volatile cards, People's flattened
"connected") were the P0 arc — both repaired and live-verified.

## 5. WorkLedger

**WorkLedger is the durable operating substrate.** It is one table
(`work_ledger_entries`) with a free-string `ledger_type`, and that is a
feature: new work kinds don't need migrations, they need discipline.

**The canonical row model (founder-ratified — never re-litigate):**

| Record | Meaning | Owner |
|---|---|---|
| `MeetingCapture` | the conversation/capture record | caller/org |
| `COMMITMENT` | an obligation | **the doer** |
| `FOLLOW_UP` | a drafted send/review action | **the sender/reviewer** |
| `Action` | a governed execution object | requester (source) |
| `EscalationRequest` | the approval/dual-control object | target = approver |

A drafted follow-up and its mirrored commitment are **different work owned by
different people** — never double-counted, never merged. `ORG_SEEDING` and
`GOAL` rows are their own surfaces (excluded from My Work/Team Work);
`FOLLOW_UP` is first-class caller work (in My Work *and* resumable as a rich
card in Comms — same row, two projections).

**Recent proof:** BUG B (durable follow-ups), BUG C (durable recipient
review on the same rows), approval loop (Action⇄Escalation reconcile both
directions). All live-verified with genuine navigation.

## 6. Routing Decision Layer

This is **not intent classification**. It is the layer that decides, from
persisted decider outputs (`routing-decision.ts` — CT renders the projection,
never re-derives):

- **who owns** work (proof-path owner resolution; unproven → `NEEDS_OWNER`,
  never auto-assigned),
- **who approves** (dual-control target resolution — org-admin pool via the
  canonical COMPANY resolver; the hierarchy-edge regression here is fixed),
- **who receives** (recipient governance: `confirmed / likely / ambiguous /
  out_of_scope / unauthorized / cross_team_needs_approval`),
- **when to escalate**, **when a tool is missing** (`connector_required` /
  `setup-required`), **when a Dandelion seed exists** (external/unproven
  people become admin-governed seeds, never trusted edges),
- **when work is silent / blocked / approval-required / ready** (the ten
  routing lanes on every work card).

**Surfaces that read it:** My Work, Team Work (manager rollup on real
hierarchy edges), Action Center, Blind Spots, Approvals, People &
Collaboration (growth recommendations with structured per-fact context).

## 7. Governed Actions

Actions are how Otzar executes — and **every meaningful action is governed**
(ADR-0057 pipeline: `PROPOSED → APPROVED → SCHEDULED → RUNNING → SUCCEEDED /
FAILED / REJECTED / CANCELLED`, one canonical state machine in
`state-machine.ts` — never a second one).

The governed verbs shipped today: send internal note · confirm recipient ·
select recipient · dismiss follow-up · approve/reject escalation · create
work · escalate · connect tool · ingest meeting · create Dandelion seed ·
record memory capsule (consent gate).

**Recent proof:** invalid send shape fixed (BUG A: `body_summary` ≤200,
full draft in `body_redacted`); "Submitted for approval" truth copy (never
optimistic "Sent"); approved sends **deliver** (scheduler admission →
executor → real `SEND_INTERNAL_NOTIFICATION` handler — first completed
governed send delivered live 2026-07-02); rejected sends reconcile;
idempotency keys prevent duplicate approvals piling up.

## 8. Approvals / Dual-Control / Escalation

Part of the trust layer, now a **closed loop** (live-verified both legs):

> sender submits → Action `PROPOSED` + escalation created → approver's
> queue (Review Center) shows **human context** ("Second approval for:
> Internal note", requester by *name*) → approve → paired Action `APPROVED`
> → scheduler/executor → **delivered** (`SUCCEEDED`) → sender sees "Sent"
> — or — reject (with reason) → paired Action `REJECTED` → sender sees
> "Not approved" → audit records `ACTION_APPROVED` / `ACTION_REJECTED`.

**Invariants (all live-proven):** two-person rule (the source can never
resolve their own escalation — 403, and it never appears in their own
queue); verdicts are final (no flip-flop after APPROVED/REJECTED); the
approver's reason is stored as a **safe bounded scalar**
(`safeApproverReason`, ≤500 chars) on the escalation's `resolution_metadata`
and in the `ACTION_REJECTED` audit; **Review Center**
(`src/pages/Approvals.tsx`, `/approvals`) is the current approver surface.

**Remaining honest:** the rejection *reason* is not yet projected on the
sender's `/actions` list view (verdict yes, prose no); Review Center badges
count all escalation types, not just actionable sends; the Approved tab can
read zero while the executor transits a send quickly.

## 9. RBAC / ABAC / TAR / Policy

This layer defines who can **see, approve, send, confirm, override — and
what can never be overridden**. TAR (Token Attribute Repository) carries the
capability bits; permissions are the 3-tuple; recipient governance and
dual-control sit on top.

**The override matrix (founder-ratified in BUG C — the load-bearing policy):**

| Recipient verdict | Nature | Caller may complete? |
|---|---|---|
| `out_of_scope` | knowledge gap | ✅ Confirm (vouch — recorded as `caller_confirmed`) |
| `likely` | judgment call | ✅ Confirm |
| `ambiguous` | multiple matches | ✅ Select — from **server-resolved** id-based candidates only |
| `unauthorized` | policy denies | ❌ never |
| `cross_team_needs_approval` | approval boundary | ❌ never directly |

**Recent proof:** all five verdicts behave exactly as above, live; admin
Review Center is capability-gated; employees cannot self-approve; and the
**`/org/entities` `password_hash` leak is fixed** (FND #526 — both list and
detail now use a safe-field allowlist; found by this arc's own live smoke).

## 10. Audit / Proof

**Audit is not optional.** Every governed decision writes proof, hash-chained
(`AuditEvent`): `FOLLOW_UP_RECIPIENT_RESOLVED` (recipient review, with
`caller_confirmed` provenance) · `ACTION_APPROVED` / `ACTION_REJECTED` (with
`approver_reason`) · `ESCALATION_APPROVED` / `ESCALATION_REJECTED` ·
`audit_event_id` pointers stored **on the rows they prove** (the FOLLOW_UP
row carries its review's audit id) · execution attempts + receipts on the
ledger.

**Where proof is customer-visible today vs backend-only:**

- **Visible:** Security & Audit page (org audit browser); audit-aware toasts
  with audit links (the universal 4-stage pattern); execution receipts /
  attempts on work items; escalation status + reason on the escalation
  record; "You confirmed this recipient" provenance on cards.
- **Backend-only (honest):** the `approver_reason` on the *sender's* action
  list; per-decision proof drill-downs from most work surfaces (the pointers
  exist on the rows; the click-through UX is partial); captured-but-not-
  executed rows have empty audit affordances (honest — nothing executed yet).

## 11. Feedback Memory Loop

Otzar must improve from human decisions. The **inputs already being
generated**: wrong-owner corrections (NEEDS_OWNER reviews) · recipient
confirmed (`caller_confirmed`) · selected recipient (ambiguity resolutions) ·
rejected actions (+ approver reasons) · dismissed recommendations · "needs a
first project/workspace" facts · access corrections · tool setup events ·
(future) workflow observation.

**Honest state — do not overclaim:** the **learn-loop into ingest is not
wired**. The substrate exists (`OrgRecipientCorrection`,
`correctionsForContext`, `TwinCorrectionMemory`, and `classifyRecipient`'s
`aliases`/`excludeEntityIds` inputs) but ingest doesn't load it. The standing
rule from BUG C holds: **never write dead-end memory** — wire the read path
first (or in the same slice), then start persisting corrections from
confirm/select/reject events.

## 12. Ambient UX

**Ambient is not decoration.** Ambient means the right work appears in the
right place, at the right moment, with the right explanation — and can be
resumed. The surfaces: Talk to Otzar (voice/chat into the same governed
loop) · Comms · My Work · Team Work · Action Center ("Needs me") · People &
Collaboration · Approvals / Review Center · Blind Spots · Memory / Digital
Work Wallet · the desktop companion (built, production-configured; window
verification still pending).

**The hard statement:**

> A beautiful UI that loses work is not ambient.
> A durable system with confusing copy is not ambient.
> **Ambient = durable + governed + explainable + recoverable + low-noise
> movement of work.**

The session that produced this document proved the standard both ways: the
cards were beautiful and volatile (BUG B — not ambient), then durable with an
optimistic "Sent" lie (approval loop — still not ambient), and only after
both repairs does the flow qualify.

---

# Agentforce → Otzar mapping table

| # | Agentforce concept | What it means there | Otzar equivalent | Otzar deeper meaning | Current repo/source | Status | Recent repairs | Remaining gap | Tests / live smoke |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Agent | A configured conversational agent | **AI Twin / AI Teammate** | A governed representation of a *specific person* with role, hierarchy, tools, memory, bounded authority | `TwinConfig`, AI Teammates page, role templates | Partial | Owner/title→template mapping; twin-scope panel | Template→behavior wiring; portable-memory UX | ai-teammates unit; live IA shots |
| 2 | Topic | A category that scopes the agent's job | **Work lane / routing intent / workstream category** | Persisted routing lanes + execution types on every work item — not chat categories | `routing-decision.ts`, `execution-planner.ts`, lane chips | Live | P0R lanes; landed-P0 statuses | Correction intents (reroute/fix-role) not wired | routing-lane tests; ux-coherence smoke |
| 3 | Instructions | Prompt-level behavioral text | **Role template + governance + memory + policy (layered)** | Different owners per layer; permissions are structural, not prose | templates, Policies, Access Control, capsules, corrections | Partial | Twin mapping surfaced; consent-gated memory | Learn-loop into ingest; behavior wiring | twin/policy unit tests |
| 4 | Data Library | Grounding data for retrieval | **Data & Knowledge / ETL / org truth graph** | Unifies work *meaning*, not just data; every page a documented projection | `comms-ingest`, `OTZAR_AGENTIC_DATA_FLOW_CONTRACT.md`, `OTZAR_DATA_360_KNOWLEDGE_MODEL.md` | Live (core) | ETL durability arc (A–D) | Deeper lineage browsing | comms-ingest integration; arc C1 |
| 5 | Actions | Invocable operations | **Governed actions + WorkLedger transitions** | Every meaningful verb is an audited, approvable object with one state machine | `action.service`, `state-machine.ts`, `executor.ts`, `patchLedgerEntry` | Live | Send shape; truth copy; delivery proven; idempotency | Reason on sender list view | workos-writeback; loop smoke |
| 6 | Flow / Apex / Prompt Template | Custom logic behind actions | **Backend services + tools + role instructions** | Deterministic TS governance authority; LLM assists, never decides | FND `apps/api/src/services/**`, connector providers | Live | Dual-control resolver fix | Connector breadth (Zoom OAuth parked) | unit tier 2918; integration 111 |
| 7 | Reasoning Engine | LLM-driven planner | **Routing decision layer + recipient governance + escalation routing** | Deterministic, proof-path-based routing; explains itself on every card | `routing-decision.ts`, `recipient-governance.ts`, `resolveDualControlTarget` | Live | Manager-edge org-resolution regression fixed | Learn-loop feedback into routing | escalation-target-resolver; bugc/loop smokes |
| 8 | LLM | The model that runs the agent | **Extraction/reasoning provider — never source of truth** | LLM output is quarantined, proof-gated, and re-verified deterministically (noisy tail, recipient gate) | `comms-extract.service.ts` + deterministic gates | Live | — | Extraction variance (honest smoke branching) | comms-ingest tests; smoke annotations |
| 9 | Trust Layer | Masking/guardrails on model IO | **RBAC/ABAC/TAR + approvals + audit/proof** | Structural authority, two-person invariant, hash-chained proof — not string filters | TAR, dual-control middleware, `escalation.service.ts`, `AuditEvent` | Live | Reconciliation both legs; password_hash leak closed | Proof click-throughs from work surfaces | dual-control tiers; loop smoke; leak test |
| 10 | Builder / Console | Admin configuration studio | **Admin IA: AI Teammates, People, Tools, Access, Policies, Scenario Studio** | Admin surfaces run on the same canonical objects — no config-vs-runtime split | admin pages + `nav.ts` | Live (core) | Admin IA consolidation; connectedness truth | Assignment flow from People; Reports depth | admin-nav/ct-approvals tests; bugd smoke |

---

# Closed gaps vs remaining gaps

> **The LIVING gap document is now
> [`OTZAR_OPERATIONAL_GAP_LEDGER.md`](./OTZAR_OPERATIONAL_GAP_LEDGER.md)** —
> per-gap customer story, truth source, surfaces, risk, recommended slice,
> and the next-slice selection method. Next slices are chosen there, by
> customer journey. The tables below are the historical snapshot at this
> document's authoring.

## Closed (all live-verified, 2026-07-01 → 07-02)

| Gap | Fix | Where |
|---|---|---|
| Invalid send shape (BUG A) | `body_summary` clamped, full draft in `body_redacted` | CT `c3a4c14` |
| Volatile Comms follow-ups (BUG B) | Durable `FOLLOW_UP` rows + resume projection | FND `85fdfbe`, CT `0e584a6` |
| Recipient review stuck state (BUG C) | resolve-recipient (confirm/select), audited, durable | FND `d280cfc`, CT `fcb2a2a` |
| Misleading connectedness copy (BUG D) | `NEEDS_PROJECT_OR_WORKSPACE` + true org placement + structured context | FND `8e3423b`, CT `7e44e09` |
| Dual-control approver routing regression | Canonical COMPANY org resolution (manager edges no longer break approver pools) | FND `8e3423b` |
| Action⇄Escalation reconciliation | REJECTED mirror block + reason plumbing | FND `8c10788` (#525) |
| Optimistic "Sent" copy | "Submitted for approval" truth state; "Not approved" verdict | CT `084767f`+`31ef3ee` |
| `password_hash` org-entity leak | Safe-field allowlist on list + detail | FND `9dce631` (#526) |
| Home / Needs-Me mismatch | Single-source signals (Section-25) | earlier pass |
| Team Work manager rollup | Real hierarchy edges | P1 pass |
| Meeting ingest not-configured path | Honest door, no fake happy path | Slice 3 |
| Workflow observation consent layer | Consent-first prototype, no silent capture | Slice 5 |

## Still open / partial

| Gap | Note |
|---|---|
| Project/workspace assignment flow from People & Collaboration | BUG D names the gap; admin can't act in-flow yet |
| Durable server-side dismiss for People recommendations | "Hide for now" is honestly session-local |
| Correction-memory learn-loop into ingest | Substrate exists; ingest doesn't read it |
| Full role-template→twin behavior wiring | Templates label/scope, don't drive conduct |
| Desktop window/customer verification, tray, native notifications | DMG builds; window verification pending |
| Zoom happy path | Parked until OAuth credentials |
| Data & Knowledge deeper lineage browsing | Lifecycle framing shipped only |
| Memory / Digital Work Wallet personal-value redesign | Framing exists, depth doesn't |
| Scenario Studio executive rollup depth | Real pipeline, thin rollups |
| Real Reports vs Work Health analytics | Reports is an honest link-hub |
| Rejection reason on sender's list view | Verdict projected, prose isn't |
| Review Center badge refinement | Counts all escalation types |

---

# The "never again" list

1. **Never let extracted work live only in component state.**
2. **Never let a page invent durable truth.**
3. **Never use display names as identity** (stable ids only; duplicate-name
   safe).
4. **Never expose secret or credential material** (the `password_hash` leak
   is the standing example; allowlist selects on every entity read).
5. **Never imply someone is disconnected from the org** when only a
   project/workspace assignment is missing.
6. **Never let policy boundaries be caller-overridden**
   (`unauthorized` / `cross_team_needs_approval` are not judgment calls).
7. **Never fake a learn-loop** by writing memory that ingest does not read.
8. **Never say "Sent" before approval/execution** — "Submitted for approval"
   is the truthful state.
9. **Never claim desktop complete because the DMG builds.**
10. **Never claim a meeting-ingestion happy path** without credentials and a
    transcript smoke.
11. **Never treat hierarchy as UI-only metadata** — manager edges change
    approver resolution, routing, and copy (the dual-control regression is
    the standing proof).
12. **Never claim "agentic"** unless Otzar actually acts, routes, asks,
    remembers, audits, or improves in that flow.

---

## Related canon (read in this order)

1. This document — the shape.
2. `OTZAR_AGENTIC_DATA_FLOW_CONTRACT.md` — canonical objects + load-bearing
   rules.
3. `OTZAR_PAGE_PROJECTION_MATRIX.md` — who reads what, page by page.
4. `OTZAR_COMMS_INGESTION_ETL_REPAIR.md` +
   `OTZAR_COMMS_PEOPLE_P0_ARC_FINAL_VERIFICATION.md` — how the arc was
   repaired and proven.
5. `OTZAR_PRODUCT_MODEL_CORRECTION.md` — the seeded-org truth map and
   product-model corrections.
6. `AMBIENT_WORK_OS_PRODUCT_DOCTRINE.md` + `OTZAR_CUSTOMER_EXPERIENCE_FIRST_MODEL.md`
   — how to decide what to build next.
