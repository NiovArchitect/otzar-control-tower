// FILE: tests/unit/contextual-work-surfaces.test.ts
// PURPOSE: C-04 — contextual work surface contract.

import { describe, expect, it } from "vitest";
import {
  assertAllKindsContextual,
  C04_LEGACY_REDIRECTS,
  CONTEXTUAL_WORK_SURFACES,
  contextualSurfaceFingerprint,
  hostPathForKind,
  isLegacyContextualPath,
  legacyRedirectTarget,
  surfaceForKind,
} from "@/lib/nav/contextual-work-surfaces";
import { EMPLOYEE_REDIRECTS } from "@/lib/nav/route-inventory";

describe("C-04 contextual work surfaces", () => {
  it("covers blind spots, corrections, obligations, handoffs, evidence", () => {
    const kinds = CONTEXTUAL_WORK_SURFACES.map((s) => s.kind);
    for (const k of [
      "blind_spots",
      "corrections",
      "obligations",
      "handoffs",
      "evidence",
    ] as const) {
      expect(kinds).toContain(k);
    }
    expect(assertAllKindsContextual()).toEqual([]);
  });

  it("hosts exception kinds under Needs me; open work under My Work", () => {
    for (const s of CONTEXTUAL_WORK_SURFACES) {
      if (s.kind === "open_work") {
        expect(s.hostPath).toBe("/app/my-work");
      } else {
        expect(s.hostPath).toBe("/app/action-center");
      }
      expect(s.hostTestId.length).toBeGreaterThan(0);
    }
    expect(hostPathForKind("blind_spots")).toBe("/app/action-center");
    expect(hostPathForKind("open_work")).toBe("/app/my-work");
    expect(surfaceForKind("handoffs")?.hostTestId).toBe(
      "incoming-handoffs-lane",
    );
  });

  it("legacy blind-spots / approvals redirect to Needs me; my-work stays live", () => {
    expect(isLegacyContextualPath("/app/blind-spots")).toBe(true);
    expect(legacyRedirectTarget("/app/blind-spots")).toBe(
      "/app/action-center",
    );
    // /app/my-work is a live My Work surface (not a Needs me redirect).
    expect(C04_LEGACY_REDIRECTS.some((r) => r.path === "/app/my-work")).toBe(
      false,
    );
    // Inventory redirects include C-04 aliases for blind spots / approvals.
    const paths = EMPLOYEE_REDIRECTS.map((r) => r.path);
    expect(paths).toContain("/app/blind-spots");
    expect(paths).toContain("/app/approvals");
    expect(paths).not.toContain("/app/my-work");
  });

  it("fingerprint is stable", () => {
    expect(contextualSurfaceFingerprint()).toMatch(
      /blind_spots>corrections>obligations>handoffs>evidence/,
    );
  });
});
