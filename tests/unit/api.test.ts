// FILE: tests/unit/api.test.ts
// PURPOSE: Patent-defensive contract tests for the api.ts HTTP client.
// CONNECTS TO: src/lib/api.ts.
//
// COVERS THE TWO INVARIANTS THAT MUST NEVER REGRESS:
//   1. Authorization: Bearer <token> attaches automatically when a
//      token is present.
//   2. A 401 response triggers the configured onUnauthorized callback
//      (in production this is auth-store logout).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/lib/api";

describe("ApiClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("attaches Authorization: Bearer <token> when a token is present", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: true,
            version: "0.0.1",
            database: "connected",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    globalThis.fetch = fetchMock;

    const onUnauthorized = vi.fn();
    const client = new ApiClient({
      baseUrl: "http://test.local",
      getToken: () => "tok-abc-123",
      onUnauthorized,
    });

    const result = await client.platform.health();
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const calls = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock
      .calls;
    expect(calls.length).toBeGreaterThan(0);
    const firstCall = calls[0];
    if (!firstCall || firstCall.length < 2) {
      throw new Error("expected fetch to be called with init argument");
    }
    const init = firstCall[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer tok-abc-123");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("invokes onUnauthorized when the server returns 401", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ code: "SESSION_INVALID" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
    );
    globalThis.fetch = fetchMock;

    const onUnauthorized = vi.fn();
    const client = new ApiClient({
      baseUrl: "http://test.local",
      getToken: () => "expired-token",
      onUnauthorized,
    });

    const result = await client.org.analytics();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.code).toBe("SESSION_INVALID");
    }
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
