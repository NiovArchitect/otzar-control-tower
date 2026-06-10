## Section 12 in progress · operational rules

Currently building Section 12 (Otzar Control Tower frontend). The discipline cadence is non-negotiable.

1. **Pre-flight grep.** Verify every contract
   the sub-box consumes. Surface every drift between assumed contract
   (CONTEXT.md / 12B.1 type contract) and Foundation reality. Report
   findings as numbered drifts. WAIT for user resolution before
   drafting plan.

2. **Plan-review gate.** Draft plan covering: file list with paths,
   prop signatures, label map additions, MSW handler additions,
   architecture tests, pre-commit alignment review checklist, commit
   message. Reference `docs/SECTION_12_DISCIPLINE.md` rather than
   restating rules. WAIT for user approval before any code.

3. **Sequenced build.** Order steps so each layer compiles before the
   next. Run `npm run typecheck` after each major layer (types, api
   client, components, tests).

4. **Six verifications, all green.**
   - `npm run typecheck` (0 errors, strict + noUncheckedIndexedAccess
     + exactOptionalPropertyTypes)
   - `npm run lint` (0 warnings, 0 errors)
   - `npm run test` (target count met)
   - `npm run build` (success)
   - `npm run dev` (HTTP 200)
   - `npm install` (clean, no peer-dep failures)

5. **Pre-commit alignment review.** Verify against
   `docs/SECTION_12_DISCIPLINE.md` discipline rules + sub-box
   specifics.

6. **User-approved commit.** No commit until user approves the
   report. Force-pushes use `--force-with-lease` with backup branch.

### Architectural primitives (from 12B.1) — REACH FOR THESE

Inventory: AuditAwareButton, AuditAwareForm, AuditEventTooltip,
WalletProvenanceBadge, DataSovereigntyInline, DataTable<T>, MatrixCell,
api.org.*, api.cosmp.*, 3 label maps, 11 shadcn primitives, MSW handlers.

If a screen needs a privileged action: AuditAwareButton or
AuditAwareForm. If a list: DataTable. If a drawer: shadcn Sheet
(side="right"). If a tab system: shadcn Tabs. If a wallet display:
WalletProvenanceBadge. New components only with explicit JSDoc
rationale meeting "reused 3+ times" or "encapsulates non-trivial
drift-prone logic."

### Vocabulary discipline

Customer-facing labels go through one of three label maps:
- `src/lib/labels/capsule-types.ts` (20 entries)
- `src/lib/labels/entity-types.ts` (6 entries)
- `src/lib/audit/event-types.ts` (30 entries)

TypeScript `Record<T, string>` enforces compile-time exhaustiveness.

Customer terms in copy: Members · AI Teammates · Knowledge Items ·
Access Control · Data & Knowledge · Security & Audit ·
Personal/Enterprise/AI Teammate wallet. NEVER: Entity, Twin, Capsule,
Permission, Wallet (these are data-model primitives, not customer copy).

### Audit-aware UI 4-stage pattern is universal

Every privileged action implements: pre-action affordance → optional
confirmation → in-flight → post-action toast with clickable audit link.
Failure paths omit audit_event_id (12B.0 contract). No exceptions. No
"small actions" that skip the pattern.

### Schema-honest UI

Foundation models permissions as a 3-tuple (access_scope,
can_share_forward, duration_type). UI renders this directly. No
synthetic 4-value enum. No invented abstractions.

### Cross-repo discipline

When a sub-box needs Foundation extensions (12C, 12D, 12E), Foundation
work lands FIRST as `[SECTION-XX-FOUNDATION]` commit with own tests.
Frontend consumes the new contract in a SECOND commit. Pattern from
12B.0/12B.1.

### State files

- `docs/SECTION_12_DISCIPLINE.md` — strategic frame (committed)
- `CONTEXT.md` — current state, HEAD, test count, sub-box progress
  (untracked)
- `AGENTS.md` — operational rules (committed)

Update CONTEXT.md after every sub-box close. Update
SECTION_12_DISCIPLINE.md when a new architectural decision is locked
(append to decisions list with next # number).
