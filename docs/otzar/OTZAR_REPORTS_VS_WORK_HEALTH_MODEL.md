# Otzar Reports vs Work Health model

**1. Customer story.** "As a manager, I want accurate team reports pushed up
the hierarchy. As an employee, I want personal work health that helps ME
improve — never confused with manager reports."

**2. Desired feeling.** Manager: "I see my team truthfully without asking."
Employee: "this is a mirror for me, not a scorecard about me."

**3. Automatic:** Reports roll curated work data up REAL manager edges
(individual → team → department → org); Work Health derives personal insight
(delivery, blockers, commitments, focus, follow-through) from the person's
own ledger.

**4. Ask the human:** nothing for defaults; admins configure what rolls up
and who may see individual-level detail (policy, not hardcoded).

**5. Data inputs:** the ONE WorkLedger (curated), goals, hierarchy edges,
execution attempts/receipts. **Never invented metrics.**

**6. ETL path:** curated work data → hierarchy-aware aggregation (manager
edges now REAL — seeded and admin-operable) → permission filter (a manager
sees their subtree only) → report views → audit of access. Work Health: same
source, self-scope only.

**7. Permissions:** managers see their reports' rollups per policy;
executives see org/department rollups; employees see ONLY their own Work
Health; individual detail inside team reports is policy-gated.

**8. Routing:** report-worthy anomalies (stale team work, blocked clusters)
route to the manager's attention (Team Work / Action Center), not buried in
a chart.

**9. Audit/proof:** every rollup traceable to ledger rows; report access
audited.

**10. Feedback loop:** "this metric is wrong" corrections trace to source
rows; disputes become identity/status corrections, improving the ledger.

**11. Shipped today (grep-verified):**
- **Work Health EXISTS and is honest**: `OperationalHealth.tsx` ("Work
  health" in employee More) on `GET /work-os/operational-health` (advisory
  execution-health, Phase 1285-Z) + `GET /work-os/risk/assessment` — real,
  self-scoped, advisory-labeled.
- **Reports is an honest link-hub** (no fake analytics — verified in the
  admin IA audit) routing to real surfaces.
- Hierarchy rollup PREREQUISITE is now real: manager edges live (9 edges,
  3 departments) + Team Work manager gate + pagination.

**12. Not shipped:** hierarchy-aware aggregation itself (team/department
rollups computed over manager edges); executive org rollups; policy-gated
individual detail; any charting of curated metrics. **No analytics are
claimed that don't exist** — the Reports page stays a link-hub until rollups
are real.

**13. Safe first slice:** ONE manager rollup on Team Work — "Your team this
week: N completed · N blocked · N waiting on approval · oldest stale item"
computed from the already-paginated team-work data + manager edges, with
each number deep-linking to the filtered list. No new tables, no charts, no
fake precision.
