# PRD-06 — Implementation Coherence

Area 11. **Read this before implementing any Otzar feature.** Its job: keep every
implementation coherent with the updated product direction so the build does not drift.

## Before you implement

1. Read the relevant PRD (`PRD-00`..`PRD-05`) + `AMBIENT_INTERFACE_RECONCILIATION_MAP.md`.
2. Inspect existing implementation (grep the repo — the orchestrator lives in
   `components/otzar/AmbientOtzarBar.tsx` + `lib/work-os/*`).
3. Inspect tests (`tests/unit/ambient-*`, `work-context`, `ambient-visibility`,
   `ambient-edge-presence`).
4. Reconcile with current shipped behavior; inspect recent commits.
5. Avoid duplicate systems; avoid stale doctrine; preserve the latest direction.
6. Build the **smallest safe vertical slice**.
7. Test against **product acceptance**, not just technical pass/fail.
8. Four-gate: `npx tsc --noEmit` · lint changed files · targeted tests · full suite ·
   `npm run build`. Commit clean (`niovarchitect <sadeil@niovlabs.com>`, no AI
   attribution). Deploy (manual Render `otzar-app` trigger) · verify 200 + bundle hash +
   shipped strings · write smoke tests.

## Do NOT ship features that technically work but violate the direction

Violations to reject in review:
- contextless tasks/artifacts (see `PRD-03`)
- backend terms / route names / ids / policy codes in normal UX (see `PRD-02`)
- proof/audit noise in normal UX
- dashboards-first / panel-first UI (see `PRD-01`)
- chat-only behavior (Otzar is a work orchestrator, not a chatbot)
- generic browser/computer-agent behavior (see `PRD-04` limits)
- work artifacts with no endpoint (see `PRD-03` completion)
- interruptions that do not earn attention (see `PRD-02`)
- UI that makes the human operate Otzar instead of Otzar carrying the work
- a Twin acting beyond its human's authority (see `PRD-00`)

## The standing standard

Otzar must remain: **ambient, governed, context-aware, role-aware,
completion-oriented, low-friction, presence-first, enterprise-safe.** The user feels the
magic, never the machinery. When a change is "technically green" but feels like an
enterprise app to operate, it is wrong — fix it before shipping.

**The one question every slice must pass (the Extreme Polarity Ability, `PRD-00`):**
does this make Otzar better at turning **communication/context into governed work
movement**? If yes, build it. If it creates more human work → compress. Contextless
artifacts → block. Hides human-judgment needs → surface. Surfaces noise → digest/hide.
Backend proof → available but out of normal flow. Routes work → govern. Interprets work
→ allow correction. Tracks work → never fake completion.

## Phase map (source of truth: `PRD-00`)

2.5 visibility+resolver · 2.5+ deepened visibility · 2.6 work-context · 2.7 calm-
interface · 2.8 orb compression + presence · 2.9 permissioned surface-context seed
(`PRD-04` A) · 3 transcript/meeting intelligence (`PRD-04` B). Do not jump phases until
the current one is committed, deployed, verified, and smoke-tested.
