# Role Template → AI Twin Behavior & Authority: Wiring Plan

**Status:** 2026-07-03 (Fable 5). SLICE 1 SHIPPED (FND `dd7c4ab`, CT `e8cc7f5`)
per founder GO — Option A exactly as specified below. Day-one runtime outcome
change: zero (ceiling default APPROVAL_REQUIRED; existing twins untouched,
live-verified). DEPLOY-ORDER LESSON (P0 incident, same day): Render job
`startCommand` is NOT run through a shell — quotes pass literally, so
`node -e "…"` evaluates a string literal and exits 0 as a silent no-op. Any
remote migration/verify channel MUST first prove it can FAIL (canary
`process.exit(3)` → job must report failed). Working channel:
`sh -c` + spaceless `${IFS}` pipeline. The safe sequence that finally shipped:
real additive SQL job → exit-code-verified → independent untouched-rows job →
THEN merge/deploy → behavioral probe (route serves the new fields). Companion to
[`OTZAR_ROLE_TEMPLATE_WIRING_AUDIT.md`](./OTZAR_ROLE_TEMPLATE_WIRING_AUDIT.md)
(the evidence) and
[`OTZAR_TWIN_ROLE_TEMPLATE_MODEL.md`](./OTZAR_TWIN_ROLE_TEMPLATE_MODEL.md)
(the product model). Ledger: gap G/H in
[`OTZAR_OPERATIONAL_GAP_LEDGER.md`](./OTZAR_OPERATIONAL_GAP_LEDGER.md).

**The promise this plan serves:** "When I assign a person a role, their AI
Twin behaves, acts, requests approvals, uses tools, and collaborates
according to that role — not just a label and a persona." Otzar cannot claim
role-aware twins while templates affect only persona copy. But authority
defaults are enterprise trust — they get wired deliberately, capped, audited,
and displayed, never silently.

**The one hard rule throughout: displayed capability must match runtime
enforcement.** Any field the admin sees must be the field the evaluator
reads.

---

## 1. Current reality (evidence: audit doc, all file:line verified)

| Piece | Where | State |
|---|---|---|
| `AgentTemplate` (13 role templates) | FND `schema.prisma:2055-2069`; seed files `apps/api/templates/roles/*.md`; seeded on boot (`governance/seeds.ts:129-176`) | Durable. Carries `template_content`, `skill_packages[]`, `autonomy_default` |
| Seeded `autonomy_default` values | template frontmatter | **10× APPROVAL_REQUIRED, 3× EXECUTIVE_OVERRIDE (CEO, COO, CTO)** — the quantified risk of any verbatim wire |
| `TwinConfig.role_template` | `schema.prisma:889`; written at provisioning `twin.service.ts:243-268` via `role-template-resolver.ts`; audited | Durable + set. **Read at runtime by exactly one consumer** |
| The one `role_template` runtime reader | `otzar.service.ts:941-957` (chat conduct Layer 2 persona prompt) | LIVE — persona only, no authority |
| `autonomy_level` enforcement | `action.service.ts:355-359` → `policy-evaluator.ts:289-410` (OBSERVE_ONLY→FORBIDDEN; APPROVAL_REQUIRED→dual control unless ActionPolicy AUTO_APPROVE; EXECUTIVE_OVERRIDE→tier-gated) → execution + audit `action.service.ts:529-614` | LIVE and reachable (`POST /api/v1/actions`; connector invoke; ambient bar). **This is the real authority rail** |
| Provisioning default | `twin.service.ts:234` | Hardcoded `isAdmin ? EXECUTIVE_OVERRIDE : APPROVAL_REQUIRED`; **never reads `template.autonomy_default`** |
| Evaluator's role slot | `policy-evaluator.ts:92` (`role_template?` in envelope) | Exists; fed `undefined` at `action.service.ts:374`; no branch reads it |
| `TwinAuthorityGrant` | `schema.prisma:2645-2718`; services `twin-authority-grant.service.ts` | Create/list/revoke + display-only capacity summary; **zero runtime consumers** |
| Tool access | ConnectorBinding, org-scoped, resolved inside action handlers (`handlers.ts:604`, `getConnectorBindingForOrg`) behind the same Action policy gate | Separate connector state; NOT template/role/grant-driven today |
| Autonomy edits | `PATCH /org/ai-teammates/:id` → `TwinConfig.autonomy_level` (`org.routes.ts:2356-2366`) | LIVE admin control (CT "Behavior Policy") |
| Org ceiling substrate | `OrgSettings` (`schema.prisma:856-865`) | **No autonomy-ceiling field exists today** — Option A requires one additive column |
| AI Teammates UI | CT `AITeammates.tsx` | Shows Owner, **stored** Role template (fixed `3cae28e`; "Not set yet" honest state), Behavior Policy (`autonomy_level` label), EXECUTIVE badge, status |
| Chat approval detection | `approval-detection.ts` verb-scan | Advisory only; consults neither template nor autonomy; must never be confused with enforcement |

## 2. Product model (the intended stack)

```
Human role (role_title / hierarchy)
  → role template            (AgentTemplate slug — applied at provisioning, admin-visible, admin-changeable)
  → twin behavior/persona    (template_content → conduct prompt)        [LIVE today]
  → autonomy default         (template.autonomy_default, CEILING-CAPPED by org policy)  [slice 1]
  → allowed action classes   (ActionPolicy rows per action_type/risk — existing rail)
  → tool requirements        (template-declared tool needs → connector readiness signal; grants stay separate)  [future]
  → approval boundaries      (policy evaluator + dual-control — unchanged, never template-bypassed)
  → audit/proof              (every applied default + override audited with provenance)
  → memory scope             (template-scoped memory defaults)          [future]
  → visible admin controls   (AI Teammates shows ALL of the above truthfully)
```

Non-negotiables: a template can *recommend* authority, never *grant* past
org policy; the chat verb-scan stays advisory; RBAC/ABAC/TAR and the
approval policy remain upstream of everything a twin executes.

## 3. Authority model options

**Option A — ceiling-capped wire (RECOMMENDED; matches founder bias).**
Provisioning sets `autonomy_level = min(template.autonomy_default,
org_ceiling)`; org ceiling is a new additive `OrgSettings.twin_autonomy_ceiling`
defaulting to `APPROVAL_REQUIRED` (= today's de-facto behavior, so day-one
outcome change is ZERO until an admin raises the ceiling). Admin PATCH can
still set any level explicitly (audited) — the ceiling caps *defaults*, not
deliberate admin decisions. Provenance recorded.
*Why right:* the CEO/COO/CTO templates carry `EXECUTIVE_OVERRIDE` defaults;
uncapped they would silently mint auto-approve-tier twins. A ceiling makes
template influence real while org policy stays sovereign. Safest default
that still moves the product.

**Option B — verbatim wire + audit.** Template default applies directly.
Rejected for now: 3/13 seeds would immediately create EXECUTIVE_OVERRIDE
twins on provisioning with no admin decision — a silent authority escalation
an enterprise buyer would fail us on, audit trail or not.

**Option C — populate the evaluator's role slot only.** Fill
`entity_profile_safe_view.role_template` at `action.service.ts:374` (slot
already typed at `policy-evaluator.ts:92`), change no outcomes. Safest
operationally, but by itself it is invisible to customers — role templates
would still not govern anything. Adopted here as **part of slice 1** (it is
zero-risk and enables future policy-by-role) rather than as the whole answer.

**Recommendation: Option A, with Option C's slot-fill folded in.**

## 4. Safe first implementation slice (needs founder GO before shipping)

FND first (own PR + tests), CT second — the established two-commit pattern.

1. **Additive column:** `OrgSettings.twin_autonomy_ceiling TwinAutonomyLevel
   @default(APPROVAL_REQUIRED)`. No backfill needed; absent row behaves as
   default.
2. **Provisioning (`twin.service.ts` STEP 4):** applied level =
   `min(template.autonomy_default ?? APPROVAL_REQUIRED, ceiling)` on the
   ordered scale OBSERVE_ONLY < APPROVAL_REQUIRED < EXECUTIVE_OVERRIDE.
   Existing `isAdmin` handling preserved exactly as today (admin twins are an
   explicit org decision, not a template default). **Existing twins are
   untouched — provisioning-time only, no migration of current rows.**
3. **Provenance:** the provisioning audit event gains
   `autonomy_source: "role_template_default" | "org_ceiling_capped" |
   "admin_hardcoded"` + `template_recommended_level`; `TwinConfig` gains an
   additive `autonomy_source String?` so the UI can say where the level came
   from without audit archaeology.
4. **Evaluator slot fill (Option C):** `action.service.ts:374` passes the
   real `role_template`; NO evaluator branch added — outcomes provably
   unchanged (test-locked).
5. **CT AI Teammates:** columns/drawer show — person represented, stored
   role template, current autonomy level, **template-recommended level**,
   **org ceiling**, and "Adjusted by your admin" when
   `autonomy_level ≠ applied default` (from `autonomy_source` + PATCH
   audit). Honest "Not set yet" everywhere a value is absent. No guessed
   archetypes (already fixed), no capability claims beyond the enforced
   rails.
6. **Explicitly NOT in slice 1:** no tool-execution expansion, no
   `TwinSkill` provisioning, no `TwinAuthorityGrant` consumer, no new
   evaluator behavior, no change to any existing twin's authority.

Risk assessment: with the ceiling defaulting to `APPROVAL_REQUIRED`, slice 1
changes **zero runtime outcomes on day one** — CEO/COO/CTO templates get
capped to exactly what provisioning hardcodes today. The product gains: real
template→authority plumbing, provenance, and truthful admin visibility; the
org gains a single deliberate knob (`twin_autonomy_ceiling`) to let templates
matter more. The residual risk is admin confusion between "recommended" and
"applied" — addressed by the explicit UI copy in step 5.

## 5. AI Teammates UI clarity (target state)

Person represented · role template (stored) · current autonomy level ·
template-recommended autonomy · org ceiling/policy cap · tool readiness
(from real ConnectorBinding state — the signal that already exists in
`connector-capability.ts`) · approval requirement (from the enforced level,
never the chat verb-scan) · last active/recent work where the substrate
already has it · "Not set yet" honestly where missing. No guessed
archetypes. No fake capability claims. Every displayed value traces to the
exact field runtime enforcement reads.

## 6. Runtime enforcement map (where runtime must eventually read)

- `autonomy_level` — `policy-evaluator.ts` (LIVE today; stays the spine).
- `role_template` — envelope slot (filled in slice 1; future policy rungs
  may branch per-role, e.g. ActionPolicy rows keyed by role).
- `TwinAuthorityGrant` — future: either consumed by the evaluator as a
  scoped elevation (grant → temporary allowed class) or retired; a substrate
  with no reader is a dead rail. Founder decision required.
- Tool grants — future: template declares tool *requirements* (readiness
  signal); execution keeps flowing through ConnectorBinding + Action policy;
  no template ever bypasses connector authorization.
- RBAC/ABAC/TAR — unchanged, upstream of all of it (`tar_capability_bits`,
  `permission_set_summary` already in the envelope).
- Approval policy — `ActionPolicy` + dual-control unchanged; templates can
  never lower an approval boundary, only (capped) raise autonomy toward it.

## 7. Tests required (slice 1 gate)

FND: template default applies at provisioning (persona template → level);
ceiling caps EXECUTIVE_OVERRIDE seeds to APPROVAL_REQUIRED with
`org_ceiling_capped` provenance; raising the ceiling lets the default
through; admin PATCH override still works and is audited; **existing twins'
levels unchanged by deploy (no-migration test)**; evaluator outcomes
byte-identical with the role slot filled (golden-case matrix across all
three autonomy levels); unauthorized/cross-team/approval boundaries intact;
cross-org template isolation (org-scoped custom template never resolves for
another org).
CT: teammates row/drawer renders stored template, applied level, recommended
level, ceiling, "Adjusted by your admin"; "Not set yet" states; no raw
enum/slug leakage (banned-terms sweep).

## 8. Live smoke (slice 1, non-destructive)

Preferred: read-only — verify AI Teammates on the existing demo twins
renders stored truth + the new recommendation/ceiling fields (screenshot),
and `GET`-probe the ceiling field default via org settings surface.
Mutating leg ONLY if reversible: provisioning a smoke member/twin requires a
twin/member removal-or-suspend rail — if none exists at implementation time,
provisioning behavior stays integration-proven (the assignment-slice
precedent) and live coverage stays read-only. **No authority escalation in
the live org, period** — the ceiling default makes the smoke naturally
non-escalating.

## 9. Explicitly parked (future, in dependency order)

1. Tool grants / `skill_packages` → `TwinSkill` provisioning + readiness UI.
2. `TwinAuthorityGrant` runtime consumer (or retirement) — needs its own
   boundary design.
3. Role-template skill packs affecting drafting/execution routing.
4. Template-driven memory scope defaults.
5. Template-driven multi-twin collaboration policies.
6. Full admin template editor (custom org templates exist in substrate;
   editing UX is its own slice).

## What requires founder approval before any code ships

1. Adopt Option A (ceiling-capped) as the authority model.
2. The new `OrgSettings.twin_autonomy_ceiling` knob (name/default).
3. Confirmation that existing twins are left untouched (provisioning-only).
4. The slice-1 scope above (including the Option C slot-fill).
