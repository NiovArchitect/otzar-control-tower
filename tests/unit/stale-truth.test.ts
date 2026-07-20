// FILE: stale-truth.test.ts
// PURPOSE: B-03 — stale labeling and real next-decision guard.

import { describe, expect, it } from "vitest";
import {
  STALE_AFTER_MS,
  isRealNextDecision,
  isResolvedStatus,
  isStaleOpenWork,
  staleLabel,
} from "@/lib/today/stale-truth";

describe("B-03 stale-truth", () => {
  const now = Date.parse("2026-07-20T12:00:00.000Z");

  it("labels open work older than 7 days as stale", () => {
    const old = new Date(now - STALE_AFTER_MS - 1000).toISOString();
    expect(isStaleOpenWork(old, now)).toBe(true);
    expect(staleLabel(old, now)).toBe("Stale — still open, needs a decision");
  });

  it("fresh work is not stale", () => {
    const fresh = new Date(now - 60_000).toISOString();
    expect(isStaleOpenWork(fresh, now)).toBe(false);
    expect(staleLabel(fresh, now)).toBeNull();
  });

  it("IDLE_HEALTHY is not a real next decision", () => {
    expect(isRealNextDecision("IDLE_HEALTHY")).toBe(false);
    expect(isRealNextDecision("ADVANCE_OBLIGATION")).toBe(true);
  });

  it("resolved statuses leave open surfaces", () => {
    expect(isResolvedStatus("SUCCEEDED")).toBe(true);
    expect(isResolvedStatus("COMPLETED")).toBe(true);
    expect(isResolvedStatus("PENDING")).toBe(false);
  });
});
