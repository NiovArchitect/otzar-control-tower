// FILE: tests/unit/ask-twin-related-work.test.tsx
// PURPOSE: Phase 1286-D — locks the "Find related work" panel under Ask your
//          Twin. Covers: deterministic Work-OS routing still short-circuits (no
//          governed/semantic call); a genuine self-question uses the governed
//          answer then offers related work; the fetch hits semantic-retrieval/
//          query with auth; validated vs Python-down labels; empty state; Open
//          routing; no raw UUID; and that NO task/send/approval API is called.
// CONNECTS TO: src/pages/app/MyTwin.tsx (AskYourTwin + RelatedWorkPanel).

import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MyTwin } from "@/pages/app/MyTwin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

const navigateSpy = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useNavigate: () => navigateSpy };
});

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: { can_read_capsules: true, can_write_capsules: true, can_share_capsules: false, can_admin_org: true, can_admin_niov: false },
  });
}

// Track every method+path the page calls, to prove no task/send/approval fires.
const calls: string[] = [];
function trackAll(): void {
  server.events.removeAllListeners();
  server.events.on("request:start", ({ request }) => {
    calls.push(`${request.method} ${new URL(request.url).pathname}`);
  });
}

function mockTwin(): void {
  // A populated twin so the page renders fully, including the Ask-your-Twin box
  // (shape mirrors the canonical my-twin test).
  server.use(
    http.get(`${API_BASE}/otzar/my-twin`, () =>
      HttpResponse.json(
        {
          ok: true,
          twin: {
            twin_id: "twin-self-0001",
            display_name: "Your AI Teammate",
            role_title: "Executive Assistant",
            autonomy_mode: "APPROVAL_REQUIRED",
            swarm_enabled: false,
            role_template: null,
            is_admin_twin: false,
            status: "ACTIVE",
            skills: [],
            approver: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          has_multiple_twins: false,
          twin_count: 1,
        },
        { status: 200 },
      ),
    ),
  );
}

// A HIGH-context governed answer (transparency present, retrieval USED) so the
// related-work panel stays BUTTON-triggered for these tests. Low-context auto-
// find is covered by its own test below.
function mockConversation(transparencyOver: Record<string, unknown> = {}): void {
  server.use(
    http.post(`${API_BASE}/otzar/conversation/message`, () =>
      HttpResponse.json({ ok: true, response: "Here is what I found in your governed context.", conversation_id: "c1", context_used: 3, tokens_consumed: 10, next_step: "ANSWERED", correction_capture_available: true, speech_ready_text: "x", voice_output_supported: false, clarification_needed: false, action_proposed: false, approval_required: false, policy_blocked: false, dmw_scope_blocked: false, collaboration_suggested: false, memory_used_summary: {}, transparency: { context_items_used: 3, items_skipped_low_relevance: 0, items_skipped_budget: 0, access_limited: false, retrieval_status: "USED", retrieval_source: "COE_ASSEMBLE_CONTEXT", retrieval_reason: "", memory_updated: false, tool_calls: [], approval_required: false, verification_status: "NOT_ACTIVE", ...transparencyOver } }),
    ),
  );
}

function mockSemantic(body: Record<string, unknown>, status = 200): void {
  server.use(http.post(`${API_BASE}/work-os/semantic-retrieval/query`, () => HttpResponse.json(body, { status })));
}

function result(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    result_id: "led-decision",
    result_type: "DECISION",
    title: "Onboarding copy decision",
    summary: "We decided to go with the new onboarding copy.",
    score: 9,
    reason: "Matched query terms in the title",
    source: { source_system: "work_ledger", ledger_entry_id: "led-decision" },
    route: "/app/my-work",
    related_person: { entity_id: "ent-sam", display_name: "Samiksha Rao", unresolved: false },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    scope_label: "personal",
    provenance: "python:semantic-rerank",
    ...over,
  };
}

const VALIDATED_ENV = { status: "PYTHON_ENRICHED", source: "PYTHON_ADVISORY", authority: "FOUNDATION_VALIDATED", capability: "SEMANTIC_RETRIEVAL", latency_ms: 40, provenance: "python:semantic-rerank", warnings: [], updated_at: new Date().toISOString() };
const DOWN_ENV = { status: "UNHEALTHY", source: "PYTHON_ADVISORY", authority: null, capability: "SEMANTIC_RETRIEVAL", latency_ms: null, provenance: "foundation:deterministic-lexical", warnings: [], updated_at: new Date().toISOString() };

function renderPage(): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MyTwin />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setAuth();
  navigateSpy.mockReset();
  calls.length = 0;
  mockTwin();
});

async function askSelfQuestion(): Promise<void> {
  await waitFor(() => expect(screen.getByTestId("ask-your-twin-input")).toBeInTheDocument());
  await userEvent.type(screen.getByTestId("ask-your-twin-input"), "what did we decide about onboarding");
  await userEvent.click(screen.getByTestId("ask-your-twin-submit"));
  await waitFor(() => expect(screen.getByTestId("ask-your-twin-answer")).toBeInTheDocument());
}

describe("Ask your Twin — deterministic routing preserved", () => {
  it("a known Work-OS question routes to its surface and never calls conversation/semantic", async () => {
    trackAll();
    renderPage();
    await waitFor(() => expect(screen.getByTestId("ask-your-twin-input")).toBeInTheDocument());
    await userEvent.type(screen.getByTestId("ask-your-twin-input"), "show my blind spots");
    await userEvent.click(screen.getByTestId("ask-your-twin-submit"));
    expect(navigateSpy).toHaveBeenCalledWith("/app/blind-spots");
    expect(calls.some((c) => c.includes("/otzar/conversation/message"))).toBe(false);
    expect(calls.some((c) => c.includes("/work-os/semantic-retrieval/query"))).toBe(false);
  });
});

describe("Ask your Twin — Find related work (advisory, scoped)", () => {
  it("a self question uses the governed answer, then offers related work behind a button", async () => {
    mockConversation();
    renderPage();
    await askSelfQuestion();
    // High-context answer → related work is button-triggered (not auto).
    expect(screen.getByTestId("ask-related-find")).toBeInTheDocument();
    expect(screen.queryByTestId("ask-related-results")).toBeNull();
  });

  it("AUTO-runs related retrieval when the governed answer has low/no context (Phase 1287-C)", async () => {
    // Low-context governed answer (NO_MATCHES) → the Twin should not feel
    // unaware: it auto-runs the scoped related retrieval without a manual click.
    mockConversation({ context_items_used: 0, retrieval_status: "NO_MATCHES" });
    mockSemantic({ ok: true, results: [result()], envelope: VALIDATED_ENV });
    renderPage();
    await askSelfQuestion();
    // No button click — results appear automatically.
    await waitFor(() => expect(screen.getByTestId("ask-related-results")).toBeInTheDocument());
    expect(screen.queryByTestId("ask-related-find")).toBeNull();
    expect(screen.getByTestId("ask-related-item")).toBeInTheDocument();
  });

  it("clicking Find related work calls semantic-retrieval/query and renders validated results", async () => {
    mockConversation();
    mockSemantic({ ok: true, results: [result()], envelope: VALIDATED_ENV });
    trackAll();
    renderPage();
    await askSelfQuestion();
    await userEvent.click(screen.getByTestId("ask-related-find"));
    await waitFor(() => expect(screen.getByTestId("ask-related-results")).toBeInTheDocument());
    expect(calls.some((c) => c === "POST /api/v1/work-os/semantic-retrieval/query")).toBe(true);
    expect(screen.getByTestId("ask-related-label").textContent).toBe("Advisory rerank, validated by Otzar");
    const item = screen.getByTestId("ask-related-item");
    expect(within(item).getByText("Onboarding copy decision")).toBeInTheDocument();
    expect(item.textContent).toContain("Samiksha Rao");
    expect(item.textContent).toContain("relevance 9");
    // No raw UUID / ledger id as a label.
    expect(item.textContent).not.toContain("led-decision");
    expect(item.textContent).not.toContain("ent-sam");
    // No task/send/approval API is WRITTEN by the display. (The page itself
    // legitimately READS /actions on mount — the GAP-H-OPS "My AI Twin"
    // transparency panel lists recent governed activity — so the invariant
    // is no mutation, not no read.)
    expect(calls.some((c) => c.startsWith("POST") && c.includes("/actions"))).toBe(false);
    expect(calls.some((c) => /\/notifications\/.*\/(read|reply)/.test(c))).toBe(false);
  });

  it("shows a deterministic label when Python is down", async () => {
    mockConversation();
    mockSemantic({ ok: true, results: [result({ provenance: "foundation:deterministic-lexical" })], envelope: DOWN_ENV });
    renderPage();
    await askSelfQuestion();
    await userEvent.click(screen.getByTestId("ask-related-find"));
    await waitFor(() => expect(screen.getByTestId("ask-related-label")).toBeInTheDocument());
    expect(screen.getByTestId("ask-related-label").textContent).toBe("Related work, scoped to your organization");
    expect(screen.getByTestId("ask-related-provenance").textContent).toMatch(/unhealthy/);
  });

  it("renders an honest empty state when there is no related work", async () => {
    mockConversation();
    mockSemantic({ ok: true, results: [], envelope: DOWN_ENV });
    renderPage();
    await askSelfQuestion();
    await userEvent.click(screen.getByTestId("ask-related-find"));
    await waitFor(() => expect(screen.getByTestId("ask-related-empty")).toBeInTheDocument());
  });

  it("Open routes to the result destination", async () => {
    mockConversation();
    mockSemantic({ ok: true, results: [result()], envelope: VALIDATED_ENV });
    renderPage();
    await askSelfQuestion();
    await userEvent.click(screen.getByTestId("ask-related-find"));
    await waitFor(() => expect(screen.getByTestId("ask-related-open")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("ask-related-open"));
    expect(navigateSpy).toHaveBeenCalledWith("/app/my-work");
  });

  it("shows an honest error when retrieval fails, governed answer remains", async () => {
    mockConversation();
    mockSemantic({ ok: false, code: "API_ERROR" }, 500);
    renderPage();
    await askSelfQuestion();
    await userEvent.click(screen.getByTestId("ask-related-find"));
    await waitFor(() => expect(screen.getByTestId("ask-related-error")).toBeInTheDocument());
    expect(screen.getByTestId("ask-your-twin-answer")).toBeInTheDocument();
  });
});
