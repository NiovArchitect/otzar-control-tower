// FILE: tests/unit/meeting-captures.test.tsx
// PURPOSE: Phase 1222 — locks the MeetingCaptures page surface:
//          provider select, create form, list rendering, language
//          ban.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MeetingCaptures } from "@/pages/app/MeetingCaptures";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

beforeEach(() => {
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
});

function mockList(
  rows: Array<{
    id: string;
    title: string;
    status:
      | "PENDING"
      | "PROCESSED"
      | "ATTACHED_TO_WORKSPACE"
      | "BLOCKED_PARTICIPANT_CONSENT"
      | "FAILED"
      | "ARCHIVED";
    provider:
      | "GOOGLE_MEET"
      | "ZOOM"
      | "MICROSOFT_TEAMS"
      | "MANUAL_UPLOAD"
      | "API_INGEST";
    participants?: number;
  }>,
): void {
  server.use(
    http.get(`${API_BASE}/otzar/meeting-captures`, () =>
      HttpResponse.json({
        ok: true,
        meeting_captures: rows.map((r) => ({
          meeting_capture_id: r.id,
          provider: r.provider,
          provider_meeting_id: null,
          title: r.title,
          scheduled_start: null,
          scheduled_end: null,
          recorded_start: null,
          recorded_end: null,
          participant_count: r.participants ?? 0,
          status: r.status,
          workspace_id: null,
          source_conversation_id: null,
          summary: null,
          has_transcript: false,
          created_at: "2026-06-10T15:00:00.000Z",
          updated_at: "2026-06-10T15:00:00.000Z",
        })),
      }),
    ),
    http.get(`${API_BASE}/otzar/collaboration/workspaces`, () =>
      HttpResponse.json({ ok: true, workspaces: [] }),
    ),
  );
}

describe("MeetingCaptures page", () => {
  it("renders empty state when no captures exist", async () => {
    mockList([]);
    render(
      <MemoryRouter>
        <MeetingCaptures />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("meeting-captures-page")).toBeInTheDocument();
    });
    // Pre-existing flake fix (OTZAR-RETURN-2): the empty-state copy renders only
    // after the captures query resolves, so assert it with the async findByText
    // (polls) instead of a synchronous getByText that races the in-flight query
    // under full-suite load. Not related to the InboxThread/Conversations fixes.
    expect(
      await screen.findByText("No captures yet. Use the form above to record one."),
    ).toBeInTheDocument();
  });

  it("renders a capture row per result with status badge", async () => {
    mockList([
      {
        id: "mc-1",
        title: "Demo planning",
        status: "PROCESSED",
        provider: "GOOGLE_MEET",
        participants: 3,
      },
      {
        id: "mc-2",
        title: "External demo",
        status: "BLOCKED_PARTICIPANT_CONSENT",
        provider: "ZOOM",
        participants: 4,
      },
    ]);
    render(
      <MemoryRouter>
        <MeetingCaptures />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByTestId("meeting-capture-row")).toHaveLength(2);
    });
    expect(screen.getByText("Demo planning")).toBeInTheDocument();
    expect(screen.getByText("External demo")).toBeInTheDocument();
  });

  it("renders the create form with provider selector and consent options", async () => {
    mockList([]);
    render(
      <MemoryRouter>
        <MeetingCaptures />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.getByTestId("meeting-capture-create-form"),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("meeting-capture-provider")).toBeInTheDocument();
    expect(screen.getByTestId("meeting-capture-title")).toBeInTheDocument();
    expect(screen.getByTestId("meeting-capture-submit")).toBeInTheDocument();
  });

  it("never surfaces raw developer terms", async () => {
    mockList([
      {
        id: "mc-1",
        title: "Demo planning",
        status: "PROCESSED",
        provider: "GOOGLE_MEET",
        participants: 3,
      },
    ]);
    render(
      <MemoryRouter>
        <MeetingCaptures />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("meeting-captures-page")).toBeInTheDocument();
    });
    const html = screen.getByTestId("meeting-captures-page").outerHTML;
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

describe("MeetingCaptures — reopen original source (P0C)", () => {
  function mockCaptureWithTranscript(): void {
    server.use(
      http.get(`${API_BASE}/otzar/meeting-captures`, () =>
        HttpResponse.json({
          ok: true,
          meeting_captures: [
            {
              meeting_capture_id: "mc-src-1", provider: "MANUAL_UPLOAD", provider_meeting_id: null,
              title: "Launch sync", scheduled_start: null, scheduled_end: null, recorded_start: null,
              recorded_end: null, participant_count: 2, status: "PROCESSED", workspace_id: null,
              source_conversation_id: null, summary: null, has_transcript: true,
              created_at: "2026-06-10T15:00:00.000Z", updated_at: "2026-06-10T15:00:00.000Z",
            },
          ],
        }),
      ),
      http.get(`${API_BASE}/otzar/collaboration/workspaces`, () => HttpResponse.json({ ok: true, workspaces: [] })),
    );
  }

  it("reopens the original transcript for an authorized capture", async () => {
    mockCaptureWithTranscript();
    server.use(
      http.get(`${API_BASE}/otzar/meeting-captures/mc-src-1/transcript`, () =>
        HttpResponse.json({ ok: true, meeting_capture_id: "mc-src-1", title: "Launch sync", transcript: "Sadeil: we ship Friday. David: I'll prep the release notes.", has_transcript: true }),
      ),
    );
    render(<MemoryRouter><MeetingCaptures /></MemoryRouter>);
    const btn = await screen.findByTestId("meeting-capture-view-source");
    await userEvent.click(btn);
    const panel = await screen.findByTestId("meeting-capture-source-panel");
    await waitFor(() => expect(panel.getAttribute("data-status")).toBe("ready"));
    expect(panel).toHaveTextContent(/release notes/);
  });

  it("shows a no-access state (never the text) when the server denies the source", async () => {
    mockCaptureWithTranscript();
    server.use(
      http.get(`${API_BASE}/otzar/meeting-captures/mc-src-1/transcript`, () =>
        HttpResponse.json({ ok: false, code: "NOT_ALLOWED" }, { status: 403 }),
      ),
    );
    render(<MemoryRouter><MeetingCaptures /></MemoryRouter>);
    await userEvent.click(await screen.findByTestId("meeting-capture-view-source"));
    const panel = await screen.findByTestId("meeting-capture-source-panel");
    await waitFor(() => expect(panel.getAttribute("data-status")).toBe("denied"));
    expect(panel).toHaveTextContent(/don.t have access/i);
    expect(panel).not.toHaveTextContent(/release notes/);
  });
});
