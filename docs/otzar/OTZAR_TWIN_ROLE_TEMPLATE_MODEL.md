# Otzar twin ↔ role-template model

**Status:** Phase 2 (2026-07-01). Grep-verified against code; no invention.

## The 13 shipped role templates (FND `apps/api/templates/roles/*.md`)

account-executive · chief-executive-officer · chief-operating-officer ·
chief-technology-officer · customer-success-manager · finance-analyst ·
hr-manager · marketing-manager · operations-manager · product-manager ·
sales-manager · sales-representative · software-engineer

Each is a markdown behavior/instruction template seeded into the DB
(`services/governance/seeds.ts` → AgentTemplate rows keyed by `role_name`).
They are NOT user-uploaded; they ship with Foundation.

## How the wiring actually works (already built)

1. **Title → template slug**: `role-template-resolver.ts` maps a free-form
   title ("VP of Sales", "AI/NLP Engineer") to one of the 13 slugs; unknown
   titles resolve to **null** → the twin keeps a generalist fallback. Never
   invents; never hardcodes a person. CT mirrors the intent in
   `src/lib/role-archetypes.ts` (`resolveRoleArchetype` — used for the human
   preview).
2. **Member → twin**: `POST /org/onboarding/invite` (Phase-3 atomic invite,
   admin-gated) mints the AI twin for a pending member — entity + wallet +
   membership + TwinConfig; **STEP 4 of twin provisioning preloads the
   matching role template** from the member's title.
3. **Persistence**: `TwinConfig.role_template` (nullable string = slug);
   surfaced as `role_template_status: CONFIGURED | NOT_CONFIGURED` in the
   twin view (`otzar.service.ts`).

## What Phase 2 added (CT, compose-only)

- **Invite wizard** captures title + department + manager (stable-id select;
  duplicate names safe) and, after member creation, places the person through
  the SAME governed `/org/hierarchy/assign` rail (audited). The title field
  live-previews "Role template: Marketing Manager"; Step 3 shows the full
  placement (title/department/template) before "Confirm and send invite",
  which mints the twin.
- **AI Teammates** gains a human "Role template" column (owner title →
  archetype display name; "General" when no template applies). Raw slugs/file
  names stay out of normal UI.

## Honest boundaries (not yet wired)

- Role template selection is **derived from the title**, not a separate
  picker — a distinct "access package" selector does not exist yet.
- Tool packages per role, approval-class per role, and the twin
  "learning/memory state" line are future; AI Teammates shows what is
  persisted today (behavior policy, admin status, owner, template).
- Admin promotion/demotion UI + last-admin guard: not yet built (Phase 2
  remainder; requires an FND capability-mutation route audit first).

## ETL / Data-360 carry-through

New member → org-graph entity (stable id) → hierarchy edge (routing/
escalation) → twin with role template (what it may do) → title/role feeds
notification context (live: senders carry role_title) → all corrections flow
back through the audited assign rail.
