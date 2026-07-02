# Otzar product-model correction (founder walk-through, 2026-07-01)

**Status:** Phase 1 executed (truth & cleanup); Phases 2–6 queued. Vocabulary:
**ETL / data-flow / communication-ingestion pipeline** (the term "ATO" is not
a repo or product concept and must not be used).

## Seeded-org truth map (authoritative)

Source of truth: `niov-foundation/scripts/provision-demo-team-accounts.ts` +
`provision-pratham-shiney.ts` + founder corrections (2026-07-01). Applied LIVE
through `POST /org/hierarchy/assign` (10 audited changes, this pass).

| Person | Title | Department | Reports to | Notes |
|---|---|---|---|---|
| Sadeil Lewis | Founder & CEO | Leadership | — (org root) | org admin |
| David Odie | Tech Lead | Engineering | Sadeil | |
| Vishesh | AI UI Engineer | Engineering | David | live UI demo account |
| Samiksha | AI/NLP Engineer | Engineering | David | |
| Shiney | Integration Engineer | Engineering | David | founder: "not Operations" — seed source confirms |
| Pratham | Software Engineer | Engineering | David | |
| Annie | Senior Engineer & Researcher | Engineering | David | **founder correction overrides** seed title "Risk & Compliance Lead" — discrepancy noted, founder wins |
| Shweta | Go-to-Market Lead | Marketing | Sadeil | founder: "Shreda/Shreeda is Marketing" = this person |
| William | Chief Product Owner | Product | Sadeil | founder: "Will is Product Owner / Chief Product Owner" |
| Walter | Media Lead | Video Production | Sadeil | founder: **never Sales / Sales Lead** |

- **"Sumeet"**: does NOT exist in any seed source or the live roster — no
  action taken; if a Sumeet appears anywhere it is a Dandelion-class external
  seed, not a member. (Rule: do not invent.)
- **Zephyr / Davy**: deliberate identity-safety TEST fixtures
  (`otzar-live-workos-identity.spec.ts` proves unknown names never match).
  Their live smoke residue was cleaned this pass through product APIs:
  **5 Dandelion seeds rejected** (reason recorded) + **5 team-work items
  CANCELLED** (audit-retained, hidden from all work surfaces); post-check: 0
  visible. The spec fixtures themselves stay — they are the no-wrong-match
  proof.

## Founder model corrections (the operating model, captured)

1. **Dandelion / Organization Seeding** = discovering people/context from the
   org's workstream (meetings, calls, docs, messages) — external participants
   become reviewable seeds (invite as member / keep as external contact /
   ignore / request approval). It is NOT tools/access setup. Onboarding
   converts approved seeds into members/twins/tools/access.
2. **AI twins** = portable work identity: how the human works, methods,
   skills, training — never employer raw data. Twin mapping must read as
   "Sadeil's Otzar Twin · Founder/Admin · Leadership", with role-template-
   derived capabilities, tools, approval requirements.
3. **Member creation** must place a person in the org: email/name/title/
   department/manager/role template/admin status/twin creation/tool package/
   onboarding path — Salesforce-grade admin flow, AI-native.
4. **Access Control + Access Grants** = ONE area (org defaults → role
   defaults → user overrides → twin permissions → audit).
5. **Data & Knowledge** = the governed Data-360 layer: raw → normalized →
   entity-resolved → curated → permissioned → used by twins/reports/policies
   → feedback loop. Retention belongs here.
6. **Action Center** is THE human "needs me" surface; Approvals/Review
   surfaces must not duplicate it (admin policy oversight stays separate).
7. **Talk to Otzar** is the shortcut command surface (approve/edit/reroute/
   teach/correct hierarchy...) — actions belong there, not in new pages.
8. **Policies** grow toward compliance/regulator data-sharing (governed,
   auditable, API-mediated) — structurally correct now, honestly future.
9. **Voice** is a branded built-in, not an admin connector concept.
10. **Reports** (hierarchy-aware rollups, pushed up) ≠ **Work Health**
    (individual "how am I doing"). Never confuse them.
11. **Memory / Digital Work Wallet** = insight + portable identity, not a
    permission-control page.
12. **Ambient visual system** must be real across the shell and key surfaces
    (frosted layers, stateful borders/glow tied to presence), not orb-only.
13. **Blind spots**: urgent ones surface where the human already looks
    (Home/Action Center); the page is the detail view, not the only door.
14. **Screen/workflow observation + Zoom ingestion**: future, permissioned,
    transparent; documented before built; never claimed early.

## Phase-1 results (this pass)

- 10 live role/department/manager corrections (audited: `55d56036…fdd26ae4`).
- Fixture residue cleaned via product APIs (above).
- **Section-25 Home/Needs-Me mismatch FIXED**: the Home headline counts
  `intelligence.suggestions`, which were rendered NOWHERE. The counted items
  now render as deep links inside the same "What changed" panel, from the
  same response object — claim and items cannot diverge. Tests added.

## Next phases (queued, in order)

Phase 2 admin People model (invite flow + twin creation + role templates) ·
Phase 3 IA consolidation (nav decision table → Access consolidation,
Seeding/Dandelion reframe, employee nav cleanup) · Phase 4 Data 360 + Memory ·
Phase 5 ambient visual system across the shell · Phase 6 future capabilities
(Zoom ingestion, workflow observation, Agent Playground scenarios, regulator
policies) as docs first.
