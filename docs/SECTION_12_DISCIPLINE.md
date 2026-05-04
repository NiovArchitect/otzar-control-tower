# Section 12 Discipline — otzar-control-tower

Strategic substrate for Section 12 sub-boxes 12B.2 through 12F.
Companion to CLAUDE.md (operational rules) and CONTEXT.md (current state).
Per-sub-box plans reference this rather than restate the rules.

## Mission

Section 12 is the customer-facing surface of Otzar. When an enterprise
team evaluates Otzar, they spend 80% of their evaluation time inside
these screens. Foundation can be patent-perfect and still fail
commercially if Section 12 doesn't carry the story.

## Production-ready means all hold simultaneously

- Architectural integrity: every screen consumes Foundation's actual
  data model through type-safe contracts. Patent claims visible.
- Vocabulary discipline: no data-model leakage in customer copy.
- Audit-aware UI everywhere: 4-stage state machine, no exceptions.
- Data sovereignty visible: inline note + footer badge +
  WalletProvenanceBadge on rows where wallet boundaries matter.
- Dandelion propagation visible: admins see propagation impact
  before commit.
- Cross-repo audit chain end-to-end: any AuditAwareButton click →
  Foundation writes audit row → response surfaces audit_event_id →
  toast clickable to /security-audit?audit_id=X → detail drawer renders.
- Performance: FCP < 1.5s, TTI < 4s, action feedback < 1s.
- WCAG AA / Section 508 floor.
- Self-onboarded admin: 12F takes a fresh admin to first AI teammate
  without human assistance.

## Architectural decisions in force

1. JWT in memory only. No localStorage/sessionStorage.
2. Single HTTP surface (src/lib/api.ts). No direct fetch() in components.
3. Capabilities from allowed_operations, mirroring Foundation's
   OPERATION_TO_CAPABILITY map.
4. Audit-aware UI 4-stage pattern on every privileged action.
5. Customer vocabulary, not data-model vocabulary.
6. shadcn/ui + Radix + Tailwind. Hand-written primitives.
7. TanStack Query 5 for server state. Zustand 4 for client state.
8. TypeScript strict + noUncheckedIndexedAccess +
   exactOptionalPropertyTypes.
9. Vite proxy /api → :3000.
10. npm package manager.
11. DataSovereigntyBadge in footer + DataSovereigntyInline at top of
    every data screen.
12. WalletProvenanceBadge encapsulates (walletType, entityType) →
    variant derivation. PERSONAL+AI_AGENT → "AI Teammate wallet."
13. Pagination + filtering defaults: 25 rows, URL state, 4 table states
    in DataTable.
14. No optimistic mutations on privileged actions. Wait for server
    audit confirmation.
15. Role-based visibility at AuthGuard, not per-screen.
16. audit_event_id on success-arm responses only. Failure paths omit.
17. Schema-honest permissions matrix: 3-tuple (access_scope,
    can_share_forward, duration_type).
18. Label maps are single source of truth; Record<T, string> enforces
    compile-time exhaustiveness.
19. Bridge-aware Access Control: one bridge, N permissions. Revoke by
    bridge_id.
20. Three-step Dandelion invite wizard: capture → Phase 2 review →
    Phase 3 confirm.
21. Random password placeholder via crypto.getRandomValues(). Never
    displayed/logged/stored. Invitee's real path is
    Phase3Result.activation_credential.
22. Bulk actions: Promise.allSettled() with per-item progress and
    "Retry failed only" CTA. Reusable BulkActionsBar.
23. Client-side audit filtering for /org/audit in 12B-12C. Foundation
    extends in 12D.
24. Pending Approvals badge renders 0 throughout 12B-12D. Real source
    in Section 14.
25. Sharing rules / collaboration policies in Policies (12E), not
    Access Control.
26. "Last Updated" not "Last Active" in member lists. Schema-honest.
27. Phase 2 review focused slice: new entity + direct manager + first
    5 direct reports + expand link.
28. Sheet (side="right") consistent for all detail panels.
29. MSW with onUnhandledRequest:"error" — every endpoint consumer
    registers a handler.

## Customer vocabulary (the 3 label maps)

- Members (not Entities)
- AI Teammates (not Twins)
- Knowledge Items (not Capsules)
- Access Control (not Permissions)
- Data & Knowledge (not Capsule storage)
- Security & Audit (not Audit Events log)
- Personal/Enterprise/AI Teammate wallet
  (not WalletType: PERSONAL/ENTERPRISE)

Internal codes appear in audit-event tooltips when granular detail
aids the operator. Default display uses customer-friendly labels.

Label maps (compile-time exhaustive via `Record<T, string>`):
- src/lib/labels/capsule-types.ts (20 entries)
- src/lib/labels/entity-types.ts (6 entries)
- src/lib/audit/event-types.ts (30 entries)

## Audit-aware UI 4-stage spec

Every privileged action via AuditAwareButton or AuditAwareForm.

- Stage 1 — Pre-action affordance: AuditEventTooltip below the action
  shows customer-friendly audit label.
- Stage 2 — Confirmation (optional): Dialog with title, description,
  target description, audit literal.
- Stage 3 — In-flight: button disabled, spinner, "Logging audit
  event..." text.
- Stage 4 — Post-action: success toast with truncated audit_event_id
  clickable to /security-audit?audit_id=full; failure toast with
  error.message and NO audit link (12B.0 contract).

No screen rolls its own action button. No action skips the pattern.

## Available primitive inventory (after 12B.1)

- AuditAwareButton, AuditAwareForm, AuditEventTooltip
- WalletProvenanceBadge, DataSovereigntyInline
- DataTable<T>, MatrixCell
- 11 shadcn primitives (avatar, checkbox, command, dialog, form,
  popover, radio-group, select, switch, tabs, textarea)
- api.org.* + api.cosmp.* (~25 typed methods)
- 3 label maps with helpers
- MSW handlers + tests/setup.ts polyfill

Sub-boxes 12B.2+ may add: BulkActionsBar (12B.2), additional label maps
(autonomy-levels, permission-scopes, pattern-types, etc.). Justification
in JSDoc required for each new component. "Reused 3+ times" or
"encapsulates non-trivial drift-prone logic" are the two valid grounds.

## Discipline cadence (every sub-box)

1. Pre-flight grep against niov-foundation. Surface drift.
2. Plan-review gate. User approves before code.
3. Sequenced build with incremental typecheck.
4. 6 verifications: typecheck, lint, test, build, dev server, npm install.
5. Pre-commit alignment review against this doc.
6. User-approved commit. Force-push uses --force-with-lease + backup branch.

## Cross-repo discipline

Foundation extensions (when needed for 12C, 12D, 12E) land first as
their own [SECTION-XX-FOUNDATION] commit with own tests. Frontend
lands second consuming the new contract. Following the 12B.0/12B.1
pattern.
