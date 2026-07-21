// FILE: tests/unit/s250-live-cast.test.ts
// PURPOSE: R-03 live cast plan — origin keys + markers; no network.

import { describe, expect, it } from "vitest";
import {
  R03_MARKERS,
  buildLiveCast,
  syntheticEmail,
} from "@/lib/org/synthetic-s250/live-cast";

describe("R-03 live cast plan", () => {
  it("emits durable markers and stable origin keys", () => {
    expect(R03_MARKERS.environment_class).toBe("SYNTHETIC_SCALE");
    expect(R03_MARKERS.never_customer).toBe(true);
    const cast = buildLiveCast({ count: 25, run_version: "testv1", seed: 1 });
    expect(cast).toHaveLength(25);
    expect(cast[0]!.role_title).toMatch(/CEO/i);
    expect(cast[0]!.origin_key).toBe("R03:S250:testv1:0");
    expect(new Set(cast.map((c) => c.origin_key)).size).toBe(25);
    expect(syntheticEmail(cast[0]!.email_local)).toContain("@niovlabs.com");
    expect(cast.some((c) => c.kind === "contractor")).toBe(true);
    expect(cast.some((c) => c.kind === "manager")).toBe(true);
  });

  it("is deterministic for same seed", () => {
    const a = buildLiveCast({ count: 10, run_version: "x", seed: 42 });
    const b = buildLiveCast({ count: 10, run_version: "x", seed: 42 });
    expect(a.map((p) => p.origin_key)).toEqual(b.map((p) => p.origin_key));
  });
});
