// FILE: tests/unit/collaboration-workspaces.test.tsx
// PURPOSE: Phase 1221 — locks the CollaborationWorkspaces list page
//          and CollaborationWorkspaceDetail page surfaces: list,
//          create-form, detail sections, language ban.

import { describe, expect, it, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { CollaborationWorkspaces } from "@/pages/app/CollaborationWorkspaces";
import { CollaborationWorkspaceDetail } from "@/pages/app/CollaborationWorkspaceDetail";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "x@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
}

function mockList(
  rows: Array<{
    workspace_id: string;
    title: string;
    description: string | null;
    members: number;
    decisions: number;
    commitments: number;
    open_actions: number;
    completed_actions: number;
    visibility?: "INTERNAL_ONLY" | "EXTERNAL_ALLOWED";
  }>,
): void {
  server.use(
    http.get(`${API_BASE}/otzar/collaboration/workspaces`, () =>
      HttpResponse.json({
        ok: true,
        workspaces: rows.map((r) => ({
          workspace_id: r.workspace_id,
          title: r.title,
          description: r.description,
          status: "ACTIVE",
          visibility: r.visibility ?? "INTERNAL_ONLY",
          source_type: "MANUAL",
          source_conversation_id: null,
          created_by_entity_id: "00000000-0000-0000-0000-000000000001",
          created_at: "2026-06-10T15:00:00.000Z",
          updated_at: "2026-06-10T15:00:00.000Z",
          counts: {
            members: r.members,
            decisions: r.decisions,
            commitments: r.commitments,
            open_actions: r.open_actions,
            completed_actions: r.completed_actions,
          },
        })),
      }),
    ),
  );
}

beforeEach(() => {
  setAuth();
});

describe("CollaborationWorkspaces — list page", () => {
  it("renders the empty state when no workspaces exist", async () => {
    mockList([]);
    render(
      <MemoryRouter>
        <CollaborationWorkspaces />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getByTestId("collaboration-workspaces-empty"),
      ).toBeInTheDocument();
    });
  });

  it("renders a row per workspace with member / decision / commitment counts", async () => {
    mockList([
      {
        workspace_id: "ws-1",
        title: "Launch Collaboration",
        description: "Otzar launch readiness",
        members: 4,
        decisions: 2,
        commitments: 4,
        open_actions: 1,
        completed_actions: 3,
      },
      {
        workspace_id: "ws-2",
        title: "MICE Event Expansion",
        description: null,
        members: 5,
        decisions: 2,
        commitments: 3,
        open_actions: 0,
        completed_actions: 0,
        visibility: "EXTERNAL_ALLOWED",
      },
    ]);
    render(
      <MemoryRouter>
        <CollaborationWorkspaces />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getAllByTestId("collaboration-workspace-row"),
      ).toHaveLength(2);
    });
    expect(screen.getByText("Launch Collaboration")).toBeInTheDocument();
    expect(screen.getByText("MICE Event Expansion")).toBeInTheDocument();
    expect(screen.getByText("External allowed")).toBeInTheDocument();
  });

  it("shows the create form when the new-workspace button is clicked", async () => {
    mockList([]);
    render(
      <MemoryRouter>
        <CollaborationWorkspaces />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getByTestId("collaboration-workspaces-empty"),
      ).toBeInTheDocument();
    });
    fireEvent.click(
      screen.getByTestId("collaboration-workspace-create-toggle"),
    );
    expect(
      screen.getByTestId("collaboration-workspace-create-form"),
    ).toBeInTheDocument();
  });

  it("never surfaces raw developer terms (DMW / COSMP / capsule_id / payload / binding / adapter)", async () => {
    mockList([
      {
        workspace_id: "ws-1",
        title: "Launch Collaboration",
        description: "Otzar launch readiness",
        members: 4,
        decisions: 2,
        commitments: 4,
        open_actions: 1,
        completed_actions: 3,
      },
    ]);
    render(
      <MemoryRouter>
        <CollaborationWorkspaces />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getAllByTestId("collaboration-workspace-row"),
      ).toHaveLength(1);
    });
    const html = screen.getByTestId("collaboration-workspaces-page").outerHTML;
    expect(html).not.toMatch(/\bDMW\b/);
    expect(html).not.toMatch(/\bCOSMP\b/);
    expect(html).not.toMatch(/capsule_id/i);
    expect(html).not.toMatch(/payload_redacted/i);
    expect(html).not.toMatch(/binding[_-]?id/i);
    expect(html).not.toMatch(/adapter/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/embedding/i);
  });
});

describe("CollaborationWorkspaceDetail — Launch fixture", () => {
  function mockDetail(): void {
    server.use(
      http.get(`${API_BASE}/otzar/collaboration/workspaces/ws-1`, () =>
        HttpResponse.json({
          ok: true,
          workspace: {
            workspace_id: "ws-1",
            title: "Launch Collaboration",
            description: "Otzar launch readiness",
            status: "ACTIVE",
            visibility: "INTERNAL_ONLY",
            source_type: "COMMS_CAPTURE",
            source_conversation_id: null,
            created_by_entity_id: "uuid-sadeil",
            created_at: "2026-06-10T15:00:00.000Z",
            updated_at: "2026-06-10T15:00:00.000Z",
          },
          members: [
            {
              membership_id: "m-1",
              workspace_id: "ws-1",
              member_entity_id: "uuid-sadeil",
              member_display_name: "Sadeil Lewis",
              member_email: null,
              role_label: "Founder",
              responsibility_summary: "approval and launch coordination",
              member_type: "INTERNAL",
              access_level: "APPROVE",
              status: "ACTIVE",
            },
            {
              membership_id: "m-2",
              workspace_id: "ws-1",
              member_entity_id: "uuid-david",
              member_display_name: "David Odie",
              member_email: null,
              role_label: "Tech Lead",
              responsibility_summary: "UI flow review",
              member_type: "INTERNAL",
              access_level: "CONTRIBUTE",
              status: "ACTIVE",
            },
            {
              membership_id: "m-3",
              workspace_id: "ws-1",
              member_entity_id: "uuid-samiksha",
              member_display_name: "Samiksha Sharma",
              member_email: null,
              role_label: "AI/NLP Engineer",
              responsibility_summary: "AI trial review",
              member_type: "INTERNAL",
              access_level: "CONTRIBUTE",
              status: "ACTIVE",
            },
            {
              membership_id: "m-4",
              workspace_id: "ws-1",
              member_entity_id: "uuid-annie",
              member_display_name: "Annie Wells",
              member_email: null,
              role_label: "Risk & Compliance Lead",
              responsibility_summary: "compliance review",
              member_type: "INTERNAL",
              access_level: "CONTRIBUTE",
              status: "ACTIVE",
            },
          ],
          decisions: [
            {
              decision_id: "d-1",
              workspace_id: "ws-1",
              text: "Keep internal note workflows inside Otzar notifications only for now.",
              source_conversation_id: null,
              source_excerpt: null,
              created_at: "2026-06-10T15:00:00.000Z",
            },
            {
              decision_id: "d-2",
              workspace_id: "ws-1",
              text: "Do not enable Slack or email sending until explicit connector approval is finished.",
              source_conversation_id: null,
              source_excerpt: null,
              created_at: "2026-06-10T15:00:00.000Z",
            },
          ],
          commitments: [
            {
              commitment_id: "c-1",
              workspace_id: "ws-1",
              owner_entity_id: "uuid-david",
              owner_display_name: "David Odie",
              text: "David reviews the UI flow by Friday.",
              due_date: null,
              source_conversation_id: null,
              source_excerpt:
                "Sadeil asked David to review the UI flow by Friday.",
              assignment_reason:
                "David Odie was explicitly asked to handle this.",
              confidence: "HIGH",
              resolution_status: "RESOLVED",
              related_action_id: null,
              status: "PROPOSED",
            },
            {
              commitment_id: "c-2",
              workspace_id: "ws-1",
              owner_entity_id: "uuid-samiksha",
              owner_display_name: "Samiksha Sharma",
              text: "Samiksha reviews the AI/NLP trial notes.",
              due_date: null,
              source_conversation_id: null,
              source_excerpt: "Samiksha agreed to review the AI/NLP trial notes.",
              assignment_reason:
                "Samiksha Sharma agreed to this in the capture.",
              confidence: "HIGH",
              resolution_status: "RESOLVED",
              related_action_id: null,
              status: "PROPOSED",
            },
            {
              commitment_id: "c-3",
              workspace_id: "ws-1",
              owner_entity_id: "uuid-annie",
              owner_display_name: "Annie Wells",
              text: "Annie completes the compliance review this week.",
              due_date: null,
              source_conversation_id: null,
              source_excerpt:
                "Annie said she can complete a compliance review this week.",
              assignment_reason:
                "Annie Wells owns compliance review in this workspace.",
              confidence: "HIGH",
              resolution_status: "RESOLVED",
              related_action_id: "action-annie",
              status: "ACTION_CREATED",
            },
          ],
          linked_actions: [
            {
              action_id: "action-annie",
              status: "APPROVED",
              action_type: "SEND_INTERNAL_NOTIFICATION",
              risk_tier: "LOW",
              requires_approval: false,
              created_at: "2026-06-10T15:01:00.000Z",
              updated_at: "2026-06-10T15:01:00.000Z",
            },
          ],
          shared_context: [
            {
              shared_context_id: "sc-1",
              workspace_id: "ws-1",
              context_type: "COMMS_SUMMARY",
              context_ref_id: null,
              title: "Conversation summary",
              summary:
                "Sadeil, David, Samiksha, and Annie aligned on the Otzar launch follow-up.",
              sensitivity: "INTERNAL",
              created_at: "2026-06-10T15:00:00.000Z",
            },
          ],
          permissions: {
            can_view: true,
            can_contribute: true,
            can_approve: true,
            is_creator: true,
          },
          audit_summary: {
            created_at: "2026-06-10T15:00:00.000Z",
            member_count: 4,
            decision_count: 2,
            commitment_count: 3,
            action_count: 1,
          },
        }),
      ),
      http.get(
        `${API_BASE}/otzar/collaboration/workspaces/ws-1/external-collaborators`,
        () => HttpResponse.json({ ok: true, workspace_memberships: [] }),
      ),
      http.get(
        `${API_BASE}/otzar/collaboration/workspaces/ws-1/external-commitments`,
        () => HttpResponse.json({ ok: true, external_commitments: [] }),
      ),
    );
  }

  function renderDetail(): void {
    render(
      <MemoryRouter initialEntries={["/app/collaboration-workspaces/ws-1"]}>
        <Routes>
          <Route
            path="/app/collaboration-workspaces/:workspace_id"
            element={<CollaborationWorkspaceDetail />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("renders all 4 internal members", async () => {
    mockDetail();
    renderDetail();
    await waitFor(() => {
      expect(
        screen.getAllByTestId("collaboration-workspace-member-row"),
      ).toHaveLength(4);
    });
    // Each member name may appear twice (member-row + commitment owner
    // group label); we only assert presence.
    expect(screen.getAllByText("Sadeil Lewis").length).toBeGreaterThan(0);
    expect(screen.getAllByText("David Odie").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Samiksha Sharma").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Annie Wells").length).toBeGreaterThan(0);
  });

  it("renders both Launch decisions", async () => {
    mockDetail();
    renderDetail();
    await waitFor(() => {
      expect(
        screen.getAllByTestId("collaboration-workspace-decision-row"),
      ).toHaveLength(2);
    });
  });

  it("groups commitments by owner and renders assignment reasons", async () => {
    mockDetail();
    renderDetail();
    await waitFor(() => {
      expect(
        screen.getAllByTestId("collaboration-workspace-commitment-row"),
      ).toHaveLength(3);
    });
    expect(
      screen.getByText("David Odie was explicitly asked to handle this."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Samiksha Sharma agreed to this in the capture."),
    ).toBeInTheDocument();
  });

  it("shows the Confirm follow-up button only for RESOLVED commitments without an action linked", async () => {
    mockDetail();
    renderDetail();
    await waitFor(() => {
      expect(
        screen.getAllByTestId("collaboration-workspace-commitment-row"),
      ).toHaveLength(3);
    });
    const confirmButtons = screen.getAllByTestId(
      "collaboration-workspace-confirm-commitment",
    );
    // c-1 + c-2 are RESOLVED without related_action_id; c-3 already has
    // an action so the button is hidden.
    expect(confirmButtons.length).toBe(2);
  });

  it("renders one Action Center linked-action row when one action exists", async () => {
    mockDetail();
    renderDetail();
    await waitFor(() => {
      expect(
        screen.getAllByTestId("collaboration-workspace-action-row"),
      ).toHaveLength(1);
    });
  });

  it("renders the empty-externals state when no external stakeholders are tracked", async () => {
    mockDetail();
    renderDetail();
    await waitFor(() => {
      expect(
        screen.getByTestId("collaboration-workspace-externals-section"),
      ).toBeInTheDocument();
    });
  });

  it("never surfaces raw developer terms in the detail page", async () => {
    mockDetail();
    renderDetail();
    await waitFor(() => {
      expect(
        screen.getByTestId("collaboration-workspace-detail-page"),
      ).toBeInTheDocument();
    });
    const html = screen.getByTestId(
      "collaboration-workspace-detail-page",
    ).outerHTML;
    expect(html).not.toMatch(/\bDMW\b/);
    expect(html).not.toMatch(/\bCOSMP\b/);
    expect(html).not.toMatch(/capsule_id/i);
    expect(html).not.toMatch(/payload_redacted/i);
    expect(html).not.toMatch(/binding[_-]?id/i);
    expect(html).not.toMatch(/adapter/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/embedding/i);
  });
});
