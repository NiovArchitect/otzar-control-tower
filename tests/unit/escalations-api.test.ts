// FILE: tests/unit/escalations-api.test.ts
// PURPOSE: Contract tests for the api.escalations.* employee Approvals
//          methods. Asserts each method hits the correct /escalations/*
//          path with the right method + body, attaches Bearer, and
//          introduces NO /console/* call.
// CONNECTS TO: src/lib/api.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "@/lib/api";

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function lastCall(fetchMock: typeof globalThis.fetch): {
  url: string;
  init: RequestInit;
} {
  const calls = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock
    .calls;
  const first = calls[0];
  if (!first || first.length < 2) {
    throw new Error("expected fetch to be called with (url, init)");
  }
  return { url: String(first[0]), init: first[1] as RequestInit };
}

describe("api.escalations.*", () => {
  let originalFetch: typeof globalThis.fetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function client(): ApiClient {
    return new ApiClient({
      baseUrl: "http://test.local",
      getToken: () => "tok-emp-1",
      onUnauthorized: vi.fn(),
    });
  }

  it("pending -> GET /escalations/pending (no query when no limit) + Bearer", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({ ok: true, escalations: [] }),
    );
    globalThis.fetch = fetchMock;

    const r = await client().escalations.pending();
    expect(r.ok).toBe(true);
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe("http://test.local/escalations/pending");
    expect(init.method ?? "GET").toBe("GET");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer tok-emp-1",
    );
    expect(url).not.toContain("/console");
  });

  it("pending -> includes limit query when provided", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({ ok: true, escalations: [] }),
    );
    globalThis.fetch = fetchMock;

    await client().escalations.pending({ limit: 25 });
    const { url } = lastCall(fetchMock);
    expect(url).toBe("http://test.local/escalations/pending?limit=25");
  });

  it("detail -> GET /escalations/:id", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({ ok: true, escalation: { escalation_id: "e1" } }),
    );
    globalThis.fetch = fetchMock;

    await client().escalations.detail("e1");
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe("http://test.local/escalations/e1");
    expect(init.method ?? "GET").toBe("GET");
    expect(url).not.toContain("/console");
  });

  it("approve -> POST /escalations/:id/approve with resolution_metadata body", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({ ok: true, escalation: { escalation_id: "e1", status: "APPROVED" } }),
    );
    globalThis.fetch = fetchMock;

    const r = await client().escalations.approve("e1", {
      resolution_metadata: { note: "looks good" },
    });
    expect(r.ok).toBe(true);
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe("http://test.local/escalations/e1/approve");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      resolution_metadata: { note: "looks good" },
    });
    expect(url).not.toContain("/console");
  });

  it("reject -> POST /escalations/:id/reject with resolution_metadata body", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({ ok: true, escalation: { escalation_id: "e1", status: "REJECTED" } }),
    );
    globalThis.fetch = fetchMock;

    const r = await client().escalations.reject("e1", {
      resolution_metadata: { note: "not now" },
    });
    expect(r.ok).toBe(true);
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe("http://test.local/escalations/e1/reject");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      resolution_metadata: { note: "not now" },
    });
    expect(url).not.toContain("/console");
  });
});
