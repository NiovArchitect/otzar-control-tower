# Customer-Org Simulation — Readiness Plan (pre-GO)

> STATUS: **v1 EXECUTED 2026-07-07** — founder GO received. The dedicated
> tenant `Meridian Field Systems` (org `69c07a00-2b39-4771-95c3-22c214e7ae6c`)
> was created through the dual-controlled Phase-0 rail (operator-1
> requested → 403 payload-bound pending → operator-2 approved → 201,
> approval consumed single-use). Customer Org Simulation v1 ran GREEN
> first-pass (8.4 min, `otzar-live-customer-sim.spec.ts` /
> `test:e2e:live:customer-sim`): 8-identity cast + hierarchy + 3A rights
> + org timezone via live rails; 4 dated reference docs incl. an explicit
> supersession pair; HONEST missing-Google state (adapter
> BLOCKED_BY_CREDENTIAL, /drive/docs refuses — never a fake connect);
> truth arc (calm supersession correction, sales-overreach flag, zero
> invented owners); employee reality (starter twins, role-boundary 403s,
> enumeration-safe 404); calendar proposal-only honesty; full cleanup
> (rows cancelled, identities suspended — the tenant persists clean).
> **v2 EXECUTED 2026-07-07** (`test:e2e:live:customer-sim:v2`, GREEN ~15 min):
> full 16-identity cast + hierarchy + role titles + 3A rights + timezones;
> REAL Google (Drive doc import with external_source lineage + dedupe;
> Calendar free/busy driving a scheduling proposal; honest Meet
> SCOPE_REAUTH_REQUIRED branch); the calendar-WRITE runtime shipped
> (approval-gated Google events.insert/delete, calendar.events scope) and
> stays honestly EVENT_WRITE_SCOPE_MISSING live until a founder re-consent
> grants the scope; deep truth engine (calm supersession lead,
> sales-overreach flag, memory/question/request mint no work,
> zero-invention); employee/Twin boundaries; full cleanup (zero residue,
> Google connection persists VERIFIED). v3 candidates: real Meet transcript
> once the Meet API path opens for the account, real calendar event
> create→delete once the write scope is consented, UI walk-throughs.
> v2-original scope (now done): full 16-identity cast, ~20-transcript
> lived-in layer, Google Docs/Meet imports once OAuth credentials exist,
> admin/employee UI walk-throughs. The sections below remain the
> blueprint. The
> Redwood Atlas doctrine (`redwood-atlas/README.md`, corpus/people/
> clients fixtures, the 44-check matrix) is the parent discipline; this
> plan scales it from a truth-weight proof to a LIVED-IN customer org.

## 1. Purpose

The Redwood corpus proved the governance engine at ingest scale. What it
deliberately did not build is a customer org that FEELS inhabited: a
company with working hours, a real reporting tree, role-appropriate AI
Teammates, dated documents that supersede each other, and enough dummy
client/project surface that every Otzar screen has honest content. That
is what a pilot prospect will judge in a demo, and what the pilot's own
org will look like on day 30.

## 2. Company profile (fixture: `customer-org/profile.json` — to be authored)

- **Meridian Field Systems** (working name; final name at GO) — a
  60-person B2B industrial-IoT services company: field-device fleets,
  installation projects, support contracts. Rich enough for real
  cross-team conflict (sales promises vs engineering capacity vs
  compliance dates); boring enough that no real-world brand collides.
- Industry: TECH/industrial services. One HQ + one field region.

## 3. Time, schedule, hierarchy

- **Org timezone:** America/Chicago HQ; field region America/Denver;
  one remote lead America/New_York (exercises the timezone-aware
  work-profile rails the Redwood personas proved individually).
- **Working hours:** 8:30–17:00 HQ; field crews 7:00–15:30; the
  simulation's transcripts and doc dates all fall INSIDE working hours
  (calm ambient behavior), with exactly two deliberate after-hours
  events to exercise quiet-hours/notification posture.
- **Hierarchy (via the live `POST /org/hierarchy/assign` rail):**
  CEO → VP Ops, VP Sales, Eng Director → 3 team leads → 8–12 ICs
  (~16 provisioned identities total; the other "employees" exist only
  as roster names in seeded docs — cheap, honest, and enough for
  people-resolution).

## 4. Decision rights + communication lineage

- 3A decision-rights per person via the live PATCH rail, mapped like the
  Redwood people fixture (owns / can_approve / recommend_only across
  strategic, execution, deadline, product, customer, technical,
  architecture, design, finance, legal domains).
- Every seeded conversation keeps the 16-act communication-lineage
  vocabulary (decision, approval, commitment, request, memory_reference,
  superseding_decision, …) so truth-weight ranks real material.

## 5. Documents: source-of-truth, dated, superseded

Through the ADMIN SEEDED-CONTEXT rail only (titles carry
`[Seeded simulation]` — never presented as live-connector truth):

- One master services agreement summary + one SOW per project (dated).
- A Q3 delivery plan (dated June) SUPERSEDED by a revised plan (dated
  July) — the supersession pair is explicit in the newer doc's text.
- An on-call/escalation policy (policy_constraint material).
- Two stale docs deliberately NOT superseded (tests honest staleness).

## 6. Transcripts with natural conflict (the lived-in layer)

~20 conversations through the governed ingest rail, run-tagged:

- The sales-promise-vs-approved-scope arc (recommend-only overreach).
- The deadline replan arc (July → September, explicit supersession).
- A compliance date that outranks a preference (policy beats wish).
- A recorded disagreement where hierarchy does NOT win (the CEO's
  suggestion loses to the owner's decision — hierarchy≠truth proof).
- Routine standups/1:1s (noise floor — most conversations mint nothing).

## 7. AI Teammates (role-specific behavior)

- One twin per provisioned lead (via `POST /org/ai-teammates`),
  role_title matching the human's function; autonomy APPROVAL_REQUIRED
  everywhere (pilot posture). The twin-deactivation rail is the
  cleanup for every one of them.
- Role-specific calibration only through the shipped calibration
  surfaces; nothing hand-injected into memory stores.

## 8. Honesty boundaries (BINDING)

- **No fake Google claims.** No "event created", no "calendar invite
  sent", no live Google Docs/Meet references. Anything calendar-like is
  a seeded simulation doc with the label in the title. The connector
  honesty sweeps from the Redwood corpus spec apply verbatim.
- Provider-acceptance vs delivery language discipline everywhere.
- Demo org untouched; all load is smoke-tenancy (see §9).

## 9. Cleanup / reset strategy + the exact GO

- **Tenant choice (GO decision):** load into the NIOV Smoke Org
  (fastest; residue coexists with smoke history) OR a NEW dedicated
  customer-sim org via the dual-controlled `POST /platform/orgs` rail
  (cleanest; recommended — its own admin, its own reset story, and the
  org-creation rail gets another live exercise).
- Every identity `pilot-smoke+` / sim-prefixed; every row run-tagged;
  cleanup = the proven rails (CANCELLED rows, suspended identities,
  deactivated twins, archived projects/workspaces). A
  `customer-sim-residue-sweep` script mirrors the existing sweeps.
- **The exact GO needed:** "GO customer-org simulation load — target:
  <NIOV Smoke Org | new org named X>" plus (if new org) the second
  operator's dual-control approval for org creation. Without that GO,
  nothing in this plan touches any live system.

## 10. Effort estimate

Fixture authoring (profile/people/docs/transcripts): the long pole
(~2-3 focused blocks). Loading + verification: one block (the Redwood
corpus loader pattern is directly reusable). UX walk-through: one block.
