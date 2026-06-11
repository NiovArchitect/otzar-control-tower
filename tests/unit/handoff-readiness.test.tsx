// FILE: tests/unit/handoff-readiness.test.tsx
// PURPOSE: Phase 1242 — locks the "What's ready vs blocked" handoff
//          section on the Production Readiness page: headline, the
//          schema-approval callout, friendly grouped capability
//          labels, honest runtime fallbacks, and the no-secrets
//          boundary.
// CONNECTS TO: src/pages/app/OnboardingReadiness.tsx (HandoffSection),
//          tests/msw/handlers.ts (otzarProductionReadinessHandler).

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { server } from "../msw/server";
import { OnboardingReadiness } from "@/pages/app/OnboardingReadiness";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function mockChecklist(): void {
  server.use(
    http.get(`${API_BASE}/onboarding/checklist`, () =>
      HttpResponse.json({
        ok: true,
        checklist: {
          org_entity_id: "o-1",
          mode: "DEMO",
          ready_for_production_at: null,
          steps: [
            {
              step_id: "ORG_CREATED",
              label: "Create your organization",
              status: "READY",
              summary: "Org exists.",
              completed_at: null,
              auto_ready: true,
              guidance: "",
              summary_ready: "",
            },
          ],
          facts: {
            total_members: 4,
            admin_members: 1,
            role_archetypes_assigned: 4,
            action_policies_configured: 1,
            connector_bindings: 0,
            stt_providers_available: 2,
            stt_providers_missing_keys: 2,
            has_open_audit_chain: true,
            schema_migration_state: "LOCAL_ONLY",
          },
        },
      }),
    ),
  );
}

function setAdmin(): void {
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

beforeEach(() => {
  setAdmin();
  mockChecklist();
});

function renderPage(): void {
  render(
    <MemoryRouter>
      <OnboardingReadiness />
    </MemoryRouter>,
  );
}

describe("OnboardingReadiness — handoff section (Phase 1242)", () => {
  it("renders the headline, schema approval callout, and grouped capabilities", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("handoff-readiness-card")).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId("handoff-readiness-headline"),
    ).toHaveTextContent("ready for a full internal demo");
    expect(screen.getByTestId("handoff-schema-callout")).toHaveTextContent(
      "APPROVE PROD SCHEMA PUSH",
    );
    const caps = screen.getAllByTestId("handoff-capability");
    expect(caps.length).toBeGreaterThanOrEqual(4);
    // Friendly labels, not raw enums, in the visible text.
    const text = screen.getByTestId("handoff-readiness-card").textContent ?? "";
    expect(text).toContain("Ready now");
    expect(text).toContain("Ready after schema approval");
    expect(text).toContain("Needs credentials");
    expect(text).toContain("Not started");
  });

  it("shows honest runtime fallbacks in plain language", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("handoff-runtimes")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("handoff-runtimes")).toHaveTextContent(
      "connect Deepgram or Whisper for production voice input",
    );
  });

  it("handoff copy never exposes secrets or raw env values", async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("handoff-readiness-card")).toBeInTheDocument(),
    );
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("sk-");
    expect(text).not.toContain("client_secret");
    expect(text).not.toContain("super-secret");
  });
});
