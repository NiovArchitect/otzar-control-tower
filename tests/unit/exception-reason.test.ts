// FILE: exception-reason.test.ts
// PURPOSE: Unit tests for exception-only reason tags (Path E/F).
// CONNECTS TO: src/lib/work-os/exception-reason.ts

import { describe, expect, it } from "vitest";
import {
  explainActionException,
  isExceptionOnlyItem,
} from "@/lib/work-os/exception-reason";
import type { SafeActionView } from "@/lib/types/foundation";

function action(partial: Partial<SafeActionView>): SafeActionView {
  return {
    action_id: "00000000-0000-4000-8000-000000000001",
    action_type: "RECORD_CAPSULE",
    status: "SUCCEEDED",
    risk_tier: "LOW",
    requires_approval: false,
    created_at: "2026-07-28T00:00:00.000Z",
    updated_at: "2026-07-28T00:00:00.000Z",
    ...partial,
  } as SafeActionView;
}

describe("explainActionException", () => {
  it("does not treat SUCCEEDED low-risk PATH B as an exception", () => {
    const e = explainActionException(
      action({ status: "SUCCEEDED", risk_tier: "LOW", action_type: "RECORD_CAPSULE" }),
    );
    expect(e.is_exception).toBe(false);
    expect(e.autonomy_path).toBe("B");
    expect(isExceptionOnlyItem(action({ status: "SUCCEEDED" }))).toBe(false);
  });

  it("marks high-risk dual-control pending as Path F exception", () => {
    const e = explainActionException(
      action({
        status: "PROPOSED",
        risk_tier: "HIGH",
        action_type: "PROPOSE_PERMISSION_GRANT",
        escalation_id: "00000000-0000-4000-8000-000000000099",
      }),
    );
    expect(e.is_exception).toBe(true);
    expect(e.reason_tag).toBe("Dual control required");
    expect(e.why_you_are_needed).toMatch(/high-stakes/i);
    expect(e.autonomy_path).toBe("F");
  });

  it("marks stuck PROPOSED without escalation as owner/route exception", () => {
    // exactOptionalPropertyTypes: omit escalation_id rather than set undefined
    const e = explainActionException(
      action({
        status: "PROPOSED",
        risk_tier: "MEDIUM",
      }),
    );
    expect(e.is_exception).toBe(true);
    expect(e.reason_tag).toBe("Owner unclear");
    expect(e.why_you_are_needed).toMatch(/owner/i);
  });

  it("surfaces FAILED as material correction exception", () => {
    const e = explainActionException(action({ status: "FAILED" }));
    expect(e.is_exception).toBe(true);
    expect(e.reason_tag).toBe("Material correction");
  });
});
