// FILE: tests/unit/auth-guard.test.tsx
// PURPOSE: Patent-defensive contract tests for AuthGuard.
// CONNECTS TO: src/components/AuthGuard.tsx, src/lib/stores/auth.ts.
//
// COVERS THE TWO RULES THAT KEEP HUMANS SOVEREIGN:
//   3. Unauthenticated visitors get redirected to /login -- no
//      protected screen ever renders without a token.
//   4. Authenticated users without can_admin_org see Access Denied
//      -- a TAR without admin_org capability cannot reach the
//      Control Tower.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuthStore } from "@/lib/stores/auth";

function setStore(partial: Partial<ReturnType<typeof useAuthStore.getState>>) {
  useAuthStore.setState(partial);
}

beforeEach(() => {
  // Reset to logged-out defaults between tests.
  setStore({
    token: null,
    entity: null,
    capabilities: null,
    isAuthenticated: false,
    isLoading: false,
    loginError: null,
  });
});

describe("AuthGuard", () => {
  it("redirects unauthenticated visitors to /login", () => {
    setStore({ isAuthenticated: false });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <AuthGuard>
                <div>protected content</div>
              </AuthGuard>
            }
          />
          <Route path="/login" element={<div>login screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("login screen")).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("bounces authenticated non-admins to employee Home (/app) — no CT shell", () => {
    setStore({
      token: "tok",
      entity: { email: "viewer@example.com" },
      capabilities: {
        can_read_capsules: true,
        can_write_capsules: false,
        can_share_capsules: false,
        can_admin_org: false,
        can_admin_niov: false,
      },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={["/users"]}>
        <Routes>
          <Route
            path="/users"
            element={
              <AuthGuard>
                <div>protected content</div>
              </AuthGuard>
            }
          />
          <Route path="/app" element={<div>employee home</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("employee home")).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /access denied/i })).toBeNull();
  });

  it("still admits an authenticated org admin (Control Tower not weakened)", () => {
    setStore({
      token: "tok",
      entity: { email: "admin@example.com" },
      capabilities: {
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: true,
        can_admin_org: true,
        can_admin_niov: false,
      },
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <AuthGuard>
                <div>protected content</div>
              </AuthGuard>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("protected content")).toBeInTheDocument();
  });
});
