// FILE: tests/unit/calendar-datetime.test.ts
// PURPOSE: N-04 — final agreed datetime normalization + idempotency key.

import { describe, expect, it } from "vitest";
import {
  finalAgreedSummary,
  normalizeSelectedTime,
  resolveRelativeDay,
  zonedWallToUtc,
} from "@/lib/work-os/calendar-datetime";

describe("N-04 normalizeSelectedTime", () => {
  // Fixed "now": 2026-07-20 15:00 UTC (a Monday)
  const NOW = new Date("2026-07-20T15:00:00.000Z");

  it("tomorrow + 11:00 PST produces RFC3339 window and stable key", () => {
    const a = normalizeSelectedTime({
      time24: "11:00",
      when: "tomorrow",
      timezoneLabel: "pst",
      durationMinutes: 30,
      now: NOW,
    });
    expect(a).not.toBeNull();
    if (a === null) return;
    expect(a.iana).toBe("America/Los_Angeles");
    expect(a.timezoneExplicit).toBe(true);
    expect(a.display).toMatch(/11:00 AM Pacific Time/);
    expect(a.start).toMatch(/T11:00:00/);
    expect(a.end).toMatch(/T11:30:00/);
    // Same inputs → same idempotency key
    const b = normalizeSelectedTime({
      time24: "11:00",
      when: "tomorrow",
      timezoneLabel: "pst",
      durationMinutes: 30,
      now: NOW,
    });
    expect(b?.idempotencyKey).toBe(a.idempotencyKey);
  });

  it("today + 2pm ET differs from PST slot", () => {
    const et = normalizeSelectedTime({
      time24: "14:00",
      when: "today",
      timezoneLabel: "et",
      now: NOW,
    });
    const pt = normalizeSelectedTime({
      time24: "14:00",
      when: "today",
      timezoneLabel: "pt",
      now: NOW,
    });
    expect(et?.start).not.toBe(pt?.start);
    expect(et?.display).toMatch(/Eastern/);
    expect(pt?.display).toMatch(/Pacific/);
  });

  it("unknown timezone falls back without fabricating a named zone", () => {
    const r = normalizeSelectedTime({
      time24: "09:00",
      when: "today",
      timezoneLabel: "mars-time",
      now: NOW,
      fallbackIana: "UTC",
    });
    expect(r?.iana).toBe("UTC");
    expect(r?.timezoneExplicit).toBe(false);
  });

  it("invalid clock returns null", () => {
    expect(
      normalizeSelectedTime({ time24: "25:00", when: "today", now: NOW }),
    ).toBeNull();
  });
});

describe("N-04 resolveRelativeDay", () => {
  const NOW = new Date("2026-07-20T15:00:00.000Z"); // Monday UTC
  it("tomorrow advances one day", () => {
    const t = resolveRelativeDay("today", NOW, "UTC");
    const tm = resolveRelativeDay("tomorrow", NOW, "UTC");
    expect(tm.day).toBe(t.day + 1);
  });
});

describe("N-04 finalAgreedSummary", () => {
  it("includes meet link when present", () => {
    const s = finalAgreedSummary({
      display: "11:00 AM Pacific Time · 2026-07-21",
      meetLink: "https://meet.google.com/abc",
      created: true,
    });
    expect(s).toMatch(/Final agreed time/);
    expect(s).toMatch(/meet\.google\.com/);
  });

  it("honest when gated", () => {
    const s = finalAgreedSummary({
      display: "11:00 AM Pacific Time · 2026-07-21",
      created: false,
    });
    expect(s).toMatch(/No event created yet/);
  });
});

describe("N-04 zonedWallToUtc round-trip sanity", () => {
  it("builds a valid Date", () => {
    const d = zonedWallToUtc(2026, 7, 21, 11, 0, "America/Los_Angeles");
    expect(Number.isNaN(d.getTime())).toBe(false);
  });
});
