// FILE: tests/unit/defect-regression.test.ts
// PURPOSE: R-02 — defect→regression catalog + coverage math.

import { describe, expect, it } from "vitest";
import {
  DEFECT_REGRESSION_CATALOG,
  R02_DOCTRINE,
  R02_PROCESS_RESIDUAL,
  REGRESSION_PROCESS_STEPS,
  catalogCoverageSummary,
  coveredEntries,
  entryById,
} from "@/lib/org/defect-regression";

describe("R-02 defect→regression", () => {
  it("states doctrine and 5 process steps", () => {
    expect(R02_DOCTRINE).toMatch(/regression coverage/i);
    expect(REGRESSION_PROCESS_STEPS.map((s) => s.id)).toEqual([
      "capture",
      "fix",
      "suite",
      "catalog",
      "reprove",
    ]);
    expect(R02_PROCESS_RESIDUAL).toMatch(/not shipped|automation/i);
  });

  it("catalog has ≥8 defects with suite mappings", () => {
    expect(DEFECT_REGRESSION_CATALOG.length).toBeGreaterThanOrEqual(8);
    for (const e of DEFECT_REGRESSION_CATALOG) {
      expect(e.id.length).toBeGreaterThan(3);
      expect(e.regression_suite.length).toBeGreaterThan(5);
      expect(["covered", "partial", "open"]).toContain(e.coverage);
    }
  });

  it("summarizes coverage and requires most P0 covered", () => {
    const s = catalogCoverageSummary();
    expect(s.total).toBe(DEFECT_REGRESSION_CATALOG.length);
    expect(s.covered).toBeGreaterThanOrEqual(6);
    expect(s.p0_covered).toBeGreaterThanOrEqual(4);
    expect(s.coverage_ratio).toBeGreaterThan(0.5);
  });

  it("looks up entries and covered filter", () => {
    expect(entryById("hier-cycle-refuse")?.coverage).toBe("covered");
    expect(entryById("meet-provider-oauth")?.coverage).toBe("open");
    expect(coveredEntries().every((e) => e.coverage === "covered")).toBe(true);
  });
});
