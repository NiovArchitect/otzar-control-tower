// FILE: tests/unit/time-limited-authority.test.ts
// PURPOSE: M-02 — multi-class time-limited grants; purpose; revocation inventory.

import { describe, expect, it } from "vitest";
import {
  DURATION_CLASS_CATALOG,
  INDEFINITE_NOT_UNLIMITED,
  M02_CORE_FAMILIES,
  REVOCATION_COPY,
  TRANSPARENT_REASON_COPY,
  durationInfo,
  isTimeLimitedDuration,
  isTransparentPurpose,
  summarizeGrants,
} from "@/lib/work-os/time-limited-authority";

describe("M-02 time-limited authority", () => {
  it("catalogs 8 duration classes with families", () => {
    expect(DURATION_CLASS_CATALOG).toHaveLength(8);
    const ids = DURATION_CLASS_CATALOG.map((d) => d.id);
    expect(ids).toContain("ONE_TIME");
    expect(ids).toContain("SESSION");
    expect(ids).toContain("PROJECT_SCOPED");
    expect(ids).toContain("INDEFINITE");
  });

  it("marks one-shot/session/project as time-limited; indefinite not", () => {
    expect(isTimeLimitedDuration("ONE_TIME")).toBe(true);
    expect(isTimeLimitedDuration("SESSION")).toBe(true);
    expect(isTimeLimitedDuration("PROJECT_SCOPED")).toBe(true);
    expect(isTimeLimitedDuration("INDEFINITE")).toBe(false);
    expect(isTimeLimitedDuration("UNTIL_REVOKED")).toBe(false);
    expect(durationInfo("SESSION")?.family).toBe("session");
  });

  it("requires transparent purpose", () => {
    expect(isTransparentPurpose("")).toBe(false);
    expect(isTransparentPurpose("ab")).toBe(false);
    expect(isTransparentPurpose("Draft follow-ups for launch")).toBe(true);
  });

  it("summarizes multi-class inventory", () => {
    const s = summarizeGrants([
      {
        duration_class: "SESSION",
        revocable: true,
        purpose_summary: "Session drafts",
      },
      {
        duration_class: "PROJECT_SCOPED",
        revocable: true,
        purpose_summary: "Project coord",
      },
      {
        duration_class: "INDEFINITE",
        revocable: true,
        purpose_summary: "Standing assist",
      },
      { duration_class: "ONE_TIME", revocable: false, purpose_summary: "" },
    ]);
    expect(s.total).toBe(4);
    expect(s.time_limited_count).toBe(3);
    expect(s.open_ended_count).toBe(1);
    expect(s.revocable_count).toBe(3);
    expect(s.purposes_present).toBe(3);
    expect(s.duration_classes_present).toEqual(
      expect.arrayContaining(["SESSION", "PROJECT_SCOPED", "INDEFINITE", "ONE_TIME"]),
    );
    expect(s.families_present).toEqual(
      expect.arrayContaining(["session", "project", "open_ended", "one_shot"]),
    );
  });

  it("states doctrine for reason, revoke, indefinite honesty", () => {
    expect(TRANSPARENT_REASON_COPY).toMatch(/purpose/i);
    expect(REVOCATION_COPY).toMatch(/revoc/i);
    expect(INDEFINITE_NOT_UNLIMITED).toMatch(/not mean unlimited/i);
    expect(M02_CORE_FAMILIES).toEqual(
      expect.arrayContaining(["one_shot", "session", "project", "time_boxed"]),
    );
  });
});
