# RC2 controlling direction (founder — durable agent memory)

> **READ THIS FIRST for any RC2 / experience / admin / visual work.**  
> Updated: 2026-07-22. Supersedes ad-hoc chat summaries when they conflict with this file.  
> Status language: never claim RC2 ready / FOUNDER_EXPERIENCE_APPROVED without live founder confirmation.

---

## 0. Status vocabulary (mandatory)

Only these count as “shipped to founder”:

| Level | Meaning |
|-------|---------|
| coded | exists in a branch |
| tested | unit/integration green |
| PR open | not on main |
| merged | on `origin/main` |
| deployed | Render service SHA = main SHA |
| live bundle verified | HTML serves new `index-*.js` |
| LIVE_ROUTE_VERIFIED | authenticated route shows behavior |
| FOUNDER_VISIBLE | founder account + role confirms |

**Never** use “fixed / shipped / live / done” for coded-or-PR-only work.

Deploy truth: `docs/RENDER_DEPLOY_NOTES.md`  
Service: `otzar-app` `srv-d8t1qpj7uimc73db2il0` · domain app.otzar.ai  
Auto-deploy may lag — confirm deploy SHA; force specific commit if needed.

---

## 1. Controlling product principle

```
Preserve the working intelligence and functionality underneath.
Recompose it into a smaller number of human-facing surfaces.
```

**Never:**

- remove complexity by deleting working subsystems;
- destroy Foundation contracts that already work;
- hide Dandelion/seeding capability permanently;
- rewrite proven backend merely for a UI redesign.

**Always:**

- inventory capability first (`src/lib/setup/capability-preservation.ts`);
- map `Old screen → capability → new surface → full route`;
- keep deep links to full capability until the new surface owns every action;
- regression-test after every consolidation.

---

## 2. Dandelion / Organization Seeding (CRITICAL)

**Combined with Organization setup — not deleted.**

- Engine: Dandelion (list / syncFromGrowth / approve / reject / hold / meeting ingest / external decide / manager confirm / project assign).
- Human surface: **Organization** (`/setup`) → **Otzar found** → **Review N items**.
- Full capability route: **`/organization-seeding`** (deep link OK; not a competing primary product tab).
- Admin never needs: “Run Organization Seeding”, “Open Dandelion”, “Start seeding process”.

Organization setup flow (target):

1. Organization basics (minimal)  
2. People (found / needs review / invite)  
3. Structure (teams, managers, hierarchy — visual confirm)  
4. Projects & collaboration  
5. AI Teammates  
6. Connections  
7. Governance (defaults first)  
8. First workflow (prove value)  
9. Ready  

Onboarding ≠ organization setup:

- **Organization setup** = admin activates company.  
- **Person onboarding** = invited individual enters Otzar.

Do not overload Organization with architecture essays, philosophy, or builder copy.

---

## 3. Admin navigation (jobs, not architecture)

Target primary areas (≤7 preferred):

| Area | Contains |
|------|----------|
| Overview | readiness, attention |
| Organization | people, structure, AI, discovery |
| Connections | tools — plug and play |
| Action Center | only things needing attention |
| Intelligence | projects, movement, reports |
| Governance | autonomy, access rules, data, retention |
| Security | posture, access reviews, advanced audit |

**Secondary / advanced:** Marketplace, Federation, Billing, raw diagnostics.

Connections principle: *Find tool → Connect → works under permissions.*  
Hide MCP from primary UI. Enterprise: org OAuth / SSO / SCIM; not 1000 manual logins.

Access: contextual on person / project / tool; advanced overview under Governance/Security.  
Human language: “People with access”, not “grantees”.

Policies & retention under **Governance**.  
Reports under **Intelligence**.  
Action Center = exception queue only (no essays).

---

## 4. Visual system (core identity — not optional polish)

**Emotional target:** Enterprise intelligence from year 3000; Black Mirror sophistication; Siri-like ambient presence; subtle Atari edge DNA (geometry, not arcade).

**Official logo (must stand out — WOAH / 3D 4K polish):**

- Product: https://www.otzar.ai/  
- Brand gallery: https://www.behance.net/gallery/252799665/OTZAR  
- Repo assets: `public/brand/otzar-logo.png` (1080² hero), `otzar-logo.svg` (mono chrome), `SOURCE.md`  
- Component: `src/components/ambient/OtzarBrandLogo.tsx` — glass sphere, spectral bloom, Atari corner ticks, float on hero  
- Surfaces: Login hero · Today · AmbientNav · Control Tower sidebar · employee header  

**Ambient edge + Atari DNA:**

- Presence-driven rim: listening / thinking / speaking / attention / blocked / complete.  
- Implementation: `AmbientEdgeGlow` + CSS `.otzar-ambient-rim` + always-on idle rim + shell corner brackets.  
- Active = restrained spectral travel (cyan/indigo/violet). Idle = barely-there silver/cyan.  
- Atari = precise L-corner geometry + edge ticks — **not** arcade RGB, pixel fonts, vaporwave.  
- Glass cards: `.otzar-glass-card` default on shadcn `Card`. Stages: `.otzar-stage` + `.otzar-atari-frame`.  
- Reduced motion: static state colors, no travel/float animation.  
- Performance: CSS first; no WebGL for atmosphere only.

**Founder must approve visual system live** before freeze.

---

## 5. Truth / deploy discipline

1. Implementation  
2. Unit tests  
3. PR green  
4. Merge to main  
5. Render deploy of **exact** merge SHA  
6. Live bundle hash flip  
7. Authenticated route proof  
8. Founder confirmation where required  

Open PRs (as of last update — re-check with `gh pr list`):

| PR | Topic |
|----|--------|
| #204 | Dandelion into Organization (preserve capability) |
| #205 | Official logo + ambient rim (stacks visual) |

Post-merge: verify deploy SHA == main; bundle on app.otzar.ai.

---

## 6. Execution order (do not randomize)

1. Restore Dandelion into Organization setup (**#204**)  
2. Consolidate setup/onboarding correctly (no capability loss)  
3. Connections plug-and-play  
4. Access contextual + Governance overview  
5. Policies under Governance  
6. Data & retention under Governance  
7. Action Center = real exception queue  
8. Reports into Intelligence  
9. Security/audit cleanup  
10. Full visual system + ambient presence (**#205** + founder approve)  
11. Capability-preservation regression  
12. Fresh admin + employee comprehension  
13. Full Work OS regression  
14. Founder live review  

---

## 7. Open defects (do not mark closed without proof)

- Talk “ping David” professional draft: **live Talk artifact path** still needs LIVE_ROUTE_VERIFIED  
- Residual copy: “Tools & Connections”, “Dandelion” in body (scrub carefully; keep engines)  
- Bootstrap sadeil password stale — use working admin smoke carefully; do not lock founder  
- Employee People previews / speak-back / mic — deploy-verify separately  
- Visual system — not FOUNDER_VISIBLE until founder says so  

---

## 8. Agent rule of thumb

When simplifying:

```
capability-preservation map updated?
full route still works?
new surface shows the signal (Otzar found / Review N)?
live SHA + route proof after merge?
```

If any answer is no → do not remove the old surface.

---

## Related files

- `src/lib/setup/capability-preservation.ts`  
- `src/lib/setup/org-discovery.ts`  
- `src/components/otzar/OrgDiscoveryFoundCard.tsx`  
- `src/pages/OrgSetup.tsx`  
- `src/pages/OrganizationSeeding.tsx`  
- `docs/otzar/OTZAR_AMBIENT_UI_VISUAL_SYSTEM.md`  
- `docs/RENDER_DEPLOY_NOTES.md`  
- `docs/otzar/AGENT_CONTINUITY_POINTER.md`  
