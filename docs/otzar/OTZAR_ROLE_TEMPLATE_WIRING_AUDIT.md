# Role template → AI twin behavior: wiring audit (Gap G)

**Status:** 2026-07-03 (Fable 5, overnight run). Grep-first audit, no code
changed by the audit itself. Part of the canonical architecture — see
[`OTZAR_OPERATIONAL_GAP_LEDGER.md`](./OTZAR_OPERATIONAL_GAP_LEDGER.md) gap G
and [`OTZAR_TWIN_ROLE_TEMPLATE_MODEL.md`](./OTZAR_TWIN_ROLE_TEMPLATE_MODEL.md).

## Bottom line

The chain is **partially live, not conceptual** — but the load-bearing
runtime link runs through `TwinConfig.autonomy_level`, **not** the role
template. Today the template governs exactly one runtime decision: the LLM
conduct persona (chat drafting). Authority, tool access, and approval
enforcement are real and audited, but they key off `autonomy_level`;
`role_template` is deliberately fed `undefined` into the policy evaluator.

## What exists (substrate)

- `AgentTemplate` (FND `schema.prisma:2055-2069`): 13 seeded role templates
  (`apps/api/templates/roles/*.md`) with `template_content`,
  `skill_packages[]`, `autonomy_default`; seeded on boot
  (`governance/seeds.ts:129-176`).
- `TwinConfig.role_template` (slug pointer, `schema.prisma:889`) — set at
  provisioning by `twin.service.ts:243-268` via
  `role-template-resolver.ts`, audited.
- `SkillPackage.capability_flags` + `TwinSkill`; `TwinAuthorityGrant` + state
  machine (`schema.prisma:2645-2718`).

## What actually consults it at runtime

- **Template → conduct persona (LIVE):** `otzar.service.ts:941-957` injects
  `AgentTemplate.template_content` into the chat prompt (honest fallback when
  null). This changes how the twin *talks/drafts* — not what it may *do*.
- **Autonomy → enforcement (LIVE, template-independent):**
  `action.service.ts:355-359` → `policy-evaluator.ts:289-410` branches on
  `twin_autonomy_level` (OBSERVE_ONLY→FORBIDDEN; APPROVAL_REQUIRED→dual
  control unless ActionPolicy AUTO_APPROVE; EXECUTIVE_OVERRIDE→tier-gated),
  gating real execution with audit (`action.service.ts:529-614`). Reachable
  from the product (`POST /api/v1/actions`; CT connector invoke / ambient
  bar). CT "Behavior Policy" edits feed this rail (org.routes.ts:2356-2366).
- **Chat-side approval detection is advisory only** (`approval-detection.ts`
  verb-scan; consults neither template nor autonomy; UI flag, no enforcement).

## The severed wires (numbered)

1. **Template → autonomy severed at provisioning:** `twin.service.ts:234`
   hardcodes `isAdmin ? EXECUTIVE_OVERRIDE : APPROVAL_REQUIRED` and never
   reads `template.autonomy_default` — the seeded field is dead.
2. **Template → skills/tools severed at provisioning:** `skill_packages` are
   seeded but no `TwinSkill` rows are created; `capability_flags` gate
   nothing at runtime.
3. **Evaluator slot exists but is fed `undefined`:**
   `policy-evaluator.ts:92` has `role_template?` in the envelope type;
   `action.service.ts:374` passes `undefined`; no evaluator branch reads it.
4. **`TwinAuthorityGrant` has no runtime consumer:** `checkTwinAuthority…` /
   `consumeOneTime…` exist (`twin-authority-grant.service.ts:469-540`) with
   zero callers outside their own file/tests — parallel to, and disconnected
   from, the live enforcement path. Display-only capacity summary.
5. **Two disjoint approval paths** (chat advisory vs Action enforcing); the
   template touches neither decision.
6. **CT truth violation (FIXED in this run):** the AI Teammates "Role
   template" column derived a label from the owner's job title via a CT-side
   archetype registry — ignoring the stored `config.role_template` and even
   using a different vocabulary. Fixed: the column now renders the stored
   slug humanized, with an honest "Not set yet" state
   (`src/lib/labels/role-template.ts`).

## Recommended smallest wiring slice (NOT executed — founder decision)

Seed `TwinConfig.autonomy_level` from `AgentTemplate.autonomy_default` at
provisioning (`twin.service.ts:234`, template row already fetched at `:246`),
keeping the `isAdmin` handling. This connects template → autonomy →
permissions/tools gate → approval → audit through rails that are already
live — no new models, no new evaluator branch.

**Why it was NOT done autonomously overnight:** it changes the authority
default of newly provisioned twins based on seeded template values — if any
template's `autonomy_default` sits above APPROVAL_REQUIRED, wiring it blindly
RAISES autonomy without an explicit admin decision. That is approval-policy-
adjacent and belongs to the founder. Options when picked up:
(a) wire with a ceiling (`min(template_default, APPROVAL_REQUIRED)` unless
admin), (b) wire verbatim + audit the applied default, (c) leave autonomy
alone and instead populate the evaluator's `role_template` slot
(`action.service.ts:374`) so future policy rungs can branch on role without
changing today's outcomes.

Follow-on candidates in order: evaluator slot population (no behavior change,
enables policy-by-role), `skill_packages` → `TwinSkill` provisioning, a
runtime consumer decision for `TwinAuthorityGrant` (wire it into the
evaluator or retire it — a substrate with no reader is a dead rail).
