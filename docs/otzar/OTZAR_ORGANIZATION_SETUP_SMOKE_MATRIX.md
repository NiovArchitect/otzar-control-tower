# Otzar Organization Setup — Onboarding Failure-Story Smoke Matrix

**Status:** 2026-07-04 (Fable 5), authored with GAP-U slice 1 (the read-only
Organization Setup page). This matrix works BACKWARD from the ways company
onboarding commonly stalls, and ties each story to Otzar's detection, the
admin-visible state, the repair path, and the test that proves it. It is
implementation-bound, not theoretical: every "Covered" row cites a real test.

**Legend:** ✅ covered (slice noted) · 🟡 partially covered · 🔴 not
represented yet. **Status 2026-07-05: 14/14 stories covered** across
slices 1–5; remaining maturity items listed at the bottom.

| # | Story | Customer pain | Source of truth | Detection | Admin sees | Repair path | Test proof | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | People cannot start | Invited but nobody activated | `activation_status` on org/entities | waiting/expired/invited counts | "N people are waiting on activation… Open Users to copy their activation links." | /users (copy/regenerate links — P0-ONBOARD rail) | org-setup.test partial-state; live smoke count check | ✅ |
| 2 | Access but no role | Person logs in, Otzar can't route confidently | twin `config.role_template` joined to active people | active people whose twin lacks a template | "N active people need a role assignment before Otzar can route work to them confidently." | /ai-teammates | org-setup.test partial + priority ladder | ✅ |
| 3 | Hierarchy missing | Clarification/escalation ambiguity | person→person manager edges in org/hierarchy | active people with no manager edge | "N people have no manager mapped…" + "Hierarchy is who manages whom — it is not permission." | /users (reporting editor) | org-setup.test partial + ladder | ✅ |
| 4 | Admin authority too broad | Security/trust risk | `is_admin` on org membership edges | admin count | "N people have admin-level authority. Keep this limited to trusted operators." | /users | org-setup.test partial (human label, no enum) | ✅ |
| 5 | Twins exist but not ready | "AI is set up" but can't work | `tool_readiness.status` (never fake-ready) | ready/needs_setup/not_configured buckets | "N AI Teammates still need setup before Otzar can call them ready." Authority shown separately from title. | /ai-teammates | org-setup.test partial (no fake ready) | ✅ |
| 6 | Tool connected but not useful | "We connected Slack" but nothing flows | connectors/oauth/status per provider | per-provider status → honest per-tool line | Zoom: "connected… ambient ingestion is not automatic yet". Slack: "message ingestion is not wired… yet". Missing creds: "not available yet — requires operator setup." | /tools-connections | org-setup.test ready-ish (connected ≠ ingesting) | ✅ |
| 7 | Data pipeline unclear | "Where does our data go?" | doctrine (wallet boundary, audit, ledger) | governance section renders the boundary statements | "Company work data stays company-owned… never becomes portable personal memory." | /data-knowledge, /retention | data-flow.test (six trust fields per source; connected ≠ ingesting; honest retention) + live spec | ✅ SLICE 3 — /setup/data-flow answers pull/push/landing/ownership/visibility/retention per source |
| 8 | Pipeline not flowing | Setup "done" but no work truth | analytics decision/capsule counts + seeds presence | zero-signal → "No work has flowed yet" + strongest first source | "Start by pasting a meeting transcript in Comms…" | /organization-seeding (+ Comms) | org-setup.test empty vs ready-ish flip | ✅ |
| 9 | Recommendations disconnected | Setup feels scattered | open dandelion seeds count | pending review count on First workflows | "N suggestions are waiting for review in Organization Seeding." | /organization-seeding | org-setup.test ready-ish next-step + setup-coach.test (grouped/deduped/disappears-when-fixed/quiet-org/copy sweep) | ✅ SLICE 5 — setup coach shipped as DERIVED typed recommendations (doctrine: setup stalls need repair links, not approval — the Dandelion approve/reject lifecycle stays operational-only; ingestion-driven seeds with real approval semantics remain in Organization Seeding) |
| 10 | Approval policy unclear | "What can AI do alone?" | org/settings flags + twin ceiling | human-readable policy lines | "Sensitive AI actions require human approval." / ceiling as "Approval required" | /data-knowledge (+ Settings) | org-setup.test (no raw policy enums) | ✅ |
| 11 | External data boundaries | Client-data leakage worry | doctrine + T-1→T-4 rails | governance boundary line | "Client and vendor data never becomes portable personal memory." | /data-knowledge | data-flow.test external_context row (observed-never-trusted, never-portable, manager-vs-source visibility) | ✅ SLICE 3 — the External & client context row states the full boundary |
| 12 | Retention setup missing | Compliance concern | (unmodeled — honest) | limitation always shown | "Retention controls are not configurable in-product yet. Keep this visible during pilot planning." | /retention (existing honest page) | overclaim test asserts the line renders | ✅ (as an honest limitation) |
| 13 | Bulk onboarding pain | 100+ people, one-by-one invites | CSV import (/setup/import-people) through the EXISTING rails: bulk create → per-person Phase-3 invite (twin + one-time link) → hierarchy assign | parser refuses forbidden columns; preview-first; confirmation-gated | "Preview first… You're about to invite N people with minimum access… No email is sent." Per-batch cap 20 with honest split copy. | /setup/import-people (linked from the People card + results link back to /setup) | csv-import.test 8 tests (stories 1–13 of the import list): empty/headers/invalid-email/dupes/existing/forbidden-columns/manager-resolution/self-manager/unknown-role/row-cap/no-write-before-confirm/partial-failure/one-time links | ✅ SLICE 2 |
| 14 | "Can we go live?" | Implementation confidence gap | all of the above | top summary + ONE deterministic next step | "N areas need attention — start with the step below." / "You're in good shape." | /setup/go-live — the formal gate: deterministic verdict (Not ready / Needs admin setup / Ready for first workflow), ready/blocking/tidy/founder-action tally, per-item repair links, always-rendered "not self-serve complete" limitation | go-live.test (verdict ladder, founder actions apart, warnings never fake-block, overclaim sweep, GET-only) + live spec verdict check | ✅ SLICE 4 — the go-live gate is the graduation artifact |

## Detection priority (the Next Best Step ladder, test-locked)

activate people → assign roles → map managers → connect first tool → finish
twin setup → ingest first conversation → review pending suggestions → "in
good shape". Foundation/bootstrap issues can't occur for a logged-in admin
(the org exists by construction), so the ladder starts at people.

## Remaining unimplemented stories (honest)

- ~~Per-source data-flow panel~~ — SHIPPED as slice 3 (/setup/data-flow).
- ~~External-scope panel~~ — covered by slice 3's External & client context
  row; a deeper per-account view remains future.
- ~~Setup-coach lane~~ — SHIPPED as slice 5, DERIVED not persisted: the
  coach card on /setup groups one recommendation per category from
  computeSetupFacts, disappears when fixed, and never enters the
  operational seed queue. Persisted setup seeds were deliberately rejected:
  the approve/reject lifecycle is the wrong shape for repair items
  (approving an activation stall changes no truth). Re-open only if a
  setup decision with REAL approval semantics appears.
- ~~Go-live gate~~ — SHIPPED as slice 4 (/setup/go-live).
- ~~Bulk import~~ — SHIPPED as slice 2 (CSV, cap 20/batch, preview-first,
  least-access by construction). Remaining bulk maturity: HRIS/directory
  import, org-chart upload, >20-row streaming batches.

None of these require schema changes; bulk import and setup-coach seeds
require founder approval (write paths / new seed lane).
