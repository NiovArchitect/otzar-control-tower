# Otzar admin IA redesign plan

**Status:** v1 (2026-07-01, Fable 5 session). Grounded in the executed admin
IA audit (this pass) + the smoke matrix + the UI/UX quality rubric. This is a
repair queue in priority order, not a rewrite plan — the grouped 8-section IA
skeleton is sound and stays.

## Audit summary (what the sweep actually found)

- **Nav:** 8 grouped sections, 7 stubs honestly hidden behind `comingSoon`
  (VITE_SHOW_COMING_SOON reveals). No dead `href="#"`/empty-onClick buttons
  anywhere in `src/pages` or `src/components`.
- **Wired pages** (API-backed, purpose-clear after the PROD-UX passes): Users
  (+ReportingCard), AI Teammates, Tools & Connections (+SlackWriteSetupCard),
  Organization Seeding (grouped queues), Approvals, Review Center, Access
  Control/Grants, Cohorts, Collaboration Policy, System Health, Voice
  Providers, Voice.
- **Honest previews / link-hubs:** Billing & Entitlements (explicit
  read-only-preview disclaimer), Reports, Retention (route to real surfaces).
- **Deep-audit still owed:** Onboarding (1936L; validation copy de-jargoned
  this pass, structure not yet), AgentPlayground (2271L), Security (1279L).
- **Defect class found:** *missing* wires rather than fake ones — the
  request_setup action computed-but-unrendered (fixed), hierarchy read hiding
  manager edges (fixed), My Work silent truncation (fixed).

## Target top-down IA (mapping, not upheaval)

The directive's 10 sections map onto the existing 8 groups; two get explicit
subsections rather than new nav noise:

1. Organization → Overview (Home, Billing-preview demoted here)
2. People & hierarchy → People & Roles (Users+Reporting, AI Teammates, Seeding, Onboarding)
3. AI teammates → People & Roles subsection (already)
4. Tools & connected accounts → Tools & Connections (Voice providers join here)
5. Access & governance → Policies & Approvals (Access Control/Grants, Policies, Collaboration policy)
6. Work routing → Work Graph & Memory (routing lanes surfaced on items)
7. Approvals → Policies & Approvals (Pending Approvals, Review Center)
8. Notifications → employee shell (inbox) + admin setup-gap alerts (see queue)
9. Audit/proof → Audit & Activity (Security & Audit, Reports)
10. Setup gaps / health → Diagnostics (System Health, Connector Health, blocked-work counts)

## Priority repair queue

**P1 — shipped this pass:** hierarchy authoring (ReportingCard + FND assign
route, live-seeded 9 edges/3 departments); setup deep-link; My Work
pagination; blind-spot triage; FocusHome deletion; Onboarding validation copy.

**P2 — next slices (scoped, testable):**
1. Org-chart view on Members (tree from the same hierarchy read; read-only
   first). Axis 3.
2. Notification on reporting change (member + new manager see "You now report
   to…"; FND event + inbox row). Axis 6.
3. Team Work triage + pagination (replicate the my-work pattern). Axes 12/13.
4. Connection classes on Tools & Connections: label every binding
   "Organization connection" now; personal/team connections stated as "not
   yet available" (never faked). Axis 4.
5. Disconnect policy sentence on every connection card ("Org policy: only
   admins can remove connections") sourced from org settings when the policy
   model lands. Axis 5.
6. Onboarding restructure: collapse to the 3 real acts (org basics → people →
   first tool) with the wizard steps as progressive disclosure. Axes 2/8/13.
7. a11y gate: add vitest-axe (or equivalent) smoke over the top 6 surfaces.
   Axis 11.
8. AgentPlayground + Security deep copy/wiring audit (same method as this
   pass: classify → wire/hide/humanize).

**P3 — needs product decisions first:** org-policy model for employee
self-connect/disconnect (ABAC minimum: org-level policy flags read by the
connections surface); push/email channel; second-tenant isolation proof.

## External resources — risk/fit assessment (2026-07-01, read-only research)

1. **UI-UX-Pro-Max skill** (`nextlevelbuilder/ui-ux-pro-max-skill`, MIT).
   NOT docs-only: ships a Python BM25 search engine, an npm global CLI
   (`uipro`), bash deploy scripts, and GitHub-Actions release automation; the
   claimed `.claude/skills/ui-ux-pro-max/SKILL.md` path was not confirmed in
   the repo listing. **Decision: read-only inspiration, no install.** The
   value for Otzar (design axes, palette/typography discipline, industry
   reasoning) is principle-shaped and is distilled into
   `OTZAR_UI_UX_QUALITY_RUBRIC.md`; installing a global CLI + Python runtime
   adds executable third-party surface for no capability we lack.
2. **CodeRabbit** (GitHub App, docs.coderabbit.ai). Legitimate PR-review
   layer; zero-config default (summary + inline comments in 2–5 min), tunable
   via `.coderabbit.yaml`. Free Pro applies to PUBLIC repos only — ours are
   private (Pro ≈ $24–30/dev/mo). **Decision: recommended as an additional
   review layer, install deferred to the founder** (granting a third-party
   app repo access requires explicit human approval per the safety rules).
   Setup when approved: (a) coderabbit.ai → sign in with GitHub; (b) install
   the GitHub App scoped to `otzar-control-tower` + `niov-foundation` ONLY;
   (c) open/refresh a PR to trigger the first review; (d) optionally commit a
   `.coderabbit.yaml` focusing: dead code, duplicate logic, untested flows,
   auth/RBAC mistakes, cross-org leakage, missing loading/error states,
   connector/account safety, dependency bloat. All findings verified by
   Fable gates before any change lands.
3. **21st.dev.** Community marketplace of React components/templates/themes
   (shadcn-adjacent, publish-your-own model); per-component licensing is not
   uniformly stated. **Decision: do not adopt as a dependency.** Usable as
   read-only inspiration only — Otzar must not look like a template, and the
   ambient doctrine (frosted presence, stateful glow, calm collaboration) is
   already codified in `lib/ambient/presence-ring.ts` + GlassPanel.
