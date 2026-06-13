// FILE: tests/unit/timezone.test.ts
// PURPOSE: Phase 1274 — lock the pure timezone interpretation used by
//          scheduling. "PST" → Pacific Time (season-neutral display),
//          explicit time formats honestly, unknown labels never fake a
//          zone.

import { describe, expect, it } from "vitest";
import {
  interpretTimezoneLabel,
  formatProposedTime,
  formatClock,
  displayForIana,
} from "../../src/lib/work-os/timezone";

describe("interpretTimezoneLabel", () => {
  it("maps PST/PT/PDT to Pacific Time (America/Los_Angeles)", () => {
    for (const l of ["pst", "PST", "pt", "pdt"]) {
      const r = interpretTimezoneLabel(l);
      expect(r?.iana).toBe("America/Los_Angeles");
      expect(r?.display).toBe("Pacific Time");
    }
  });

  it("maps ET/EST to Eastern Time", () => {
    expect(interpretTimezoneLabel("et")?.display).toBe("Eastern Time");
    expect(interpretTimezoneLabel("est")?.iana).toBe("America/New_York");
  });

  it("returns null for an unknown label (never fabricates a zone)", () => {
    expect(interpretTimezoneLabel("zzz")).toBeNull();
    expect(interpretTimezoneLabel(undefined)).toBeNull();
  });
});

describe("formatClock + formatProposedTime", () => {
  it("formats 24h to 12h", () => {
    expect(formatClock("11:00")).toBe("11:00 AM");
    expect(formatClock("14:30")).toBe("2:30 PM");
    expect(formatClock("00:00")).toBe("12:00 AM");
  });

  it("appends the interpreted timezone display, or just the clock when unknown", () => {
    expect(formatProposedTime("11:00", "pst")).toBe("11:00 AM Pacific Time");
    expect(formatProposedTime("11:00", undefined)).toBe("11:00 AM");
    expect(formatProposedTime("11:00", "zzz")).toBe("11:00 AM");
  });
});

describe("displayForIana", () => {
  it("gives a friendly name for known zones; raw id otherwise; 'unknown' for null", () => {
    expect(displayForIana("America/Los_Angeles")).toBe("Pacific Time");
    expect(displayForIana("Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(displayForIana(null)).toBe("unknown");
  });
});
