// FILE: tests/unit/users-activation-email.test.tsx
// PURPOSE: [ACT-EMAIL] the Users-row send affordance: "Send activation
//          email" renders ONLY for non-active members, posts exactly one
//          send per explicit click (nothing before), the success copy
//          claims provider ACCEPTANCE ("sent"), never delivery, the
//          not-configured result is honest and points at the copy-link
//          fallback (which remains rendered), and no token/UUID appears
//          in visible copy.
// CONNECTS TO: src/pages/Users.tsx ActivationCell,
//          api.org.members.activationEmail, FND activation-email rail.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { UsersPage } from "@/pages/Users";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function person(id: string, name: string, activation: string) {
  return {
    entity_id: id,
    entity_type: "PERSON",
    display_name: name,
    email: `${name.toLowerCase()}@example.com`,
    status: "ACTIVE",
    activation_status: activation,
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
        items: [person("p-pending", "Pending", "activation_pending"), person("p-active", "Activeuser", "active")],
        total: 2,
        skip: 0,
        take: 250,
      }),
    ),
    http.get(`${API_BASE}/org/hierarchy`, () =>
      HttpResponse.json({ ok: true, org_entity_id: "org-root", memberships: [] }),
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
          <Toaster />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("[ACT-EMAIL] Users row — send activation email", () => {
  it("send renders for pending only; one explicit click = one POST; 'sent' claims acceptance, never delivery", async () => {
    const sends: string[] = [];
    server.use(
      http.post(`${API_BASE}/org/members/:id/activation-email`, ({ params }) => {
        sends.push(String(params.id));
        return HttpResponse.json({ ok: true, status: "sent", expires_at: "2027-01-01T00:00:00.000Z" });
      }),
    );
    renderUsers();
    const buttons = await screen.findAllByTestId("users-send-activation-email");
    // Pending member only — the active member offers reset-link, no email.
    expect(buttons.length).toBe(1);
    expect(screen.getByTestId("users-copy-reset-link")).toBeTruthy();
    // Copy-link fallback remains next to the send button.
    expect(screen.getByTestId("users-copy-activation-link")).toBeTruthy();
    expect(sends).toEqual([]);
    await userEvent.click(buttons[0]!);
    const toast = await screen.findByText(/provider accepted it/);
    expect(sends).toEqual(["p-pending"]);
    expect(toast.textContent).toContain("Activation email sent");
    expect(toast.textContent).not.toMatch(/delivered|opened|received/i);
  });

  it("not-configured is honest and points at the copy-link fallback", async () => {
    server.use(
      http.post(`${API_BASE}/org/members/:id/activation-email`, () =>
        HttpResponse.json(
          { ok: false, code: "EMAIL_NOT_CONFIGURED", message: "Email delivery isn't configured yet — copy the activation link instead." },
          { status: 422 },
        ),
      ),
    );
    renderUsers();
    await userEvent.click((await screen.findAllByTestId("users-send-activation-email"))[0]!);
    const note = await screen.findByText(/isn't configured yet/);
    expect(note.textContent).toContain("copy the activation link instead");
    // No token/UUID leaked anywhere visible.
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(body).not.toMatch(/token=/);
  });
});
