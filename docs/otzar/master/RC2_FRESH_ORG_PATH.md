# RC2 fresh-organization activation path

**Updated:** 2026-07-22  
**Status vocabulary only:** IMPLEMENTED / MERGED / DEPLOYED / LIVE_ROUTE_VERIFIED / FOUNDER_VISIBLE / FOUNDER_APPROVED  
**Do not claim RC2 READY.**

---

## 1. What “fresh org” means

Target proof (founder brief):

1. Zero prior discovery state  
2. People imported or discovered  
3. Structure proposed  
4. Findings reviewed (confirm/correct)  
5. AI Teammates prepared  
6. Tools connected  
7. First workflow executed  
8. Organization reaches Ready  

Metrics: screens, clicks, time to first value, fields entered, review items, confusion points.

---

## 2. Product path that exists today (human sequence)

| # | Step | Live route | Primary action |
|---|------|------------|----------------|
| 1 | Login → Today | `/app` | See **Otzar found** entry (admins) |
| 2 | Organization | `/setup` | Categories + Decide now + **9-step path** |
| 3 | People | `/users` or category `people` | Activate / invite |
| 4 | Structure | `/organization-seeding?class=managers` | Confirm managers/teams |
| 5 | Projects | `?class=projects` or `/app/work-projects` | Placement / membership |
| 6 | AI Teammates | `/ai-teammates` | Pair / configure |
| 7 | Connections | `/tools-connections` | Find → Connect → permissions |
| 8 | Governance | `/policies`, `/retention`, `/access-control` | Defaults already on |
| 9 | First workflow | `/workflows` or Work OS | Prove one governed flow |
| 10 | Ready | `/setup/go-live` | Go-live readiness |

Legacy aliases (no dead ends): `/dandelion`, `/seeding` → review queue; `/organization`, `/org-setup` → `/setup`.

---

## 3. What was live-measured (timed smoke — 2026-07-22)

Artifact: `screenshots/rc2-fresh-org-path/report.json` (+ PNG steps 01–05).

**Scope honesty:** this run uses the **existing sadeil org**, not a brand-new empty tenant.  
It measures whether the **activation product path is operable end-to-end**.

| Metric | Value |
|--------|-------|
| Wall-clock (login → AI Teammates) | **~46s** automated |
| Screens / major steps | **8** |
| Clicks / navigations (approx) | **8** |
| Discovery categories open | **3** |
| Inline actionable items | **12** |
| Category queue seeds (people) | **32** |

| Gate | Result |
|------|--------|
| Discovery entry on Today | **LIVE_ROUTE_VERIFIED** |
| Setup path + categories + review queue | **LIVE_ROUTE_VERIFIED** |
| Category → seed queue | **LIVE_ROUTE_VERIFIED** |
| Connections plug-and-play | **LIVE_ROUTE_VERIFIED** |
| Go-live screen reachable | **LIVE_ROUTE_VERIFIED** |
| AI Teammates reachable | **LIVE_ROUTE_VERIFIED** |

True **zero-state org** requires Foundation:

- create isolated org entity  
- mint first admin with `admin_org` TAR  
- no residual seeds  

Until that rail is available, **zero-state fresh org is NOT LIVE_ROUTE_VERIFIED**.

---

## 4. Blockers for full fresh-org claim

1. **Org create + first admin TAR** — CT can create *members* with `is_admin` membership flags, but login still returns `read/write/share` only (see `RC2_SECOND_ADMIN_PROOF.md`).  
2. **Empty seed state** — existing pilot orgs already have open review items; cannot prove “zero prior discovery” without a new org.  
3. **First workflow executed** — separate Work OS LIVE_ROUTE proof (Talk / ledger / connector), not just page open.

---

## 5. Status (this document)

| Claim | Status |
|-------|--------|
| Product activation sequence documented | **IMPLEMENTED** |
| Path operable on live admin org (sadeil) | **LIVE_ROUTE_VERIFIED** (timed smoke) |
| Brand-new empty org → Ready | **NOT PROVEN** |
| FOUNDER_APPROVED full activation journey | **No** |
| RC2 READY | **No** |

---

## 6. Next ops action

When Foundation can provision:

```
POST create org → first admin with admin_org → CT login →
/setup shows empty calm discovery →
import/discover people → review → connect tools → first workflow → go-live Ready
```

Record: org_entity_id, admin email, screens, clicks, wall-clock to first confirmed finding and to Ready.
