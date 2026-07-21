# Continuity memory — 2026-07-21 (register completeness audit)

> **Durable agent memory.** Read this before any “freeze” or “nothing left to ship” claim.

## Correction (founder-enforced)

Finishing the **narrow Control Tower register subset** is **not** finishing Otzar.

| Valid statement | Invalid statement |
|-----------------|-------------------|
| Gate A (CT investor surface) is nearly closed except N-02 | “The complete Otzar product vision is finished” |
| 60 LIVE rows + 9/9 re-bind = strong Gate A regression | 9/9 re-bind proves holistic completeness of all founder requirements |

## Program gates (A–D) — never collapse

| Gate | Name | Status |
|------|------|--------|
| **A** | Control Tower investor surface | Nearly closed — **N-02 EXTERNALLY_BLOCKED** (honesty residual LIVE) |
| **B** | Otzar autonomous Work OS | **Open** — R-03, J-04, L-02, V-01/V-02, A-08, C-07, … |
| **C** | Otzar Relay | **Open required program** — T-01 boundary LIVE only; T-02/T-03 not built |
| **D** | Foundation compliance | **Open** — U-01 DISCOVERED; U-02 NOT_STARTED |

Canonical docs:

* `docs/otzar/master/PROGRAM_GATES.md`
* `docs/otzar/master/REGISTER_COMPLETENESS_AUDIT.md`
* `docs/otzar/master/MASTER_COMPLETION_GATE.md` (unfrozen whole-product claim)
* `docs/otzar/master/FOUNDER_REQUIREMENTS_REGISTER.json` (**74 rows** after audit)

## Register counts (post-audit)

* **74** total requirements (was ~62 before audit)
* **60** LIVE_VERIFIED
* **1** EXTERNALLY_BLOCKED (N-02)
* **1** IMPLEMENTED (OPS-02)
* Rest: PARTIAL / DISCOVERED / NOT_STARTED for restored program rows

## Rows restored that were missing or under-scoped

A-08, C-07, J-04, L-02, R-03, R-04, T-02, T-03, U-01, U-02, V-01, V-02

## Critical honesty on LIVE rows

| ID | Limitation |
|----|------------|
| **H-02** | Redaction + multi-user isolation only — **not** full Teach lifecycle (H-01) or later-apply (H-03) |
| **R-01** | L1 pressure LIVE — **not** SCALE_PROVEN 250/2500 (see **R-03**) |
| **T-01** | Boundary doctrine LIVE — **Relay product not built** (T-02/T-03) |
| **A-04** | Server walkthrough completion LIVE — full cinematic multi-role = **A-08** PARTIAL |
| **L-01** | Envelope LIVE — load/storm = **L-02** |

## Scale / credentials (do not misuse)

Internal synthetic scale (**R-03**) must **not** wait on YC credentials.

* Internally simulatable: seed org, hierarchy pressure, virtualization, authz, chaos/replay, perf
* Needs operator/credentials: N-02 Meet OAuth, continuous second-tenant, dedicated YC pure-fresh org residual

## Latest product progress (after audit)

* **R-03** SyntheticScaleHarnessCard shipped; deep smoke **10/10** product surface on `index-CDUr8iyt.js`
* Status: **BROWSER_PROVEN** for doctrine/levels UI; S25 **partial**; S250/S2500 **planned** (not SCALE_PROVEN)
* Commits: `cdadd1d` (audit + R-03), `bce210c` (R-03 proof)

## Next highest internally achievable Work OS work

1. **R-03 deepen** — S250 seeded harness UNIT_PROVEN (see `src/lib/org/synthetic-s250/`); next S2500 + live provision optional  
2. **J-04** — canonical project graph deep proof  
3. **A-08** — unify cinematic first-login multi-role journey  
4. **L-02** — AI collab load/storm  
5. Relay **T-02** remains separate program (do not drop)

## N-02

Still **EXTERNALLY_BLOCKED**. Operator must reconnect Google Meet scopes. Do not claim operational transcripts. Do not block independent Gate B work on N-02.

## Freeze rule (restored)

A freeze is only valid when:

* every founder requirement is in the register;
* every program has a separate gate;
* LIVE rows have matching proof depth / acceptance_limitations;
* remaining work is external, deliberately deferred, or a separate active program with a next step.

Until then:

> **Gate A is nearly closed, but the full Otzar product program still has preserved open requirements across Gates B, C, and D.**

## Agent anti-patterns (forbidden)

* Endless gate re-bind as substitute for program completeness  
* Calling Relay “optional”  
* Calling all scale “blocked on YC credentials”  
* Declaring “nothing left to ship” from CT subset green  
* Letting H-02 redaction stand for full work-style learning lifecycle  

## S250 progress

* `src/lib/org/synthetic-s250/` — seed graph, scenarios/oracles, pipeline, metrics, repair
* Unit: `tests/unit/synthetic-s250-harness.test.ts`
* S250 status: **partial/UNIT_PROVEN** (not SCALE_PROVEN at provisioned live tenant)

## R-03 S250 first slice (committed)

* Commit `3da4084` — full S250 harness under `src/lib/org/synthetic-s250/`
* UNIT_PROVEN: 250 people + twins, ≥20 teams, ≥30 projects, 40 scenarios, hidden oracles, failure injection, metrics, repair loop
* UI: SyntheticScaleHarnessCard marks S250 partial
* Run: `npm run test:unit:s250`
* Not yet: S2500, live provision of 250 accounts, multi-day real-provider volume
* **Next gate priority after this slice:** evaluate J-04 project graph vs further R-03 depth

## J-04 progress (in flight → ship)

* `src/lib/work-os/project-graph.ts` — inventory facets + disconnect detection + health score
* `src/components/otzar/ProjectGraphCoherenceCard.tsx` — browser surface on project heart
* Wired into `WorkProjects` ProjectContextPanel after J-02 spine
* Unit: `tests/unit/project-graph.test.ts`
* Deep smoke: `tests/e2e/otzar-live-project-graph-j04.spec.ts`
* Status: **UNIT_PROVEN / IMPLEMENTED** pending live deep smoke
* R-03 S250 remains UNIT_PROVEN (first slice); do not drop S2500 residual
* **Next after J-04 browser proof:** A-08 cinematic first-login OR deepen R-03 multi-day volume metrics — use register priority

## R-03 S250 depth slice 2 (multi-day multi-channel)

* Multi-day `day_events` across chat/email/meeting/doc/calendar/handoff/ai_collab
* Hidden oracles expanded (report cues, handoff team, twin attribution)
* Provider emulator (`emu://`) — no real Google at scale
* Pipeline stages: decision, handoff, twin_attribution, provider_execution, project_graph (J-04), role_report, persistence, calendar
* Multi-category metrics (understanding/collab/execution/coherence/security/perf)
* Failing seed records preserved on every run
* Unit: 6/6 in `tests/unit/synthetic-s250-harness.test.ts`
* Still not SCALE_PROVEN at provisioned live tenant; S2500 planned

## J-04 LIVE_VERIFIED (2026-07-21)

* Deep smoke **10/10** on live `index-DYGGJfKt.js`
* Spec: `tests/e2e/otzar-live-project-graph-j04.spec.ts`
* Product: ProjectGraphCoherenceCard on WorkProjects project heart
* Commits: `4132b41` (impl), `9db04ab` (R-03 depth co-deployed)
* Residual: federated multi-object graph + provider doc-edit propagation
* **Next internal Work OS priority:** **A-08** cinematic first-login multi-role (or L-02 if A-08 blocked)
* R-03 S250 multi-day still UNIT_PROVEN (not live provision)
* N-02 still EXTERNALLY_BLOCKED
* Gates C/D still open required programs

## A-08 progress (in flight)

* Walkthrough **v2**: every role = org_state + provider honesty + AI action (≤3 steps)
* `cinematic-first-login.ts` pure inventory + all-roles gate
* FirstUseReveal: data-a08, doctrine, restrained spatial depth
* Unit 7/7 A-08; deep smoke ready
* Status: **UNIT_PROVEN** pending live deep smoke

## A-08 LIVE_VERIFIED (2026-07-21)

* Deep smoke **10/10** on live `index-8r5noGUq.js`
* Spec: `tests/e2e/otzar-live-cinematic-first-login-a08.spec.ts`
* Walkthrough v2: org_state + provider honesty + AI action for all 5 roles
* Commits: `c4d3f32` / `b99831d`
* **Next internal Work OS priority:** **L-02** AI collab load/storm; R-03 S2500 residual
* J-04 LIVE; R-03 S250 multi-day UNIT_PROVEN; N-02 EXTERNALLY_BLOCKED
* Gates C (Relay) and D (compliance) still open required programs

## L-02 LIVE_VERIFIED (2026-07-21)

* Deep smoke **10/10** on live `index-DDGJfPyy.js`
* Spec: `tests/e2e/otzar-live-ai-collab-load-l02.spec.ts`
* Concurrency/storm/loop pure harness + Collaboration card
* **Next:** R-03 S2500 residual or V-02 messy multi-source
* J-04 + A-08 + L-02 LIVE; R-03 S250 UNIT_PROVEN; N-02 EXTERNALLY_BLOCKED
* Gates C/D still open required programs

## R-03 S250 structural audit (2026-07-21)

### Proof level split (honest)

| Level | Status |
|-------|--------|
| dataset_generated | **proven** (250 humans + 250 twins, teams, projects, multi-day NL) |
| foundation_provisioned | **partial** — `STRUCTURAL_CANONICAL_FIXTURE` only; **0** live Foundation entities |
| runtime_active | **partial** — session-equivalent samples ×250 pass |
| browser_sampled | **partial** — product surface LIVE; not 250 logins |
| scale_measured | **partial** — in-process concurrency p50/p95/p99 |

**SCALE_PROVEN = false** (hard withheld).

### What was built

* `proof-levels.ts` — explicit classification; `s250ScaleProven` only when all five proven
* `validate-graph.ts` — structural counts + P0 invariants
* `canonical-provision.ts` — fixture-tagged memberships/twins/projects/policies
* `runtime-sample.ts` — all 250 identities + stratified deep
* `concurrency.ts` — 50 home / 50 project / 100 collab
* `l02-s250.ts` — L-02 against real S250 twin graph
* `v02-messy-sources.ts` — typed multi-source accuracy
* `acceptance-gate.ts` — structural gate vs SCALE_PROVEN residual list
* Unit: `tests/unit/s250-structural-acceptance.test.ts` (5/5)

### Blocking residuals before S2500

1. Live Foundation bulk provision of 250 via org/membership/twin rails
2. Stratified browser journeys on a provisioned S250 tenant
3. Live DB/API/queue p99 measurement

### Preserved

* A-08 LIVE · L-02 LIVE · J-04 LIVE
* N-02 EXTERNALLY_BLOCKED · Gate C Relay · Gate D compliance
* Do not jump to S2500 headline without structural honesty

## R-03 live Foundation provision attempt (2026-07-21)

### Preflight (PASS)

* API `https://api.otzar.ai/api/v1` health ok
* Live Foundation SHA: `18295678aac102e8026135a12eb9f08003b88c88`
* Database: connected
* CT SHA at attempt: `3e3f98b`
* Markers: `environment_class=SYNTHETIC_SCALE`, `test_program=R-03`, `scale_level=S250`, `never_customer=true`
* Meridian org id blocked for mutation
* Rate plan: batch 5, delay 350–400ms, concurrency 1

### Phase-0 (BLOCKED)

* Script: `scripts/otzar-r03-s250-live-provision.mjs --phase0`
* Dual-control path: operator-1 POST `/platform/orgs` → operator-2 approve escalation → re-POST
* **Result:** `niov-operator-1@niovlabs.com` login **401 INVALID_CREDENTIALS** (bootstrap secrets stale)
* smoke-admin bootstrap also 401
* meridian-admin bootstrap also 401
* Demo shared password works for sadeil/vishesh only — **must not** host S250 scale

### Provisioner ready (code)

* Deterministic cast + origin keys `R03:S250:<run>:<index>`
* Idempotent state under `.r03-s250-state/` (gitignored; may hold admin password)
* Escalation ladder 5→20→50→100→250 with reconcile
* Canonical rails: `/org/members` → invite → activate → hierarchy/assign → ensure-twin
* Tenancy guard refuses Meridian and mismatched org_entity_id

### Exact proof levels (unchanged honesty)

* dataset_generated=proven
* foundation_provisioned=partial (fixture only; live count 0)
* runtime_active=partial (session-equivalent)
* browser_sampled=partial
* scale_measured=partial
* **SCALE_PROVEN=false**
* S2500 not started

### Operator action required (external)

1. Rotate/restore `niov-operator-1` + `niov-operator-2` live passwords in bootstrap
2. Re-run `node scripts/otzar-r03-s250-live-provision.mjs --phase0`
3. Then `--target=5` canary → 20 → 50 → 100 → 250 automatically

