// FILE: tests/unit/my-twin.test.tsx
// PURPOSE: Page tests for the employee My Twin surface. Verifies the
//          identity renders safely, the multi-twin note + no-teammate
//          empty state, and that NO raw twin_id / role-template body /
//          substrate internals leak into customer-facing UI.
// CONNECTS TO: src/pages/app/MyTwin.tsx, tests/msw/handlers.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MyTwin } from "@/pages/app/MyTwin";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: false,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
}

function renderMyTwin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MyTwin />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => setAuth());

describe("MyTwin (employee Otzar)", () => {
  it("renders the twin identity, skills, and approver safely", async () => {
    renderMyTwin();
    // Scope identity assertions to the main card -- the role-scope panel
    // legitimately repeats some of these (role title, approver, behavior
    // mode), so global getByText would match multiple.
    const card = await screen.findByTestId("my-twin-card");
    expect(within(card).getByText("Your AI Teammate")).toBeInTheDocument();
    expect(within(card).getByText(/Executive Assistant/)).toBeInTheDocument();
    expect(within(card).getByText(/Approval required/i)).toBeInTheDocument();
    expect(screen.getByTestId("my-twin-skills")).toHaveTextContent(
      /Calendar Coordination/,
    );
    expect(within(card).getByText(/Dana Manager/)).toBeInTheDocument();
  });

  it("renders the role-scope profile safely with anti-surveillance framing", async () => {
    renderMyTwin();
    const panel = await screen.findByTestId("role-scope-panel");
    expect(panel).toHaveTextContent(/within your role and access/i);
    expect(panel).toHaveTextContent(/Role-scoped enterprise context/);
    expect(panel).toHaveTextContent(
      /Governed by role and organization access rules/,
    );
    // Permissioned work context is rendered as NOT surveillance.
    expect(within(panel).getByTestId("observation-mode")).toHaveTextContent(
      /Permissioned work context, not surveillance\./i,
    );
    expect(panel).toHaveTextContent(/prevent drift/i);
    expect(panel).toHaveTextContent(
      /Sensitive actions still require permission, policy, or approval/i,
    );
    // No surveillance / monitoring / policing framing, and no raw ids.
    expect(panel).not.toHaveTextContent(
      /monitoring|policing|spy|tracking employees|judging/i,
    );
    const text = panel.textContent ?? "";
    expect(text).not.toContain("twin-self-0001"); // raw id not surfaced
    expect(text).not.toMatch(
      /capability_flags|permission envelope|bridge_id|raw memory|vector|embedding/i,
    );
  });

  it("remains backward-compatible when role_scope_profile is absent", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin`, async () =>
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
    renderMyTwin();
    // Identity still renders; the role-scope panel shows its fallback.
    expect(await screen.findByTestId("my-twin-card")).toBeInTheDocument();
    expect(screen.getByTestId("role-scope-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("role-scope-panel")).not.toBeInTheDocument();
  });

  it("does not expose raw twin_id, role-template body, or substrate internals", async () => {
    const { container } = renderMyTwin();
    await screen.findByText("Your AI Teammate");
    const text = container.textContent ?? "";
    expect(text).not.toContain("twin-self-0001"); // raw twin_id hidden
    expect(text).not.toContain("executive-assistant"); // role_template body hidden
    expect(text).not.toMatch(
      /capsule|vector|bridge_id|capability_flags|template_content|raw memory/i,
    );
  });

  it("renders the no-teammate empty state on 404 TWIN_NOT_FOUND", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin`, async () =>
        HttpResponse.json(
          { ok: false, code: "TWIN_NOT_FOUND", message: "No twin" },
          { status: 404 },
        ),
      ),
    );
    renderMyTwin();
    expect(await screen.findByTestId("my-twin-empty")).toBeInTheDocument();
  });

  it("renders the Ask your Twin box without an em dash in its copy", async () => {
    renderMyTwin();
    const box = await screen.findByTestId("ask-your-twin");
    expect(box).toBeInTheDocument();
    expect(box.textContent ?? "").not.toContain("—");
  });

  describe("Ask your Twin (Phase 1285-R)", () => {
    it("routes a known Work OS question to its surface WITHOUT calling the LLM", async () => {
      let convoCalls = 0;
      server.use(
        http.post(`${API_BASE}/otzar/conversation/message`, () => {
          convoCalls += 1;
          return HttpResponse.json({ ok: true, response: "x" });
        }),
      );
      const user = userEvent.setup();
      renderMyTwin();
      await screen.findByTestId("ask-your-twin");
      await user.type(screen.getByTestId("ask-your-twin-input"), "what is blocked?");
      await user.click(screen.getByTestId("ask-your-twin-submit"));
      // Deterministic route — no governed-chat call, no fake answer rendered.
      expect(convoCalls).toBe(0);
      expect(screen.queryByTestId("ask-your-twin-answer")).toBeNull();
    });

    it("is disabled-honest for another person's Twin (no LLM, no fake answer)", async () => {
      let convoCalls = 0;
      server.use(
        http.post(`${API_BASE}/otzar/conversation/message`, () => {
          convoCalls += 1;
          return HttpResponse.json({ ok: true, response: "x" });
        }),
      );
      const user = userEvent.setup();
      renderMyTwin();
      await screen.findByTestId("ask-your-twin");
      await user.type(
        screen.getByTestId("ask-your-twin-input"),
        "ask David's twin what he thinks",
      );
      await user.click(screen.getByTestId("ask-your-twin-submit"));
      const other = await screen.findByTestId("ask-your-twin-other");
      expect(other.textContent ?? "").toMatch(/will not answer for/i);
      expect(screen.getByTestId("ask-your-twin-collaboration")).toBeInTheDocument();
      expect(convoCalls).toBe(0); // never calls the LLM for someone else's twin
      expect(screen.queryByTestId("ask-your-twin-answer")).toBeNull();
    });

    it("answers a self question from the governed endpoint with attribution + transparency + provenance", async () => {
      server.use(
        http.post(`${API_BASE}/otzar/conversation/message`, () =>
          HttpResponse.json({
            ok: true,
            response: "You have two open items due this week.",
            context_used: 2,
            tokens_consumed: 120,
            conversation_id: "conv-1",
            transparency: {
              context_items_used: 2,
              items_skipped_low_relevance: 0,
              items_skipped_budget: 0,
              access_limited: false,
              retrieval_status: "USED",
              retrieval_source: "COE_ASSEMBLE_CONTEXT",
              retrieval_reason: "matched",
              memory_updated: false,
              tool_calls: [],
              approval_required: false,
              verification_status: "NOT_ACTIVE",
            },
            context_provenance: [
              {
                context_id: "11111111-1111-1111-1111-111111111111",
                title: "Q3 roadmap notes",
                source_type: "CAPSULE",
                scope: "PERSONAL",
                content_available: true,
                reason: "keyword match",
              },
            ],
            next_step: "ANSWERED",
            correction_capture_available: true,
            speech_ready_text: "You have two open items due this week.",
            voice_output_supported: false,
            clarification_needed: false,
            action_proposed: false,
            approval_required: false,
            policy_blocked: false,
            dmw_scope_blocked: false,
            collaboration_suggested: false,
            memory_used_summary: {},
          }),
        ),
      );
      const user = userEvent.setup();
      renderMyTwin();
      await screen.findByTestId("ask-your-twin");
      await user.type(
        screen.getByTestId("ask-your-twin-input"),
        "what should I focus on today?",
      );
      await user.click(screen.getByTestId("ask-your-twin-submit"));
      const answer = await screen.findByTestId("ask-your-twin-answer");
      expect(answer.textContent ?? "").toMatch(/two open items/);
      expect(screen.getByTestId("ask-your-twin-attribution").textContent ?? "").toMatch(
        /from your governed context/i,
      );
      expect(screen.getByTestId("ask-your-twin-transparency")).toBeInTheDocument();
      const prov = screen.getByTestId("ask-your-twin-provenance");
      expect(prov.textContent ?? "").toMatch(/Q3 roadmap notes/);
      // Never render the raw context_id UUID as a label.
      expect(prov.textContent ?? "").not.toContain("11111111-1111-1111-1111-111111111111");
    });

    it("shows an honest error and no fake answer when the governed endpoint fails", async () => {
      server.use(
        http.post(`${API_BASE}/otzar/conversation/message`, () =>
          HttpResponse.json({ ok: false, code: "INTERNAL_ERROR" }, { status: 500 }),
        ),
      );
      const user = userEvent.setup();
      renderMyTwin();
      await screen.findByTestId("ask-your-twin");
      await user.type(screen.getByTestId("ask-your-twin-input"), "summarize my week");
      await user.click(screen.getByTestId("ask-your-twin-submit"));
      await waitFor(() =>
        expect(screen.getByTestId("ask-your-twin-error")).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("ask-your-twin-answer")).toBeNull();
    });
  });

  it("shows the multi-twin note when has_multiple_twins is true", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin`, async () =>
        HttpResponse.json(
          {
            ok: true,
            twin: {
              twin_id: "twin-self-0001",
              display_name: "Your AI Teammate",
              role_title: null,
              autonomy_mode: "OBSERVE_ONLY",
              swarm_enabled: false,
              role_template: null,
              is_admin_twin: false,
              status: "ACTIVE",
              skills: [],
              approver: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            has_multiple_twins: true,
            twin_count: 2,
          },
          { status: 200 },
        ),
      ),
    );
    renderMyTwin();
    expect(
      await screen.findByText(/multiple assigned AI teammates/i),
    ).toBeInTheDocument();
  });
});
