// FILE: admin-organization-entry.test.tsx
// PURPOSE: Post-login /app must surface "Otzar found" for org admins —
//          founder-visible without hunting Control Tower icon.
// CONNECTS TO: AdminOrganizationEntry, capabilities, org-discovery.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { AdminOrganizationEntry } from "@/components/otzar/AdminOrganizationEntry";
import { useAuthStore } from "@/lib/stores/auth";

const API = "http://localhost:3000/api/v1";

function renderEntry() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <AdminOrganizationEntry />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  server.use(
    http.get(`${API}/org/entities`, () =>
      HttpResponse.json({
        ok: true,
        items: [
          {
            entity_id: "00000000-0000-0000-0000-000000000001",
            entity_type: "PERSON",
            display_name: "Ada",
            email: "ada@example.com",
            status: "ACTIVE",
            activation_status: "active",
          },
        ],
        has_more: false,
      }),
    ),
    http.get(`${API}/org/hierarchy`, () =>
      HttpResponse.json({
        ok: true,
        org_entity_id: "00000000-0000-0000-0000-000000000099",
        memberships: [],
      }),
    ),
    http.get(`${API}/otzar/dandelion/seeds`, () =>
      HttpResponse.json({ ok: true, seeds: [] }),
    ),
  );
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({
    token: null,
    entity: null,
    capabilities: null,
    isAuthenticated: false,
  });
});

describe("AdminOrganizationEntry", () => {
  it("renders nothing for non-admin employees", () => {
    useAuthStore.setState({
      token: "t",
      entity: { email: "emp@example.com" },
      isAuthenticated: true,
      capabilities: {
        can_admin_org: false,
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: false,
        can_admin_niov: false,
      },
    });
    renderEntry();
    expect(screen.queryByTestId("admin-organization-entry")).toBeNull();
  });

  it("shows Otzar found + Organization link for org admins", async () => {
    useAuthStore.setState({
      token: "t",
      entity: { email: "admin@example.com" },
      isAuthenticated: true,
      capabilities: {
        can_admin_org: true,
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: false,
        can_admin_niov: false,
      },
    });
    renderEntry();
    const entry = await screen.findByTestId("admin-organization-entry");
    expect(entry).toBeInTheDocument();
    expect(entry.textContent).toMatch(/Otzar found/i);
    expect(entry.getAttribute("href")).toBe("/setup");
    await waitFor(() => {
      expect(screen.getByTestId("admin-organization-entry-signal").textContent)
        .toMatch(/people/i);
    });
  });
});
