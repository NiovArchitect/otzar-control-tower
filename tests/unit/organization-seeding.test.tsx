// FILE: organization-seeding.test.tsx
// PURPOSE: The Admin "Organization Seeding" queue renders governed Dandelion seeds
//          (human-readable, no raw IDs), shows source evidence + approval state, and
//          offers Approve setup / Hold / Reject. Non-admins are told it's admin-only.
//          "Approve setup" calls the endpoint (never auto-grants — that's enforced
//          server-side).

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { useAuthStore } from "@/lib/stores/auth";
import { OrganizationSeedingPage } from "@/pages/OrganizationSeeding";

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
  } as never);
}

function seed(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    seed_id: "led-seed-1",
    seed_type: "grant_tool_access",
    subject_name: "David",
    recommended_action: "GitHub is needed but isn't ready — an admin should connect/authorize it.",
    source_evidence: "David owns the repo access work",
    source_conversation_id: "conv-1",
    confidence: "high",
    approval_required: true,
    policy_status: "needs_review",
    sensitivity: "internal",
    risk_if_ignored: "The committed work is blocked until the tool is connected.",
    status: "SEED_NEEDS_REVIEW",
    resulting_action: null,
    rejection_reason: null,
    hold_reason: null,
    reviewed: false,
    created_at: new Date().toISOString(),
    ...over,
  };
}

function mockSeeds(seeds: ReadonlyArray<Record<string, unknown>>): void {
  server.use(http.get(`${API_BASE}/org/dandelion/seeds`, () => HttpResponse.json({ ok: true, seeds })));
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <OrganizationSeedingPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setAuth();
});

describe("Organization Seeding — admin seed queue", () => {
  it("renders a seed with its human-readable action, evidence, and review controls", async () => {
    mockSeeds([seed()]);
    renderPage();
    const card = await screen.findByTestId("org-seed-card");
    expect(card.textContent).toMatch(/Tool access needed/);
    expect(card.textContent).toMatch(/David/);
    expect(card.textContent).toMatch(/GitHub is needed/);
    expect(screen.getByTestId("org-seed-evidence").textContent).toMatch(/repo access work/);
    // Approve/Hold/Reject controls render.
    expect(screen.getByTestId("org-seed-approve")).toHaveTextContent(/Approve setup/i);
    expect(screen.getByTestId("org-seed-hold")).toBeInTheDocument();
    expect(screen.getByTestId("org-seed-reject")).toBeInTheDocument();
    // No raw ledger id leaks as visible text.
    expect(card.textContent).not.toContain("led-seed-1");
  });

  it("Approve setup calls the governed endpoint (server enforces no auto-grant)", async () => {
    let approved: string | null = null;
    mockSeeds([seed()]);
    server.use(
      http.post(`${API_BASE}/org/dandelion/seeds/:id/approve`, ({ params }) => {
        approved = params.id as string;
        return HttpResponse.json({ ok: true, seed: seed({ status: "SEED_APPROVED", resulting_action: "setup action created — access is NOT granted automatically" }) });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("org-seed-approve");
    await user.click(screen.getByTestId("org-seed-approve"));
    await waitFor(() => expect(approved).toBe("led-seed-1"));
  });

  it("shows an admin-only message when the API denies a non-admin", async () => {
    server.use(http.get(`${API_BASE}/org/dandelion/seeds`, () => HttpResponse.json({ ok: false, code: "OPERATION_NOT_PERMITTED" }, { status: 403 })));
    renderPage();
    expect(await screen.findByTestId("org-seeding-denied")).toHaveTextContent(/organization admins/i);
  });

  it("shows a calm empty state when there are no suggestions", async () => {
    mockSeeds([]);
    renderPage();
    expect(await screen.findByTestId("org-seeding-empty")).toHaveTextContent(/No suggestions yet/i);
  });
});
