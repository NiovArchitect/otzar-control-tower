// FILE: tests/unit/action-classify.test.ts
// PURPOSE: Phase 1285-S — lock the deterministic Action Center classifier:
//          only PROPOSED + a live escalation is actionable; non-actionable /
//          historical / low-risk records are classified + labeled, never
//          counted as needing a decision.
// CONNECTS TO: src/lib/work-os/action-classify.ts.

import { describe, expect, it } from "vitest";
import {
  classifyAction,
  isActionablePending,
  actionClassLabel,
} from "@/lib/work-os/action-classify";
import type { SafeActionView } from "@/lib/types/foundation";

function action(over: Partial<SafeActionView> = {}): SafeActionView {
  return {
    action_id: "a-1",
    status: "PROPOSED",
    action_type: "SEND_INTERNAL_NOTIFICATION",
    risk_tier: "LOW",
    requires_approval: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...over,
  };
}

describe("classifyAction", () => {
  it("PROPOSED + escalation is ACTIONABLE_PENDING", () => {
    expect(classifyAction(action({ status: "PROPOSED", escalation_id: "esc-1" }))).toBe(
      "ACTIONABLE_PENDING",
    );
    expect(isActionablePending(action({ status: "PROPOSED", escalation_id: "esc-1" }))).toBe(true);
    expect(actionClassLabel(action({ status: "PROPOSED", escalation_id: "esc-1" }))).toBe(null);
  });

  it("PROPOSED without escalation is NEEDS_REVIEW (not actionable)", () => {
    const a = action({ status: "PROPOSED" });
    expect(classifyAction(a)).toBe("NEEDS_REVIEW");
    expect(isActionablePending(a)).toBe(false);
    expect(actionClassLabel(a)).toBe("No action needed right now");
  });

  it("FAILED / TIMED_OUT is NEEDS_ATTENTION", () => {
    expect(classifyAction(action({ status: "FAILED" }))).toBe("NEEDS_ATTENTION");
    expect(classifyAction(action({ status: "TIMED_OUT" }))).toBe("NEEDS_ATTENTION");
  });

  it("terminal low-risk internal note is LOW_RISK_INTERNAL_NOTE", () => {
    const a = action({ status: "SUCCEEDED", action_type: "SEND_INTERNAL_NOTIFICATION", risk_tier: "LOW" });
    expect(classifyAction(a)).toBe("LOW_RISK_INTERNAL_NOTE");
    expect(actionClassLabel(a)).toBe("Low-risk internal note");
    // Also matches the DUAL_CONTROL-prefixed form.
    expect(
      classifyAction(
        action({
          status: "REJECTED",
          action_type: "DUAL_CONTROL:ACTION_CREATE_SEND_INTERNAL_NOTIFICATION",
          risk_tier: "LOW",
        }),
      ),
    ).toBe("LOW_RISK_INTERNAL_NOTE");
  });

  it("SUCCEEDED non-note is HISTORICAL_EXECUTED", () => {
    const a = action({ status: "SUCCEEDED", action_type: "RECORD_CAPSULE", risk_tier: "LOW" });
    expect(classifyAction(a)).toBe("HISTORICAL_EXECUTED");
    expect(actionClassLabel(a)).toBe("Already handled");
  });

  it("in-flight / other terminal is NON_ACTIONABLE", () => {
    expect(classifyAction(action({ status: "APPROVED" }))).toBe("NON_ACTIONABLE");
    expect(classifyAction(action({ status: "RUNNING" }))).toBe("NON_ACTIONABLE");
    expect(
      classifyAction(action({ status: "CANCELLED", action_type: "RECORD_CAPSULE", risk_tier: "MEDIUM" })),
    ).toBe("NON_ACTIONABLE");
  });

  it("no class label contains an em dash (recipient-facing copy)", () => {
    const statuses: SafeActionView["status"][] = [
      "PROPOSED",
      "SUCCEEDED",
      "FAILED",
      "CANCELLED",
    ];
    for (const status of statuses) {
      const label = actionClassLabel(action({ status }));
      if (label !== null) expect(label).not.toContain("—");
    }
  });
});
