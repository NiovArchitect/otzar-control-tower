// FILE: tests/unit/section16-session-restore.test.tsx
// PURPOSE: [SECTION-16] CT session-continuity units — (1) resolveDestination
//          open-redirect safety + returnTo preference; (2) restoreSession
//          rehydrates the in-memory store from /auth/me and NEVER persists auth
//          to browser storage; (3) the guards capture returnTo when bouncing to
//          /login.
// CONNECTS TO: src/pages/Login.tsx (resolveDestination), src/lib/stores/auth.ts
//              (restoreSession), src/components/AuthGuard.tsx + EmployeeGuard.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router-dom";
import { resolveDestination } from "@/pages/Login";
import { api } from "@/lib/api";
import { restoreSession, useAuthStore } from "@/lib/stores/auth";
import { AuthGuard } from "@/components/AuthGuard";
import { EmployeeGuard } from "@/components/employee/EmployeeGuard";

const ADMIN = {
  can_read_capsules: true,
  can_write_capsules: true,
  can_share_capsules: true,
  can_admin_org: true,
  can_admin_niov: false,
};
const EMPLOYEE = { ...ADMIN, can_admin_org: false };

function resetStore() {
  useAuthStore.setState({
    token: null,
    entity: null,
    capabilities: null,
    isAuthenticated: false,
    isLoading: false,
    loginError: null,
  });
}
beforeEach(resetStore);

describe("[SECTION-16] resolveDestination — returnTo preference + open-redirect safety", () => {
  it("prefers a same-origin returnTo path over persona routing", () => {
    expect(resolveDestination("/users", ADMIN)).toBe("/users");
    expect(resolveDestination("/app/action-center", EMPLOYEE)).toBe("/app/action-center");
  });

  it("accepts an already-decoded deep path (input comes decoded from useSearchParams)", () => {
    expect(resolveDestination("/app/my-twin", EMPLOYEE)).toBe("/app/my-twin");
  });

  it("falls back to persona routing when returnTo is absent", () => {
    expect(resolveDestination(null, ADMIN)).toBe("/");
    expect(resolveDestination(null, EMPLOYEE)).toBe("/app");
    expect(resolveDestination("", ADMIN)).toBe("/");
  });

  it("REJECTS open-redirect vectors and never bounces to /login", () => {
    // protocol-relative + absolute URLs must not be honored
    expect(resolveDestination("//evil.com", ADMIN)).toBe("/");
    expect(resolveDestination("https://evil.com", ADMIN)).toBe("/");
    expect(resolveDestination("http://evil.com", EMPLOYEE)).toBe("/app");
    // a returnTo pointing back at /login would loop
    expect(resolveDestination("/login", EMPLOYEE)).toBe("/app");
    expect(resolveDestination("/login?x=1", ADMIN)).toBe("/");
  });
});

describe("[SECTION-16] restoreSession — rehydrate from /auth/me, memory-only", () => {
  it("rehydrates the in-memory store on a valid restore", async () => {
    vi.spyOn(api.auth, "me").mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        token: "restored-token",
        session_id: "sess-1",
        entity: { email: "person@meridian.test" },
        allowed_operations: ["read", "write", "admin_org"],
        clearance_ceiling: 3,
      },
    } as never);
    const restored = await restoreSession();
    expect(restored).toBe(true);
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.token).toBe("restored-token");
    expect(s.entity?.email).toBe("person@meridian.test");
    expect(s.capabilities?.can_admin_org).toBe(true);
    expect(s.capabilities?.can_read_capsules).toBe(true);
  });

  it("leaves the store logged out when /auth/me returns no session", async () => {
    vi.spyOn(api.auth, "me").mockResolvedValue({
      ok: false,
      code: "NO_SESSION",
      message: "",
      status: 401,
    } as never);
    const restored = await restoreSession();
    expect(restored).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("never writes the token to localStorage/sessionStorage (memory-only)", async () => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(api.auth, "me").mockResolvedValue({
      ok: true,
      data: {
        ok: true,
        token: "secret-token-xyz",
        session_id: "sess-2",
        entity: { email: "a@b.test" },
        allowed_operations: ["read"],
        clearance_ceiling: 1,
      },
    } as never);
    await restoreSession();
    expect(JSON.stringify(localStorage)).not.toContain("secret-token-xyz");
    expect(JSON.stringify(sessionStorage)).not.toContain("secret-token-xyz");
  });
});

function ShowReturnTo() {
  const [params] = useSearchParams();
  return <div data-testid="login-screen">returnTo={params.get("returnTo") ?? "none"}</div>;
}

describe("[SECTION-16] guards capture returnTo when bouncing to /login", () => {
  it("AuthGuard preserves the attempted admin path", () => {
    render(
      <MemoryRouter initialEntries={["/users"]}>
        <Routes>
          <Route path="/users" element={<AuthGuard><div>protected</div></AuthGuard>} />
          <Route path="/login" element={<ShowReturnTo />} />
        </Routes>
      </MemoryRouter>,
    );
    // React Router decodes the query value, so the guard-encoded %2Fusers reads
    // back as /users — resolveDestination then returns it verbatim (no re-decode).
    expect(screen.getByTestId("login-screen")).toHaveTextContent("returnTo=/users");
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });

  it("EmployeeGuard preserves the attempted /app deep link", () => {
    render(
      <MemoryRouter initialEntries={["/app/action-center"]}>
        <Routes>
          <Route path="/app/action-center" element={<EmployeeGuard><div>emp</div></EmployeeGuard>} />
          <Route path="/login" element={<ShowReturnTo />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("login-screen")).toHaveTextContent(
      "returnTo=/app/action-center",
    );
  });
});
