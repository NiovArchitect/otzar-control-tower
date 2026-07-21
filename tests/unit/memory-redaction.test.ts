// FILE: tests/unit/memory-redaction.test.ts
// PURPOSE: H-02 — redaction stress corpus + live scan.

import { describe, expect, it } from "vitest";
import {
  H02_REDACTION_DOCTRINE,
  REDACTION_STRESS_CORPUS,
  SAFE_PREFERENCE_SAMPLES,
  safeSamplesAllAccepted,
  scanPreferencesForUnsafePlain,
  stressCorpusAllRejected,
} from "@/lib/work-os/memory-redaction";
import { isSafePortablePlain } from "@/lib/work-os/portable-core";

describe("H-02 memory redaction stress", () => {
  it("documents doctrine and ≥10 corpus classes", () => {
    expect(H02_REDACTION_DOCTRINE).toMatch(/never raw confidential|reusable memory/i);
    expect(REDACTION_STRESS_CORPUS.length).toBeGreaterThanOrEqual(10);
  });

  it("rejects every stress corpus sample", () => {
    const r = stressCorpusAllRejected();
    expect(r.ok).toBe(true);
    expect(r.leaked).toEqual([]);
    for (const row of REDACTION_STRESS_CORPUS) {
      expect(isSafePortablePlain(row.sample), row.id).toBe(false);
    }
  });

  it("accepts safe method preference samples", () => {
    const r = safeSamplesAllAccepted();
    expect(r.ok).toBe(true);
    expect(SAFE_PREFERENCE_SAMPLES.length).toBeGreaterThanOrEqual(3);
  });

  it("scans live preference bags for unsafe portable plain", () => {
    const clean = scanPreferencesForUnsafePlain([
      { correction_id: "1", plain: "Prefer bullets", ownership: "portable" },
      {
        correction_id: "2",
        plain: "Contains customer secret about Acme",
        ownership: "portable",
      },
      {
        correction_id: "3",
        plain: "Salary band confidential internal",
        ownership: "org_bound",
      },
    ]);
    expect(clean.unsafe).toBe(1);
    expect(clean.unsafe_ids).toEqual(["2"]);
    expect(clean.clean).toBe(false);
    expect(
      scanPreferencesForUnsafePlain([
        { correction_id: "a", plain: "Draft before send", ownership: "portable" },
      ]).clean,
    ).toBe(true);
  });
});
