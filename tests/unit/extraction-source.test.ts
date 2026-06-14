// FILE: tests/unit/extraction-source.test.ts
// PURPOSE: Phase 1278 — lock the HONEST extraction-source label. Python
//          enrichment is claimed ONLY when the worker is HEALTHY; every
//          other status is named as deterministic fallback. No fake green.

import { describe, expect, it } from "vitest";
import {
  extractionSourceLabel,
  pythonEnrichmentApplied,
} from "../../src/lib/work-os/extraction-source";

describe("extractionSourceLabel", () => {
  it("claims Python enrichment ONLY when the worker is HEALTHY", () => {
    expect(extractionSourceLabel("HEALTHY")).toBe("Python enrichment used");
  });

  it("names deterministic fallback for every non-healthy status", () => {
    for (const s of ["NOT_CONFIGURED", "DISABLED", "UNHEALTHY", "CONFIGURED_UNVERIFIED", null] as const) {
      expect(extractionSourceLabel(s)).toMatch(/Deterministic extraction/i);
      expect(extractionSourceLabel(s)).not.toMatch(/Python enrichment used/i);
    }
  });

  it("pythonEnrichmentApplied is true only for HEALTHY", () => {
    expect(pythonEnrichmentApplied("HEALTHY")).toBe(true);
    for (const s of ["NOT_CONFIGURED", "DISABLED", "UNHEALTHY", null] as const) {
      expect(pythonEnrichmentApplied(s)).toBe(false);
    }
  });
});
