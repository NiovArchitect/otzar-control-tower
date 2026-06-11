// FILE: tests/unit/my-day.test.tsx
// PURPOSE: Phase 1212 -- locks the "My Day" landing page. Covers
//          greeting + role chips, pending-decisions card, recent-
//          notes card, primary "Talk to Otzar" CTA, empty states,
//          privacy invariant, and roster-aware behavior.
// CONNECTS TO: src/pages/app/MyDay.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MyDay } from "@/pages/app/MyDay";
import { useAuthStore } from "@/lib/stores/auth";
import type {
  ContextHealthResponse,
  MyDayIntelligenceView,
  SafeActionView,
  SafeNotificationView,
} from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(email = "sadeil@niovlabs.com"): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email },
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

function ctxHealth(
  overrides: Partial<ContextHealthResponse["identity"]> = {},
): ContextHealthResponse {
  return {
    ok: true,
    status: "READY",
    identity: {
      viewer: {
        user_id: "u-sadeil",
        email: "sadeil@niovlabs.com",
        display_name: "Sadeil Lewis",
        title: "FOUNDER",
        org_role: "FOUNDER",
        is_founder_admin: true,
      },
      org: { org_id: "o-niov", name: "NIOV Labs", domain: "niovlabs.com" },
      twin: { twin_id: "t-otzar", display_name: "Otzar", active: true },
      projects: [],
      authority: {
        can_admin_org: true,
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: true,
        can_access_external_api: false,
        external_write_policy: "APPROVAL_REQUIRED",
      },
      context_signals: {
        memory_capsules_count: 12,
        transcript_summaries_count: 3,
        collaboration_inbound_count: 1,
        collaboration_outbound_count: 2,
      },
      org_roster: [],
      safety: {
        no_external_write_without_approval: true,
        no_private_data_to_unauthorized_users: true,
        no_raw_audio_storage: true,
        no_raw_transcript_default: true,
      },
      ...overrides,
    },
  };
}

function action(overrides: Partial<SafeActionView> = {}): SafeActionView {
  return {
    action_id: "a-1",
    status: "PROPOSED",
    action_type: "SEND_INTERNAL_NOTIFICATION",
    risk_tier: "LOW",
    requires_approval: true,
    created_at: new Date(Date.now() - 60_000).toISOString(),
    updated_at: new Date(Date.now() - 60_000).toISOString(),
    ...overrides,
  };
}

function notif(overrides: Partial<SafeNotificationView> = {}): SafeNotificationView {
  return {
    notification_id: "n-1",



    action_id: "a-1",
    notification_class: "OTZAR_INTERNAL_NOTE",
    body_summary: "Hey Sadeil — quick FYI.",
    created_at: new Date(Date.now() - 120_000).toISOString(),
    read_at: null,
    ...overrides,
  };
}

function intelligence(
  overrides: Partial<MyDayIntelligenceView> = {},
): MyDayIntelligenceView {
  return {
    headline: "Nothing needs your attention right now. Otzar is keeping watch.",
    suggestions: [],
    signals: {
      proposed_actions_count: 0,
      recent_action_count: 0,
      unread_notifications_count: 0,
      collaboration_inbox_pending_count: 0,
      collaboration_needs_approval_count: 0,
      collaboration_blocked_count: 0,
      active_authority_grants_count: 0,
      expiring_soon_grants_count: 0,
      sensitive_case_by_case_grants_count: 0,
      active_project_count: 0,
      open_commitments_owned_count: 0,
      waiting_on_external_count: 0,
      owed_to_external_count: 0,
      most_recent_action_at: null,
      most_recent_collaboration_at: null,
    },
    waiting_on_external: { they_owe_us_count: 0, we_owe_them_count: 0 },
    provider_status: "FIXTURE_PROVIDER_URL_NOT_SET",
    generated_at: new Date().toISOString(),
    ...overrides,
  };
}

function mockAll(opts: {
  ctx?: ContextHealthResponse;
  pending?: SafeActionView[];
  notifications?: SafeNotificationView[];
  intelligence?: MyDayIntelligenceView | null;
} = {}): void {
  const ctx = opts.ctx ?? ctxHealth();
  const pending = opts.pending ?? [];
  const notifications = opts.notifications ?? [];
  const intel = opts.intelligence === undefined ? intelligence() : opts.intelligence;
  server.use(
    http.get(`${API_BASE}/otzar/my-day/intelligence`, () =>
      intel === null
        ? HttpResponse.json({ ok: false, code: "NO_ORG_FOR_CALLER" }, { status: 404 })
        : HttpResponse.json({ ok: true, intelligence: intel }),
    ),
    http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
      HttpResponse.json(ctx),
    ),
    http.get(`${API_BASE}/actions`, () =>
      HttpResponse.json({
        ok: true,
        items: pending,
        page: 1,
        page_size: 5,
        total: pending.length,
      }),
    ),
    http.get(`${API_BASE}/notifications`, () =>
      HttpResponse.json({
        ok: true,
        page: 1,
        page_size: 5,
        total: notifications.length,
        notifications,
      }),
    ),
  );
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <MyDay />
    </MemoryRouter>,
  );
}

beforeEach(() => setAuth());

describe("MyDay — greeting + role chips", () => {
  it("renders viewer display_name in the greeting", async () => {
    mockAll();
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/Sadeil Lewis/)).toBeInTheDocument(),
    );
  });

  it("renders the role chip with humanized title", async () => {
    mockAll();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-role-chip")).toHaveTextContent(
        "Founder & CEO",
      ),
    );
    expect(screen.getByTestId("my-day-role-chip")).toHaveTextContent(
      "NIOV Labs",
    );
    expect(screen.getByTestId("my-day-role-chip")).toHaveTextContent("Otzar");
  });

  it("renders Sadeil correctly when given Sadeil context (NOT David)", async () => {
    mockAll({
      ctx: ctxHealth({
        viewer: {
          user_id: "u-david",
          email: "david@niovlabs.com",
          display_name: "David Odie",
          title: "TECH LEAD",
          org_role: "TECH LEAD",
          is_founder_admin: false,
        },
        twin: { twin_id: "t-d", display_name: "David's Twin", active: true },
      }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/David Odie/)).toBeInTheDocument(),
    );
    expect(screen.getByTestId("my-day-role-chip")).toHaveTextContent(
      "Tech Lead",
    );
    expect(screen.queryByText(/Sadeil/)).toBeNull();
  });
});

describe("MyDay — pending decisions card", () => {
  it("renders the count badge and pending list", async () => {
    mockAll({
      pending: [
        action({ action_id: "a-1" }),
        action({
          action_id: "a-2",
          action_type: "INVOKE_CONNECTOR",
        }),
      ],
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-pending-list")).toBeInTheDocument(),
    );
    const items = screen.getAllByTestId("my-day-pending-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Internal note");
    expect(items[1]).toHaveTextContent("Connected tool call");
  });

  it("shows the empty state when nothing is pending", async () => {
    mockAll({ pending: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-pending-empty")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("my-day-pending-empty")).toHaveTextContent(
      "Nothing waiting on you",
    );
  });
});

describe("MyDay — recent notes card", () => {
  it("renders unread notifications with body_summary", async () => {
    mockAll({
      notifications: [
        notif({
          notification_id: "n-1",
          body_summary: "Hey Sadeil — bandwidth for a sync?",
        }),
      ],
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-inbox-item")).toHaveTextContent(
        "bandwidth for a sync",
      ),
    );
  });

  it("shows 'all caught up' when no unread notes", async () => {
    mockAll({ notifications: [] });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-inbox-empty")).toHaveTextContent(
        "all caught up",
      ),
    );
  });
});

describe("MyDay — primary CTA + org pulse", () => {
  it("renders the Talk to Otzar primary card with a /app/voice link", async () => {
    mockAll();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-talk-cta")).toBeInTheDocument(),
    );
    const link = screen.getByRole("link", { name: /Start/i });
    expect(link.getAttribute("href")).toBe("/app/voice");
  });

  it("renders the at-a-glance counts from context-health", async () => {
    mockAll();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-org-pulse")).toBeInTheDocument(),
    );
    const pulse = screen.getByTestId("my-day-org-pulse");
    expect(pulse).toHaveTextContent("Memory summaries");
    expect(pulse).toHaveTextContent("12");
    expect(pulse).toHaveTextContent("Transcript summaries");
    expect(pulse).toHaveTextContent("3");
  });
});

describe("MyDay — privacy invariants (RULE 0)", () => {
  it("never renders TAR / wallet / clearance / payload / vector internals", async () => {
    mockAll({
      pending: [action()],
      notifications: [notif()],
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-page")).toBeInTheDocument(),
    );
    const html = document.body.outerHTML;
    expect(html).not.toMatch(/tar_hash/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/clearance_ceiling/i);
    expect(html).not.toMatch(/permission_id/i);
    expect(html).not.toMatch(/payload_redacted/i);
    expect(html).not.toMatch(/policy_envelope/i);
    expect(html).not.toMatch(/embedding/i);
    expect(html).not.toMatch(/bearer/i);
    expect(html).not.toMatch(/session_token/i);
  });
});

describe("MyDay — Phase 1234 intelligence card", () => {
  it("renders headline + top suggestions with calm copy and Open links", async () => {
    mockAll({
      intelligence: intelligence({
        headline: "Otzar found 2 things that may need your attention.",
        suggestions: [
          {
            rank: 1,
            reason: "PENDING_APPROVALS_AWAITING_YOU",
            safe_title: "Review your pending approvals",
            confidence: "HIGH",
            risk: "APPROVAL_REQUIRED",
            score: 0.9,
          },
          {
            rank: 2,
            reason: "COLLABORATION_INBOX_NEEDS_RESPONSE",
            safe_title: "Reply to your collaboration inbox",
            confidence: "MEDIUM",
            risk: "NONE",
            score: 0.7,
          },
        ],
      }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-intelligence")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("my-day-intelligence-headline")).toHaveTextContent(
      "Otzar found 2 things",
    );
    const items = screen.getAllByTestId("my-day-intelligence-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Review your pending approvals");
    expect(items[0]).toHaveTextContent("ready for your approval");
    expect(items[1]).toHaveTextContent("waiting on your reply");
  });

  it("caps the list at the top 3 suggestions", async () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      rank: i + 1,
      reason: "REVIEW_RECENT_ACTIONS" as const,
      safe_title: `Suggestion ${i + 1}`,
      confidence: "LOW" as const,
      risk: "NONE" as const,
      score: 0.5,
    }));
    mockAll({
      intelligence: intelligence({
        headline: "Otzar found 6 things that may need your attention.",
        suggestions: many,
      }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-intelligence")).toBeInTheDocument(),
    );
    expect(screen.getAllByTestId("my-day-intelligence-item")).toHaveLength(3);
  });

  it("shows the waiting-on-external line with a workspace link", async () => {
    mockAll({
      intelligence: intelligence({
        headline:
          "Nothing needs your action right now — you're waiting on 2 items from outside your organization.",
        waiting_on_external: { they_owe_us_count: 2, we_owe_them_count: 1 },
      }),
    });
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByTestId("my-day-intelligence-external"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByTestId("my-day-intelligence-external")).toHaveTextContent(
      "Waiting on 2 items from outside your organization.",
    );
  });

  it("labels the provider honestly without developer vocabulary", async () => {
    mockAll({
      intelligence: intelligence({ provider_status: "PYTHON_CONFIGURED" }),
    });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-intelligence")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("my-day-intelligence")).toHaveAttribute(
      "data-provider-status",
      "PYTHON_CONFIGURED",
    );
    expect(screen.getByTestId("my-day-intelligence")).toHaveTextContent(
      "Ranked by Otzar's intelligence service.",
    );
    // Visible copy only — the data-provider-status attribute is a
    // diagnostics/test hook, not user-facing text.
    const visible = screen.getByTestId("my-day-intelligence").textContent ?? "";
    expect(visible).not.toMatch(/fixture/i);
    expect(visible).not.toMatch(/python/i);
    expect(visible).not.toMatch(/provider_url/i);
  });

  it("hides the card entirely when the intelligence call fails (non-blocking)", async () => {
    mockAll({ intelligence: null });
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("my-day-page")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByTestId("my-day-pending")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("my-day-intelligence")).toBeNull();
  });
});
