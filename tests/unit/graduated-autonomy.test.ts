// FILE: tests/unit/graduated-autonomy.test.ts
// PURPOSE: M-01 — observe → draft → confirm → execute ladder; preference ≠ authority.

import { describe, expect, it } from "vitest";
import {
  AUTHORITY_LADDER_DOCTRINE,
  LADDER_STAGE_ORDER,
  PREFERENCE_NEQ_AUTHORITY_COPY,
  buildGraduatedAutonomyView,
  ceilingStageForPolicy,
  policyLabelFromMode,
  preferenceRaisesAutonomy,
} from "@/lib/work-os/graduated-autonomy";

describe("M-01 graduated autonomy", () => {
  it("orders observe → draft → confirm → execute", () => {
    expect(LADDER_STAGE_ORDER).toEqual([
      "observe",
      "draft",
      "confirm",
      "execute",
    ]);
  });

  it("maps OBSERVE_ONLY: observe active; execute blocked", () => {
    const v = buildGraduatedAutonomyView("OBSERVE_ONLY");
    expect(v.policy_label).toBe("Observe only");
    expect(v.current_stage_id).toBe("observe");
    expect(v.stages.find((s) => s.id === "observe")?.availability).toBe(
      "active_ceiling",
    );
    expect(v.stages.find((s) => s.id === "execute")?.availability).toBe(
      "blocked",
    );
    expect(v.stages.find((s) => s.id === "confirm")?.availability).toBe(
      "blocked",
    );
  });

  it("maps APPROVAL_REQUIRED: confirm is focus; execute gated", () => {
    const v = buildGraduatedAutonomyView("APPROVAL_REQUIRED");
    expect(v.policy_label).toBe("Approval required");
    expect(v.current_stage_id).toBe("confirm");
    expect(v.stages.find((s) => s.id === "confirm")?.availability).toBe(
      "active_ceiling",
    );
    expect(v.stages.find((s) => s.id === "execute")?.availability).toBe(
      "gated",
    );
    expect(v.stages.find((s) => s.id === "observe")?.availability).toBe(
      "allowed",
    );
  });

  it("maps EXECUTIVE_OVERRIDE: execute is ceiling; still allows confirm", () => {
    const v = buildGraduatedAutonomyView("EXECUTIVE_OVERRIDE");
    expect(v.current_stage_id).toBe("execute");
    expect(v.stages.find((s) => s.id === "execute")?.availability).toBe(
      "active_ceiling",
    );
    expect(v.stages.find((s) => s.id === "confirm")?.availability).toBe(
      "allowed",
    );
    expect(ceilingStageForPolicy("EXECUTIVE_OVERRIDE")).toBe("execute");
  });

  it("never lets preference raise autonomy", () => {
    expect(preferenceRaisesAutonomy()).toBe(false);
    expect(PREFERENCE_NEQ_AUTHORITY_COPY).toMatch(/never move the ladder|never/i);
    expect(AUTHORITY_LADDER_DOCTRINE).toMatch(/observe/i);
    expect(AUTHORITY_LADDER_DOCTRINE).toMatch(/execute/i);
  });

  it("labels unknown policy safely without raw leak in label map", () => {
    expect(policyLabelFromMode("CUSTOM_MODE")).toBe("Custom Mode");
    expect(policyLabelFromMode(null)).toBe("Not set yet");
  });
});
