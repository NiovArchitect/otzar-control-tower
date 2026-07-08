// FILE: tests/unit/context-health-badge.test.tsx
// PURPOSE: Phase 1205 -- component tests for the AI Twin context
//          badge that consumes GET /api/v1/otzar/my-twin/context-health.
//          Locks: rendering of the closed-vocab IdentityContext
//          projection, status-dot mapping, and the privacy invariant
//          that no raw memory / transcripts / vectors / TAR hashes
//          leak into the UI.
// CONNECTS TO: src/components/otzar/ContextHealthBadge.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ContextHealthBadge } from "@/components/otzar/ContextHealthBadge";
import { useAuthStore } from "@/lib/stores/auth";
import type {
  ContextHealthResponse,
  ContextHealthStatus,
} from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: false,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
}

function buildResponse(
  status: ContextHealthStatus,
  identityOverrides: Partial<ContextHealthResponse["identity"]> = {},
): ContextHealthResponse {
  return {
    ok: true,
    status,
    identity: {
      viewer: {
        user_id: "u-1",
        email: "sadeil@niovlabs.com",
        display_name: "Sadeil Lewis",
        title: "FOUNDER",
        org_role: "FOUNDER",
        is_founder_admin: true,
      },
      org: { org_id: "o-1", name: "NIOV Labs", domain: "niovlabs.com" },
      twin: { twin_id: "t-1", display_name: "Otzar", active: true },
      projects: [
        { project_id: "p-1", name: "Foundation", role: "LEAD" },
        { project_id: "p-2", name: "Otzar Control Tower", role: "MEMBER" },
      ],
      authority: {
        can_admin_org: true,
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: true,
        can_access_external_api: false,
        external_write_policy: "APPROVAL_REQUIRED",
      },
      context_signals: {
        memory_capsules_count: 12,
        transcript_summaries_count: 3,
        collaboration_inbound_count: 1,
        collaboration_outbound_count: 2,
      },
      org_roster: [],
      safety: {
        no_external_write_without_approval: true,
        no_private_data_to_unauthorized_users: true,
        no_raw_audio_storage: true,
        no_raw_transcript_default: true,
      },
      ...identityOverrides,
    },
  };
}

function mockHealth(resp: ContextHealthResponse): void {
  server.use(
    http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
      HttpResponse.json(resp),
    ),
  );
}

beforeEach(() => {
  setAuth();
});

describe("ContextHealthBadge — happy paths (status mapping)", () => {
  it("renders READY status with the viewer's identity", async () => {
    mockHealth(buildResponse("READY"));
    render(<ContextHealthBadge />);
    await waitFor(() =>
      expect(screen.getByTestId("context-health-badge")).toBeInTheDocument(),
    );
    const badge = screen.getByTestId("context-health-badge");
    expect(badge.getAttribute("data-status")).toBe("READY");
    expect(screen.getByText("AI Teammate context ready")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-viewer")).toHaveTextContent("Sadeil Lewis");
    expect(screen.getByTestId("ctx-email")).toHaveTextContent(
      "sadeil@niovlabs.com",
    );
    expect(screen.getByTestId("ctx-role")).toHaveTextContent("FOUNDER");
    expect(screen.getByTestId("ctx-org")).toHaveTextContent("NIOV Labs");
    expect(screen.getByTestId("ctx-twin")).toHaveTextContent("Otzar");
    expect(screen.getByTestId("ctx-projects")).toHaveTextContent("2");
    expect(screen.getByTestId("ctx-memory")).toHaveTextContent("12");
    expect(screen.getByTestId("ctx-transcripts")).toHaveTextContent("3");
    expect(screen.getByTestId("ctx-inbound")).toHaveTextContent("1");
    expect(screen.getByTestId("ctx-outbound")).toHaveTextContent("2");
  });

  it("renders PARTIAL status", async () => {
    mockHealth(
      buildResponse("PARTIAL", {
        twin: { twin_id: null, display_name: null, active: false },
      }),
    );
    render(<ContextHealthBadge />);
    await waitFor(() =>
      expect(screen.getByTestId("context-health-badge")).toBeInTheDocument(),
    );
    expect(screen.getByText("Partial context")).toBeInTheDocument();
    expect(screen.getByTestId("ctx-twin")).toHaveTextContent("Not assigned");
  });

  it("renders UNCONFIGURED status without crashing on null org / twin", async () => {
    mockHealth(
      buildResponse("UNCONFIGURED", {
        viewer: {
          user_id: "u",
          email: null,
          display_name: "Unknown viewer",
          title: "MEMBER",
          org_role: "MEMBER",
          is_founder_admin: false,
        },
        org: { org_id: null, name: null, domain: null },
        twin: { twin_id: null, display_name: null, active: false },
        projects: [],
      }),
    );
    render(<ContextHealthBadge />);
    await waitFor(() =>
      expect(screen.getByTestId("context-health-badge")).toBeInTheDocument(),
    );
    expect(screen.getByText("Context not wired")).toBeInTheDocument();
    // No email row when email is null.
    expect(screen.queryByTestId("ctx-email")).toBeNull();
    // No org row when org.name is null.
    expect(screen.queryByTestId("ctx-org")).toBeNull();
    expect(screen.getByTestId("ctx-projects")).toHaveTextContent("0");
  });
});

describe("ContextHealthBadge — multi-user parametricity (per Founder clarification 2026-06-10)", () => {
  it("renders David Odie when David's context is returned (not Sadeil)", async () => {
    mockHealth(
      buildResponse("READY", {
        viewer: {
          user_id: "u-david",
          email: "david@niovlabs.com",
          display_name: "David Odie",
          title: "TECH LEAD",
          org_role: "TECH LEAD",
          is_founder_admin: false,
        },
        twin: {
          twin_id: "t-david",
          display_name: "David's Twin",
          active: true,
        },
      }),
    );
    render(<ContextHealthBadge />);
    await waitFor(() =>
      expect(screen.getByTestId("ctx-viewer")).toHaveTextContent("David Odie"),
    );
    expect(screen.getByTestId("ctx-email")).toHaveTextContent(
      "david@niovlabs.com",
    );
    expect(screen.getByTestId("ctx-role")).toHaveTextContent("TECH LEAD");
    expect(screen.getByTestId("ctx-twin")).toHaveTextContent("David's Twin");
    expect(screen.queryByText("Sadeil Lewis")).toBeNull();
  });

  it("renders Vishesh when Vishesh's context is returned", async () => {
    mockHealth(
      buildResponse("READY", {
        viewer: {
          user_id: "u-vishesh",
          email: "vishesh@niovlabs.com",
          display_name: "Vishesh Kumar",
          title: "AI/NLP ENGINEER",
          org_role: "AI/NLP ENGINEER",
          is_founder_admin: false,
        },
      }),
    );
    render(<ContextHealthBadge />);
    await waitFor(() =>
      expect(screen.getByTestId("ctx-viewer")).toHaveTextContent(
        "Vishesh Kumar",
      ),
    );
    expect(screen.queryByText("Sadeil Lewis")).toBeNull();
    expect(screen.queryByText("David Odie")).toBeNull();
  });
});

describe("ContextHealthBadge — error states", () => {
  it("renders the error state when the API returns a failure", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
        HttpResponse.json(
          { ok: false, code: "SESSION_INVALID", message: "Denied" },
          { status: 401 },
        ),
      ),
    );
    render(<ContextHealthBadge />);
    await waitFor(() =>
      expect(screen.getByTestId("context-health-error")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("AI Teammate context unavailable"),
    ).toBeInTheDocument();
  });

  it("renders the error state when the network request fails entirely", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
        HttpResponse.error(),
      ),
    );
    render(<ContextHealthBadge />);
    await waitFor(() =>
      expect(screen.getByTestId("context-health-error")).toBeInTheDocument(),
    );
  });
});

describe("ContextHealthBadge — privacy invariants (RULE 0)", () => {
  it("never renders raw memory text, raw transcripts, or vectors", async () => {
    mockHealth(buildResponse("READY"));
    render(<ContextHealthBadge />);
    await waitFor(() =>
      expect(screen.getByTestId("context-health-badge")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("context-health-badge").outerHTML;
    expect(html).not.toMatch(/payload[_-]?content/i);
    expect(html).not.toMatch(/transcript[_-]?body/i);
    expect(html).not.toMatch(/embedding/i);
    expect(html).not.toMatch(/vector/i);
    expect(html).not.toMatch(/password/i);
    expect(html).not.toMatch(/bearer/i);
    expect(html).not.toMatch(/session[_-]?token/i);
    expect(html).not.toMatch(/tar[_-]?hash/i);
    expect(html).not.toMatch(/permission[_-]?id/i);
    expect(html).not.toMatch(/bridge[_-]?id/i);
  });

  it("never renders the raw [TRANSCRIPT-FATHOM] prefix even though counts come from those rows", async () => {
    mockHealth(buildResponse("READY"));
    render(<ContextHealthBadge />);
    await waitFor(() =>
      expect(screen.getByTestId("context-health-badge")).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId("context-health-badge").outerHTML,
    ).not.toContain("[TRANSCRIPT-FATHOM]");
  });
});
