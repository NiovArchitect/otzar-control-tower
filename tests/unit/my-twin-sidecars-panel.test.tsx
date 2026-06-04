// FILE: tests/unit/my-twin-sidecars-panel.test.tsx
// PURPOSE: Phase 4 PR 2 — component tests for the MyTwinSidecarsPanel.
//          Verifies tiles render only when their sidecar arrives,
//          counts surface honestly, and no raw substrate / surveillance
//          framing leaks into the UI copy.
// CONNECTS TO: src/components/employee/MyTwinSidecarsPanel.tsx.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyTwinSidecarsPanel } from "@/components/employee/MyTwinSidecarsPanel";
import type { MyTwinView } from "@/lib/types/foundation";

function baseTwin(overrides: Partial<MyTwinView> = {}): MyTwinView {
  return {
    twin_id: "t-1",
    display_name: "Atlas",
    role_title: "Engineering Twin",
    autonomy_mode: "APPROVAL_REQUIRED",
    swarm_enabled: false,
    role_template: null,
    is_admin_twin: false,
    status: "ACTIVE",
    skills: [],
    approver: null,
    created_at: "2026-06-01T12:00:00.000Z",
    updated_at: "2026-06-03T12:00:00.000Z",
    ...overrides,
  };
}

describe("MyTwinSidecarsPanel", () => {
  it("renders nothing when no sidecars are present", () => {
    const { container } = render(<MyTwinSidecarsPanel twin={baseTwin()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders pending approvals tile when summary is present", () => {
    render(
      <MyTwinSidecarsPanel
        twin={baseTwin({
          pending_approvals_summary: {
            pending_count: 3,
            most_recent_at: new Date().toISOString(),
          },
        })}
      />,
    );
    expect(
      screen.getByTestId("sidecar-pending-approvals"),
    ).toBeInTheDocument();
    expect(screen.getByText("3 awaiting")).toBeInTheDocument();
  });

  it("renders active authority + personal preferences tiles together", () => {
    render(
      <MyTwinSidecarsPanel
        twin={baseTwin({
          active_authority_summary: {
            active_grant_count: 4,
            expiring_soon_count: 1,
            indefinite_grant_count: 0,
            sensitive_case_by_case_count: 2,
            most_recent_grant_at: null,
            next_expiry_at: null,
            has_revocable_grants: true,
            duration_classes_present: ["SESSION"],
          },
          personal_preferences_summary: {
            active_personal_preferences_count: 2,
            active_tone_preferences_count: 1,
            active_project_preferences_count: 0,
            active_sensitivity_boundaries_count: 0,
            active_approval_preferences_count: 0,
            active_terminology_definitions_count: 0,
            active_ask_before_acting_count: 0,
            last_correction_at: null,
          },
        })}
      />,
    );
    expect(screen.getByTestId("sidecar-active-authority")).toBeInTheDocument();
    expect(screen.getByText("4 grants")).toBeInTheDocument();
    expect(
      screen.getByTestId("sidecar-personal-preferences"),
    ).toBeInTheDocument();
    expect(screen.getByText("3 active")).toBeInTheDocument();
  });

  it("renders voice readiness with honest non-live copy at the Foundation tier", () => {
    render(
      <MyTwinSidecarsPanel
        twin={baseTwin({
          voice_readiness_state: {
            envelope_construction: "LIVE",
            live_audio_input: "NOT_AVAILABLE_AT_FOUNDATION_TIER",
            live_audio_output: "NOT_AVAILABLE_AT_FOUNDATION_TIER",
          },
        })}
      />,
    );
    expect(screen.getByTestId("sidecar-voice-readiness")).toBeInTheDocument();
    expect(
      screen.getByText("Live microphone capture is not enabled at this tier"),
    ).toBeInTheDocument();
  });

  it("never includes surveillance / score language in any tile", () => {
    const { container } = render(
      <MyTwinSidecarsPanel
        twin={baseTwin({
          pending_approvals_summary: {
            pending_count: 1,
            most_recent_at: null,
          },
          recent_action_summary: {
            recent_action_count: 5,
            most_recent_at: null,
          },
          memory_scope_summary: {
            active_scope_count: 2,
            most_recent_at: null,
          },
          active_grants_summary: {
            active_consent_grants_count: 1,
            active_team_delegations_count: 0,
            soonest_expiry_at: null,
          },
          collaboration_inbox_summary: {
            pending_request_count: 0,
            needs_my_approval_count: 0,
            blocked_request_count: 0,
            completed_recent_count: 0,
            most_recent_request_at: null,
          },
          project_context_summary: {
            active_project_count: 1,
            owned_project_count: 1,
            reviewer_project_count: 0,
            member_project_count: 0,
            recent_project_activity_at: null,
          },
        })}
      />,
    );
    const text = container.textContent ?? "";
    // None of these forbidden words should appear anywhere in the panel.
    expect(text).not.toMatch(/surveillance/i);
    expect(text).not.toMatch(/employee score/i);
    expect(text).not.toMatch(/monitoring/i);
    expect(text).not.toMatch(/spy/i);
    expect(text).not.toMatch(/productivity score/i);
  });
});
