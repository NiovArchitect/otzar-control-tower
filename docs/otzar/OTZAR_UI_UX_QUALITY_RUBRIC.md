# Otzar UI/UX quality rubric

**Status:** v1 (2026-07-01, Fable 5 session). Doctrine-derived from
`AMBIENT_WORK_OS_PRODUCT_DOCTRINE.md`, the PRD set (PRD-00…06), and the deep
smoke matrix. External-resource enrichment (UI-UX-Pro-Max skill, 21st.dev
patterns) is a labeled TODO pending the safety review of those sources — this
rubric makes no claims about them.

**How to use:** score every surface 0–2 per axis (0 = fails, 1 = partial,
2 = meets). A surface ships at ≥26/30 with no axis at 0. Judgments must cite
observed behavior (screenshot, test, or live probe) — never intent.

## The fifteen axes

| # | Axis | 2 looks like | 0 looks like |
|---|---|---|---|
| 1 | **Future-facing ambient presence** | The surface feels attended: frosted layers, calm stateful glow (presence-ring palette), motion only when Otzar is genuinely working | Static admin chrome; glow/decoration detached from real state |
| 2 | **Admin IA clarity** | The 8-section grouped nav answers "where do I do X?" in one hop; every page states purpose in its first line | Flat link lists; pages that need explaining |
| 3 | **Hierarchy understandability** | People are shown with role/department/manager; the reporting structure is visible AND editable (ReportingCard); names + emails, never ids | A flat user table; hierarchy implied but not operable |
| 4 | **Tools/connectors clarity** | Each connection answers: what it gives Otzar, read-only vs posting, who authorized, what work it unblocks | Type codes, binding ids, credential jargon in the main flow |
| 5 | **RBAC/ABAC policy visibility** | Who-can-do-what is stated in sentences where actions live ("Only organization admins can…") | Silent 403s; controls that render for people who can't use them |
| 6 | **Notifications & presence** | The right person sees the right event on the right surface; unread state is calm and truthful; the sender carries role context | Broadcast noise, or invisible events |
| 7 | **ETL/data-flow visibility** | Every work item shows where it came from (source evidence), where it's going (lane + next action), and its proof trail (View/Why) | Rows with no provenance or destination |
| 8 | **Empty states** | Honest and directive: what this will show, and the one action to get there | Blank panels; fake placeholder data |
| 9 | **Button/action clarity** | Labels say what happens ("Connect Slack posting", "Save reporting"); every rendered control is live | Generic labels ("Submit"), dead or unrendered affordances |
| 10 | **No developer lingo** | findBackendTermLeak-clean copy; raw enums/ids only inside "Advanced details" | binding/env-var/RUNTIME_READY/C-codes in normal flow |
| 11 | **Accessibility** | Labeled inputs (aria/htmlFor), keyboard-reachable controls, sufficient contrast on state colors | Icon-only mystery buttons; color as the only signal |
| 12 | **Responsive behavior** | The orb/dock stays non-blocking at all sizes (safe-area aware); tables degrade to readable cards | Overlapping CTAs; horizontal scroll traps |
| 13 | **Visual hierarchy** | One primary action per view; attention lanes outrank silent ones; counts on section headers | Equal-weight walls (the 222-item backlog anti-pattern) |
| 14 | **Motion/state feedback** | In-flight, success, and failure each have a distinct calm state; drag ≠ click; presence arc request→thinking→routed→done | Spinners with no outcome; success claimed on failure |
| 15 | **Trust/safety/audit communication** | Governed actions say so ("every send goes through approval"); outcomes cite the audit trail; secrets stated as never shown | Silent writes; unverifiable claims |

## Current scores (evidence-based, 2026-07-01)

Scored against the deployed app + smoke matrix evidence. Cited gaps are the
work queue, not commentary.

- **Employee ambient surfaces** (AmbientWorkSurface, orb/dock, My Work,
  Blind Spots): **26/30.** Strong on 1/7/9/10/14/15 (presence palette
  unit-locked; routing lanes + View/Why live; copy gate green; drag≠click
  live-proven). Partial: 11 (no automated a11y check in gates), 12 (admin
  tables on small screens), 13 (Team Work still uncapped/untriaged).
- **Admin People & hierarchy** (Members + ReportingCard): **26/30** post-HIER.
  Partial: 3 (no tree/org-chart view — table only), 6 (no notification to the
  affected member on reporting change), 11.
- **Tools & Connections**: **25/30** post-P0F. Partial: 4 (org vs personal vs
  teammate connection classes not yet distinguished — personal connections
  don't exist and must not be faked), 5 (disconnect policy is admin-only by
  code, not by stated org policy), 12.
- **Onboarding wizard**: **22/30.** De-jargoned this pass; still long,
  step-dense, and desk-bound (20 stub-ish markers audited); needs the
  top-down restructure treatment.
- **Preview/link-hub pages** (Billing, Reports, Retention): **honest but
  low-value** — correctly labeled previews; candidates for demotion into
  their parent sections rather than top-level nav slots.

## Standing anti-patterns (never ship)

1. Glow or motion not driven by the presence store.
2. A rendered control that does nothing (or a computed action never rendered).
3. Counts that don't match the backing query.
4. Copy that names the implementation instead of the outcome.
5. An equal-weight list longer than ~25 items with no triage order.
6. A claim of "connected/done/sent" without a governed receipt behind it.
