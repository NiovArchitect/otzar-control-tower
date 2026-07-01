# Ambient Work OS — Product Doctrine (reconciled north star)

**Status:** Founder doctrine, reconciled 2026-07-01 for the **PROD-UX-AMBIENT** slice.
This doc reconciles: (1) Otzar PRDs (`docs/otzar/PRD-00…06`), (2) the Design Law
(`docs/product/otzar-ambient-work-os-design-law.md`) + Interface Reconciliation Map
(`docs/otzar/AMBIENT_INTERFACE_RECONCILIATION_MAP.md`), (3) the Work OS phase handoff
(`niov-foundation/docs/otzar/WORK_OS_PHASE_HANDOFF.md`, slices A–F), (4) **later founder
clarifications made in conversation** (which extend/deepen the PRDs and are first-class
doctrine — not skippable because "the PRD didn't mention it"), (5) actual code + routes,
and (6) live user-testing feedback. When these conflict, resolve by the priority order in
§7. This is the north star for the PROD-UX slice; the concrete repair inventory lives in
`docs/otzar/PRODUCTION_WORKOS_COHERENCE_REPAIR.md`.

---

## 1. What Otzar is (unchanged, reaffirmed)

Otzar is an **ambient enterprise AI Work OS** on the NIOV Foundation governance substrate.
Its wedge (PRD-00): **turn messy human communication into governed, context-aware,
completion-oriented work movement.** It is NOT a chatbot, dashboard, task app, CRM, debug
console, notification feed, or admin panel. *"The user feels the magic, never the
machinery."*

The backend rails for this are **built and live** (slices A–F): source/signal → owned
WorkLedger → identity/responsibility/goals → grounded answering → **governed connector/MCP
execution** (real Slack write-back verified, dual-control approval-linkage now platform
behavior). **The rails work. The product surface does not yet make them usable.** This
slice fixes the surface without rebuilding the rails.

## 2. The core founder correction (the soul)

Otzar is **ambient AI, not another SaaS task dashboard.** The core is **routing +
autonomy + ambient visibility + exception-handling** — NOT "build more pages and
buttons," and NOT "ask the human for permission every five seconds."

- **Employees should not have to live inside Otzar.** They experience it as ambient
  presence: routed work, calm cues, clear exceptions, voice/text, receipts — minimal
  surface, deep intelligence underneath.
- **Admins may live in Otzar more** (they run the org) — they get deeper, clean,
  human-readable control surfaces.
- **Routing is the core product behavior.** Most intent lives in conversations/meetings/
  messages/docs. Otzar converts signals → owner/support/lead/project/goal/tool/execution/
  authority/confidence/risk/next-step/audit/memory, then routes to the correct lane.
- **Approval is an exception path, not the default model.** Humans added AI to *reduce*
  interruptions. Low-risk / high-confidence / policy-allowed work routes or executes;
  humans are interrupted only when risk, ambiguity, identity, authority, missing
  connector/access, or policy genuinely requires it.
- **Source-backed accuracy over fast extraction.** Never invent owners/people/facts.
- **Scalable grouped workflows over card spam.** Must work for a 5,000-person org.
- **Prepare for glasses / earpieces / lenses:** frosted, ambient, glanceable, draggable,
  non-blocking, stateful, border-aware. The web app must train that same mental model now.

## 3. The autonomy / routing ladder (the anti-approval-spam model)

Every signal Otzar processes lands on exactly one rung. **Most work should rest at rungs
1–3; rung 5 is the exception, not the norm.** This is enforced by the *existing* frontend
rail `src/lib/work-os/ambient-visibility.ts` (`decideAmbientVisibility` →
`silent | confirmation | interrupt | digest | detail_on_demand` + importance levels) and
the backend Work-Graph governance (earned-autonomy, decision-rights, recipient proof-path,
execution planner mode). **Do not build a second autonomy system — compose these.**

| Rung | Behavior | When | Human sees |
|---|---|---|---|
| 1 · Silent capture | save source, extract facts, update memory/graph | always | nothing (audit-only) |
| 2 · Silent routing | route obvious low-risk work to the right owner/Action Center | clear owner, low risk | at most a calm cue / digest |
| 3 · Draft | Otzar prepares a message/doc/ticket/update; no send | medium value, reviewable | "Otzar drafted X" (on demand) |
| 4 · Execute w/ policy | audited execution of low-risk, allowed, high-confidence, connected-tool actions | policy permits + tool connected | receipt afterward (silent success) |
| 5 · Escalate / approve | require a human decision | risk med/high · external/sensitive write · unclear authority · ambiguous/unknown identity · unknown owner · missing connector/access · conflicting evidence · cross-team/org · low confidence · cost/legal/security exposure | **interrupt** with reason + one clear action |
| 6 · Block safely | cannot route/execute safely | unresolved blocker | clear "why" + next-best setup/identity/policy step |

The governed Slice-F write-back is rung 4/5: `execution_mode=otzar_can_execute_with_approval`
means "route to approval," never "execute immediately." That is preserved. The product job
is to make rungs 1–3 the felt default and rung 5 rare, clear, and one-tap.

**The routing decision is a first-class product object (P0R).** Every routed item exposes
the lane Otzar chose (`silent_capture | silent_routing | notify_owner | draft_ready |
execute_when_allowed | ask_approval | escalate | blocked | setup_required |
identity_review`) **and why**: reason, source evidence, risk, confidence, policy basis,
owner, next best action, audit pointer. This is a pure projection composed from the
existing deciders (`computeAutonomyDecision` + `planExecution` + capability state +
identity guards) — never a second autonomy system, and never a fabricated explanation.

## 4. Employee experience model

Ambient, routed, non-blocking. The employee's felt surfaces (Design Law §1–4):
- **Presence, not panel** — the orb + edge glow + at-most-two frosted notification cards
  (`AmbientEdgeGlow`, `AmbientOtzarBar`, `AmbientNotificationStack`). Nine presence states
  (`src/lib/stores/presence.ts`: IDLE/LISTENING/THINKING/RECOMMENDATION/APPROVAL_REQUIRED/
  SUCCESS/BLOCKED/QUIET/FAILURE). **Compress by default, expand only when needed.**
- **My Work / Action Center = "what needs me," and it is ACTIONABLE** (§6-P0A). Not a
  readable list — the employee can open source, ask Otzar to handle, approve/reject/edit,
  mark done, request/connect a tool, see the receipt. No dead/fake buttons; no item without
  an action or an explanation.
- **Today routes** — an attention cue deep-links to the actual item; count matches data;
  no card without a backing item (§6-P0B).
- **Comms is reopenable source-of-truth** — captures persist; the original transcript/
  source + derived work + evidence are viewable by authorized users (§6-P0C).
- **Voice-first, non-blocking** — voice input works or degrades to server STT with honest
  state; the Talk-to-Otzar presence never blocks primary CTAs (§6-P0G/H).
- Copy is human. **No backend machinery in normal UX** — enforced by the existing guard
  `findBackendTermLeak` (`ambient-visibility.ts`): no env-var/binding/rail/envelope/
  entitlement/UPPER_SNAKE/route-id language in employee copy.

## 5. Admin experience model

Admins get real operational control — calm, human-readable, no terminal, no filler.
- **Understand the org**: people / roles / hierarchy / teams / projects, AI-Twin mapping,
  Dandelion suggestions — visible and actionable (§6-P1 People & Roles).
- **Review Dandelion at scale**: grouped, prioritized, searchable queues — never a flat
  75-card wall (§3 Dandelion scale model / §6-P0E).
- **Operate tools from the UI**: connect / verify / reconnect / revoke / rotate / test /
  set default channel; see scopes, missing permissions, bot-not-in-channel, and which work
  is blocked by a tool (§6-P0F). No terminal for common setup.
- **Inspect governance without developer language**: policies/approvals/execution-health/
  audit as flows, not envelopes/entitlements/rails. Diagnostics stay in a separate
  operator/advanced view, not normal admin nav.
- Implementation language (`env var`, `binding`, `connector rail`, `MCP rail`, `envelope`,
  `entitlement`, raw IDs) moves to **Advanced details**, never front-and-center.

## 6. What this slice must repair (P0 = product blocker · P1 = scale/usability · P2 = copy/IA)

- **P0R** — the routing/autonomy decision layer surfaces on every item (lane + why); low
  risk routes silently, approval demanded only where policy/risk requires (§3).
- **P0A** — My Work / Action Center surfaces the governed execution loop and is actionable.
- **P0B** — Today attention card click-through + count consistency.
- **P0C** — Comms preserves + reopens source conversations/transcripts.
- **P0D** — Identity truth: no pronoun-as-owner ("owned by his"), no ungrounded name
  ("Zephyr") as owner, unknown grounded participants (Dishant) → one grouped Dandelion
  person/setup suggestion, duplicate people (David×N) cluster. Conservative + evidence-based.
- **P0E** — Dandelion / Organization Seeding scales: grouped prioritized queues + search +
  pagination + safe bulk actions; no flat spam; enterprise (5,000+) shape.
- **P0F** — Tools & Connections becomes a UI setup surface (connect/verify/revoke/rotate/
  test), wired to the Slice-F admin binding route + capability/blocked-work views.
- **P0G** — Browser voice/STT server fallback (ElevenLabs route already shipped).
- **P0H** — Talk-to-Otzar presence draggable/collapsible/non-blocking.
- **P1** — Admin IA cleanup (hide/merge filler/preview/dummy; remove implementation copy);
  AI Teammates human-readable (owner/Twin/role/policy, IDs only in details); People & Roles
  hierarchy visible + actionable.
- **P2** — Copy cleanup (implementation → human), applied via `findBackendTermLeak` as the
  test gate.

## 7. Conflict-resolution priority (when sources disagree)

1. **Preserve working backend rails** (A–F, governed execution, dual-control approval
   wire). Never regress; never rebuild; expose them.
2. Follow the clearest coherent **product doctrine** (this doc + PRDs + Design Law).
3. Prefer the **ambient AI Work OS** goal over dashboard/task-app assumptions.
4. Prefer **routing/autonomy** over constant approval.
5. Prefer **source-backed accuracy** over fast extraction.
6. Prefer **clean enterprise flow** over exposing implementation pages.
7. Prefer **scalable grouped workflows** over card spam.
8. Prefer **non-blocking employee experience** over forcing employees to live in Otzar.
9. Later founder clarifications in conversation **extend** the PRDs; "not in a PRD" is not
   a reason to skip. When a clarification updates intent, update behavior AND docs.

## 8. DO-NOT-BREAK (backend rails — preserve, expose, never rebuild)

- The one canonical **WorkLedger** (no second ledger), the **Action executor** +
  policy-evaluator + scheduler/executor + dual-control (no second executor/approval
  system), the **connector/MCP** providers + binding model, **Dandelion** seeding service,
  **identity resolution**, **grounding**, **goals**, **audit** — all from A–F.
- The **dual-control Action approval linkage** (escalation approval → paired Action
  APPROVED) is now platform behavior — preserve it.
- No UI-only fake state; no hardcoded demo names as product logic; no faked completion; no
  auto-invite / auto-grant; no cross-org leak; governed execution stays governed.

## 9. Reconciliation notes (explicit deltas from live testing)

- The PRDs describe the ambient model and the visibility rails; **live testing showed the
  surfaces don't yet consume them** (Action Center not actionable, Today not routing, Comms
  not reopenable, Dandelion flat-spam, tools terminal-only, voice broken, orb blocking).
  This slice is that consumption — the doctrine was right; the wiring was missing.
- "Ask/approve when needed" (PRD copy) is reconciled with the founder correction as the
  **autonomy ladder** (§3): approval is rung 5 (exception), not the default. Where earlier
  UI made everything an approval/review, that is a bug to fix, not doctrine.
- Dandelion "every suggestion is a card" is reconciled to **grouped-by-person/entity/
  setup-target queues** (§3/§6-P0E) for scale.
