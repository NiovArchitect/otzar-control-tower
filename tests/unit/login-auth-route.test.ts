// FILE: tests/unit/login-auth-route.test.ts
// PURPOSE: Phase 1304-B regression — the UNAUTHENTICATED auth route (login) must
//          NOT flatten a 401 into SESSION_INVALID and must NOT trigger
//          onUnauthorized()/logout. A 401 on login means bad credentials
//          (INVALID_CREDENTIALS) / SUSPENDED, surfaced honestly. Protected-route
//          401 behavior (logout + SESSION_INVALID) is preserved. The store maps
//          credential codes to recoverable copy, never "SESSION_INVALID".
// CONNECTS TO: src/lib/api.ts (request() authRoute branch), src/lib/stores/auth.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/lib/api";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function lastInit(fetchMock: typeof globalThis.fetch): RequestInit {
  const calls = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock
    .calls;
  const first = calls[0];
  if (!first || first.length < 2)
    throw new Error("expected fetch(url, init)");
  return first[1] as RequestInit;
}

describe("Phase 1304-B — login auth route 401 handling", () => {
  let originalFetch: typeof globalThis.fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // Test: login 401 surfaces the REAL body code, NOT SESSION_INVALID, and does
  // NOT trigger onUnauthorized()/logout.
  it("login 401 → INVALID_CREDENTIALS (not SESSION_INVALID) + no onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      jsonResponse(
        { ok: false, code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
        401,
      ),
    );
    globalThis.fetch = fetchMock;

    const client = new ApiClient({
      baseUrl: "http://test.local",
      getToken: () => null,
      onUnauthorized,
    });
    const r = await client.auth.login("user@example.com", "wrong");

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe("INVALID_CREDENTIALS");
      expect(r.code).not.toBe("SESSION_INVALID");
    }
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  // Test: SUSPENDED (5-attempt lockout, served as 403) surfaces honestly too and
  // does not trigger logout on the login route.
  it("login 403 SUSPENDED → code SUSPENDED + no onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ ok: false, code: "SUSPENDED", message: "Suspended" }, 403),
    ) as typeof globalThis.fetch;
    const client = new ApiClient({
      baseUrl: "http://test.local",
      getToken: () => null,
      onUnauthorized,
    });
    const r = await client.auth.login("user@example.com", "x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("SUSPENDED");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  // Test: login does not attach a stale Authorization header (token is null on a
  // fresh, memory-only auth store).
  it("login sends NO Authorization header when there is no token", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      jsonResponse({ ok: false, code: "INVALID_CREDENTIALS" }, 401),
    );
    globalThis.fetch = fetchMock;
    const client = new ApiClient({
      baseUrl: "http://test.local",
      getToken: () => null,
      onUnauthorized: vi.fn(),
    });
    await client.auth.login("user@example.com", "x");
    const headers = (lastInit(fetchMock).headers ?? {}) as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  // Test: successful login (200) returns the token through the success branch.
  it("login 200 → ok with token", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse(
        {
          ok: true,
          token: "jwt-abc",
          session_id: "sess-1",
          allowed_operations: ["read", "write"],
        },
        200,
      ),
    ) as typeof globalThis.fetch;
    const client = new ApiClient({
      baseUrl: "http://test.local",
      getToken: () => null,
      onUnauthorized: vi.fn(),
    });
    const r = await client.auth.login("user@example.com", "right");
    expect(r.ok).toBe(true);
    if (r.ok && r.data.ok) expect(r.data.token).toBe("jwt-abc");
  });

  // REGRESSION: a PROTECTED route 401 still logs out + reports SESSION_INVALID.
  it("protected route 401 → SESSION_INVALID + onUnauthorized fired (unchanged)", async () => {
    const onUnauthorized = vi.fn();
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ ok: false, code: "SESSION_INVALID" }, 401),
    ) as typeof globalThis.fetch;
    const client = new ApiClient({
      baseUrl: "http://test.local",
      getToken: () => "stale-token",
      onUnauthorized,
    });
    // notifications.list is a protected (non-authRoute) GET.
    const r = await client.notifications.list();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("SESSION_INVALID");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});

describe("Phase 1304-B — auth store renders honest login copy", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("INVALID_CREDENTIALS → 'Incorrect email or password.' (never SESSION_INVALID)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api", () => ({
      api: {
        auth: {
          login: vi.fn(async () => ({
            ok: false,
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials",
            status: 401,
          })),
        },
      },
    }));
    const { useAuthStore } = await import("@/lib/stores/auth");
    const res = await useAuthStore.getState().login("u@example.com", "wrong");
    expect(res.ok).toBe(false);
    expect(res.message).toBe("Incorrect email or password.");
    expect(useAuthStore.getState().loginError).toBe("Incorrect email or password.");
    expect(res.message).not.toMatch(/SESSION_INVALID/);
  });

  it("SUSPENDED → account-locked copy (recoverable, not a session error)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/api", () => ({
      api: {
        auth: {
          login: vi.fn(async () => ({
            ok: false,
            code: "SUSPENDED",
            message: "Suspended",
            status: 403,
          })),
        },
      },
    }));
    const { useAuthStore } = await import("@/lib/stores/auth");
    const res = await useAuthStore.getState().login("u@example.com", "x");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/locked/i);
    expect(res.message).not.toMatch(/SESSION_INVALID/);
  });
});
