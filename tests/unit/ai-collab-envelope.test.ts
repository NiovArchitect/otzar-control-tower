// FILE: tests/unit/ai-collab-envelope.test.ts
// PURPOSE: L-01 — AI↔AI collaboration envelope: fail closed, audited.

import { describe, expect, it } from "vitest";
import {
  AI_COLLAB_ENVELOPE_DOCTRINE,
  AI_COLLAB_FAIL_CLOSED,
  AI_COLLAB_NEVER,
  claimsSilentAiCollab,
  classifyEnvelopeState,
  isAiToAiTarget,
  labelEnvelopeBlockedReason,
  resolveCollabTarget,
} from "@/lib/work-os/ai-collab-envelope";

describe("L-01 AI collab envelope", () => {
  it("classifies blocked as fail closed", () => {
    const c = classifyEnvelopeState({
      state: "BLOCKED",
      blocked_reason: "CROSS_ORG_DENIED",
    });
    expect(c.outcome).toBe("blocked");
    expect(c.fail_closed).toBe(true);
    expect(c.audited).toBe(true);
    expect(c.reason_label).toMatch(/Outside your organization/i);
  });

  it("classifies needs approval honestly", () => {
    const c = classifyEnvelopeState({
      state: "NEEDS_APPROVAL",
      requires_approval: true,
    });
    expect(c.outcome).toBe("needs_approval");
    expect(c.fail_closed).toBe(false);
  });

  it("classifies unknown state as fail closed", () => {
    const c = classifyEnvelopeState({ state: "WEIRD" });
    expect(c.outcome).toBe("fail_closed");
    expect(c.fail_closed).toBe(true);
  });

  it("resolves human vs AI Teammate targets", () => {
    expect(resolveCollabTarget({ kind: "human", entityId: "e1" })).toEqual({
      target_type: "EMPLOYEE",
      target_entity_id: "e1",
    });
    expect(
      resolveCollabTarget({ kind: "ai_teammate", entityId: "t1" }),
    ).toEqual({
      target_type: "EMPLOYEE_TWIN",
      target_twin_entity_id: "t1",
    });
  });

  it("detects AI-to-AI targets", () => {
    expect(isAiToAiTarget("EMPLOYEE_TWIN")).toBe(true);
    expect(isAiToAiTarget("EMPLOYEE", true)).toBe(true);
    expect(isAiToAiTarget("EMPLOYEE", false)).toBe(false);
  });

  it("states doctrine and never-list; rejects silent claims", () => {
    expect(AI_COLLAB_ENVELOPE_DOCTRINE).toMatch(/fail closed|audited|policy/i);
    expect(AI_COLLAB_FAIL_CLOSED).toMatch(/blocks/i);
    expect(AI_COLLAB_NEVER.length).toBeGreaterThanOrEqual(3);
    expect(claimsSilentAiCollab("silent twin actions")).toBe(true);
    expect(claimsSilentAiCollab(AI_COLLAB_ENVELOPE_DOCTRINE)).toBe(false);
    expect(labelEnvelopeBlockedReason("TARGET_NOT_FOUND")).toMatch(
      /fail closed/i,
    );
  });
});
