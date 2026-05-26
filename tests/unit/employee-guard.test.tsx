// FILE: tests/unit/employee-guard.test.tsx
// PURPOSE: Contract tests for EmployeeGuard -- the employee Otzar shell
//          gate. Admits can_read_capsules; never requires can_admin_org;
//          never consults can_admin_niov.
// CONNECTS TO: src/components/employee/EmployeeGuard.tsx,
//              src/lib/stores/auth.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EmployeeGuard } from "@/components/employee/EmployeeGuard";
import { useAuthStore } from "@/lib/stores/auth";

function setStore(partial: Partial<ReturnType<typeof useAuthStore.getState>>) {
  useAuthStore.setState(partial);
}

beforeEach(() => {
  setStore({
    token: null,
    entity: null,
    capabilities: null,
    isAuthenticated: false,
    isLoading: false,
    loginError: null,
  });
});

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route
          path="/app"
          element={
            <EmployeeGuard>
              <div>employee content</div>
            </EmployeeGuard>
          }
        />
        <Route path="/login" element={<div>login screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("EmployeeGuard", () => {
  it("redirects unauthenticated visitors to /login", () => {
    setStore({ isAuthenticated: false });
    renderGuard();
    expect(screen.getByText("login screen")).toBeInTheDocument();
    expect(screen.queryByText("employee content")).not.toBeInTheDocument();
  });

  it("admits an authenticated user with can_read_capsules", () => {
    setStore({
      token: "tok",
      entity: { email: "employee@example.com" },
      capabilities: {
        can_read_capsules: true,
        can_write_capsules: false,
        can_share_capsules: false,
        can_admin_org: false,
        can_admin_niov: false,
      },
      isAuthenticated: true,
    });
    renderGuard();
    expect(screen.getByText("employee content")).toBeInTheDocument();
  });

  it("shows No Otzar access when authenticated without can_read_capsules", () => {
    setStore({
      token: "tok",
      entity: { email: "noaccess@example.com" },
      capabilities: {
        can_read_capsules: false,
        can_write_capsules: false,
        can_share_capsules: false,
        can_admin_org: false,
        // Even a niov admin without read gets no employee access.
        can_admin_niov: true,
      },
      isAuthenticated: true,
    });
    renderGuard();
    expect(
      screen.getByRole("heading", { name: /no otzar access/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("employee content")).not.toBeInTheDocument();
  });
});
