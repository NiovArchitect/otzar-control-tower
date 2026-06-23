// FILE: tests/unit/twin-scope-panel.test.tsx
// PURPOSE: [OTZAR-V1-LIVE-2B] Lock the governed "what your Twin can — and cannot
//          — do" scope panel. It must surface BOTH the accessible capabilities
//          and the explicit restricted boundaries (the Twin is bounded by the
//          human's authority + the safety invariants), sourced from Foundation's
//          context-health, in calm employee vocabulary, and link to the grant
//          control surface.
// CONNECTS TO: src/components/employee/TwinScopePanel.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { TwinScopePanel } from "@/components/employee/TwinScopePanel";
import { useAuthStore } from "@/lib/stores/auth";
import type { ContextHealthResponse } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
}

function ctx(
  overrides: Partial<ContextHealthResponse["identity"]["authority"]> = {},
): ContextHealthResponse {
  return {
    ok: true,
    status: "READY",
    identity: {
      viewer: {
        user_id: "u",
        email: "sadeil@niovlabs.com",
        display_name: "Sadeil Lewis",
        title: "FOUNDER",
        org_role: "FOUNDER",
        is_founder_admin: true,
      },
      org: { org_id: "o", name: "NIOV Labs", domain: null },
      twin: { twin_id: "t", display_name: "Otzar", active: true },
      projects: [],
      authority: {
        can_admin_org: true,
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: true,
        can_access_external_api: false,
        external_write_policy: "APPROVAL_REQUIRED",
        ...overrides,
      },
      context_signals: {
        memory_capsules_count: 8,
        transcript_summaries_count: 2,
        collaboration_inbound_count: 1,
        collaboration_outbound_count: 4,
      },
      org_roster: [],
      safety: {
        no_external_write_without_approval: true,
        no_private_data_to_unauthorized_users: true,
        no_raw_audio_storage: true,
        no_raw_transcript_default: true,
      },
    },
  };
}

function mockCtx(resp: ContextHealthResponse): void {
  server.use(
    http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
      HttpResponse.json(resp),
    ),
  );
}

function renderPanel(): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TwinScopePanel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => setAuth());

describe("TwinScopePanel — governed scope (LIVE-2B)", () => {
  it("renders BOTH a can-access and a cannot-do section from context-health", async () => {
    mockCtx(ctx());
    renderPanel();
    await screen.findByTestId("twin-scope-panel");
    expect(screen.getByTestId("twin-scope-can")).toBeInTheDocument();
    expect(screen.getByTestId("twin-scope-cannot")).toBeInTheDocument();
  });

  it("surfaces the bounded-authority guarantee + memory-in-scope count", async () => {
    mockCtx(ctx());
    renderPanel();
    await screen.findByTestId("twin-scope-panel");
    const text = screen.getByTestId("twin-scope-panel").textContent ?? "";
    // The core governance claim, in employee vocabulary.
    expect(text).toMatch(/can only (reach|access) what you can (reach|access)/i);
    // Memory count drawn from context-health.
    expect(text).toContain("8 memory items");
    // No Foundation data-model jargon leaks into employee copy.
    expect(text).not.toMatch(/\bDMW\b|\bCOSMP\b|\bcapsule\b|\bTAR\b/);
  });

  it("shows external access as OFF (cannot reach external systems) when not granted", async () => {
    mockCtx(ctx({ can_access_external_api: false }));
    renderPanel();
    await screen.findByTestId("twin-scope-cannot");
    const cannot = screen.getByTestId("twin-scope-cannot").textContent ?? "";
    expect(cannot).toMatch(/external systems on its own/i);
    expect(cannot).toMatch(/private data with people who aren't authorized/i);
    expect(cannot).toMatch(/raw audio/i);
  });

  it("links to the authority-grants control surface", async () => {
    mockCtx(ctx());
    renderPanel();
    const link = await screen.findByTestId("twin-scope-grants-link");
    expect(link.getAttribute("href")).toBe("/app/authority-grants");
  });

  it("renders nothing (no scary state) when context-health is unavailable", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
        HttpResponse.json({ ok: false, code: "ERROR" }, { status: 500 }),
      ),
    );
    renderPanel();
    // The panel stays absent rather than rendering an error card.
    await waitFor(() => {
      expect(screen.queryByTestId("twin-scope-panel")).toBeNull();
    });
  });
});
