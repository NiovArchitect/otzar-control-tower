// FILE: live-role-brief.test.ts
// PURPOSE: Live role brief composer prefers API truth over static copy.

import { describe, expect, it } from "vitest";
import { composeLiveRoleBrief, formatMinutesAsClock } from "@/lib/demo/live-role-brief";

describe("composeLiveRoleBrief", () => {
  it("uses live recommendation title for outcome", () => {
    const b = composeLiveRoleBrief({
      personaKey: "organization_lead",
      dgi: {
        open_active_work_titles: [
          "Casey: complete remaining security controls",
          "Current recommendation: conditional interview for HelioGrid",
        ],
        next_best_step: { safe_title: "Continue work", reason: "Open items" },
      },
      workItems: [
        {
          title: "Current recommendation: conditional interview for HelioGrid",
          status: "PROPOSED",
          ledger_type: "TASK",
        },
      ],
      collabs: [
        {
          state: "COMPLETED",
          request_type: "CONTEXT_REQUEST",
          safe_summary: "Confirm security checklist status for HelioGrid gate.",
        },
      ],
    });
    expect(b.outcome.source).toBe("live_dgi");
    expect(b.outcome.text.toLowerCase()).toMatch(/conditional interview|recommendation/);
    expect(b.otzarHandled.source).toBe("live_collab");
    expect(b.otzarHandled.text).toMatch(/security checklist/i);
    expect(b.aiTeammateNow.source).not.toBe("static_fallback");
    expect(b.liveFieldCount).toBeGreaterThanOrEqual(4);
  });

  it("Casey needs you prefers live security work", () => {
    const b = composeLiveRoleBrief({
      personaKey: "security_lead",
      dgi: {
        open_active_work_titles: [
          "Casey: complete remaining security controls before interview invite",
        ],
      },
      workItems: [
        {
          title: "Casey: complete remaining security controls before interview invite",
          status: "DETECTED",
          ledger_type: "TASK",
        },
      ],
      collabs: [
        {
          state: "ACCEPTED",
          request_type: "CONTEXT_REQUEST",
          safe_summary: "Ava AI Teammate requests security-gate status",
        },
      ],
    });
    expect(b.needsYou.source).toBe("live_work");
    expect(b.needsYou.text).toMatch(/security/i);
    expect(b.aiTeammateNow.source).toBe("live_collab");
    expect(b.aiTeammateNow.text.toLowerCase()).not.toMatch(
      /^(assisting you|helping the team|staying ready|collaborating)$/,
    );
  });

  it("honest idle when no work or collab", () => {
    const b = composeLiveRoleBrief({
      personaKey: "contractor",
      dgi: { open_active_work_titles: [] },
      workItems: [],
      collabs: [],
    });
    expect(b.aiTeammateNow.source).toBe("honest_idle");
  });

  it("formatMinutesAsClock", () => {
    expect(formatMinutesAsClock(540)).toBe("9:00 AM");
    expect(formatMinutesAsClock(1050)).toBe("5:30 PM");
  });
});
