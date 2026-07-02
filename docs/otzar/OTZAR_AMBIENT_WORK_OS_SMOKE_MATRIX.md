# Otzar Ambient Work OS — deep smoke matrix

**Run:** 2026-07-01 · Fable 5 session · live stack app.otzar.ai (`74d3f55`→bundle
`index-eqSomt7E.js`+) + api.otzar.ai (FND `478f8f2`, PR #518 deployed, health OK).
**Standard:** behavior from the user's perspective; PASS only when the behavior was
observed; SKIP is a labeled gap, never a pass. Evidence = the automated spec/probe
that produced it (reproducible with `DEMO_SHARED_PASSWORD` set).

**Evidence sources** (all runnable):
- `UXC` = `npm run test:e2e:live:workos:ux-coherence` — **8/8 PASS live** (2026-07-01)
- `DEEP` = `npm run test:e2e:live:workos:full` — deep Work OS live suite (see report)
- `PROBE` = scratchpad `group-probes.mjs` API probes (read-only; output in the run log)
- `UNIT` = CT vitest (176 files / 2011 green) · `FND-CI` = PR CI tiers (5/5 green)
- `SLICE-F` = prior live verification (real Slack `chat.postMessage`, commit `7a3ddbd`)

Legend: ✅ PASS · ❌ FAIL (product gap) · ⏭️ SKIP(reason) · 🔶 PARTIAL (works, with a named gap)

---

## GROUP 1 — Identity, org, hierarchy, roles

| # | Scenario | Role | Status | Evidence / gap |
|---|---|---|---|---|
| 1.1 | Admin sees admin controls | admin | ✅ | PROBE: sadeil login with `admin_org` → hierarchy/seeds 200; UXC-7 |
| 1.2 | Employee cannot reach admin surfaces | employee | ✅ | PROBE: vishesh → `/org/hierarchy` 403, `/org/dandelion/seeds` 403 `OPERATION_NOT_PERMITTED` |
| 1.3 | Admin views people/team structure | admin | ✅ | PROBE: `/org/hierarchy` 200, 10 memberships, 10/10 role_title; CT Members renders Role/Dept/Reports-to (`4d3edeb`, users-hierarchy tests) |
| 1.4 | Admin can assign/verify manager relationship | admin | ❌ **GAP** | No UI to create/edit person→person memberships. Production data is FLAT: all 10 memberships hierarchy_level 0, 0 departments, 0 person-manager edges → "Reports to" honestly renders "—" everywhere. Files: `src/pages/Users.tsx` (needs an assign-manager action), FND membership write route exists (`EntityMembership`), Dandelion `role_project_team` seeds should build these edges |
| 1.5 | Employee belongs to the right org | employee | ✅ | DEEP orgquery/identity specs (org-scoped queries; PROBE org_entity_id filters) |
| 1.6 | No cross-org data | — | ⏭️ SKIP(env) | Production has ONE org; no second org to probe. FND-CI integration covers tenant filters; a seeded second org is the honest way to prove it live |
| 1.7 | Twin mapping follows membership | admin | ✅ | AITeammates owner via hierarchy (`4d3edeb`); LIVE-5 repaired 8/8 twins via memberships |
| 1.8 | Owner/requester labels human-readable | all | ✅ | PROBE: 200/200 named items, 0 pronoun owners; UNIT owner-display matrix |
| 1.9 | Unknown owner → identity review | system | ✅ | P0D (FND `0e08d32`) + live routing lanes include `identity_review`; DEEP identity spec |
| 1.10 | Hierarchy flows into routing | system | 🔶 | Recipient proof-path governance uses the graph (Work Graph subsystem); OWNER routing uses evidence/identity, not manager edges — acceptable, but escalation-approver selection does not yet consult hierarchy (flat data would defeat it anyway; see 1.4) |

## GROUP 2 — Ambient presence & UI behavior

| # | Scenario | Status | Evidence / gap |
|---|---|---|---|
| 2.1–2.7 | Nine presence states map to calm/distinct visuals | ✅ | UNIT `presence-ring.test.ts` (9-state palette locked), `ambient-edge-presence`, `ambient-quiet-mode`; states driven by the real presence store, not decoration |
| 2.8 | Glow maps to real state | ✅ | UNIT ambient-otzar-bar (109 tests incl. "failed save flashes FAILURE not SUCCESS") |
| 2.9 | Orb non-blocking, can't be lost off-screen | ✅ | UXC-5 live drag 1056→16px edge-snap + off-screen stored positions reset (UNIT orb-position 23) |
| 2.10 | Expanded dock doesn't cover critical areas | ✅ | Dock anchors to orb's edge, 88vh clamp (UNIT clampDockBottom); UXC-5 drag≠click |
| 2.11 | My Work / Team Work / Action Center feel connected | 🔶 | Shared WorkLedgerItem + buckets + routing chips connect them; Today deep-links in (UXC-1). Gap: `FocusHome.tsx` is DEAD CODE (not routed) — P0B behavior lives natively in AmbientWorkSurface; delete FocusHome + `today-attention.ts` (cleanup follow-up) |
| 2.12 | No backend jargon in normal flow | ✅ | UNIT prod-ux-copy-gate (findBackendTermLeak sweep) + PROBE: 0/200 live routing reasons carry jargon |

## GROUP 3 — Voice, text, hands-free

| # | Scenario | Status | Evidence / gap |
|---|---|---|---|
| 3.1 | Type a natural request | ✅ | DEEP loop spec (employee-flow: typed commands → honest outcomes) |
| 3.2 | Speak in browser | ⏭️ SKIP(env) | Headless CI has no microphone; UXC-6 proves the honest state copy instead |
| 3.3 | Web Speech fail → server STT | ✅ (unit) / ⏭️ live(env) | UNIT stt-path 23 (matrix + one-time auto-switch); real-mic fallback untestable headless |
| 3.4 | Desktop/Tauri path intact | ✅ | decideSttPath preserves `desktop_capture` EXACTLY (unit-locked); desktop live-verified LIVE-4A |
| 3.5 | Otzar speaks back | ✅ | UNIT voice-playback/tts tests; auto-speak opt-in (founder emergency fix respected) |
| 3.6 | Voice failure honest copy | ✅ | UXC-6 live + UNIT transcribe/speech error copy |
| 3.7 | Text + voice → same governed loop | ✅ | Both submit through the same conduct/chat path (AmbientOtzarBar single handleSendText) |
| 3.8 | No raw audio stored | ✅ | Policy invariant in hook + route (LIVE-4A); disclosure copy live (UXC-6) |
| 3.9 | STT keys backend-only | ✅ | ElevenLabs key never in CT; transcribe route server-side (FND) |

## GROUP 4 — Routing/autonomy decision layer

| # | Scenario | Status | Evidence / gap |
|---|---|---|---|
| 4.1/4.2 | Silent lanes → no chip | ✅ | UNIT routing-lane + PROBE live: 134 silent_capture + 18 silent_routing render chip-less |
| 4.3–4.10 | All 8 attention lanes correct | ✅ | Live lanes in real use: draft_ready 20 · setup_required 24 · escalate 3 · blocked 1 (PROBE); lane matrix FND-CI (31 tests) + CT chip matrix (13 tests) |
| 4.11 | View/Why explains in human words | ✅ | UXC-2 live View/Why + routing block; UXC-3 humanized reason |
| 4.12 | Reason/risk/confidence/next-action/audit surfaced | 🔶 | reason+risk+next_best_action live (137/200 carry next action). Gap: `audit_pointer` 0/200 — `audit_event_id` is only set by the execution bridge on executed rows; captured rows have none (honest, but the audit affordance is invisible until executions accrue) |
| 4.13 | No enum leaks | ✅ | PROBE 0/200 jargon; UNIT copy gate |
| 4.14 | CT presents, never recomputes | ✅ | `routing-lane.ts` is pure presentation over `entry.routing`; no policy math in CT (code-audited) |

## GROUP 5 — Collaboration between users

| # | Scenario | Status | Evidence / gap |
|---|---|---|---|
| 5.1–5.4 | Work created → routed → owner's My Work → team view | ✅ | DEEP loop + etl + identity specs (ingest → owner resolution → my-work); UXC-2 71 live items |
| 5.5–5.7 | Requester sees status; owner completes; waiting-on clears | ✅ | UNIT work-state events + DEEP loop (mark-complete rails); P0A execute/receipt tests |
| 5.8 | Blocker visible to the right person | ✅ | blocked lane + blocker_reason live (1 blocked item, humanized) |
| 5.9/5.10 | Approver sees approval; non-approver cannot approve | ✅ (CI) | FND dual-control integration tests (PR #514): distinct-approver enforced; live escalate lane present (3 items). Live negative re-run not repeated (mutating) |
| 5.11 | User A cannot see B's work | ✅ | PROBE: 0 shared items between vishesh(200)/sadeil(121); DEEP per-user isolation test |
| 5.12 | Org A vs Org B | ⏭️ SKIP(env) | single-org production (see 1.6) |
| 5.13 | Twin references resolve to real people | ✅ | DEEP identity spec (email reconciliation; unknown never matches) |
| 5.14 | Notifications in correct surfaces | 🔶 | In-app: approvals→Action Center, replies→Comms, attention→Needs-you panel (UXC-1 live). Gap: no push/email channel; desktop native notifications NEEDS_NATIVE (honest boundary) |

## GROUP 6 — Push/pull data movement

| # | Scenario | Status | Evidence / gap |
|---|---|---|---|
| 6.1/6.2 | Pulls from right source; not from unauthorized | ✅ | DEEP grounding spec: grounded-ONLY answers; refuses when insufficient |
| 6.3/6.4 | Message → work item → ledger status | ✅ | DEEP loop/etl (ingest → WorkLedger rows → status) |
| 6.5/6.6 | Draft/action routed; notification to right user | ✅ | Slice-F bridge + UXC-1 routing; 5.14 note applies |
| 6.7 | Audit/proof recorded | ✅ | Execution attempts + audit ids (P0A receipt shows real channel/ts); DEEP etl proof rows |
| 6.8 | No raw provider data/secrets | ✅ | UNIT invoke-surface privacy tests (16); secret_ref NAME-only invariant live (UXC-8 no secret in response) |
| 6.9 | Explains what data it used | ✅ | View/Why + evidence refs; DEEP grounding evidence |
| 6.10 | Failed pull/write → actionable state | ✅ | setup_required lane (24 live) names the tool; connector-error-copy wired |

## GROUP 7 — Tools, connectors, governed actions

| # | Scenario | Status | Evidence |
|---|---|---|---|
| 7.1 | Connect tools from UI | ✅ | SlackWriteSetupCard + register form (UNIT slack-write-setup 5, connectors-admin 54) |
| 7.2/7.3 | No duplicate setup; idempotent | ✅ | created:false → "already connected"; existing binding renders Connected (UNIT) |
| 7.4 | Feature-disabled honest | ✅ | UNIT (FEATURE_DISABLED copy); live flag is ON (422 path, UXC-8) |
| 7.5 | Secrets never render | ✅ | UNIT privacy invariants; live response carries no secret material |
| 7.6/7.7 | Test invoke governed; writes approval-gated | ✅ | Invoke → Action pipeline (UNIT); SLICE-F live real post via approved Action |
| 7.8 | Read-only connector cannot write | ✅ | Closed operation vocab per type (UNIT invoke-operations); FND validates |
| 7.9 | Failure copy actionable | ✅ | UNIT connector-error-copy 10 (missing_scope names scope, not_in_channel names fix) |
| 7.10 | Setup-required work points to setup | 🔶 | Lane names the tool + blocked-count on the setup card. Gap: the work item's "request_setup" action does not deep-link to `/tools-connections` yet (small wire) |
| 7.11/7.12 | Audit + result in the right surface | ✅ | Receipt (channel/ts/permalink) on the item (UNIT P0A receipt test; SLICE-F live) |

## GROUP 8 — Approvals & governance

| # | Scenario | Status | Evidence |
|---|---|---|---|
| 8.1–8.7 | Block-until-approved; right approver; status changes; audit trail | ✅ (CI+SLICE-F) | FND dual-control integration (#513/#514): NEEDS_APPROVAL until DISTINCT approver approves; approval→executed→receipt live-verified once (real Slack post). Not re-run (mutating/outward) |
| 8.8 | Approval status in human words | ✅ | "Waiting on approval" / escalate chip "Awaiting sign-off" (UNIT) |
| 8.9 | No bypass via direct invoke | ✅ | Invoke creates a governed Action (policy-evaluated); UNIT + route design |
| 8.10 | No cross-org approval leak | ⏭️ SKIP(env) | single org (1.6) |

## GROUP 9 — Notifications & presence

| # | Scenario | Status | Evidence / gap |
|---|---|---|---|
| 9.1–9.3 | Work appears in My Work / Team / Action Center | ✅ | UXC-1/2 live; DEEP loop |
| 9.4 | Blocked/setup work creates attention | ✅ | Lanes + Needs-you panel (live counts) |
| 9.5/9.6 | Calm completion; state arc request→thinking→routed→done | ✅ | Presence store arc (UNIT ambient tests); post-action toasts w/ audit link (12B pattern) |
| 9.7 | No spam to unrelated users | ✅ | Per-user scoping (PROBE 0 overlap) |
| 9.8 | Copy says what happened + next | ✅ | Routing reasons + next_best_action (137/200 live) |
| 9.9 | Glows = real state | ✅ | 2.8 |
| 9.10 | "What needs my attention?" answers right | ✅ | UXC-1 (3 approvals → Action Center); blind-spots feed 200 (222 items — see G10 note) |

## GROUP 10 — Scale & hierarchy readiness (audit; no destructive load test)

| # | Check | Status | Finding |
|---|---|---|---|
| 10.1 | Org-scoped queries | ✅ | `org_entity_id` filters throughout work-ledger/seed services (code audit) |
| 10.2 | Pagination | ❌ **GAP** | Hard `take: 200/300` caps, NO cursor pagination: my-work (`work-ledger.service.ts:479,597,645,701`), seeds (`dandelion-seed.service.ts:122`). At 5k people an employee/team surface truncates silently. PROBE: vishesh my-work returned exactly 200 (cap hit TODAY) |
| 10.3 | Surfaces don't assume tiny org | 🔶 | Grouped queues (P0E) help; `Users.tsx` fetches `take: 250` people for name resolution client-side — breaks >250 members |
| 10.4 | No client-side filtering over unbounded lists | 🔶 | MyWork/TeamWork bucket client-side over the capped 200 — acceptable only while caps exist |
| 10.5 | Hierarchy lookup not hardcoded | ✅ | `/org/hierarchy` + EntityMembership model; but data is flat (1.4) |
| 10.6 | Duplicate-name person resolution | ✅ | Identity reconciliation is evidence+email-based, never name-only (DEEP identity: same name w/o email stays unresolved) |
| 10.7 | Role checks not by display name | ✅ | Capability/operation-based (`admin_org` op; `can_admin_org`) |
| 10.8 | Routing uses stable IDs | ✅ | entity_id/ledger_entry_id/binding_id throughout |
| 10.9 | Notifications scoped | ✅ | Per-caller feeds |
| 10.10 | Dept/team/manager/admin/employee/AI path | ❌ **GAP** | Model supports it; PRODUCT lacks: department values (0/10 live), person→person manager edges (0 live), and any admin UI to create them (1.4). Blind-spots at 222 unresolved items also signals a triage-at-scale gap |

## GROUP 11 — Enterprise primitives (Salesforce/Data-360/Agentforce as reference)

| Primitive | Status | Otzar equivalent |
|---|---|---|
| Unified person/identity profile | ✅ | Entity + cross-source identity reconciliation (Slice C) |
| Org hierarchy + role model | 🔶 | EntityMembership (role/dept/level/is_admin) exists; unpopulated + not admin-operable (1.4, 10.10) |
| Permissioned data graph | ✅ | 3-tuple permissions, org scoping, caller-scoped reads |
| Governed action layer | ✅ | ADR-0057 Action executor + dual-control + audit (live-proven) |
| Agent/twin assignment | ✅ | 1 human ↔ 1 AI teammate, membership-based |
| Audit/proof trail | ✅ | Audit events + execution attempts + receipts |
| Data source mapping | ✅ | Connector registry + bindings + capability states |
| Team/work context | ✅ | WorkLedger + goals + org-query + grounding |
| Activation/governance boundary | ✅ | Flags + policy + founder-gated writes |
| Admin-operable setup | 🔶 | Tools yes (P0F); hierarchy no (1.4) |

## GROUP 12 — Live deployed verification

| Step | Status | Evidence |
|---|---|---|
| Branch confirmation | ✅ | otzar-app←CT `main`; otzar-api←FND `main`; Auto-Deploy "On Commit" |
| SHA on deploy branch | ✅ | CT `origin/main`=`059adf4`(+); FND `origin/main`=`478f8f2` |
| Deploy of that SHA | ✅ | CT: bundle flip + 8 content probes; FND: routing route 404→401 + health `database: connected` |
| Live health | ✅ | `/api/v1/health` ok |
| Live product smokes | ✅ | UXC 8/8 PASS + PROBE suite + DEEP suite (results in run log) |

---

## Repair pass results (2026-07-01, second Fable 5 session)

- **G1.4 → ✅ REPAIRED.** FND PR #519 (deployed; assign route live-probed): `POST /org/hierarchy/assign` (admin-gated, stable IDs, cycle-safe, audited) + GET read-shape fix (person→person manager edges were invisible). CT `dc514d7`: ReportingCard on Members (name+email labels, sentence outcomes). Live-seeded through the product's own API as the org admin: **9 manager edges, 3 departments + Leadership, 3 levels, 19/19 memberships carrying departments, 10 audit events**.
- **G10.2 → ✅ REPAIRED.** my-work paginates (skip/take/has_more, stable id-tiebreak order; integration-tested first/next/disjoint/scoped). CT `ac9be32`: "Show more of your work" with id-dedup.
- **G10.10 → ✅ REPAIRED.** Departments/teams/managers now real and admin-operable (see G1.4 evidence); hierarchy signal already flows into notifications (live probe: sender carries role_title "Engineering Lead").
- **G7.10 → ✅ REPAIRED.** `request_setup` was computed but NEVER rendered; blocked-setup items now show "Connect <tool>" deep-linking to /tools-connections (asserted in unit tests).
- **Gap #3 (FocusHome dead code) → ✅ DELETED** (CT `ba785d9`).
- **Gap #8 (222-item backlog) → ✅ TRIAGED** (CT `e3074d7`): lane-priority order via the P0R projection (identity>blocked>setup>approval>silent tail; oldest-first ties), capped render + honest "Show all N".
- **G5.14 update:** in-app inbox live-verified (33 real notifications for one employee; DIRECT_MESSAGE class; role-carrying senders). Push/email/native remain absent — honestly labeled.
- Onboarding wizard validation copy de-jargoned (binding/env-var → connection/credential reference).
- Still open: second-org live isolation proof (needs a seeded second tenant); push/email channel; Team Work/seeds pagination (my-work pattern ready to replicate); AgentPlayground deep audit.

## Confirmed product gaps (ruthless list)

1. **Hierarchy is structural fiction in production** (G1.4/G10.10): model + read API exist, but zero departments, zero manager edges, all level 0, and NO admin UI to create them. Members "Reports to" is honest but empty. Blocker for "proper hierarchy" claims.
2. **No pagination on core work queries** (G10.2): take-200 caps are being HIT today (vishesh=200 exactly). Silent truncation at scale. Needs cursor pagination on my-work/team/seeds + server-side filtering.
3. **FocusHome is dead code** (G2.11): not routed; P0B was wired into it by the prior session. Real behavior lives in AmbientWorkSurface. Delete `FocusHome.tsx` + `today-attention.ts` + tests.
4. **setup_required doesn't deep-link to setup** (G7.10): item names the tool; one Link to `/tools-connections` closes it.
5. **audit_pointer invisible until executions accrue** (G4.12): expected, but the "why/audit" affordance shows nothing on captured rows.
6. **No second org in prod** (G1.6/5.12/8.10): cross-org isolation is CI-proven only. Seed a second org to prove it live.
7. **No push/email notification channel** (G5.14): in-app surfaces only; desktop native notifications remain NEEDS_NATIVE.
8. **222 blind-spot items** for one employee: the attention triage path exists but the backlog signals runtime-verification noise worth a triage pass.
