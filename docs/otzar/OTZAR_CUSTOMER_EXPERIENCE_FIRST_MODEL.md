# Otzar customer-experience-first model (governing method)

**Status:** adopted 2026-07-01 (founder directive). This is the governing rule
for every future Otzar feature: **start with the customer experience, then
work backward to the technology.** Never start from existing pages, routes,
prior Claude-built code, passing tests, or implementation convenience.

## The sequence (mandatory for every implementation)

1. Customer experience story
2. Desired user feeling
3. Data/ETL flow
4. Permission/routing model
5. Existing-code discovery by grep
6. Smallest coherent implementation
7. Tests
8. Live smoke
9. Customer-experience verification (screenshots/live behavior, not bundles)
10. Honest remaining gap

## The questions every feature answers FIRST

What is the customer trying to accomplish? · What should Otzar understand
automatically? · What should it do without bothering the human? · What should
it ask for? · What should the human see and FEEL? · What must be routed,
permissioned, audited? · What memory/knowledge improves? · What makes this
agentic and novel instead of a normal SaaS dashboard?

## Personas

| Persona | Their lived goal | Otzar's promise |
|---|---|---|
| Founder / org admin | run and shape the organization from one place | command center: state, attention, blockers, next action; people/tools/access operable in minutes |
| Manager / team lead | know team state; unblock; approve | Team Work + rollups + approvals routed to them; escalations arrive, never rot |
| Employee | do the work; be helped, not managed | angel on the shoulder: My Work says why/who/next; approvals only when needed; teaching via Talk |
| Executive | direction + risk at org level | hierarchy-aware rollups; scenario exploration (Agent Playground) |
| External participant / Dandelion seed | contribute without being in the org | discovered from the workstream; reviewed; invited / kept as contact / ignored — never silently absorbed |
| AI teammate / twin | act within role + policy | role-template behavior; approval-gated writes; portable learning of its human |
| Compliance / regulator viewer (future) | see exactly the bound data, nothing else | policy-bound packages with proof (see COMPLIANCE_REGULATOR_SHARING model) |
| NIOV/Otzar operator | run the platform without touching org data | diagnostics tier only; org data never leaves (Security §15 clarity) |

## The customer-feeling standard (what "agentic" must mean)

Otzar is already watching the permitted workstream · knows relevant-now vs
later · knows who owns what and who reports to whom · knows what tool/data is
missing · routes to the right person or twin · escalates when it can't ·
asks approval only when needed · keeps proof · improves after every
correction.

## Phase-5 customer-experience verification (recorded closeout)

Scored from the live production screenshots (bundle `index-Cq7lKZ4R.js`):
- **Admin Home**: shows attention (go-live blockers), Otzar activity, next
  best actions — command-center shape present; metric-tile row still reads
  dashboard-ish (named gap).
- **People/Members**: org map at a glance ✅; invite→placement→template→twin
  in one flow ✅; wrong/fake roles gone ✅ (live-corrected + fixture cleanup).
- **Tools & Connections**: purpose groups + the four facts ✅; setup-required
  work deep-links here ✅; no provider lingo in normal flow ✅.
- **Work surfaces**: why/who/next on every card ✅ (lane chip + owner +
  next action + human status words); blocked/approval visually distinct ✅;
  silent items recede ✅.
- **Blind Spots**: urgent items surface on Today ✅; triage order ✅; every
  item routes to action (setup links, View/Why) ✅.
- **Memory**: portable identity vs company data stated ✅; no employee org-
  authority controls ✅; personal value display still thin (named gap).
- **Data & Knowledge**: lifecycle framing ✅; the deeper raw/curated browse
  experience is future (named gap).
