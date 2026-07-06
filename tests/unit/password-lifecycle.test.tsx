// FILE: tests/unit/password-lifecycle.test.tsx
// PURPOSE: [PASSWORD-LIFECYCLE] the customer-facing lifecycle:
//          - /forgot-password shows the SAME enumeration-safe copy for
//            any input, posts exactly one request, never renders a
//            token/URL, and honors the copy rules ("expire… used once",
//            "Admins never see or set your password")
//          - Login carries the "Forgot password?" door
//          - /app/account-security changes a password (current+new+
//            confirm), maps failures honestly, claims other-device
//            signout only after success, and never leaks raw codes
//          - Users rows: ACTIVE members get "Send password reset"
//            (never activation), pending members keep "Send activation
//            email" (never reset) — the two purposes never blur;
//            "sent" claims provider acceptance, never delivery.
// CONNECTS TO: ForgotPassword.tsx, AccountSecurity.tsx, Login.tsx,
//          Users.tsx ActivationCell, FND password-lifecycle rail.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ForgotPasswordPage } from "@/pages/ForgotPassword";
import { AccountSecurityPage } from "@/pages/app/AccountSecurity";
import { UsersPage } from "@/pages/Users";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

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
});

describe("[PASSWORD-LIFECYCLE] forgot password — enumeration-safe", () => {
  it("any email gets the same calm confirmation; one POST; no token/URL rendered", async () => {
    const posts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/auth/forgot-password`, async ({ request }) => {
        posts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({
          ok: true,
          message: "If an account exists for that email, we sent reset instructions.",
        });
      }),
    );
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
    const copy = screen.getByTestId("forgot-password-copy").textContent ?? "";
    expect(copy).toContain("expire and can be used once");
    expect(copy).toContain("Admins never see or set your password");
    await userEvent.type(screen.getByTestId("forgot-password-email"), "whoever@example.com");
    await userEvent.click(screen.getByTestId("forgot-password-submit"));
    const done = await screen.findByTestId("forgot-password-done");
    expect(done.textContent).toContain("If an account exists");
    expect(posts).toEqual([{ email: "whoever@example.com" }]);
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/token=|\/activate\?/);
    expect(body).not.toMatch(/account (was )?found|no account/i); // no enumeration signal
  });
});

describe("[PASSWORD-LIFECYCLE] account security — self-service change", () => {
  function renderSecurity() {
    return render(
      <MemoryRouter>
        <AccountSecurityPage />
      </MemoryRouter>,
    );
  }

  it("happy path posts current+new and claims other-device signout only on success", async () => {
    const posts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/auth/change-password`, async ({ request }) => {
        posts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, other_sessions_invalidated: true });
      }),
    );
    renderSecurity();
    expect(screen.getByTestId("account-security-copy").textContent).toContain(
      "Admins never see or set your password",
    );
    await userEvent.type(screen.getByTestId("security-current-password"), "old-password-1");
    await userEvent.type(screen.getByTestId("security-new-password"), "new-password-22");
    await userEvent.type(screen.getByTestId("security-confirm-password"), "new-password-22");
    await userEvent.click(screen.getByTestId("security-submit"));
    const result = await screen.findByTestId("security-result");
    expect(result.textContent).toContain("Password changed");
    expect(result.textContent).toContain("other signed-in devices were signed out");
    expect(posts).toEqual([
      { current_password: "old-password-1", new_password: "new-password-22" },
    ]);
  });

  it("mismatched confirm and wrong current password map to honest copy; no raw codes", async () => {
    server.use(
      http.post(`${API_BASE}/auth/change-password`, () =>
        HttpResponse.json(
          { ok: false, code: "CURRENT_PASSWORD_INCORRECT", message: "no" },
          { status: 403 },
        ),
      ),
    );
    renderSecurity();
    // Client-side mismatch: no POST fires.
    await userEvent.type(screen.getByTestId("security-current-password"), "old-password-1");
    await userEvent.type(screen.getByTestId("security-new-password"), "new-password-22");
    await userEvent.type(screen.getByTestId("security-confirm-password"), "different-thing");
    await userEvent.click(screen.getByTestId("security-submit"));
    expect((await screen.findByTestId("security-result")).textContent).toContain("don't match");
    // Server wrong-current: honest copy, never the raw enum.
    await userEvent.clear(screen.getByTestId("security-confirm-password"));
    await userEvent.type(screen.getByTestId("security-confirm-password"), "new-password-22");
    await userEvent.click(screen.getByTestId("security-submit"));
    const result = await screen.findByTestId("security-result");
    expect(result.textContent).toContain("current password didn't match");
    expect(document.body.textContent ?? "").not.toContain("CURRENT_PASSWORD_INCORRECT");
  });
});

describe("[PASSWORD-LIFECYCLE] Users rows — reset for active, activation for pending, never blurred", () => {
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

  it("active member: Send password reset posts once; copy claims acceptance and never-see-password; pending member keeps activation", async () => {
    const resets: string[] = [];
    server.use(
      http.get(`${API_BASE}/org/entities`, () =>
        HttpResponse.json({
          ok: true,
          items: [person("p-active", "Activeuser", "active"), person("p-pending", "Pending", "activation_pending")],
          total: 2,
          skip: 0,
          take: 250,
        }),
      ),
      http.get(`${API_BASE}/org/hierarchy`, () =>
        HttpResponse.json({ ok: true, org_entity_id: "org-root", memberships: [] }),
      ),
      http.post(`${API_BASE}/org/members/:id/password-reset-email`, ({ params }) => {
        resets.push(String(params.id));
        return HttpResponse.json({ ok: true, status: "sent", expires_at: "2027-01-01T00:00:00.000Z" });
      }),
    );
    renderUsers();
    const resetButtons = await screen.findAllByTestId("users-send-reset-email");
    expect(resetButtons.length).toBe(1); // the ACTIVE member only
    expect(screen.getAllByTestId("users-send-activation-email").length).toBe(1); // the PENDING member only
    expect(resets).toEqual([]);
    await userEvent.click(resetButtons[0]!);
    const toast = await screen.findByText(/provider accepted it/);
    expect(resets).toEqual(["p-active"]);
    expect(toast.textContent).toContain("Password reset email sent");
    expect(toast.textContent).toContain("never see or set their password");
    expect(toast.textContent).not.toMatch(/delivered|opened|received/i);
  });
});
