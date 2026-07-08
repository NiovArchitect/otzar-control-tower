// FILE: my-twin-activity.test.tsx
// PURPOSE: [GAP-H OPS] The employee "My AI Twin" partner-transparency panel:
//          renders source-backed recent activity in human words; renders the
//          honest empty state when the twin provably did nothing; never
//          fakes activity; never leaks raw backend codes or UUIDs. Composed
//          only from self-scoped endpoints.
// CONNECTS TO: src/components/employee/MyTwinActivityPanel.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MyTwinActivityPanel } from "@/components/employee/MyTwinActivityPanel";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "vishesh@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
});

function renderPanel(): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MyTwinActivityPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function followUp(overrides: Record<string, unknown> = {}) {
  return {
    ledger_entry_id: "led-1",
    meeting_capture_id: null,
    title: "Follow-up to Samiksha",
    status: "DRAFT",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    action: {
      local_id: "f1",
      action_type: "SEND_INTERNAL_NOTIFICATION",
      target: { entity_id: "e-sam", display_name: "Samiksha Sharma", email: null },
      draft_text: "Hi Samiksha — notes attached.",
      reason: "Named in the conversation.",
      source_excerpt: null,
      confidence: "MEDIUM",
      resolution_status: "RESOLVED",
      recipient_governance: {
        entity_id: "e-sam",
        display_name: "Samiksha Sharma",
        email: null,
        role: null,
        participantStatus: "unknown",
        mentionStatus: "alias_mentioned",
        workConnectionType: "none",
        evidence: {
          quote: null,
          source: "correction_memory",
          matchedToken: "samiksha",
          alternativeCandidates: [],
        },
        roleMatch: "unknown",
        hierarchyConnection: "unknown",
        projectConnection: "unknown",
        policyStatus: "unknown",
        sensitivity: "internal",
        confidence: "medium",
        recipientSafety: "likely",
        autonomyEligibility: "approval_required",
      },
      autonomy: { bucket: "NEEDS_REVIEW" },
    },
    ...overrides,
  };
}

describe("[GAP-H OPS] MyTwinActivityPanel", () => {
  it("renders source-backed activity in human words (incl. learn-loop evidence)", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/conversations`, () =>
        HttpResponse.json({
          ok: true,
          items: [
            {
              conversation_id: "c-1",
              twin_id: "tw-1",
              source_type: "CHAT",
              status: "ACTIVE",
              message_count: 4,
              started_at: new Date(Date.now() - 3600_000).toISOString(),
              closed_at: null,
            },
          ],
          total: 1,
          has_more: false,
        }),
      ),
      http.get(`${API_BASE}/work-os/comms/follow-ups`, () =>
        HttpResponse.json({ ok: true, follow_ups: [followUp()] }),
      ),
      http.get(`${API_BASE}/actions`, () =>
        HttpResponse.json({
          ok: true,
          items: [
            {
              action_id: "a-1",
              status: "PROPOSED",
              action_type: "SEND_INTERNAL_NOTIFICATION",
              risk_tier: "LOW",
              requires_approval: true,
              escalation_id: "esc-1",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          page: 1,
          page_size: 50,
          total: 1,
        }),
      ),
    );
    renderPanel();
    await waitFor(() =>
      expect(screen.getAllByTestId("my-twin-activity-row").length).toBeGreaterThan(0),
    );
    const panel = screen.getByTestId("my-twin-activity");
    expect(panel).toHaveTextContent("Recent work your AI Teammate helped move.");
    expect(panel).toHaveTextContent(/Talked with you .*ago/);
    expect(panel).toHaveTextContent("Drafted a follow-up for Samiksha Sharma.");
    expect(panel).toHaveTextContent("1 draft ready for your review.");
    expect(panel).toHaveTextContent("1 submission is with your approver.");
    // Learn-loop provenance row appears ONLY because backend evidence exists.
    expect(panel).toHaveTextContent("Used your previous recipient choice.");
    expect(panel).toHaveTextContent("Tool requirements not set yet.");
    // Human copy only.
    const text = panel.textContent ?? "";
    for (const banned of [
      "correction_memory",
      "caller_confirmed",
      "PROPOSED",
      "escalation_id",
      "led-1",
      "tw-1",
    ]) {
      expect(text).not.toContain(banned);
    }
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it("renders the honest empty state when the twin provably did nothing", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/conversations`, () =>
        HttpResponse.json({ ok: true, items: [], total: 0, has_more: false }),
      ),
      http.get(`${API_BASE}/work-os/comms/follow-ups`, () =>
        HttpResponse.json({ ok: true, follow_ups: [] }),
      ),
      http.get(`${API_BASE}/actions`, () =>
        HttpResponse.json({ ok: true, items: [], page: 1, page_size: 50, total: 0 }),
      ),
    );
    renderPanel();
    await waitFor(() =>
      expect(screen.getByTestId("my-twin-activity-empty")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("my-twin-activity-empty")).toHaveTextContent(
      "Your AI Teammate has no recorded activity yet. When it drafts, routes, or submits work for you, it will appear here.",
    );
    // Never fake activity.
    expect(screen.queryAllByTestId("my-twin-activity-row")).toHaveLength(0);
  });

  it("no learn-loop row without backend evidence", async () => {
    const noEvidence = followUp();
    (noEvidence.action as { recipient_governance: { evidence: { source: string } } }).recipient_governance.evidence.source = "explicit_mention";
    server.use(
      http.get(`${API_BASE}/otzar/conversations`, () =>
        HttpResponse.json({ ok: true, items: [], total: 0, has_more: false }),
      ),
      http.get(`${API_BASE}/work-os/comms/follow-ups`, () =>
        HttpResponse.json({ ok: true, follow_ups: [noEvidence] }),
      ),
      http.get(`${API_BASE}/actions`, () =>
        HttpResponse.json({ ok: true, items: [], page: 1, page_size: 50, total: 0 }),
      ),
    );
    renderPanel();
    await waitFor(() =>
      expect(screen.getAllByTestId("my-twin-activity-row").length).toBeGreaterThan(0),
    );
    expect(screen.getByTestId("my-twin-activity")).not.toHaveTextContent(
      "Used your previous recipient choice.",
    );
  });
});
