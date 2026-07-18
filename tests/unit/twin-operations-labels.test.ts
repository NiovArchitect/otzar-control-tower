// FILE: twin-operations-labels.test.ts
// PURPOSE: [GAP-H OPS] Operational truth labels: readiness never fakes
//          "Ready" when requirements are unmodeled; owner work is never
//          presented as twin activity; honest states everywhere; zero raw
//          backend tokens.
// CONNECTS TO: src/lib/labels/twin-operations.ts, src/pages/AITeammates.tsx.

import { describe, expect, it } from "vitest";
import { lastActiveLabel, toolReadinessLabel } from "@/lib/labels/twin-operations";

describe("[GAP-H OPS] toolReadinessLabel", () => {
  it("unmodeled requirements are NEVER 'Ready'", () => {
    const v = toolReadinessLabel({
      status: "not_configured",
      missing_tools: [],
      connected_tools_count: 3,
      required_tools_count: 0,
    });
    expect(v).toBe("Tool requirements not set yet");
    expect(v).not.toContain("Ready");
  });
  it("ready only when the backend says ready", () => {
    expect(
      toolReadinessLabel({
        status: "ready",
        missing_tools: [],
        connected_tools_count: 2,
        required_tools_count: 2,
      }),
    ).toBe("Ready for assigned tools");
  });
  it("missing tools show human names, counts otherwise", () => {
    expect(
      toolReadinessLabel({
        status: "needs_setup",
        missing_tools: [{ tool_key: "slack", label: "Slack" }],
        connected_tools_count: 0,
        required_tools_count: 1,
      }),
    ).toBe("Needs Slack");
    expect(
      toolReadinessLabel({
        status: "needs_setup",
        missing_tools: [
          { tool_key: "slack", label: "Slack" },
          { tool_key: "github", label: "GitHub" },
        ],
        connected_tools_count: 0,
        required_tools_count: 2,
      }),
    ).toBe("Needs Slack, GitHub");
  });
  it("older backends / unknown render honest 'Not set yet'", () => {
    expect(toolReadinessLabel(undefined)).toBe("Not set yet");
  });
});

describe("[GAP-H OPS] lastActiveLabel", () => {
  it("twin activity renders a human recency", () => {
    const v = lastActiveLabel({
      last_active_at: new Date(Date.now() - 3600_000).toISOString(),
      last_activity_label: "Conversation with owner",
      recent_work_count: 2,
      activity_source: "twin",
    });
    expect(v).toMatch(/^Active /);
  });
  it("owner work is labeled as OWNER work — never twin activity", () => {
    const v = lastActiveLabel({
      last_active_at: null,
      last_activity_label: "Owner has recent work",
      recent_work_count: 0,
      activity_source: "owner_work",
    });
    expect(v).toBe("Owner has recent work");
    expect(v.toLowerCase()).not.toContain("twin");
  });
  it("no activity is an honest empty state", () => {
    expect(
      lastActiveLabel({
        last_active_at: null,
        last_activity_label: null,
        recent_work_count: 0,
        activity_source: "none",
      }),
    ).toBe("No twin activity yet");
  });
  it("older backends render honest 'not connected yet'", () => {
    expect(lastActiveLabel(undefined)).toBe("Activity tracking not connected yet");
  });
  it("no raw backend tokens in any label", () => {
    const all = [
      toolReadinessLabel(undefined),
      lastActiveLabel(undefined),
      lastActiveLabel({ last_active_at: null, last_activity_label: null, recent_work_count: 0, activity_source: "none" }),
    ].join(" ");
    for (const banned of ["not_configured", "needs_setup", "owner_work", "activity_source", "connector"]) {
      expect(all).not.toContain(banned);
    }
  });
});
