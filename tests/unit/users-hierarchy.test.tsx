// FILE: tests/unit/users-hierarchy.test.tsx
// PURPOSE: PROD-UX-P1 — People & Roles (Members) renders the REAL org
//          hierarchy from /org/hierarchy: role title, department, and the
//          manager's name in "Reports to". A parent that isn't a person
//          (org root / hive) and a person with no membership render "—" —
//          never a raw id, never invented structure.
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { UsersPage } from "@/pages/Users";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function person(id: string, name: string) {
  return {
    entity_id: id,
    entity_type: "PERSON",
    display_name: name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    status: "ACTIVE",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "admin@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
  server.use(
    http.get(`${API_BASE}/org/entities`, () =>
      HttpResponse.json({
        ok: true,
        items: [person("p-sadeil", "Sadeil"), person("p-vishesh", "Vishesh")],
        total: 2,
        skip: 0,
        take: 250,
      }),
    ),
    http.get(`${API_BASE}/org/hierarchy`, () =>
      HttpResponse.json({
        ok: true,
        org_entity_id: "org-root",
        memberships: [
          {
            membership_id: "m1",
            parent_id: "p-sadeil",
            child_id: "p-vishesh",
            role_title: "Engineer",
            department: "Product",
            hierarchy_level: 2,
            is_admin: false,
            is_active: true,
            created_at: "2026-07-01T00:00:00.000Z",
          },
          {
            membership_id: "m2",
            parent_id: "org-root",
            child_id: "p-sadeil",
            role_title: "Founder",
            department: null,
            hierarchy_level: 1,
            is_admin: true,
            is_active: true,
            created_at: "2026-07-01T00:00:00.000Z",
          },
        ],
      }),
    ),
  );
});

function renderUsers() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <MemoryRouter>
          <UsersPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("Members — org hierarchy columns (P1)", () => {
  it("renders role, department, and the manager's NAME (never an id)", async () => {
    renderUsers();
    expect(await screen.findByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("Product")).toBeInTheDocument();
    // Vishesh reports to Sadeil — shown by name.
    const cells = screen.getAllByRole("cell").map((c) => c.textContent);
    expect(cells.some((t) => t === "Sadeil")).toBe(true);
    expect(cells.some((t) => t?.includes("p-sadeil"))).toBe(false);
    expect(cells.some((t) => t?.includes("org-root"))).toBe(false);
  });

  it("a non-person parent (org root) renders '—' for Reports to, with the role still shown", async () => {
    renderUsers();
    expect(await screen.findByText("Founder")).toBeInTheDocument();
    // Sadeil's parent is the org root — no fabricated manager.
    const cells = screen.getAllByRole("cell").map((c) => c.textContent);
    expect(cells.filter((t) => t === "—").length).toBeGreaterThan(0);
  });
});

// PROD-UX-HIER — the admin's reporting-structure editor wires the live
// assign API with stable ids and answers in sentences, never codes.
describe("Members — reporting structure editor (PROD-UX-HIER)", () => {
  it("assigns a manager with role+department and reports the outcome in words", async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/org/hierarchy/assign`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, membership_id: "m-new", audit_event_id: "aud-9" });
      }),
    );
    renderUsers();
    const { default: userEvent } = await import("@testing-library/user-event");
    await screen.findByTestId("reporting-card");
    // Options load from the people query.
    await screen.findByText("Engineer");
    await userEvent.selectOptions(screen.getByTestId("reporting-person-select"), "p-vishesh");
    await userEvent.selectOptions(screen.getByTestId("reporting-manager-select"), "p-sadeil");
    await userEvent.type(screen.getByTestId("reporting-role-input"), "Staff Engineer");
    await userEvent.type(screen.getByTestId("reporting-department-input"), "Platform");
    await userEvent.click(screen.getByTestId("reporting-assign"));
    const notice = await screen.findByTestId("reporting-notice");
    expect(notice).toHaveTextContent(/Vishesh now reports to Sadeil/);
    expect(notice).toHaveTextContent(/audit trail/i);
    expect(posted).toEqual({
      person_entity_id: "p-vishesh",
      manager_entity_id: "p-sadeil",
      role_title: "Staff Engineer",
      department: "Platform",
    });
  });

  it("a cycle refusal reads as a human sentence, not a code", async () => {
    server.use(
      http.post(`${API_BASE}/org/hierarchy/assign`, () =>
        HttpResponse.json({ ok: false, code: "CYCLE" }, { status: 422 }),
      ),
    );
    renderUsers();
    const { default: userEvent } = await import("@testing-library/user-event");
    await screen.findByTestId("reporting-card");
    await screen.findByText("Engineer");
    await userEvent.selectOptions(screen.getByTestId("reporting-person-select"), "p-sadeil");
    await userEvent.selectOptions(screen.getByTestId("reporting-manager-select"), "p-vishesh");
    await userEvent.click(screen.getByTestId("reporting-assign"));
    const notice = await screen.findByTestId("reporting-notice");
    expect(notice).toHaveTextContent(/report to their own report/i);
    expect(notice).not.toHaveTextContent(/CYCLE/);
  });
});
