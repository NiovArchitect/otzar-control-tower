// FILE: tests/unit/work-projects.test.tsx
// PURPOSE: Phase 4E — page tests for the WorkProjects employee surface.
// CONNECTS TO: src/pages/app/WorkProjects.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { WorkProjects } from "@/pages/app/WorkProjects";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
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

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <WorkProjects />
    </QueryClientProvider>,
  );
}

const PROJECT_FIXTURE = {
  project_id: "11111111-2222-3333-4444-555555555555",
  name: "Phoenix launch",
  state: "ACTIVE" as const,
  created_at: new Date().toISOString(),
  archivable: true,
};

beforeEach(() => {
  setAuth();
});

describe("WorkProjects page", () => {
  it("renders header + create form + active projects list", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/work-projects`, () =>
        HttpResponse.json({ ok: true, projects: [PROJECT_FIXTURE] }),
      ),
    );
    renderPage();
    expect(await screen.findByText("Work projects")).toBeInTheDocument();
    expect(screen.getByTestId("create-project-form")).toBeInTheDocument();
    expect(await screen.findByText("Phoenix launch")).toBeInTheDocument();
  });

  it("archive button only renders when project.archivable=true", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/work-projects`, () =>
        HttpResponse.json({
          ok: true,
          projects: [
            PROJECT_FIXTURE,
            {
              ...PROJECT_FIXTURE,
              project_id: "66666666-7777-8888-9999-aaaaaaaaaaaa",
              state: "ARCHIVED" as const,
              archivable: false,
              name: "Archived project",
            },
          ],
        }),
      ),
    );
    renderPage();
    await screen.findByText("Phoenix launch");
    expect(
      screen.getByTestId(`project-archive-${PROJECT_FIXTURE.project_id}`),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(
        "project-archive-66666666-7777-8888-9999-aaaaaaaaaaaa",
      ),
    ).not.toBeInTheDocument();
  });

  it("clicking Members toggles the members panel", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/work-projects`, () =>
        HttpResponse.json({ ok: true, projects: [PROJECT_FIXTURE] }),
      ),
      http.get(
        `${API_BASE}/otzar/work-projects/${PROJECT_FIXTURE.project_id}/members`,
        () =>
          HttpResponse.json({
            ok: true,
            members: [
              {
                project_member_id: "mem-1",
                project_id: PROJECT_FIXTURE.project_id,
                entity_id: PROJECT_FIXTURE.project_id,
                role: "OWNER" as const,
                created_at: new Date().toISOString(),
              },
            ],
          }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    await screen.findByText("Phoenix launch");
    await user.click(
      screen.getByTestId(`project-toggle-${PROJECT_FIXTURE.project_id}`),
    );
    expect(
      await screen.findByTestId("project-members-panel"),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("members-list")).toBeInTheDocument();
  });

  it("members form exposes all 3 roles", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/work-projects`, () =>
        HttpResponse.json({ ok: true, projects: [PROJECT_FIXTURE] }),
      ),
      http.get(
        `${API_BASE}/otzar/work-projects/${PROJECT_FIXTURE.project_id}/members`,
        () => HttpResponse.json({ ok: true, members: [] }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    await screen.findByText("Phoenix launch");
    await user.click(
      screen.getByTestId(`project-toggle-${PROJECT_FIXTURE.project_id}`),
    );
    const roleSel = await screen.findByTestId("add-member-role");
    expect(within(roleSel).getAllByRole("option")).toHaveLength(3);
  });
});
