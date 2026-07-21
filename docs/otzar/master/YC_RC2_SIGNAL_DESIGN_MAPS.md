# YC RC2 signal design maps

**Status:** `YC_RC1_REOPENED_FOR_SIGNAL_AND_FIRST_USE_REPAIR`

Backend Work OS proof stays. This document guides human-facing repair.

## Human mental-model map

| Role | They think in… | First need |
|------|----------------|------------|
| Admin | readiness, people, access, connections | Confirm structure and tools |
| Executive | decisions, risk, movement | What needs a decision |
| Manager | team capacity, blockers, handoffs | Who is stuck |
| Employee | my work, help, proof | What needs me now |
| Contractor | scope, sponsor, deliverables | Authorized work only |

## Workflow-to-surface map

| Workflow | Primary surface | Secondary |
|----------|-----------------|-----------|
| See what needs me | Needs me (Action Center) | Home focus |
| Understand a project | Project context | Doc / meeting links |
| Ask for help | People | Talk |
| Confirm org structure | People (admin) | Hierarchy editor |
| Connect tools | Connections | Admin Tools |
| Review AI work | Talk / My Teammate | Needs me approvals |

## Cognitive-load baseline (pre-RC2)

| Metric | Baseline observation |
|--------|----------------------|
| First-use walkthrough | Dismissed on first CTA (fixed) |
| Admin nav commercial items | Billing, Marketplace, Federation primary (hidden for RC2) |
| Users page engineering cards | Scale/pressure harness visible (gated) |
| People badges | Counts only, no hover detail (preview added) |
| Long dashes / envelope terms | Widespread (partial cleanup) |

## Role-based Home model

Home answers five questions only:

1. Needs me
2. Changed
3. Handled by Otzar
4. Waiting
5. Next action

## Project composition model

One project surface holds: people, tasks, decisions, docs, meetings, blockers, AI activity. No separate apps for each type as primary destinations.

## Task composition model

Human labels: needs me, waiting, done. Backend types stay internal.

## Screen disposition (first cut)

| Surface | Disposition |
|---------|-------------|
| First-use strip on Home only | Move to shell-global persistent guide |
| Synthetic scale / pressure cards | Diagnostics flag only |
| Billing / Marketplace / Federation | Hidden advanced (routes kept) |
| People shared/collab badges | Hover preview with real waiting-on lines |
| Collaboration "envelope" copy | Plain language |

## Next implementation slices

1. Invite flow field reduction
2. Full em-dash lint gate on UI strings
3. Prohibited-language dictionary scan in CI
4. Fresh tester protocol without founder narration
