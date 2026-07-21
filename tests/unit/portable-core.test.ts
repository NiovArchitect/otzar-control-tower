// FILE: tests/unit/portable-core.test.ts
// PURPOSE: H-02 / I-01 — portable core classification + multi-user isolation.

import { describe, expect, it } from "vitest";
import {
  EXPORT_HONESTY,
  NEVER_PORTABLE,
  PORTABLE_CORE_DOCTRINE,
  classifyPreferenceSummary,
  classifyPreferences,
  isSafePortablePlain,
  orgBoundOnly,
  ownershipLabel,
  portableOnly,
  preferencesIsolatedAcrossUsers,
} from "@/lib/work-os/portable-core";

describe("I-01 / H-02 portable core", () => {
  it("classifies [portable] and [org-bound] prefixes", () => {
    expect(classifyPreferenceSummary("[portable] Prefer bullets first")).toEqual({
      plain: "Prefer bullets first",
      ownership: "portable",
    });
    expect(
      classifyPreferenceSummary("[org-bound] Use Acme project template"),
    ).toEqual({
      plain: "Use Acme project template",
      ownership: "org_bound",
    });
    expect(classifyPreferenceSummary("Draft before send")).toEqual({
      plain: "Draft before send",
      ownership: "portable",
    });
  });

  it("splits portable vs org-bound lists", () => {
    const rows = classifyPreferences([
      { correction_id: "1", safe_summary: "[portable] Methods first" },
      { correction_id: "2", safe_summary: "[org-bound] Internal escalation path" },
      { correction_id: "3", safe_summary: "Use numbered steps" },
    ]);
    expect(portableOnly(rows)).toHaveLength(2);
    expect(orgBoundOnly(rows)).toHaveLength(1);
    expect(ownershipLabel("portable")).toMatch(/Portable/i);
    expect(ownershipLabel("org_bound")).toMatch(/Org-bound/i);
  });

  it("isolates multi-user preference fingerprints", () => {
    const a = [
      "Always lead with decision and impact for project briefs",
      "Prefer Google Docs for collaborative drafts",
    ];
    const b = [
      "Send weekly status Fridays",
      "Use calendar holds for deep work blocks",
    ];
    expect(preferencesIsolatedAcrossUsers(a, b)).toBe(true);
    expect(
      preferencesIsolatedAcrossUsers(a, [
        ...b,
        "Always lead with decision and impact for project briefs",
      ]),
    ).toBe(false);
    expect(preferencesIsolatedAcrossUsers([], b)).toBe(true);
  });

  it("rejects confidential markers in portable plain text", () => {
    expect(isSafePortablePlain("Prefer short emails")).toBe(true);
    expect(isSafePortablePlain("Contains customer secret about Acme")).toBe(
      false,
    );
    expect(isSafePortablePlain("export twin now")).toBe(false);
  });

  it("states doctrine and export honesty without claiming shipped export", () => {
    expect(PORTABLE_CORE_DOCTRINE).toMatch(/shape of how you work/i);
    expect(PORTABLE_CORE_DOCTRINE).toMatch(/cannot take the company's work/i);
    expect(EXPORT_HONESTY).toMatch(/not available yet/i);
    expect(EXPORT_HONESTY).not.toMatch(/export now|download your twin/i);
    expect(NEVER_PORTABLE.length).toBeGreaterThanOrEqual(3);
  });
});
