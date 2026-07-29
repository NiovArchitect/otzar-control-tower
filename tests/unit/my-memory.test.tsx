// FILE: tests/unit/my-memory.test.tsx
// PURPOSE: Slice 4 — useful Memory primary experience.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MyMemory } from "@/pages/app/MyMemory";
import { useAuthStore } from "@/lib/stores/auth";
import type { ContextHealthResponse } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
}

function ctx(): ContextHealthResponse {
  return {
    ok: true,
    status: "READY",
    identity: {
      viewer: {
        user_id: "u",
        email: "sadeil@niovlabs.com",
        display_name: "Sadeil Lewis",
        title: "FOUNDER",
        org_role: "FOUNDER",
        is_founder_admin: true,
      },
      org: { org_id: "o", name: "NIOV Labs", domain: null },
      twin: { twin_id: "t", display_name: "Otzar", active: true },
      projects: [],
      authority: {
        can_admin_org: true,
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: true,
        can_access_external_api: false,
        external_write_policy: "APPROVAL_REQUIRED",
      },
      context_signals: {
        memory_capsules_count: 100,
        transcript_summaries_count: 3,
        collaboration_inbound_count: 0,
        collaboration_outbound_count: 4,
      },
      org_roster: [],
      safety: {
        no_external_write_without_approval: true,
        no_private_data_to_unauthorized_users: true,
        no_raw_audio_storage: true,
        no_raw_transcript_default: true,
      },
    },
  };
}

function mockAll(): void {
  server.use(
    http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
      HttpResponse.json(ctx()),
    ),
    http.get(`${API_BASE}/otzar/work-style/status`, () =>
      HttpResponse.json({
        ok: true,
        org_policy_enabled: true,
        user_consent_required: true,
        active_session: null,
        pending_candidates_count: 0,
        approved_preferences_count: 1,
      }),
    ),
    http.get(`${API_BASE}/otzar/work-style/preferences`, () =>
      HttpResponse.json({
        ok: true,
        preferences: [
          {
            correction_id: "pref-1",
            safe_summary: "[portable] Keep answers concise: direct answer first",
            correction_type: "TONE_PREFERENCE",
          },
        ],
      }),
    ),
    http.get(`${API_BASE}/otzar/work-style/candidates`, () =>
      HttpResponse.json({ ok: true, candidates: [] }),
    ),
    http.post(`${API_BASE}/otzar/correction`, () =>
      HttpResponse.json({ ok: true, correction_capsule_id: "cap-1" }),
    ),
  );
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <MyMemory />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setAuth();
  localStorage.clear();
  mockAll();
});

describe("MyMemory — Slice 4 useful learning", () => {
  it("three-second heading is useful learning, not storage theater", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-memory-page")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("my-memory-page")).toHaveTextContent(
      /How Otzar works better for you/i,
    );
    expect(screen.getByTestId("my-memory-helping-now")).toBeInTheDocument();
    expect(screen.getByTestId("my-memory-recently-learned")).toBeInTheDocument();
    expect(screen.getByTestId("my-memory-needs-decision")).toBeInTheDocument();
    expect(screen.getByTestId("my-memory-portable-profile")).toBeInTheDocument();
    // Primary body must not lead with "100 memory records" as the story.
    const primary = screen.getByTestId("my-memory-helping-now").textContent ?? "";
    expect(primary).not.toMatch(/100 memory records/i);
    expect(document.body.innerHTML).not.toMatch(/\bDMW\b|COSMP|MemoryCapsule/);
  });

  it("shows active personal patterns from preferences", async () => {
    renderPage();
    expect(await screen.findByTestId("active-pattern-card")).toHaveTextContent(
      /Concise answers/i,
    );
  });

  it("storage counts are secondary only", async () => {
    renderPage();
    await screen.findByTestId("my-memory-knows");
    // details element — counts exist but collapsed secondary
    expect(screen.getByTestId("my-memory-knows").tagName.toLowerCase()).toBe(
      "details",
    );
    expect(screen.getByTestId("my-memory-knows")).toHaveTextContent(
      /Conversation summaries/i,
    );
  });

  it("portable profile request never claims Ready", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId("portable-profile-open"));
    expect(screen.getByTestId("portable-profile-review")).toHaveTextContent(
      /Can move with you|Stays with the organization/i,
    );
    await user.click(screen.getByTestId("portable-profile-request"));
    expect(await screen.findByTestId("portable-request-status")).toHaveTextContent(
      /Requested|Under review/i,
    );
    expect(screen.getByTestId("portable-request-status").textContent).not.toMatch(
      /^Status:\s*Ready$/i,
    );
  });

  it("ownership boundary still clear", async () => {
    renderPage();
    const boundary = await screen.findByTestId("my-memory-boundary");
    expect(boundary).toHaveTextContent(/personal work memory/i);
    expect(boundary).toHaveTextContent(/Company-owned/i);
  });
});
