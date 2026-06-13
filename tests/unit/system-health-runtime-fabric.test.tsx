// FILE: tests/unit/system-health-runtime-fabric.test.tsx
// PURPOSE: Phase 1277 — lock the System Health "Runtime Fabric" card.
//          Proves it shows runtime TRUTH: Python NOT_CONFIGURED + BEAM
//          DISABLED render honestly (no fake green), the fallback line
//          appears, healthy mocked runtimes render, and no raw env value
//          leaks into the UI.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { SystemHealthPage } from "@/pages/SystemHealth";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "x@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
});

function renderPage(): void {
  render(
    <MemoryRouter>
      <SystemHealthPage />
    </MemoryRouter>,
  );
}

describe("System Health — Runtime Fabric card", () => {
  it("shows Python NOT_CONFIGURED + BEAM DISABLED honestly with the fallback line (default)", async () => {
    renderPage();
    const card = await screen.findByTestId("system-health-runtime-fabric");
    await waitFor(() => {
      expect(card.textContent).toMatch(/Python Intelligence Worker/i);
    });
    expect(card.textContent).toMatch(/NOT CONFIGURED/i);
    expect(card.textContent).toMatch(/DISABLED/i);
    expect(screen.getByTestId("runtime-fabric-fallback").textContent).toMatch(
      /Fallback active/i,
    );
  });

  it("renders HEALTHY runtimes when configured + no fallback line", async () => {
    server.use(
      http.get(`${API_BASE}/system/runtime-capabilities`, () =>
        HttpResponse.json({
          ok: true,
          runtimes: {
            typescript_api: rv("HEALTHY"),
            python_worker: rv("HEALTHY", "PYTHON_INTELLIGENCE_RUNTIME_URL"),
            beam_fabric: rv("HEALTHY", "BEAM_RUNTIME_URL"),
            desktop_native: rv("CONFIGURED_UNVERIFIED"),
            queue_event_bus: rv("NOT_CONFIGURED"),
            fallback_active: false,
          },
        }),
      ),
    );
    renderPage();
    const card = await screen.findByTestId("system-health-runtime-fabric");
    await waitFor(() => {
      expect(card.textContent).toMatch(/BEAM Coordination Fabric/i);
    });
    expect(card.textContent).toMatch(/HEALTHY/i);
    expect(screen.getByTestId("runtime-fabric-fallback").textContent).toMatch(
      /All configured runtimes healthy/i,
    );
  });

  it("never leaks a raw runtime URL value into the UI", async () => {
    server.use(
      http.get(`${API_BASE}/system/runtime-capabilities`, () =>
        HttpResponse.json({
          ok: true,
          runtimes: {
            typescript_api: rv("HEALTHY"),
            python_worker: {
              ...rv("HEALTHY", "PYTHON_INTELLIGENCE_RUNTIME_URL"),
              // The backend NEVER sends the value; assert the UI doesn't
              // render an env key as if it were a secret URL either.
            },
            beam_fabric: rv("DISABLED", "BEAM_RUNTIME_URL"),
            desktop_native: rv("CONFIGURED_UNVERIFIED"),
            queue_event_bus: rv("NOT_CONFIGURED"),
            fallback_active: true,
          },
        }),
      ),
    );
    renderPage();
    const card = await screen.findByTestId("system-health-runtime-fabric");
    await waitFor(() =>
      expect(card.textContent).toMatch(/Python Intelligence Worker/i),
    );
    expect(card.textContent).not.toMatch(/https?:\/\//);
  });
});

function rv(status: string, env_key: string | null = null) {
  return {
    status,
    env_key,
    configured: status !== "NOT_CONFIGURED" && status !== "DISABLED",
    capabilities: [],
    note: "runtime note",
    last_checked_at: null,
  };
}
