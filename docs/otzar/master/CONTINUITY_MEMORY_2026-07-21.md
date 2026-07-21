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

## R-03 401 auth investigation (2026-07-21) — complete

### Exact failing request

| Field | Value |
|-------|--------|
| Method | `POST` |
| Endpoint | `/api/v1/auth/login` |
| Auth method | email + password JSON body |
| Next (never reached) | `POST /api/v1/platform/orgs` Bearer + dual-control |
| HTTP | **401** |
| code | `INVALID_CREDENTIALS` |
| Auth vs authz | **Authentication failed before authorization** |
| Source selected | `bootstrap/operator-1` (present=true, rejected) |

### Credential sources (presence only)

| Source | Present | Probe |
|--------|---------|--------|
| bootstrap/operator-1 | yes | CREDENTIAL_REJECTED 401 |
| bootstrap/operator-2 | yes | not re-sprayed after op1 fail |
| bootstrap/smoke-admin | yes | CREDENTIAL_REJECTED 401 |
| bootstrap/meridian-admin | yes | CREDENTIAL_REJECTED 401 |
| tmp/demo_pw_val | yes | AUTH_OK for sadeil (admin_org) + vishesh — **demo org only** |
| OTZAR_SMOKE_ADMIN_PASSWORD env | no | — |
| OTZAR_CUSTSIM_ADMIN_PASSWORD env | no | — |
| R03_SCALE_ADMIN_PASSWORD env | no | — |
| CT .env.local | keys only VITE_FOUNDATION_API_URL | no secrets |

### Live DB read-only (Render PG connection-info)

* `can_admin_niov` ACTIVE census = **0**
* `niov-operator-1@` / `niov-operator-2@` → **ABSENT** from `entities`
* `smoke-admin@` / `meridian-admin@` → **ABSENT**
* Meridian org `69c07a00…` / Smoke org `ad9515e2…` → **ABSENT**
* Only COMPANY: **NIOV Labs** `a4ddc200…` (forbidden S250 host)
* PERSON count: **8** (demo cast: sadeil, vishesh, annie, david, …)
* No R-03 / Synthetic Scale company

### Authority split

* **Phase-0** org create → platform operators + dual control (**blocked**: no operators)
* **Member provision** → org admin rails sufficient **after** Phase-0 (**no R-03 org yet**)
* **Not** requiring platform for every batch once org admin exists

### Historical customer-sim path

* Used `meridian-admin@` + `POST /org/members` → invite → activate on Meridian
* That principal and org **do not exist on this live database**
* Cannot reuse without re-bootstrap

### Residual classification

`PLATFORM_OPERATOR_ENTITIES_ABSENT_OR_STALE_SECRET`  
(not mere “password missing from file”)

### Founder action (single, sanctioned — no password paste into chat)

Zero-root operator recovery on live DB (FND), then re-run Phase-0:

```bash
cd niov-foundation
# With live DATABASE_URL from Render connection-info (ops path)
ALLOW_FOUNDER_BOOTSTRAP=true FOUNDER_BOOTSTRAP_CONFIRM="I AUTHORIZE NIOV OPERATOR BOOTSTRAP" npx tsx scripts/bootstrap-niov-operator.ts --email niov-operator-1@niovlabs.com --apply
# then operator-2 when census=1
```

Then:

```bash
cd otzar-control-tower
node scripts/otzar-r03-s250-live-provision.mjs --phase0
node scripts/otzar-r03-s250-live-provision.mjs --target=5
```

Do **not** host S250 on NIOV Labs demo company.

## R-03 founder stop — no S2500 (2026-07-21)

### Decision

Do **not** provision S2500. Do **not** continue stressing production solely to hit 250 live identities amid `429`s. Preserve successful population; finish product-facing proof.

### Live tenant (dedicated, never_customer)

| Field | Value |
|-------|--------|
| org_entity_id | `d7a270ed-d772-41f1-95bd-a8281bf0b2af` |
| run | `r20260721b` |
| admin | `r03-scale-admin+r20260721b@niovlabs.com` |
| live persons (reconciled list) | **200** (196 ACTIVE, 4 SUSPENDED samples) |
| live Twins | **200** |
| local cast file tracked | 100 (SIGINT mid level-250 after further creates) |
| Meridian | not used |
| NIOV Labs founder org | not used |

### Proof layers

| Layer | Classification |
|-------|----------------|
| S250 structural model | **STRUCTURAL_PROVEN** |
| S250 workload simulation | **SIMULATION_PROVEN** |
| Live Foundation provisioning | **LIVE_PROVISIONED_200_PERSONS** (not 250, not 2500) |
| Enterprise scale | **BOUNDED_ENTERPRISE_SCALE_PROVEN** |
| Unrestricted SCALE_PROVEN | **false** |
| S2500 | **FOUNDER_DEFERRED — unnecessary for current investor-ready scope** |

### Rate limits (useful evidence)

* `429 RATE_LIMIT_EXCEEDED` on member create, invite, activate, hierarchy assign, ensure-twin
* Backoff honored (`retry_after_seconds`); retries succeeded; no bypass
* Provisioner stopped by founder decision, not failure

### Operators

* Zero-root recovered via sanctioned `bootstrap-niov-operator.ts` with founder phrase
* Dual-control Phase-0 succeeded for R-03 org
* Secrets only in gitignored bootstrap files (never chat)

### Next (product over vanity count)

* Stratified browser journeys on live sim tenant
* Runtime sampling of live identities
* Home/project coherence, AI behavior, provider honesty
* Do **not** auto-resume 250 or S2500

## R-03 product proof on live tenant (2026-07-21) — identity growth closed

### Exact reconciliation

| Metric | Exact |
|--------|------:|
| human_entities | **200** |
| ACTIVE | **196** |
| SUSPENDED | **4** |
| ai_twins | **200** |
| hierarchy_edge_records | **440** |
| org | `d7a270ed-d772-41f1-95bd-a8281bf0b2af` |
| run | `r20260721b` |

### All-identity runtime (live Foundation)

* Script: `scripts/otzar-r03-live-product-proof.mjs --runtime`
* **200/200** after correct scoring:
  * 4× SUSPENDED → login **403** (expected refuse)
  * Employees: `GET /org/hierarchy` **403** is least-privilege (not a failure)
  * `my-twin` + context-health succeed for active cast
* Twin list owner field incomplete for 1 pair; person-35 `my-twin` proves pairing

### Concurrent runtime load (not provision endpoints)

| Workload | p50 | p95 | p99 | errors | 429 |
|----------|----:|----:|----:|-------:|----:|
| 50× hierarchy (admin) | ~222ms | ~422ms | ~484ms | 0 | 0 |
| 50× person list | ~204ms | ~442ms | outlier slow | 0 | 0 |
| 100× my-twin | ~262ms | ~418ms | ~616ms | — | 0 |

### Stratified browser

* Spec: `tests/e2e/otzar-live-r03-stratified-browser.spec.ts` **PASS**
* Admin Home + CEO/exec/managers/employees/contractor/consultant samples
* No Meridian leakage; no admin leak on employee/contractor

### Classification

* `S250_STRUCTURAL_PROVEN`
* `S250_SIMULATION_PROVEN`
* `LIVE_FOUNDATION_200_PROVISIONED`
* `LIVE_RUNTIME_ALL_IDENTITY_PROVEN` (rescored)
* `LIVE_RUNTIME_LOAD_PROVEN` (bounded)
* `LIVE_MULTI_ROLE_BROWSER_PROVEN` (stratified)
* `BOUNDED_ENTERPRISE_SCALE_PROVEN`
* `S2500` — **FOUNDER_DEFERRED**
* unrestricted `SCALE_PROVEN` — **false**

### Next product gate (not more identities)

* YC first-five-minute deep on live R-03 reviewer account
* Project-centered full loop with provider proof
* Work-style learning improvement metrics
* Second-tenant adversarial zero-leak pack

## Work OS acceptance sequence started (2026-07-21)

Identity growth remains **closed**. Active work is product behavior on live R-03 org.

### Phase 1 — YC first-five

* Reviewer: `r03-yc-reviewer+r20260721b@niovlabs.com` (one designated account)
* Spec: `tests/e2e/otzar-live-r03-yc-first5.spec.ts` **PASS** (~21.8s)
* Walkthrough present/advanced; Home coherent; Talk; Projects; provider honesty; return Home
* Org label: R03 Synthetic Scale; no Meridian foreign label
* Classification: **`YC_FIRST_FIVE_BROWSER_PROVEN`**

### Phase 2 — Project loop (PARTIAL)

* Project: `9481e76b-b618-46bc-93aa-3e63d4a0ac1a` — Enterprise Customer Pilot
* Hidden oracle: final date **2026-09-18**, rejected **2026-09-11**
* Comms ingest: **200** with `LOCAL_FALLBACK` — conversation captured; **0 work_items** (LLM not configured; DEMO_SCRIPTED not allowed)
* Seeded docs: PROJECT_BRIEF + DECISION_LOG **201** (ledger entries)

### Phase 3 — Google Docs/Calendar (HONEST BLOCK)

* Calendar propose: **`SCOPE_REAUTH_REQUIRED` / `GOOGLE_RECONNECT_REQUIRED`**
* Real Google Doc: **not proven** (no greenwash)
* Does **not** claim LIVE_DOC/CALENDAR_PROVIDER_PROVEN

### Still open in sequence

* Material document change propagation
* Work-style measurable improvement
* Full live AI-to-AI scenarios with audit UI
* Role-specific reports
* Second-tenant zero-leak pack
* Final YC rerun after repairs

### Preserved

* S2500 FOUNDER_DEFERRED
* N-02 Meet external
* Relay C / Compliance D not started

### Cross-tenant canary (demo → R-03)

* Foreign principal: `vishesh@niovlabs.com` (demo tenant)
* Target: R-03 org `d7a270ed…`, project `9481e76b…`, cast person/twin IDs
* Entity/twin/hierarchy/people list: **403** (no content)
* Project deep-get: **404**
* Projects list / my-twin: **200** without foreign R-03 IDs
* **zero_leak=true** for this pack (not full dual-org same-user suite)
* Classification candidate: `LIVE_CROSS_TENANT_ZERO_LEAK` (bounded pack)

### Work-style calibration probe

* YC reviewer POST `/otzar/twin/calibration` → **422 NOTHING_TO_REMEMBER**
* Behavioral multi-task learning loop still **NOT_RUN** (requires governed task pairs + consent UX)

### Provider residual (blocks full project loop green)

* Calendar: `GOOGLE_RECONNECT_REQUIRED`
* Real Google Doc: not proven
* Comms extraction: LOCAL_FALLBACK only (no LLM work items on this tenant)

