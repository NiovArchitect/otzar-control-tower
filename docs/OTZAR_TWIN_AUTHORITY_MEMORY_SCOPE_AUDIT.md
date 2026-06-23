# Twin / Authority / Memory Scope Audit (gates LIVE-2)

> Read-only audit of `niov-foundation` + `otzar-control-tower`, grounded in the
> repos' ADRs and design docs. Purpose: confirm the **governed AI-Twin
> architecture** is real before building the LIVE-2 proof, and pinpoint the
> minimum gaps to close. The headline: **the architecture is real and enforced.**
> The Twin operates inside its human's authority, memory is wallet-governed, and
> restricted memory is denied — with two concrete gaps to close for v1.

## Verdict at a glance

| # | Question | Verdict |
|---|---|---|
| 1 | Where does each employee's Twin exist? | ✅ REAL |
| 2 | How is each Twin tied to its human entity? | ✅ REAL |
| 3 | How is the Twin's scope made ≤ the human's RBAC/ABAC/TAR? | 🟡 REAL-by-construction (not a computed mirror) |
| 4 | What Foundation checks enforce the Twin cannot exceed the human? | ✅ REAL (11 surfaces, ADR-0046) |
| 5 | Where does company/org memory live? | ✅ REAL |
| 6 | Where does employee memory live? | ✅ REAL |
| 7 | Twin retrieves permitted employee memory? | ✅ REAL (owner-session path) |
| 8 | Twin retrieves permitted company memory? | 🟡 PARTIAL (admin perm + Hive SUMMARY; priming raw-read gap) |
| 9 | Restricted memory denied? | ✅ REAL end-to-end via COSMP (priming shortcut excepted) |
| 10 | Can a human/Twin route work to another teammate? | ✅ REAL (human path); AI gated to governed Action path |
| 11 | Can the recipient (or their Twin) respond in their own scope? | 🟡 PARTIAL (human reply REAL; Twin-autonomous reply RUNTIME_MISSING) |
| 12 | Can Foundation prove/audit the permission boundary? | 🟡 PARTIAL (Action/Escalation/TwinCollab audited; human routing NOT) |
| 13 | Employee Twin/scope surfaces exist + real? | ✅ REAL + ambient (shell, My Twin, Inbox, My Work, My Memory, Action Center) |
| 14 | Surface showing accessible vs denied scope + 3-tuple? | 🟡 PARTIAL (role/behavioral scope shown; no accessible/denied data view) |

## 1–4 · The Twin and its authority

- Each Twin is an `Entity` `AI_AGENT` row, one per `(owner_entity_id, role_title)`,
  created in `services/governance/twin.service.ts` with a `PERSONAL` wallet + its
  own TAR (`clearance_ceiling: 2`).
- The human→Twin link is an `EntityMembership` (`parent_id`=PERSON owner →
  `child_id`=AI_AGENT twin). `conductSession` resolves the Twin via that edge.
- **Scope ≤ human (the crux):** `conductSession` always runs on the **human's
  bearer token**, so the human's wallet, clearance ceiling, and TAR govern every
  capsule read. The Twin additionally has a *lower* clearance ceiling and is
  capped by AI-sovereignty rules (FULL→SUMMARY unless an explicit human override).
  So the Twin is provably **≤ the human, never exceeds**. It is enforced by
  **construction + fixed AI-class lower defaults**, not by a computed
  `deriveAuthorityFrom(human)` — that, plus `caller_can_use_target_twin: false`
  (no delegated-authority runtime) and the `TwinAuthorityGrant` substrate (no
  execution wiring), are the forward items.
- Enforcement (ADR-0046, 11 surfaces): ENTERPRISE default wallet for bare
  AI_AGENT; ceiling cap 2; AI cannot raise/grant to AI; restricted-AI-class gates
  (`ai_access_blocked`, `requires_validation`); FULL→SUMMARY cap; similarity +
  COE clearance filters; `EntityMembership` fusion.

## 5–9 · Memory wallets and governed access

- **Company memory** = org `COMPANY` entity's `ENTERPRISE` wallet
  (`niov_can_access_contents=false`); `DECISION` capsules route there
  (`observation.service.ts` PORTABILITY ROUTING INVARIANT).
- **Employee memory** = `PERSON`'s `PERSONAL` wallet; `COMMITMENT`,
  `WORK_PATTERN`, `CORRECTION` capsules route there.
- **Permitted employee read**: the human's own session reads their own wallet via
  the COSMP **owner shortcut** (`session.entity_id === capsule.entity_id` → no
  Permission row needed). `conductSession` assembles context this way. REAL.
- **Permitted company read**: admin twins get a standing org-wallet Permission;
  standard twins reach org intelligence via **Hive SUMMARY**. A `createSystemPermission`
  **future-capsule gap** means capsules created *after* twin creation aren't auto-
  covered by the bridge (not the active path, since reads run on the owner session).
- **Restricted denied** (REAL, COSMP): wallet scoping (A can't see B's capsules),
  `checkPermission`, `ai_access_blocked`, `requires_validation`, clearance ceiling,
  AI FULL→SUMMARY cap, `isDMWActive`, sovereignty rules, `NONE`-duration explicit
  block, enumeration-safe `ACCESS_DENIED`.
- **Gap:** `priming.ts:getRelevantDecisions` reads org `DECISION` capsule summaries
  via **raw Prisma**, bypassing COSMP permission/audit — any org member sees
  DECISION summaries in priming context (acknowledged in-code as a Section-14
  improvement). Not a v1 blocker, but recorded.

## 10–12 · Cross-teammate routing + audit

- **Routing (REAL, human):** `POST /work-os/internal-messages` →
  `deliverHumanInternalMessage` → recipient `Notification` row + Work Ledger row.
  AI_AGENT senders are **hard-gated** to the governed `createActionForCaller`
  path (evaluator + audit). `TwinCollaborationRequest` is a typed routing surface.
- **Recipient reply in own scope (REAL):** `replyToNotificationForCaller` submits
  the reply Action under the **recipient's** `callerEntityId` (not the sender's);
  `TwinCollaborationRequest` accept/reject is target-gated. Twin-**autonomous**
  reply is `RUNTIME_MISSING` (correctly deferred — not v1).
- **Approval ladder (REAL):** `EscalationRequest` (PENDING→APPROVED/REJECTED),
  self-approval blocked, audit-chained in-transaction.
- **Audit (PARTIAL — the key gap):** Action (`ACTION_PROPOSED/APPROVED/REJECTED`
  with actor/target/decision/risk_tier/policy_envelope_hash), Escalation, and
  TwinCollaboration transitions are all append-only audit-chained. **But
  `deliverHumanInternalMessage` does NOT call `writeAuditEvent`** — the most common
  human routing action leaves only Work-Ledger + Notification rows, no audit-chain
  entry. **This is the #1 gap for "Foundation proves what happened."**

## 13–14 · Employee surfaces

- **Real + ambient (reuse as-is):** `FocusHome`, `EmployeeLayout`,
  `AmbientOtzarBar`, `AmbientEdgeGlow`, presence store (passes the ambient design
  law); `MyTwin` (role/scope/governance panels + `AskYourTwin` scoped chat),
  `MyMemory` (counts + authority booleans + revoke links), `NotificationBell` +
  `InboxThread` (full two-way thread + reply), `MyWork`, `ActionCenter`,
  `Collaboration`.
- **Scope view (PARTIAL):** My Twin shows identity + role alignment + behavioral
  scope + governance + continuity, but **no "accessible vs denied" data/memory
  view** and **does not surface the permission 3-tuple** (access_scope,
  can_share_forward, duration_type). `role_scope_profile` is optional on the
  Foundation response (must be seeded for the demo Twins).

## Minimum LIVE-2 / LIVE-3 build (prove the architecture; reuse, don't reduce)

**Close the two real gaps + surface what already exists:**

1. **LIVE-2A (Foundation-first):** emit a `writeAuditEvent` in
   `deliverHumanInternalMessage` so human work-routing is append-only auditable
   (actor=sender, target=recipient, SAFE details: work_ledger_id, notification_id,
   message kind — no payload). Closes the #1 proof gap.
2. **LIVE-2B (Otzar):** a calm **"What your Twin can access"** panel on My Twin
   that surfaces the governed scope (permission posture / accessible vs restricted,
   and the 3-tuple where available) from existing `my-twin` / `context-health`
   data; reconnect authority tiles to `/app/authority-grants`. Proves
   "Twin operates in the human's scope, and you can see it."
3. **LIVE-2C / smoke:** validate + document the end-to-end loop on real substrate:
   route → recipient receives → reply in own scope → audit proves it.
4. **LIVE-3:** the permissioned execution loop (proposed-action → approval →
   execute one safe internal update → audit → both see) is already largely real
   (`createActionForCaller` + `EscalationRequest` + work ledger + audit) — close
   any gaps and prove it; no new action framework.

**Explicitly NOT v1 (deferred, not reduced):** autonomous Twin-to-Twin
(`RUNTIME_MISSING` / `caller_can_use_target_twin:false`), the priming COSMP-bypass
hardening, the future-capsule permission sync, external connector sends.
