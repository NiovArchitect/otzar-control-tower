// FILE: tests/unit/otzar-api.test.ts
// PURPOSE: Contract tests for the api.otzar.* employee product methods.
//          Asserts each method hits the correct /otzar/* path with the
//          right method + body, attaches Bearer, and introduces NO
//          /console/* call.
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

describe("api.otzar.*", () => {
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

  it("conversation.message -> POST /otzar/conversation/message with body + Bearer", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({
        ok: true,
        response: "hi",
        context_used: 1,
        tokens_consumed: 2,
        conversation_id: "c1",
      }),
    );
    globalThis.fetch = fetchMock;

    const r = await client().otzar.conversation.message({ message: "hello" });
    expect(r.ok).toBe(true);
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe("http://test.local/otzar/conversation/message");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({ message: "hello" });
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer tok-emp-1",
    );
    expect(url).not.toContain("/console");
  });

  it("conversation.close -> POST /otzar/conversation/close with body", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({ ok: true, capsule_id: "k1", conversation_id: "c1", topics: [] }),
    );
    globalThis.fetch = fetchMock;

    const r = await client().otzar.conversation.close({ conversation_id: "c1" });
    expect(r.ok).toBe(true);
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe("http://test.local/otzar/conversation/close");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      conversation_id: "c1",
    });
    expect(url).not.toContain("/console");
  });

  it("observe -> POST /otzar/observe with content + event_type", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({
        ok: true,
        capsule_ids: ["x"],
        extracted_summary: {
          decisions: 0,
          commitments: 0,
          work_patterns: 0,
          external_entities: 0,
          vocab_growth: 0,
        },
      }),
    );
    globalThis.fetch = fetchMock;

    const r = await client().otzar.observe({
      content: "a note",
      event_type: "NOTE",
    });
    expect(r.ok).toBe(true);
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe("http://test.local/otzar/observe");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      content: "a note",
      event_type: "NOTE",
    });
    expect(url).not.toContain("/console");
  });

  it("correction -> POST /otzar/correction with the feedback body (no conversation_id when omitted)", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({ ok: true, correction_capsule_id: "cc1" }),
    );
    globalThis.fetch = fetchMock;

    const r = await client().otzar.correction({
      incorrect_description: "wrong",
      correct_behavior: "right",
    });
    expect(r.ok).toBe(true);
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe("http://test.local/otzar/correction");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      incorrect_description: "wrong",
      correct_behavior: "right",
    });
    // Backward-compatible: when omitted, the field must NOT be on the wire.
    expect(body).not.toHaveProperty("conversation_id");
    expect(url).not.toContain("/console");
  });

  it("correction -> POST /otzar/correction includes conversation_id when provided (ADR-0055 Wave 2C)", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({ ok: true, correction_capsule_id: "cc2" }),
    );
    globalThis.fetch = fetchMock;

    await client().otzar.correction({
      incorrect_description: "wrong",
      correct_behavior: "right",
      conversation_id: "conv-closed-0001",
    });
    const { init } = lastCall(fetchMock);
    expect(JSON.parse(String(init.body))).toMatchObject({
      incorrect_description: "wrong",
      correct_behavior: "right",
      conversation_id: "conv-closed-0001",
    });
  });

  it("conversations.corrections -> GET /otzar/conversations/:id/corrections (id encoded)", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({
        ok: true,
        conversation_id: "conv-closed-0001",
        corrections_count: 3,
        has_corrections: true,
        last_correction_at: new Date().toISOString(),
        drift_prevention_note: "note-a",
        continuity_note: "note-b",
      }),
    );
    globalThis.fetch = fetchMock;

    // Path-unsafe id proves encodeURIComponent is applied.
    await client().otzar.conversations.corrections("conv closed/0001");
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(
      "http://test.local/otzar/conversations/conv%20closed%2F0001/corrections",
    );
    expect(init.method ?? "GET").toBe("GET");
    expect(url).not.toContain("/console");
  });

  it("myTwin -> GET /otzar/my-twin + Bearer", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({ ok: true, twin: {}, has_multiple_twins: false, twin_count: 1 }),
    );
    globalThis.fetch = fetchMock;

    const r = await client().otzar.myTwin();
    expect(r.ok).toBe(true);
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe("http://test.local/otzar/my-twin");
    expect(init.method ?? "GET").toBe("GET");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer tok-emp-1",
    );
    expect(url).not.toContain("/console");
  });

  it("conversations.list -> GET /otzar/conversations (no query when no params)", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({ ok: true, items: [], total: 0, has_more: false }),
    );
    globalThis.fetch = fetchMock;

    await client().otzar.conversations.list();
    const { url } = lastCall(fetchMock);
    expect(url).toBe("http://test.local/otzar/conversations");
    expect(url).not.toContain("/console");
  });

  it("conversations.list -> includes skip/take/status query", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({ ok: true, items: [], total: 0, has_more: false }),
    );
    globalThis.fetch = fetchMock;

    await client().otzar.conversations.list({
      skip: 25,
      take: 50,
      status: "ACTIVE",
    });
    const { url } = lastCall(fetchMock);
    expect(url).toContain("skip=25");
    expect(url).toContain("take=50");
    expect(url).toContain("status=ACTIVE");
    expect(url).not.toContain("/console");
  });

  it("conversations.detail -> GET /otzar/conversations/:id (id encoded)", async () => {
    const fetchMock: typeof globalThis.fetch = vi.fn(async () =>
      okJson({
        ok: true,
        conversation: {
          conversation_id: "conv-closed-0001",
          twin_id: "twin-self-0001",
          source_type: "CHAT",
          status: "CLOSED",
          started_at: new Date().toISOString(),
          closed_at: new Date().toISOString(),
          message_count: 9,
          summary: "summary",
          topics: ["pricing"],
          summary_available: true,
          summary_capsule_id: "cap-summary-0001",
          detail_availability: "SUMMARY_AVAILABLE",
          transparency_available: false,
          continuity_note: "note",
        },
      }),
    );
    globalThis.fetch = fetchMock;

    // A path-unsafe id proves encodeURIComponent is applied.
    await client().otzar.conversations.detail("conv closed/0001");
    const { url, init } = lastCall(fetchMock);
    expect(url).toBe(
      "http://test.local/otzar/conversations/conv%20closed%2F0001",
    );
    expect(init.method ?? "GET").toBe("GET");
    expect(url).not.toContain("/console");
  });

  it("exposes no transcript/messages methods on api.otzar", () => {
    const c = client();
    const otzar = c.otzar as unknown as Record<string, unknown>;
    const convos = c.otzar.conversations as unknown as Record<string, unknown>;
    expect(otzar.messages).toBeUndefined();
    expect(otzar.transcript).toBeUndefined();
    expect(convos.messages).toBeUndefined();
    expect(convos.transcript).toBeUndefined();
  });
});
