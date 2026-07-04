# Otzar Organization Setup — Onboarding Failure-Story Smoke Matrix

**Status:** 2026-07-04 (Fable 5), authored with GAP-U slice 1 (the read-only
Organization Setup page). This matrix works BACKWARD from the ways company
onboarding commonly stalls, and ties each story to Otzar's detection, the
admin-visible state, the repair path, and the test that proves it. It is
implementation-bound, not theoretical: every "Covered" row cites a real test.

**Legend:** ✅ covered by slice 1 · 🟡 partially covered · 🔴 not represented
yet (honest gap; next-slice column says what it needs).

| # | Story | Customer pain | Source of truth | Detection | Admin sees | Repair path | Test proof | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | People cannot start | Invited but nobody activated | `activation_status` on org/entities | waiting/expired/invited counts | "N people are waiting on activation… Open Users to copy their activation links." | /users (copy/regenerate links — P0-ONBOARD rail) | org-setup.test partial-state; live smoke count check | ✅ |
| 2 | Access but no role | Person logs in, Otzar can't route confidently | twin `config.role_template` joined to active people | active people whose twin lacks a template | "N active people need a role assignment before Otzar can route work to them confidently." | /ai-teammates | org-setup.test partial + priority ladder | ✅ |
| 3 | Hierarchy missing | Clarification/escalation ambiguity | person→person manager edges in org/hierarchy | active people with no manager edge | "N people have no manager mapped…" + "Hierarchy is who manages whom — it is not permission." | /users (reporting editor) | org-setup.test partial + ladder | ✅ |
| 4 | Admin authority too broad | Security/trust risk | `is_admin` on org membership edges | admin count | "N people have admin-level authority. Keep this limited to trusted operators." | /users | org-setup.test partial (human label, no enum) | ✅ |
| 5 | Twins exist but not ready | "AI is set up" but can't work | `tool_readiness.status` (never fake-ready) | ready/needs_setup/not_configured buckets | "N AI Teammates still need setup before Otzar can call them ready." Authority shown separately from title. | /ai-teammates | org-setup.test partial (no fake ready) | ✅ |
| 6 | Tool connected but not useful | "We connected Slack" but nothing flows | connectors/oauth/status per provider | per-provider status → honest per-tool line | Zoom: "connected… ambient ingestion is not automatic yet". Slack: "message ingestion is not wired… yet". Missing creds: "not available yet — requires operator setup." | /tools-connections | org-setup.test ready-ish (connected ≠ ingesting) | ✅ |
| 7 | Data pipeline unclear | "Where does our data go?" | doctrine (wallet boundary, audit, ledger) | governance section renders the boundary statements | "Company work data stays company-owned… never becomes portable personal memory." | /data-knowledge, /retention | org-setup.test empty (copy present) | 🟡 — per-source flow panel is a future slice |
| 8 | Pipeline not flowing | Setup "done" but no work truth | analytics decision/capsule counts + seeds presence | zero-signal → "No work has flowed yet" + strongest first source | "Start by pasting a meeting transcript in Comms…" | /organization-seeding (+ Comms) | org-setup.test empty vs ready-ish flip | ✅ |
| 9 | Recommendations disconnected | Setup feels scattered | open dandelion seeds count | pending review count on First workflows | "N suggestions are waiting for review in Organization Seeding." | /organization-seeding | org-setup.test ready-ish next-step | ✅ (setup-coach seed lane remains future) |
| 10 | Approval policy unclear | "What can AI do alone?" | org/settings flags + twin ceiling | human-readable policy lines | "Sensitive AI actions require human approval." / ceiling as "Approval required" | /data-knowledge (+ Settings) | org-setup.test (no raw policy enums) | ✅ |
| 11 | External data boundaries | Client-data leakage worry | doctrine + T-1→T-4 rails | governance boundary line | "Client and vendor data never becomes portable personal memory." | /data-knowledge | copy assertion in tests | 🟡 — external-scope detail panel future |
| 12 | Retention setup missing | Compliance concern | (unmodeled — honest) | limitation always shown | "Retention controls are not configurable in-product yet. Keep this visible during pilot planning." | /retention (existing honest page) | overclaim test asserts the line renders | ✅ (as an honest limitation) |
| 13 | Bulk onboarding pain | 100+ people, one-by-one invites | (unbuilt — honest) | limitation always shown | "Bulk import is not available yet — invite members one at a time from Users." | /users; CSV import is the named next slice | overclaim test asserts the line renders | ✅ (as an honest limitation) |
| 14 | "Can we go live?" | Implementation confidence gap | all of the above | top summary + ONE deterministic next step | "N areas need attention — start with the step below." / "You're in good shape." | the next-step link | priority-ladder unit test walks the full order | ✅ |

## Detection priority (the Next Best Step ladder, test-locked)

activate people → assign roles → map managers → connect first tool → finish
twin setup → ingest first conversation → review pending suggestions → "in
good shape". Foundation/bootstrap issues can't occur for a logged-in admin
(the org exists by construction), so the ladder starts at people.

## Remaining unimplemented stories (honest)

- **Per-source data-flow panel** (story 7 full form: pull/push/landing/
  visibility/retention per connector) — read-only, buildable from doctrine +
  connector status; recommended after CSV import.
- **External-scope panel** (story 11 full form) — the T-1→T-4 projections
  exist; a setup-facing summary is a small future slice.
- **Setup-coach Dandelion seeds** (story 9 full form) — needs the typed
  seed-lane split (Gap U doctrine Part 3C); no new seed type was created in
  this slice by design.
- **Go-live checklist as a formal gate** (story 14 full form) — the summary
  exists; a printable/pilot-gate handoff view is future.
- **Bulk import** (story 13 repair) — the highest-risk remaining stall for
  any pilot >15 people; recommended NEXT slice (CSV through the existing
  bulk + hierarchy + activation rails; needs founder GO since it adds a
  write-path UI).

None of these require schema changes; bulk import and setup-coach seeds
require founder approval (write paths / new seed lane).
