// FILE: tests/unit/my-organization.test.tsx
// PURPOSE: Phase 1217 — locks the "My Organization" view that
//          orients the employee in their company without surveillance
//          framing. Covers: identity card, projects-by-role grouping,
//          authority rows, context-signal counts, empty/error states,
//          roster-aware behavior, privacy invariants.
// CONNECTS TO: src/pages/app/MyOrganization.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MyOrganization } from "@/pages/app/MyOrganization";
import { useAuthStore } from "@/lib/stores/auth";
import type { ContextHealthResponse } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(email = "sadeil@niovlabs.com"): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email },
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

function ctx(
  overrides: Partial<ContextHealthResponse["identity"]> = {},
): ContextHealthResponse {
  return {
    ok: true,
    status: "READY",
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
        { project_id: "p-1", name: "Foundation", role: "OWNER" },
        { project_id: "p-2", name: "Otzar Control Tower", role: "MEMBER" },
        { project_id: "p-3", name: "Enterprise Demo Readiness", role: "OWNER" },
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
      ...overrides,
    },
  };
}

function mockCtx(resp: ContextHealthResponse): void {
  server.use(
    http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
      HttpResponse.json(resp),
    ),
  );
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <MyOrganization />
    </MemoryRouter>,
  );
}

beforeEach(() => setAuth());

describe("MyOrganization — identity card", () => {
  it("renders viewer + humanized title + org name + twin", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-org-identity")).toBeInTheDocument(),
    );
    const id = screen.getByTestId("my-org-identity");
    expect(id).toHaveTextContent("Sadeil Lewis");
    expect(id).toHaveTextContent("Founder & CEO");
    expect(id).toHaveTextContent("NIOV Labs");
    expect(id).toHaveTextContent("Otzar");
  });

  it("surfaces 'Twin not configured' when active is false", async () => {
    mockCtx(
      ctx({
        twin: { twin_id: null, display_name: null, active: false },
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-org-identity")).toHaveTextContent(
        /not configured/i,
      ),
    );
  });
});

describe("MyOrganization — projects", () => {
  it("groups projects by role with humanized labels + per-row badge", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-org-projects-count")).toHaveTextContent(
        "3",
      ),
    );
    const sections = screen.getAllByTestId("my-org-project-role-section");
    // MEMBER + OWNER sorted alphabetically.
    expect(sections[0]?.getAttribute("data-role")).toBe("MEMBER");
    expect(sections[1]?.getAttribute("data-role")).toBe("OWNER");
    const rows = screen.getAllByTestId("my-org-project-row");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Otzar Control Tower");
    expect(rows[0]).toHaveTextContent("Member");
  });

  it("shows the empty state when the viewer has no projects", async () => {
    mockCtx(ctx({ projects: [] }));
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-org-projects-empty")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("my-org-projects-empty")).toHaveTextContent(
      "not a member of any projects",
    );
  });
});

describe("MyOrganization — authority rows", () => {
  it("renders 'Yes' / 'Not yet' badges per capability", async () => {
    mockCtx(
      ctx({
        authority: {
          can_admin_org: true,
          can_read_capsules: true,
          can_write_capsules: true,
          can_share_capsules: false,
          can_access_external_api: false,
          external_write_policy: "APPROVAL_REQUIRED",
        },
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("auth-read")).toHaveAttribute(
        "data-allowed",
        "true",
      ),
    );
    expect(screen.getByTestId("auth-write").getAttribute("data-allowed")).toBe(
      "true",
    );
    expect(screen.getByTestId("auth-share").getAttribute("data-allowed")).toBe(
      "false",
    );
    expect(
      screen.getByTestId("auth-external").getAttribute("data-allowed"),
    ).toBe("false");
    expect(
      screen.getByTestId("auth-admin-org").getAttribute("data-allowed"),
    ).toBe("true");
    // External writes carry the policy chip.
    expect(screen.getByTestId("auth-external")).toHaveTextContent(
      "Approval required",
    );
  });
});

describe("MyOrganization — context signals", () => {
  it("renders the 4 context-signal counts", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-org-signals")).toBeInTheDocument(),
    );
    const s = screen.getByTestId("my-org-signals");
    expect(s).toHaveTextContent("12");
    expect(s).toHaveTextContent("Memory summaries");
    expect(s).toHaveTextContent("3");
    expect(s).toHaveTextContent("Transcript summaries");
    expect(s).toHaveTextContent("1");
    expect(s).toHaveTextContent("Inbound collaborations");
    expect(s).toHaveTextContent("2");
    expect(s).toHaveTextContent("Outbound collaborations");
  });
});

describe("MyOrganization — loading + error states", () => {
  it("renders the loading state initially", () => {
    mockCtx(ctx());
    renderPage();
    expect(screen.getByTestId("my-org-loading")).toBeInTheDocument();
  });

  it("renders the error state when the API fails", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
        HttpResponse.json(
          { ok: false, code: "SESSION_EXPIRED" },
          { status: 401 },
        ),
      ),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-org-error")).toBeInTheDocument(),
    );
  });
});

describe("MyOrganization — roster-aware (NOT David-only)", () => {
  it("renders Vishesh as viewer with their own projects + title", async () => {
    setAuth("vishesh@niovlabs.com");
    mockCtx(
      ctx({
        viewer: {
          user_id: "u-vishesh",
          email: "vishesh@niovlabs.com",
          display_name: "Vishesh Sharma",
          title: "AI UI ENGINEER",
          org_role: "AI UI ENGINEER",
          is_founder_admin: false,
        },
        projects: [
          { project_id: "p-1", name: "Otzar Live Test", role: "MEMBER" },
        ],
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-org-identity")).toHaveTextContent(
        "Vishesh Sharma",
      ),
    );
    expect(screen.getByTestId("my-org-identity")).toHaveTextContent(
      "AI UI Engineer",
    );
    // No Sadeil / David leak in the identity card.
    expect(
      screen.getByTestId("my-org-identity").textContent,
    ).not.toContain("Sadeil");
    expect(screen.getByTestId("my-org-identity").textContent).not.toContain(
      "David",
    );
  });
});

describe("MyOrganization — Phase 1218 role archetype card", () => {
  it("renders the Founder archetype's description + briefing when title is FOUNDER (mapped to CMO-like? no — Founder is not in the 13; resolves null)", async () => {
    mockCtx(ctx());
    renderPage();
    // FOUNDER is intentionally not one of the 13 Wave-2.1 archetypes
    // (the directive's 13 are functional/management roles, not the
    // C-suite umbrella). The archetype card simply does not render.
    await waitFor(() =>
      expect(screen.getByTestId("my-org-identity")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("role-archetype-card")).toBeNull();
  });

  it("renders the CTO archetype card when title is CTO", async () => {
    mockCtx(
      ctx({
        viewer: {
          user_id: "u-cto",
          email: "cto@niovlabs.com",
          display_name: "CT Owen",
          title: "CTO",
          org_role: "CTO",
          is_founder_admin: false,
        },
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("role-archetype-card")).toHaveAttribute(
        "data-role-key",
        "CTO",
      ),
    );
    expect(screen.getByTestId("role-archetype-card")).toHaveTextContent(
      "Architecture",
    );
    expect(screen.getByTestId("role-archetype-briefing")).toHaveTextContent(
      /technical second seat/i,
    );
  });

  it("renders the GENERAL_EMPLOYEE archetype card when title is 'Member'", async () => {
    mockCtx(
      ctx({
        viewer: {
          user_id: "u-x",
          email: "x@niovlabs.com",
          display_name: "Walter Carter",
          title: "MEMBER",
          org_role: "MEMBER",
          is_founder_admin: false,
        },
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("role-archetype-card")).toHaveAttribute(
        "data-role-key",
        "GENERAL_EMPLOYEE",
      ),
    );
    expect(screen.getByTestId("role-archetype-briefing")).toHaveTextContent(
      /not your manager/i,
    );
  });

  it("renders the AI_ENGINEER archetype card for the AI/NLP Engineer demo title", async () => {
    mockCtx(
      ctx({
        viewer: {
          user_id: "u-s",
          email: "samiksha@niovlabs.com",
          display_name: "Samiksha Sharma",
          title: "AI/NLP ENGINEER",
          org_role: "AI/NLP ENGINEER",
          is_founder_admin: false,
        },
      }),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("role-archetype-card")).toHaveAttribute(
        "data-role-key",
        "AI_ENGINEER",
      ),
    );
  });
});

describe("MyOrganization — privacy invariants (RULE 0)", () => {
  it("never renders TAR / wallet / clearance / permission internals", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-org-page")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("my-org-page").outerHTML;
    expect(html).not.toMatch(/tar_hash/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/clearance_ceiling/i);
    expect(html).not.toMatch(/permission_id/i);
    expect(html).not.toMatch(/embedding/i);
    expect(html).not.toMatch(/bearer/i);
    expect(html).not.toMatch(/session_token/i);
  });

  it("does not use surveillance / manager-monitoring framing", async () => {
    mockCtx(ctx());
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-org-page")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("my-org-page").outerHTML;
    expect(html).not.toMatch(/manager monitoring/i);
    expect(html).not.toMatch(/surveillance/i);
    expect(html).not.toMatch(/activity tracking/i);
    expect(html).not.toMatch(/employee monitoring/i);
    expect(html).not.toMatch(/productivity policing/i);
    // The reassurance line IS present.
    expect(html).toMatch(/does not watch you/i);
  });
});
