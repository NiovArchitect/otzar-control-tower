# Otzar Polyglot Runtime Architecture (Phase 1277)

Otzar uses the **right runtime for the right work**, with **Foundation as
the single authority**. No runtime creates authority; each either asks
Foundation for a decision, receives a Foundation-governed job/event,
emits a Foundation-audited result, or fails closed.

## Runtime division of labor

| Runtime | Owns | Must NOT |
| --- | --- | --- |
| **TypeScript / Fastify** (Foundation API) | auth/session, RBAC/ABAC, AuthorityContext, TenantOperatingConstitution, action policies, ProposedAction, WorkLedger routes, connector OAuth/status, audit, idempotency, DB writes, desktop API surface, **deterministic command planning** | run long-lived coordination loops better suited to BEAM; do heavy ML/optimization better suited to Python; bypass policy |
| **Python** (intelligence worker — `services/python-intelligence/`) | WorkSignal classification beyond rules, transcript intelligence, meeting→actions, priority scoring, workload/alignment-drift/blind-spot analysis, forecasting, scenario sim, embeddings/memory analytics, voice/audio intelligence | execute external actions; call connectors directly; store memory outside policy; receive raw secrets/tokens |
| **BEAM / Elixir** (coordination fabric — `apps/cosmp_router`, `apps/collaboration_supervisor`, `apps/dbgi_supervisor`) | long-lived tenant/org actors, live Work Comms, collaboration/Twin/workflow actors, retries/timeouts/escalations, notification fanout, presence, watchdogs, durable event loops | execute external writes without a Foundation-governed action; act as a policy authority; proceed when policy is unavailable (fail closed) |
| **Tauri / Rust** (desktop native) | mic, native notifications, screen capture/Observe, secure store, FS access (governed), OS navigation, app lifecycle | access private data without user/tenant policy; act before asking Foundation/orb |
| **Postgres / Prisma** | durable governance state (tenants, entities, memberships, grants, policies, ledgers, audit, encrypted connector tokens, memory metadata, artifacts, execution attempts) | — |
| **Queue / Event bus** | job dispatch, event fanout, retry, job state | (none configured yet — Foundation dispatches inline) |

## Governing principle

**Foundation proves allowed.** Python cannot bypass policy. BEAM actors
cannot bypass policy. Tauri tools cannot bypass policy. MCP tools and
connectors cannot bypass policy. Every runtime asks → receives → emits
audited → or fails closed.

## What is wired today (honest)

- **RuntimeCapabilityRegistry** (`GET /api/v1/system/runtime-capabilities`)
  — one aggregated, honest view of every runtime. Env **KEY NAMES only**
  (never values). Unconfigured runtimes report `NOT_CONFIGURED` /
  `DISABLED`, never fake-green. Reuses the existing BEAM status client +
  Python env conventions (no duplicate clients).
- **Existing reused clients:** `intelligence/python-ranking.service.ts`
  (Python; `PYTHON_INTELLIGENCE_RUNTIME_URL`, fixture/fallback) and
  `coordination/beam-collaboration-supervisor.service.ts` (BEAM;
  `BEAM_RUNTIME_URL`/`BEAM_RUNTIME_ENABLED`, health-checked, honest
  fallback).
- **System Health "Runtime Fabric" card** (Control Tower) — shows the
  truth + the active fallback line.

## Current status

- **Python intelligence worker** — scaffold + ranker/forecaster exist
  (`services/python-intelligence/`); at runtime it is `NOT_CONFIGURED`
  unless `PYTHON_INTELLIGENCE_RUNTIME_URL` is set. Foundation falls back
  to the deterministic TypeScript extractor and **says so**.
- **BEAM coordination fabric** — Elixir apps exist; at runtime it is
  `DISABLED`/`CONFIGURED_UNVERIFIED` unless `BEAM_RUNTIME_ENABLED=true` +
  `BEAM_RUNTIME_URL` are set and the `/health` probe passes.

## Next bridges (governed, not built this phase — avoid sprawl)

- `GovernedRuntimeJob` envelope + `RuntimeDispatchService` (tenant-scoped,
  carries authority/policy context; returns RUNTIME_USED / FALLBACK_USED /
  RUNTIME_UNAVAILABLE / BLOCKED_BY_POLICY — never hides fallback).
- Python `EXTRACT_WORK_SIGNALS` job woven into the command planner
  (deterministic first, Python enrichment when healthy).
- WorkOsEvent dispatch to BEAM on ledger/collaboration/commitment
  creation; BEAM live Work Comms + escalation/execution-verification
  watchdogs.
- Python blind-spot scoring, workload optimization, scenario simulation.
- Desktop-native screen Observe + native notifications.
