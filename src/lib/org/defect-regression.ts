// FILE: defect-regression.ts
// PURPOSE: R-02 — every discovered defect becomes regression coverage.
//          Catalog of pressure/isolation/login defects mapped to live e2e
//          or unit suites; honest residual when automation is incomplete.
// CONNECTS TO: DefectRegressionCard, enterprise-pressure REPAIR_LOOP regress
//          step, FOUNDER R-02.

export const R02_DOCTRINE =
  "Every defect found under pressure, isolation, or first-use must become " +
  "regression coverage — a named suite that would fail if the defect returns. " +
  "Happy-path-only green is not enough; the catalog is the product memory of " +
  "what already broke once.";

export type DefectSeverity = "P0" | "P1" | "P2";
export type DefectCoverage = "covered" | "partial" | "open";

export type DefectRegressionEntry = {
  id: string;
  title: string;
  severity: DefectSeverity;
  /** Where it was discovered (pressure, isolation, login, …). */
  discovered_in: string;
  /** Suite path or id that re-proves the fix. */
  regression_suite: string;
  coverage: DefectCoverage;
  plain: string;
};

/**
 * Seed catalog of defects already proven as regression in live/deep smokes.
 * Expand when pressure finds new defects (R-01 repair → R-02 regress).
 */
export const DEFECT_REGRESSION_CATALOG: readonly DefectRegressionEntry[] = [
  {
    id: "hier-cycle-refuse",
    title: "Hierarchy cycle assign refused",
    severity: "P0",
    discovered_in: "R-01 pressure / hierarchy",
    regression_suite: "otzar-live-enterprise-pressure-r01 + hierarchy-pressure",
    coverage: "covered",
    plain: "Assigning a manager that creates a cycle returns CYCLE — never silent apply.",
  },
  {
    id: "hier-nonadmin-deny",
    title: "Non-admin cannot assign hierarchy",
    severity: "P0",
    discovered_in: "R-01 pressure / RBAC",
    regression_suite: "otzar-live-enterprise-pressure-r01",
    coverage: "covered",
    plain: "Employee hierarchy assign is 401/403 — authoring stays admin-only.",
  },
  {
    id: "hier-foreign-person",
    title: "Foreign person assign not found",
    severity: "P1",
    discovered_in: "hierarchy-pressure API",
    regression_suite: "otzar-live-hierarchy-pressure",
    coverage: "covered",
    plain: "Unknown person entity fails closed (PERSON_NOT_FOUND), no invent-edge.",
  },
  {
    id: "deeplink-block-admin",
    title: "Login never restores admin shells",
    severity: "P0",
    discovered_in: "A-01/A-02 / Q-02 deep-link",
    regression_suite: "otzar-live-cross-tenant-q01 + post-login-destination units",
    coverage: "covered",
    plain: "Sensitive Control Tower paths are not validated deep links after auth.",
  },
  {
    id: "memory-cross-user",
    title: "Personal core does not cross users",
    severity: "P0",
    discovered_in: "H-02 / I-02 / Q-01 isolation",
    regression_suite: "otzar-live-portable-isolation-h02 + multi-org-isolation-i02",
    coverage: "covered",
    plain: "Employee preference fingerprints never appear in another principal's core.",
  },
  {
    id: "no-staged-fakes",
    title: "No staged frontend-only fakes",
    severity: "P0",
    discovered_in: "S-02 / S-01 investor & YC walkthrough",
    regression_suite: "otzar-live-investor-journey-s02 + yc-walkthrough-s01",
    coverage: "covered",
    plain: "Coming-soon / demo-only primary copy fails continuous journeys.",
  },
  {
    id: "org-switch-no-blend",
    title: "Org switch clears blendable client state",
    severity: "P0",
    discovered_in: "A-06 / I-02",
    regression_suite: "otzar-live-org-switch-a06 + multi-org-isolation-i02",
    coverage: "covered",
    plain: "Conversation scope, continuity, surface context, prior route clear on switch.",
  },
  {
    id: "participation-neq-authority",
    title: "Participation is not authority",
    severity: "P1",
    discovered_in: "E-03 person types",
    regression_suite: "otzar-live-person-types-e03",
    coverage: "covered",
    plain: "Contractor/vendor badges never imply elevated permissions.",
  },
  {
    id: "scale-l2-l3-continuous",
    title: "L2/L3 progressive scale continuous",
    severity: "P1",
    discovered_in: "R-01 residual",
    regression_suite: "otzar-live-enterprise-pressure-r01 (L1 proven; L2/L3 residual)",
    coverage: "partial",
    plain: "Harness documents 250→2500 bands; continuous synthetic load needs scale credentials.",
  },
  {
    id: "meet-provider-oauth",
    title: "Meet operational transcripts",
    severity: "P0",
    discovered_in: "N-02 external",
    regression_suite: "EXTERNALLY_BLOCKED — operator OAuth",
    coverage: "open",
    plain: "Cannot auto-regress until Meet scopes are re-authorized by operator.",
  },
] as const;

export function catalogCoverageSummary(
  entries: readonly DefectRegressionEntry[] = DEFECT_REGRESSION_CATALOG,
): {
  total: number;
  covered: number;
  partial: number;
  open: number;
  p0_covered: number;
  p0_total: number;
  coverage_ratio: number;
} {
  const total = entries.length;
  const covered = entries.filter((e) => e.coverage === "covered").length;
  const partial = entries.filter((e) => e.coverage === "partial").length;
  const open = entries.filter((e) => e.coverage === "open").length;
  const p0 = entries.filter((e) => e.severity === "P0");
  const p0_covered = p0.filter((e) => e.coverage === "covered").length;
  return {
    total,
    covered,
    partial,
    open,
    p0_covered,
    p0_total: p0.length,
    coverage_ratio: total === 0 ? 0 : covered / total,
  };
}

/** Process steps for turning a new pressure defect into regression. */
export const REGRESSION_PROCESS_STEPS = [
  {
    id: "capture",
    label: "Capture",
    plain: "Name the defect, severity, and how pressure found it.",
  },
  {
    id: "fix",
    label: "Fix",
    plain: "Ship the product fail-closed or repair path.",
  },
  {
    id: "suite",
    label: "Suite",
    plain: "Add or extend a unit/deep live smoke that fails if the defect returns.",
  },
  {
    id: "catalog",
    label: "Catalog",
    plain: "Register the defect → suite mapping so the catalog stays the source of truth.",
  },
  {
    id: "reprove",
    label: "Re-prove",
    plain: "Run the suite on live after deploy before claiming covered.",
  },
] as const;

export function entryById(
  id: string,
  entries: readonly DefectRegressionEntry[] = DEFECT_REGRESSION_CATALOG,
): DefectRegressionEntry | undefined {
  return entries.find((e) => e.id === id);
}

export function coveredEntries(
  entries: readonly DefectRegressionEntry[] = DEFECT_REGRESSION_CATALOG,
): DefectRegressionEntry[] {
  return entries.filter((e) => e.coverage === "covered");
}

export const R02_PROCESS_RESIDUAL =
  "End-to-end automation (auto-file suite from production incident) is not " +
  "shipped. The catalog + process steps make defect→regression a product " +
  "discipline; continuous expansion when R-01 pressure finds new defects.";
