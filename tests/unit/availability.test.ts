// FILE: tests/unit/availability.test.ts
// PURPOSE: Phase 1271 — lock the pure free/busy → candidate-window
//          helpers that back the MeetingProposalCard. Proves the card's
//          availability summary is computed from real busy intervals
//          (gaps merged, short gaps excluded, fully-booked = empty), and
//          never fabricated.

import { describe, expect, it } from "vitest";
import {
  tomorrowWorkWindow,
  freeWindowsFromBusy,
  DEFAULT_MEETING_MINUTES,
} from "../../src/lib/work-os/availability";

describe("tomorrowWorkWindow", () => {
  it("returns a next-day work-hours window as valid RFC3339 instants", () => {
    const now = new Date("2026-06-13T12:00:00Z");
    const w = tomorrowWorkWindow(now);
    // Both ends parse, and the window is ~8h (09:00–17:00 local).
    const span =
      (new Date(w.time_max).getTime() - new Date(w.time_min).getTime()) /
      3_600_000;
    expect(span).toBe(8);
    expect(new Date(w.time_min).getTime()).toBeGreaterThan(now.getTime());
    // RFC3339 (toISOString → Z), which the backend accepts.
    expect(w.time_min.endsWith("Z")).toBe(true);
  });
});

describe("freeWindowsFromBusy", () => {
  it("returns free gaps around busy blocks (>= meeting duration)", () => {
    const busy = [
      { start: "2026-06-14T17:00:00Z", end: "2026-06-14T18:00:00Z" },
    ];
    const free = freeWindowsFromBusy(
      busy,
      "2026-06-14T16:00:00Z",
      "2026-06-14T20:00:00Z",
      30,
    );
    // Gap before (16–17) and after (18–20) the busy block.
    expect(free.length).toBe(2);
  });

  it("merges overlapping busy blocks before computing gaps", () => {
    const busy = [
      { start: "2026-06-14T16:30:00Z", end: "2026-06-14T18:00:00Z" },
      { start: "2026-06-14T17:30:00Z", end: "2026-06-14T19:00:00Z" }, // overlaps
    ];
    const free = freeWindowsFromBusy(
      busy,
      "2026-06-14T16:00:00Z",
      "2026-06-14T20:00:00Z",
      30,
    );
    // One merged block 16:30–19:00 → free 16:00–16:30 (30m, kept) + 19:00–20:00.
    expect(free.length).toBe(2);
  });

  it("returns empty (fully booked) when no gap fits the duration", () => {
    const busy = [
      { start: "2026-06-14T16:00:00Z", end: "2026-06-14T20:00:00Z" },
    ];
    const free = freeWindowsFromBusy(
      busy,
      "2026-06-14T16:00:00Z",
      "2026-06-14T20:00:00Z",
      30,
    );
    expect(free).toEqual([]);
  });

  it("treats an empty busy list as one fully-free window", () => {
    const free = freeWindowsFromBusy(
      [],
      "2026-06-14T16:00:00Z",
      "2026-06-14T20:00:00Z",
      DEFAULT_MEETING_MINUTES,
    );
    expect(free.length).toBe(1);
  });
});
