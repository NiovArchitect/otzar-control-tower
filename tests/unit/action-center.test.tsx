// FILE: tests/unit/action-center.test.tsx
// PURPOSE: Phase 1211 -- locks the Action Center page that lists the
//          viewer's own Action rows by lifecycle bucket. Covers: tab
//          counts, bucket assignment, friendly labels (no developer
//          jargon in primary UI), empty state per tab, error state,
//          privacy invariant (no closed-vocab internals leak), and
//          roster-aware generalization (not David-only).
// CONNECTS TO: src/pages/app/ActionCenter.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ActionCenter } from "@/pages/app/ActionCenter";
import { useAuthStore } from "@/lib/stores/auth";
import type { SafeActionView } from "@/lib/types/foundation";

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

function action(overrides: Partial<SafeActionView> = {}): SafeActionView {
  return {
    action_id: "act-1",
    status: "PROPOSED",
    action_type: "SEND_INTERNAL_NOTIFICATION",
    risk_tier: "LOW",
    requires_approval: true,
    created_at: new Date(Date.now() - 60_000).toISOString(),
    updated_at: new Date(Date.now() - 60_000).toISOString(),
    ...overrides,
  };
}

function mockList(items: SafeActionView[]): void {
  server.use(
    http.get(`${API_BASE}/actions`, () =>
      HttpResponse.json({
        ok: true,
        items,
        page: 1,
        page_size: 50,
        total: items.length,
      }),
    ),
  );
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <ActionCenter />
    </MemoryRouter>,
  );
}

beforeEach(() => setAuth());

describe("ActionCenter — tab counts + lifecycle bucket assignment", () => {
  it("buckets statuses into pending / approved / completed / blocked", async () => {
    mockList([
      action({ action_id: "a-1", status: "PROPOSED" }),
      action({ action_id: "a-2", status: "APPROVED" }),
      action({ action_id: "a-3", status: "SCHEDULED" }),
      action({ action_id: "a-4", status: "RUNNING" }),
      action({ action_id: "a-5", status: "SUCCEEDED" }),
      action({ action_id: "a-6", status: "FAILED" }),
      action({ action_id: "a-7", status: "REJECTED" }),
      action({ action_id: "a-8", status: "CANCELLED" }),
      action({ action_id: "a-9", status: "EXPIRED" }),
      action({ action_id: "a-10", status: "TIMED_OUT" }),
    ]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-tab-pending")).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId("action-tab-pending").getAttribute("data-count"),
    ).toBe("1");
    expect(
      screen.getByTestId("action-tab-approved").getAttribute("data-count"),
    ).toBe("3"); // APPROVED + SCHEDULED + RUNNING
    expect(
      screen.getByTestId("action-tab-completed").getAttribute("data-count"),
    ).toBe("1");
    expect(
      screen.getByTestId("action-tab-blocked").getAttribute("data-count"),
    ).toBe("5"); // FAILED + REJECTED + CANCELLED + EXPIRED + TIMED_OUT
  });

  it("clicking a tab swaps the visible list", async () => {
    mockList([
      action({ action_id: "p-1", status: "PROPOSED" }),
      action({ action_id: "c-1", status: "SUCCEEDED" }),
    ]);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-center-list")).toBeInTheDocument(),
    );
    // Default tab = pending; only p-1 visible
    expect(
      screen.getByTestId("action-center-card").getAttribute("data-action-id"),
    ).toBe("p-1");
    // Switch to Completed; only c-1 visible
    await user.click(screen.getByTestId("action-tab-completed"));
    expect(
      screen.getByTestId("action-center-card").getAttribute("data-action-id"),
    ).toBe("c-1");
  });
});

describe("ActionCenter — friendly labels (Warmwind language pass)", () => {
  it("translates SEND_INTERNAL_NOTIFICATION to 'Internal note'", async () => {
    mockList([
      action({ action_type: "SEND_INTERNAL_NOTIFICATION", status: "PROPOSED" }),
    ]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-center-card")).toHaveTextContent(
        "Internal note",
      ),
    );
    expect(screen.getByTestId("action-center-card")).not.toHaveTextContent(
      "SEND_INTERNAL_NOTIFICATION",
    );
  });

  it("translates INVOKE_CONNECTOR to 'Connected tool call'", async () => {
    mockList([action({ action_type: "INVOKE_CONNECTOR", status: "PROPOSED" })]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-center-card")).toHaveTextContent(
        "Connected tool call",
      ),
    );
  });

  it("translates RECORD_CAPSULE to 'Memory record'", async () => {
    mockList([action({ action_type: "RECORD_CAPSULE", status: "PROPOSED" })]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-center-card")).toHaveTextContent(
        "Memory record",
      ),
    );
  });

  it("translates statuses + risk_tier into human copy", async () => {
    mockList([
      action({ status: "SUCCEEDED", risk_tier: "LOW" }),
    ]);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-tab-completed")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("action-tab-completed"));
    const card = screen.getByTestId("action-center-card");
    expect(card).toHaveTextContent("Sent");
    expect(card).toHaveTextContent("Low risk");
    expect(card).not.toHaveTextContent("SUCCEEDED");
    expect(card).not.toHaveTextContent("LOW");
  });

  it("translates 'no-eligible-target' decision_reason into human copy", async () => {
    mockList([
      action({
        status: "REJECTED",
        decision_reason: "no-eligible-target",
      }),
    ]);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-tab-blocked")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("action-tab-blocked"));
    expect(
      screen.getByTestId("action-decision-reason"),
    ).toHaveTextContent(
      "No one in your organization is configured to approve this type of action",
    );
    expect(
      screen.getByTestId("action-decision-reason"),
    ).not.toHaveTextContent("no-eligible-target");
  });
});

describe("ActionCenter — empty state per tab", () => {
  it("shows 'Nothing waiting on you' when there are no pending actions", async () => {
    mockList([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-center-empty")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("action-center-empty")).toHaveTextContent(
      "Nothing waiting on you",
    );
  });

  it("shows 'No approved actions in flight' on the Approved tab when empty", async () => {
    mockList([action({ status: "PROPOSED" })]);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-tab-approved")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("action-tab-approved"));
    expect(screen.getByTestId("action-center-empty")).toHaveTextContent(
      "No approved actions in flight",
    );
  });
});

describe("ActionCenter — error + privacy", () => {
  it("shows the error state when the list API fails", async () => {
    server.use(
      http.get(`${API_BASE}/actions`, () =>
        HttpResponse.json(
          { ok: false, code: "SESSION_EXPIRED" },
          { status: 401 },
        ),
      ),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-center-error")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("action-center-error")).toHaveTextContent(
      "Couldn't load your actions",
    );
  });

  it("never renders TAR / wallet / clearance / permission / payload internals", async () => {
    mockList([
      action({ status: "PROPOSED" }),
      action({ action_id: "a-2", status: "SUCCEEDED" }),
    ]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-center-list")).toBeInTheDocument(),
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
  });
});

describe("ActionCenter — roster-aware (not David-only)", () => {
  it("renders an action regardless of who the source/target was", async () => {
    setAuth("annie@niovlabs.com");
    mockList([
      action({
        action_id: "a-annie-1",
        status: "SUCCEEDED",
        action_type: "SEND_INTERNAL_NOTIFICATION",
      }),
    ]);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("action-tab-completed")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("action-tab-completed"));
    const card = screen.getByTestId("action-center-card");
    expect(card.getAttribute("data-action-id")).toBe("a-annie-1");
    // No David leak from a regression fixture in the test code.
    expect(document.body.outerHTML).not.toMatch(/\bDavid\b/);
  });
});

describe("ActionCenter — focus + artifact detail (Phase 1269)", () => {
  it("focuses the action from ?focus and shows the real recipient + body (not 'internal note')", async () => {
    const { setActionDetails } = await import(
      "@/lib/work-os/action-details-store"
    );
    setActionDetails("act-focus", {
      title: "Draft message → David",
      recipientLabel: "David",
      channel: "internal",
      body: "We need to review this.",
      sourceCommand: "Draft a message to David saying we need to review this.",
    });
    mockList([action({ action_id: "act-focus", status: "PROPOSED" })]);
    // The orb's Open routes with ?focus=<id>; emulate that URL.
    window.history.pushState({}, "", "/app/action-center?focus=act-focus");
    render(
      <MemoryRouter>
        <ActionCenter />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("action-center-card")).toBeInTheDocument(),
    );
    // Focused (highlighted) + real body visible — never disappears.
    expect(
      screen.getByTestId("action-center-card").getAttribute("data-focused"),
    ).toBe("true");
    expect(screen.getByTestId("action-detail-body").textContent).toMatch(
      /We need to review this\./,
    );
    // Reset the URL so other tests are unaffected.
    window.history.pushState({}, "", "/");
  });

  it("keeps the body inspectable even after approval", async () => {
    const { setActionDetails } = await import(
      "@/lib/work-os/action-details-store"
    );
    setActionDetails("act-approved", {
      title: "Draft message → Samiksha",
      recipientLabel: "Samiksha",
      channel: "internal",
      body: "Approved note body.",
    });
    mockList([action({ action_id: "act-approved", status: "APPROVED" })]);
    renderPage();
    // Approved tab.
    await waitFor(() =>
      expect(screen.getByTestId("action-tab-approved")).toBeInTheDocument(),
    );
    await userEvent.setup().click(screen.getByTestId("action-tab-approved"));
    expect(screen.getByTestId("action-detail-body").textContent).toMatch(
      /Approved note body\./,
    );
  });
});
