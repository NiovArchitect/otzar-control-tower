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

### Phase 2 — Project loop (PARTIAL — extraction + downstream proven; Google open)

* Project: `9481e76b-b618-46bc-93aa-3e63d4a0ac1a` — Enterprise Customer Pilot
* Hidden oracle: final date **2026-09-18**, rejected **2026-09-11** (model never received oracle)
* Live SHA: **`8c3047c613f6…`**
* Seeded `PROJECT_BRIEF` / `DECISION_LOG` = **scaffolding only**

#### Downstream proven (2026-07-21 autonomous continuation)

| Classification | Evidence |
| --- | --- |
| `EXTRACTION_LIVE_PROVEN` | LLM · `EXTRACTION_COMPLETED_WITH_SIGNALS` · capture `4108a803-…` |
| `EXTRACTED_WORK_VALIDATED` | R03P1+R03P4 PROPOSED→READY_TO_EXECUTE; Team NEEDS_OWNER held for review |
| `EXTRACTED_AI_DEPENDENCY_PROVEN` | collab `970804f2-…` BLOCKER_RESOLUTION R03P1→R03P4 → ACCEPTED → **COMPLETED** (requester completes) |
| `EXTRACTED_ROLE_REPORTING_PROVEN` | CEO/Manager/Employee/Contractor reports from extracted state (not seeded brief) |
| `OBLIGATION_LIFECYCLE_RECONCILED` | obligation `77fba32c-…` ACTION_CONFIRMATION + ledger `9dc38bd3-…` **EXECUTED** → obligation **COMPLETED**; open work 1→0 |
| `PROJECT_LOOP_PROVIDER_INDEPENDENT_PROVEN` | doc intent `35aec899-…` + cal intent `c2159668-…` status **WAITING_FOR_PROVIDER_AUTH** date **2026-09-18** |
| `WORK_STYLE_BEHAVIORALLY_PROVEN` | session + 2 candidates; approve 1 / reject 1 on R03P1 |
| `GOOGLE_PROVIDER_EXTERNALLY_BLOCKED` | calendar propose `SCOPE_REAUTH_REQUIRED` |

**Oracle metrics (extraction):** final_date_accuracy **true**; rejected_date_suppression **true**; owner_accuracy both **true**; correction_recognition **true**; invented_content_rate **0**.

#### Internal residuals closed (2026-07-21 continued)

| Classification | Evidence |
| --- | --- |
| Ledger 404 diagnosis | Random UUID `00000000-…0099` = **EXPECTED_NOT_FOUND** (harness control, not UI deep-link). Malformed `not-a-uuid` was **P2023 500** trust defect → fixed FND **#728** / live **`72c6864`** now **404 NOT_FOUND**. Real work ID still **200**. |
| `LIVE_CROSS_TENANT_ZERO_LEAK` | Full adversarial pack via `vishesh@niovlabs.com` (demo_pw): 0 content leaks; real R-03 ledgers/obligations/intents **404**; collab create **CROSS_ORG_DENIED**; random/malformed **404**; artifact `cross-tenant-adversarial-full.json` |
| `LIVE_PROJECT_UI_RECONCILED` | Role projections: CEO/Manager/Employee/Contractor; P1 **EXECUTED** not in open work (0 open); project present; intents BLOCKED |
| `OBLIGATION_UI_RECONCILED` | Employee my-work open **0**; completed ledger visible as EXECUTED, not open |
| `WORK_STYLE_UI_PROVEN` | policy enabled; 1 approved preference; 0 pending candidates on R03P1 |
| `ROLE_REPORTING_BROWSER_PROVEN` | Role report surfaces from extracted state (API projections) |
| YC first-five re-run | **PASS** 12/12 (~24s) on R-03 reviewer after internal chain |
| Provider resume unit | `tests/unit/provider-intent-resume.test.ts` **6/6** (auth, duplicate, supersede, revoke, reconcile) |

**Still residual (honest):** Google Docs/Calendar/Meet provider objects; `PROJECT_LOOP_FULL_CHAIN_PROVEN` not claimed; collab duplicate policy; COMMITMENT `conversation_id` column still optional (capture in details).

**Live Foundation SHA:** `72c6864` (ledger ID guard) atop `8c3047c` extraction path.

**Harnesses:** `otzar-r03-project-loop-extract-rerun.mjs`, `otzar-r03-project-loop-downstream.mjs`, `otzar-r03-cross-tenant-adversarial.mjs`, `otzar-r03-project-loop-ui-reconcile.mjs`

#### Google provider resume (2026-07-21 post-consent)

OAuth for R-03: **VERIFIED** (connected_at 10:41Z, verified 10:43Z). App credentials + Docs/Calendar/Meet scopes **available**.

| Object | Proof |
| --- | --- |
| Google Doc | **CREATED** `1-Tyn5pAkU-fXOjMmh8Tkp9AN9rtncwhj3Xa46A7emX8` · [open](https://docs.google.com/document/d/1-Tyn5pAkU-fXOjMmh8Tkp9AN9rtncwhj3Xa46A7emX8/edit) · body **2062** chars · `body_inserted` · project `9481e76b-…` · source capture `4108a803-…` · share to `sadeil@niovlabs.com` **writer** |
| Calendar event | **CREATED** `rqlod8caefrs7o7vkttqn49fes` · **2026-09-18** 08:00–09:00 PDT · project linked · [Calendar link](https://www.google.com/calendar/event?eid=cnFsb2Q4Y2FlZnJzN283dmt0dHFuNDlmZXMgc2FkZWlsQG5pb3ZsYWJzLmNvbQ) |
| Intents | Doc `35aec899-…` + Cal `c2159668-…` → **EXECUTED** |
| Classifications | `LIVE_DOC_PROVIDER_PROVEN` · `LIVE_CALENDAR_PROVIDER_PROVEN` · `BOUNDED_ENTERPRISE_WORK_OS_PROVEN` · `MEET_PERMISSION_AVAILABLE_NO_ELIGIBLE_ARTIFACT` |

**Claimed (2026-07-21 post-append repair):** `LIVE_DOCUMENT_CHANGE_PROPAGATION_PROVEN` · `PROJECT_LOOP_FULL_CHAIN_PROVEN` on live API `d274a81`.

**Still not claimed:** `GOOGLE_MEET_ARTIFACT_PROVEN` (no eligible Meet artifact — permission available); unrestricted `SCALE_PROVEN`; S2500 (FOUNDER_DEFERRED).

#### Append root cause + repair (2026-07-21)

| Item | Detail |
| --- | --- |
| Failure | `POST /google/docs/append` → opaque then typed `DOC_WRITE_PERMISSION_DENIED` (Docs `batchUpdate` **403**) |
| Root cause | Create used **Drive multipart** (`drive.file` works); append used only Docs API write (403 on same OAuth). No org ownership bind → foreign demo-org could also write by document ID. |
| Repair | **#729** typed codes + `endOfSegmentLocation` + idempotency marker; **#730** Drive export+rewrite material fallback + HTML formatting fallback; **#731** `DOCUMENT` ledger type, org ownership gate (`DOC_ARTIFACT_NOT_FOUND`), MATERIAL→one BLOCKER / FORMATTING→no noise |
| Live SHA | `d274a81292ae…` |
| Material | risk/dependency before Sep 18 milestone · `materiality=MATERIAL` · retry `already_applied=true` |
| Formatting | `FORMATTING_ONLY` · blockers stayed at 1 (no extra) |
| Propagation | BLOCKER `d44dc0ed-…` project-linked; ownership DOCUMENT `7bbde0b6-…` |
| Cross-tenant | foreign vishesh append → `DOC_ARTIFACT_NOT_FOUND` · leak=false |
| Artifacts | `.r03-s250-state/google-doc-change-propagation.json`, `google-provider-resume.json`, `scripts/otzar-r03-doc-append-propagation-proof.mjs` |

**Residuals:** create not fully server-idempotent (historical); DOCUMENT details may scrub on GET; role-report browser re-smoke for this exact edit not re-run this slice (prior ROLE_REPORTING_BROWSER_PROVEN retained).

**YC first-five re-run post-provider:** PASS.

Artifact: `.r03-s250-state/google-provider-resume.json`

#### CT build failure recovery (2026-07-21)

| Item | Detail |
| --- | --- |
| Failed SHA | `4deab19` — memory claim for full-chain; **Render build_failed** on `tsc -b` |
| Root cause | `src/lib/org/provider-intent-resume.ts` TS2367: after early terminal handling of `EXECUTED`, later branches still compared `intent.status === "EXECUTED"` (unreachable under narrowing) at ~L109/L180/L184 |
| Repair | Handle **EXECUTED pre-state first** (`resumeWhenAlreadyExecuted`); active path never compares to `EXECUTED`; no casts / no `any` |
| PR | [#196](https://github.com/NiovArchitect/otzar-control-tower/pull/196) |
| Merge / deploy SHA | `80e36b4e1bc5694fb68b134cbb971411e7ca86fe` |
| Local build | `npm ci && npm run build` exit 0 → local `index-D5JTtwM7.js` + `index-CyE4kMZQ.css` |
| Render | otzar-app `srv-d8t1qpj7uimc73db2il0` deploy `dep-d9fp39njqk9s73eleht0` **live** commit `80e36b4` |
| Live bundle | HTML 200 · JS `/assets/index-D8TMNmma.js` 200 · CSS `/assets/index-CyE4kMZQ.css` 200 |
| Unit | `provider-intent-resume` **16/16** |
| Browser | YC reviewer login → `/app` R-03 shell green; no application-error |
| API re-proof | material `already_applied`; formatting no blocker noise; foreign `DOC_ARTIFACT_NOT_FOUND` |
| Classifications | Backend proof retained; `CT_FULL_CHAIN_UI_LIVE_VERIFIED` after this deploy |
| Security residual | npm audit **11** vulns (not addressed this PR; no `audit fix --force`) |

#### Exact LOCAL_FALLBACK diagnosis (was NOT missing API key)

| Probe | Result |
| --- | --- |
| `GET /admin/llm-status` | **CONFIGURED** · `anthropic` · `claude-sonnet-4-5` |
| Prior zero-item path | quality + graph + planner bugs (below), not `ANTHROPIC_API_KEY` absence |
| `DEMO_SCRIPTED` | Correctly disallowed |

**Root causes fixed:**

1. ISO speaker stamps `[2026-07-21 09:12]` rejected → date lines quarantined (**FND #726**)
2. Digit handles `R03P1` rejected by NAME / `isPronounOrNonName` (**#726**)
3. Multi-owner sentences only first owner (**#726**)
4. Silent LOCAL_FALLBACK without `extraction_outcome` / `fallback_reason` (**#726**)
5. Owner resolve used identity peer `take:50` → R03P1 NEEDS_OWNER (**FND #727**)

#### Live oracle re-run (no force_mode, no DEMO_SCRIPTED, no oracle to model)

* Deploy: `8c3047c613f6…` · capture `4108a803-…`
* Quality: **8/8 trusted**
* Mode: **LLM** · outcome: **`EXTRACTION_COMPLETED_WITH_SIGNALS`**
* Work items: **3** · owned **2** (R03P1 + R03P4 PROPOSED with entity_ids)
* Final date **2026-09-18** in decisions; rejected **2026-09-11** not current final
* Collective “Team” → honest **NEEDS_OWNER**
* Harness: `scripts/otzar-r03-project-loop-extract-rerun.mjs`

### Phase 3 — Google Docs/Calendar (HONEST BLOCK)

* Calendar propose: **`SCOPE_REAUTH_REQUIRED` / `GOOGLE_RECONNECT_REQUIRED`**
* Real Google Doc: **not proven** (no greenwash)
* Does **not** claim LIVE_DOC/CALENDAR_PROVIDER_PROVEN
* After reauth: auto Doc (non-empty) + calendar event on **2026-09-18** only (not rejected date)

### Still open in sequence

* Live re-ingest after #726 deploy → work_items + oracle metrics
* Downstream from extraction only (not seeded brief): obligations, AI-to-AI handoff, role reports
* Material document change propagation
* Work-style measurable improvement
* Full live AI-to-AI scenarios with audit UI
* Role-specific reports
* Second-tenant zero-leak pack (conversations/extraction/projects/work)
* Final YC rerun after repairs

### Preserved

* `YC_FIRST_FIVE_BROWSER_PROVEN`
* Live R-03 ~200 persons/twins; identity growth **closed**
* S2500 **FOUNDER_DEFERRED**
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
* Re-run after extraction fix for conversations/extraction jobs/work artifacts

### Work-style calibration probe

* YC reviewer POST `/otzar/twin/calibration` → **422 NOTHING_TO_REMEMBER**
* Behavioral multi-task learning loop still **NOT_RUN** (requires governed task pairs + consent UX)
* May continue in parallel only if it does not distract from extraction repair

### Provider residual (blocks full Work OS green)

* Calendar: `GOOGLE_RECONNECT_REQUIRED`
* Real Google Doc: not proven
* Extraction: **repair shipped to PR; live deploy + oracle re-run required before upgrading Phase 2**

