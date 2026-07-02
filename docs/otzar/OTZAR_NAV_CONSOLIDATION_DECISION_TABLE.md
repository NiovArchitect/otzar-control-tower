# Otzar nav consolidation — decision table

**Status:** Phase 3 (2026-07-01). Every admin + employee destination
classified per the founder's Section-26 format. "Route-only" = hidden from
nav, URL still resolves (deep-link-safe). Decisions marked ✅ are EXECUTED
this pass; ⏳ are queued with their phase.

## Employee shell (`/app/*`)

| Page | Audience | Purpose / primary object | Decision |
|---|---|---|---|
| Today (AmbientWorkSurface) | employee | ambient home; needs-you + what-changed | **Keep primary** ✅ (Section-25 fix landed) |
| Needs me (Action Center) | employee | THE needs-me queue (approvals, actions) | **Keep primary** ✅ |
| Comms | employee | conversations + reopen source | **Keep primary** ✅ |
| People & Collaboration | employee | org people view | **Keep primary** ✅ |
| Memory (Digital Work Wallet) | employee | portable work identity + insight | **Keep primary**; redesign per §24 (Phase 4 ⏳ — insight, not permission controls) |
| My Day | employee | full workbench | Keep (More) ✅ |
| My Work / Team Work | employee/manager | owned work / team view | Keep (More) ✅; Team Work pagination ⏳ |
| Blind Spots | employee | detail view of attention debt | Keep (More) ✅; urgent items must ALSO surface on Today/Action Center (§21 ⏳) |
| Work health | employee | personal "how am I doing" (≠ Reports) | Keep (More) ✅ |
| Workspaces / Projects | employee | collaboration containers | Keep (More) ✅ |
| My Twin | employee | twin status | Keep (More); teaching consolidates into Talk to Otzar (§18 ⏳) |
| Tool connections | employee | honest status of connected tools | Keep (More = the settings tier) ✅; personal connections stay un-faked |
| Preferences / Corrections | employee | teach the twin; personal prefs | Keep (More) ✅ |
| Launch readiness | employee | onboarding readiness | Keep (More) ✅ |
| **My Organization** | employee | duplicate of People/Today | **Route-only** ✅ (§17) |
| **Meeting captures** | employee | manual capture page | **Route-only** ✅ (§17/§23 — ingestion is meant to be automatic; page = detail view) |
| **Approvals** | employee | duplicate of Action Center | **Route-only** ✅ (§13/§17) |
| **Authority** | employee | employee grants twin authority | **Route-only** ✅ (§7 — admin/org-policy governs twin authority) |
| Chat / Welcome / Observe / Voice captures / Conversations | — | pre-existing route-only | unchanged ✅ |

## Admin shell (grouped 8-section IA — sections stay)

| Page | Decision |
|---|---|
| Home (Command Center) | Keep (Overview) |
| Billing & Entitlements | Keep, honest preview; candidate to demote into Overview body ⏳ |
| Users/Members (+ org map + Reporting + invite) | **Keep — the People model core** ✅ (P1/P2 landed) |
| AI Teammates (+ role template column) | Keep ✅ |
| Organization Seeding | **Reframe (§5)**: Dandelion = people/context discovered from the workstream; move tools-setup concepts out; language "Otzar found people and context…" (Phase 3 remainder ⏳) |
| Onboarding | Keep; restructure to 3 acts (§E ⏳); converts approved seeds → members/twins/tools |
| Tools & Connections (+ purpose groups) | Keep ✅ |
| Voice / Voice Providers | **Demote (§7)**: branded default voice; provider detail behind Advanced ⏳ |
| Data & Knowledge + Data retention | **Merge into the Data-360 layer (§8)**: raw → curated → permissioned; retention lives here (Phase 4 ⏳) |
| **Access Control + Access & Grants** | **Consolidate into ONE Access Control (§9)** ⏳ — org defaults → role defaults → user overrides → twin permissions → audit |
| Marketplace / Federation Cohorts | Keep comingSoon-labeled, out of core IA (§10) ✅ (already gated) |
| Policies | Keep; recategorize (internal / approval / data-sharing / regulator-compliance / retention) (§11 ⏳) |
| **Collaboration policy** | **Audit → likely merge into Access Control/AI Teammates (§12)** ⏳ |
| Review Center / Pending Approvals | Keep as ADMIN oversight only; employee-side Approvals demoted ✅; verify no third user-facing queue (§13) |
| Agent Playground | Reframe as scenario collaboration (§14); honest doc before build ⏳ |
| Security & Audit | Keep; add the org-data-stays-here clarity (§15) ⏳ |
| Reports | Keep; hierarchy-aware rollups (≠ Work health) (§16) ⏳ |
| System Health / Diagnostics | Keep (Diagnostics) |
| comingSoon stubs (Intelligence, Workflows, Playground, Analytics, Conversations, Settings, Documentation) | stay hidden ✅ |

## Executed this pass
Employee demotions (4) with tests; the P1–P2 keep-decisions were landed in
prior passes. Next queued slices: Access consolidation, Seeding reframe,
Data-360 merge, voice demotion, urgent-blind-spot surfacing.
