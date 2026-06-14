// FILE: tests/unit/notification-bell.test.tsx
// PURPOSE: Phase 1210 -- locks the top-bar notification bell that
//          surfaces Foundation's self-scoped Notification inbox. The
//          bell is the recipient half of the Phase 1209 chat ->
//          Action -> Notification end-to-end. Covers: unread-badge
//          rendering, dropdown open/close, mark-read optimistic
//          update + rollback, empty state, error state, and the
//          privacy invariant that no closed-vocab internals leak
//          into primary UI copy.
// CONNECTS TO: src/components/otzar/NotificationBell.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { NotificationBell } from "@/components/otzar/NotificationBell";
import { useAuthStore } from "@/lib/stores/auth";
import type { SafeNotificationView } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "david@niovlabs.com" },
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

function buildNotification(
  overrides: Partial<SafeNotificationView> = {},
): SafeNotificationView {
  return {
    notification_id: "n-1",



    action_id: "act-1",
    notification_class: "OTZAR_INTERNAL_NOTE",
    body_summary: "Hey David — heads up, time to get back to it.",
    created_at: new Date(Date.now() - 60_000).toISOString(),
    read_at: null,
    ...overrides,
  };
}

function mockList(items: SafeNotificationView[]): void {
  server.use(
    http.get(`${API_BASE}/notifications`, () =>
      HttpResponse.json({
        ok: true,
        page: 1,
        page_size: 20,
        total: items.length,
        notifications: items,
      }),
    ),
  );
}

beforeEach(() => {
  setAuth();
});

// Phase 1266 — the bell now uses useNavigate (notification click
// routing), so it must render inside a Router.
function renderBell(): void {
  render(
    <MemoryRouter>
      <NotificationBell pollIntervalMs={0} />
    </MemoryRouter>,
  );
}

describe("NotificationBell — unread badge", () => {
  it("does not render the badge when there are no notifications", async () => {
    mockList([]);
    renderBell();
    await waitFor(() => {
      const btn = screen.getByTestId("notification-bell-button");
      expect(btn.getAttribute("data-unread-count")).toBe("0");
    });
    expect(screen.queryByTestId("notification-bell-badge")).toBeNull();
  });

  it("renders the unread count when there are unread notifications", async () => {
    mockList([
      buildNotification({ notification_id: "n-1", read_at: null }),
      buildNotification({ notification_id: "n-2", read_at: null }),
      buildNotification({
        notification_id: "n-3",
        read_at: new Date().toISOString(),
      }),
    ]);
    renderBell();
    await waitFor(() => {
      const badge = screen.getByTestId("notification-bell-badge");
      // 2 unread (n-1, n-2); n-3 is read.
      expect(badge.textContent).toBe("2");
    });
  });

  it("renders '99+' when there are 100+ unread", async () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      buildNotification({
        notification_id: `n-${i}`,
        read_at: null,
      }),
    );
    server.use(
      http.get(`${API_BASE}/notifications`, () =>
        HttpResponse.json({
          ok: true,
          page: 1,
          page_size: 20,
          total: 100,
          notifications: items,
        }),
      ),
    );
    // Force unread = 100 by stubbing list with 100 read_at=null items.
    const items100 = Array.from({ length: 100 }, (_, i) =>
      buildNotification({ notification_id: `n-${i}`, read_at: null }),
    );
    mockList(items100);
    renderBell();
    await waitFor(() => {
      expect(screen.getByTestId("notification-bell-badge").textContent).toBe(
        "99+",
      );
    });
  });
});

describe("NotificationBell — dropdown", () => {
  it("opens the dropdown on click and shows the notification body_summary", async () => {
    mockList([
      buildNotification({
        notification_id: "n-1",
        body_summary: "Hey Annie, bandwidth for a compliance review this week?",
        read_at: null,
      }),
    ]);
    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    expect(screen.getByTestId("notification-bell-dropdown")).toBeInTheDocument();
    expect(screen.getByTestId("notification-bell-item")).toHaveTextContent(
      "compliance review",
    );
  });

  it("shows the 'caught up' empty state when there are zero notifications", async () => {
    mockList([]);
    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    expect(screen.getByTestId("notification-bell-empty")).toHaveTextContent(
      "all caught up",
    );
  });
});

describe("NotificationBell — mark as read", () => {
  it("optimistically flips read_at + calls PUT /notifications/:id/read", async () => {
    mockList([
      buildNotification({ notification_id: "n-target", read_at: null }),
    ]);
    let markReadCalls = 0;
    let markReadId: string | null = null;
    server.use(
      http.put(`${API_BASE}/notifications/:id/read`, ({ params }) => {
        markReadCalls += 1;
        markReadId = params.id as string;
        return HttpResponse.json({
          ok: true,
          notification: buildNotification({
            notification_id: "n-target",
            read_at: new Date().toISOString(),
          }),
        });
      }),
    );

    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    await user.click(screen.getByTestId("notification-mark-read"));
    await waitFor(() => expect(markReadCalls).toBe(1));
    expect(markReadId).toBe("n-target");
    // Badge gone (now 0 unread).
    expect(screen.queryByTestId("notification-bell-badge")).toBeNull();
    // Item is no longer "Mark as read"-able.
    expect(screen.queryByTestId("notification-mark-read")).toBeNull();
  });

  it("rolls back the optimistic update when the API rejects", async () => {
    mockList([
      buildNotification({ notification_id: "n-fail", read_at: null }),
    ]);
    server.use(
      http.put(`${API_BASE}/notifications/:id/read`, () =>
        HttpResponse.json({ ok: false, code: "POLICY_BLOCKED" }, { status: 403 }),
      ),
    );

    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    await user.click(screen.getByTestId("notification-mark-read"));
    // Eventually the badge re-appears at 1 (rollback).
    await waitFor(() => {
      const badge = screen.getByTestId("notification-bell-badge");
      expect(badge.textContent).toBe("1");
    });
  });
});

describe("NotificationBell — error / loading", () => {
  it("shows the error state when the list API fails", async () => {
    server.use(
      http.get(`${API_BASE}/notifications`, () =>
        HttpResponse.json(
          { ok: false, code: "SESSION_EXPIRED" },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderBell();
    // Wait for the failed fetch to settle, then open.
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    await waitFor(() => {
      expect(
        screen.getByTestId("notification-bell-error"),
      ).toHaveTextContent("Couldn't load notifications");
    });
  });
});

describe("NotificationBell — privacy invariants (RULE 0)", () => {
  it("never renders TAR / wallet / clearance / permission / vector internals", async () => {
    mockList([
      buildNotification({
        body_summary: "Hey David — heads up from Sadeil.",
      }),
    ]);
    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    const html = screen.getByTestId("notification-bell-dropdown").outerHTML;
    expect(html).not.toMatch(/tar_hash/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/clearance_ceiling/i);
    expect(html).not.toMatch(/permission_id/i);
    expect(html).not.toMatch(/embedding/i);
    expect(html).not.toMatch(/vector/i);
    expect(html).not.toMatch(/bearer/i);
    expect(html).not.toMatch(/session_token/i);
  });
});

describe("NotificationBell — reply-to-note round trip (Phase 1215)", () => {
  it("clicking Reply opens an inline reply textarea", async () => {
    mockList([
      buildNotification({
        notification_id: "n-r1",

        body_summary: "Hey David — heads up.",
      }),
    ]);
    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    await user.click(screen.getByTestId("notification-reply-open"));
    expect(screen.getByTestId("notification-reply-panel")).toBeInTheDocument();
    expect(screen.getByTestId("notification-reply-textarea")).toBeInTheDocument();
  });

  it("Cancel closes the reply panel without an API call", async () => {
    mockList([buildNotification({})]);
    let postCalls = 0;
    server.use(
      http.post(`${API_BASE}/notifications/:id/reply`, () => {
        postCalls += 1;
        return HttpResponse.json({ ok: false, code: "x" }, { status: 500 });
      }),
    );
    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    await user.click(screen.getByTestId("notification-reply-open"));
    await user.click(screen.getByTestId("notification-reply-cancel"));
    expect(screen.queryByTestId("notification-reply-panel")).toBeNull();
    expect(postCalls).toBe(0);
  });

  it("Send reply POSTs to /notifications/:id/reply (source resolved server-side, no entity_id exposure)", async () => {
    mockList([
      buildNotification({
        notification_id: "n-reply-target",
        body_summary: "Hey David — heads up.",
      }),
    ]);
    let captured: { url: string; body: Record<string, unknown> } | null = null;
    server.use(
      http.post(`${API_BASE}/notifications/:id/reply`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        captured = { url: request.url, body };
        return HttpResponse.json({
          ok: true,
          reply_action_id: "act-reply-1",
          reply_action_status: "APPROVED",
        });
      }),
    );

    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    await user.click(screen.getByTestId("notification-reply-open"));
    await user.type(
      screen.getByTestId("notification-reply-textarea"),
      "On it — pushing the update now.",
    );
    await user.click(screen.getByTestId("notification-reply-send"));

    await waitFor(() =>
      expect(screen.getByTestId("notification-reply-sent")).toBeInTheDocument(),
    );

    const c = captured as unknown as {
      url: string;
      body: { body_summary: string; idempotency_key: string };
    };
    expect(c.url).toMatch(/\/notifications\/n-reply-target\/reply$/);
    expect(c.body.body_summary).toBe("On it — pushing the update now.");
    expect(c.body.idempotency_key).toBeTruthy();

    expect(
      screen
        .getByTestId("notification-reply-sent")
        .getAttribute("data-action-id"),
    ).toBe("act-reply-1");
  });

  it("Send button is disabled while text is empty", async () => {
    mockList([buildNotification({})]);
    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    await user.click(screen.getByTestId("notification-reply-open"));
    const btn = screen.getByTestId("notification-reply-send");
    expect(btn).toBeDisabled();
  });

  it("Reply failure surfaces friendly error copy", async () => {
    mockList([buildNotification({})]);
    server.use(
      http.post(`${API_BASE}/notifications/:id/reply`, () =>
        HttpResponse.json(
          { ok: false, code: "DUAL_CONTROL_NO_APPROVER_AVAILABLE" },
          { status: 503 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    await user.click(screen.getByTestId("notification-reply-open"));
    await user.type(
      screen.getByTestId("notification-reply-textarea"),
      "Quick reply.",
    );
    await user.click(screen.getByTestId("notification-reply-send"));
    await waitFor(() =>
      expect(screen.getByTestId("notification-reply-error")).toHaveTextContent(
        /hasn't configured who can approve/i,
      ),
    );
    // The Sent state is NOT rendered on failure.
    expect(screen.queryByTestId("notification-reply-sent")).toBeNull();
  });

  it("Reply for one notification does not open replies for others", async () => {
    mockList([
      buildNotification({
        notification_id: "n-a",

        body_summary: "From Sadeil.",
      }),
      buildNotification({
        notification_id: "n-b",

        body_summary: "From David.",
      }),
    ]);
    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    const openButtons = screen.getAllByTestId("notification-reply-open");
    expect(openButtons).toHaveLength(2);
    await user.click(openButtons[1]!); // open reply only on n-b
    expect(screen.getAllByTestId("notification-reply-panel")).toHaveLength(1);
  });
});

describe("NotificationBell — roster-aware (not David-only)", () => {
  it("renders Annie's notification verbatim when the API returns Annie", async () => {
    useAuthStore.setState({
      token: "tok",
      entity: { email: "annie@niovlabs.com" },
      isAuthenticated: true,
      capabilities: {
        can_read_capsules: true,
        can_write_capsules: false,
        can_share_capsules: false,
        can_admin_org: false,
        can_admin_niov: false,
      },
    });
    mockList([
      buildNotification({
        body_summary:
          "Hey Annie, bandwidth for a compliance review this week?",

      }),
    ]);
    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    expect(screen.getByTestId("notification-bell-item")).toHaveTextContent(
      "compliance review",
    );
    // No David leak even though the regression fixture used David.
    expect(
      screen.getByTestId("notification-bell-dropdown").outerHTML,
    ).not.toMatch(/\bDavid\b/);
  });
});

describe("NotificationBell — click routing (Phase 1266)", () => {
  it("clicking a notification routes (no raw error) and closes the panel", async () => {
    mockList([
      buildNotification({
        notification_id: "n-1",
        action_id: "act-9",
        read_at: null,
      }),
    ]);
    server.use(
      http.put(`${API_BASE}/notifications/:id/read`, () =>
        HttpResponse.json({
          ok: true,
          notification: buildNotification({
            notification_id: "n-1",
            read_at: new Date().toISOString(),
          }),
        }),
      ),
    );
    const user = userEvent.setup();
    renderBell();
    await waitFor(() =>
      expect(screen.getByTestId("notification-bell-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("notification-bell-button"));
    await user.click(screen.getByTestId("notification-open"));
    // Routed + panel closed; no raw error surfaced (no dead click).
    await waitFor(() =>
      expect(screen.queryByTestId("notification-bell-dropdown")).toBeNull(),
    );
    expect(screen.queryByTestId("notification-bell-error")).toBeNull();
  });
});
