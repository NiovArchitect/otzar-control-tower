# Otzar agentic data-flow contract

**Status:** 2026-07-02 (Fable 5). The canonical objects and their single
sources of truth. **Primary rule: no page invents its own truth — it reads a
canonical object or a documented projection of it.** Grounded in the codebase;
mismatch risks are named, not hidden.

## The OS-level loop (better-than-Data-360 principle)

Salesforce/Data-360 unifies data + runs automations. Otzar goes further: every
communication becomes an **agent-readable event** that can become work, memory,
or policy-bound knowledge; every derived action is **durable and recoverable**;
every routing decision **explains itself** (P0R lanes); every correction
**improves future routing**; every page shows the **same org truth from its
angle**; every twin acts within role/hierarchy/access; everything is governed
and audited.

Extract (comms/workstream) → Transform (normalized org events) → Resolve
(people/projects/tools/twins) → Policy (RBAC/ABAC/hierarchy) → Route
(owner/manager/approver/twin/tool + escalation) → Persist (durable
work/action/memory) → Surface (the right page) → Confirm-only-what's-missing →
Execute (governed) → Audit → Learn (corrections) → update memory + future
routing.

## Canonical objects

| Object | Canonical source | Stable ID | Org scope | Key states | Appears in | Audit |
|---|---|---|---|---|---|---|
| Person | `Entity` (type PERSON) / `/org/entities` | entity_id | org_entity_id | ACTIVE/SUSPENDED/DELETED | Members, People, AI Teammates | ENTITY_* |
| AI Twin | `Entity` (AI_AGENT) + `TwinConfig` | entity_id | org | active/prepared/missing; autonomy level | AI Teammates, My Twin | ENTITY_REGISTERED |
| Org | `Entity` (COMPANY) | entity_id | self | — | Home, all admin | — |
| Department/Team | `EntityMembership.department` / edges | membership_id | org | active | Members (org map), Team Work | ADMIN_ACTION (HIERARCHY_ASSIGN) |
| Manager edge | `EntityMembership` person→person | membership_id | org | active/retired | Members, Team Work rollup | HIERARCHY_ASSIGN |
| External participant / Dandelion seed | `OrgSeed` | seed_id | org | PROPOSED/NEEDS_REVIEW/APPROVED/REJECTED/HELD/APPLIED | Organization Seeding | seed verdicts |
| Communication capture | `MeetingCapture` | meeting_capture_id | caller/org | captured/processed | Comms, Meeting captures | ingest audit |
| Transcript/message source | capture.transcript / source-event | source_message_id | caller | — | Comms (caller-scoped reopen) | CONNECTOR_DATA_READ |
| Decision / Commitment / Blocker | `WorkLedgerEntry` (+evidence) | ledger_entry_id | org+caller | DETECTED…EXECUTED/VERIFIED/BLOCKED | My Work, Team Work, Blind Spots | WORK_LEDGER_* |
| Follow-up draft | `WorkLedgerEntry` (FOLLOW_UP/COMMITMENT, pre-send) + proposed_action | ledger_entry_id | owner/target/requester | PROPOSED/DRAFT→sent | Comms (resume=BUG B), My Work | attempts |
| Work item | `WorkLedgerEntry` | ledger_entry_id | per-user | see routing lanes | My Work/Team Work/Action Center | attempts + receipts |
| Approval / escalation | `Action` + `EscalationRequest` | action_id | org | PROPOSED…APPROVED/REJECTED/EXECUTED | Action Center, Review Center | ADR-0057 chain |
| Routing decision | projection over deciders (`routing-decision.ts`) | (derived) | per-item | 10 lanes | every work card | (reads only) |
| Tool connection | `ConnectorBinding` | binding_id | org | enabled/disabled/removed | Tools & Connections | ADMIN_ACTION |
| Access grant | grant/permission (3-tuple) | grant_id | org | granted/revoked | Access Control | grant/revoke audit |
| Policy | policy rows (internal/collab/data-sharing) | policy_id | org | active | Policies | policy audit |
| Audit event | `AuditEvent` | audit_id | org | immutable | Security & Audit | (is the audit) |
| Memory item | MemoryCapsule / work-graph memory | capsule_id | caller/org | scoped | My Digital Work Wallet | access audit |
| Report / metric | derived over WorkLedger + hierarchy | (derived) | hierarchy-scoped | — | Reports (link-hub today), Work Health | read audit |
| Observation session | consent-session model (no capture yet) | (client, prototype) | employee + org policy | unavailable/idle/active/review | My Digital Work Wallet | (future) |

## Load-bearing rules

1. **Work is never volatile.** Anything extracted from communication persists
   as a WorkLedger row. The Comms follow-up **cards** being volatile (BUG B)
   is the exception being repaired — the data underneath is already durable.
2. **One store per object.** Follow-ups are WorkLedger rows — there is no
   second follow-up system, and none may be added.
3. **Projections don't recompute policy.** CT renders `routing` from the
   Foundation projection; it never re-derives lanes/permissions.
4. **Connected ≠ one signal.** "Connected" spans org + department + manager +
   twin + tool + recent work. A page must not imply disconnection from a
   single missing signal (BUG D: no-project ≠ disconnected).
5. **Stable IDs only** for identity/assignment; display names never resolve
   identity (duplicate-name safe).

## Known mismatch risks (from this audit)

- Comms follow-up **cards** volatile vs the durable ledger (BUG B).
- People "not connected" **framing** vs true hierarchy connection (BUG D).
- Reports is a **link-hub**, not yet a hierarchy-aware rollup projection
  (documented; no fake metrics).
- `audit_pointer` absent on captured (non-executed) rows — honest, but the
  audit affordance is empty until executions accrue.
