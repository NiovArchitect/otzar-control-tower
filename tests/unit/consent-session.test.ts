// FILE: tests/unit/consent-session.test.ts
// PURPOSE: CX-SLICE-5 — the consent/session trust contract: org policy gates
//          everything (employee can't bypass), consent is mandatory to start,
//          the indicator shows ONLY while active, stop moves to review, and
//          review precedes any keep. Nothing here captures — it's the trust
//          model the future observation must satisfy.
import { describe, expect, it } from "vitest";
import {
  completeReview,
  initialSession,
  OBSERVATION_LEARNS,
  OBSERVATION_NEVER,
  OBSERVATION_STATUS_NOTE,
  startSession,
  stopSession,
} from "@/lib/observation/consent-session";

describe("consent-session — org policy gate", () => {
  it("without org enablement, observation is unavailable and cannot start", () => {
    const s = initialSession("not_enabled_by_org");
    expect(s.state).toBe("unavailable");
    // Even with consent, an employee cannot bypass org policy.
    const tried = startSession(s, { consentGiven: true, policy: "not_enabled_by_org" });
    expect(tried.state).toBe("unavailable");
    expect(tried.indicatorVisible).toBe(false);
  });

  it("org-enabled starts idle with no indicator", () => {
    const s = initialSession("enabled_by_org");
    expect(s.state).toBe("idle");
    expect(s.indicatorVisible).toBe(false);
  });
});

describe("consent-session — consent + lifecycle", () => {
  const idle = initialSession("enabled_by_org");

  it("consent is mandatory — no consent, no session", () => {
    const s = startSession(idle, { consentGiven: false, policy: "enabled_by_org" });
    expect(s.state).toBe("idle");
    expect(s.indicatorVisible).toBe(false);
  });

  it("consent + policy → active, and the indicator is visible ONLY then", () => {
    const active = startSession(idle, { consentGiven: true, policy: "enabled_by_org" });
    expect(active.state).toBe("active");
    expect(active.indicatorVisible).toBe(true);
    const stopped = stopSession(active);
    expect(stopped.state).toBe("review");
    expect(stopped.indicatorVisible).toBe(false); // never active after stop
    const done = completeReview(stopped, true);
    expect(done.state).toBe("idle");
    expect(done.indicatorVisible).toBe(false);
  });

  it("review precedes memory — you cannot skip from active straight to keep", () => {
    const active = startSession(idle, { consentGiven: true, policy: "enabled_by_org" });
    // completeReview is a no-op unless in review.
    expect(completeReview(active, true).state).toBe("active");
  });

  it("discard on review keeps nothing and returns to idle", () => {
    const review = stopSession(startSession(idle, { consentGiven: true, policy: "enabled_by_org" }));
    expect(completeReview(review, false).state).toBe("idle");
  });
});

describe("consent-session — honest, non-surveillance copy", () => {
  it("learns METHODS, never company data", () => {
    const learns = OBSERVATION_LEARNS.join(" ");
    const never = OBSERVATION_NEVER.join(" ");
    expect(learns).toMatch(/work methods|writing style|tools|patterns/i);
    expect(never).toMatch(/confidential|raw file|didn't consent/i);
  });

  it("the status note is consent-first and rejects surveillance language", () => {
    expect(OBSERVATION_STATUS_NOTE).toMatch(
      /consent|review|session|never company secrets|never new permissions/i,
    );
    expect(OBSERVATION_STATUS_NOTE).not.toMatch(/track you|monitor you|spy/i);
  });
});

