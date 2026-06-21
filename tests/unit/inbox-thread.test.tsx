// FILE: tests/unit/inbox-thread.test.tsx
// PURPOSE: Phase OTZAR-RETURN-2 — InboxThread must resolve a notification by
//          route id across the WHOLE self-scoped inbox, not just the first
//          page. Proves: found on page 1 still loads the entity-keyed thread
//          (the Sadeil <-> David relationship-threading path is unchanged); a
//          notification beyond page 1 now resolves instead of falsely showing
//          "not available"; a mid-scan fetch failure surfaces as an ERROR (not
//          a false "gone"); a genuinely-absent id shows an honest state with
//          real navigation; and the paginated resolver is BOUNDED (a backend
//          that ignores `page` cannot make it loop forever).
// CONNECTS TO: src/pages/app/InboxThread.tsx, src/lib/api.ts notifications.list
//          + workOs.thread, tests/msw/server.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { InboxThread } from "@/pages/app/InboxThread";
import { useAuthStore } from "@/lib/stores/auth";
import type { SafeNotificationView } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(): void {
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

beforeEach(() => setAuth());

function notif(id: string, over: Partial<SafeNotificationView> = {}): SafeNotificationView {
  return {
    notification_id: id,
    action_id: null,
    notification_class: "DIRECT_MESSAGE",
    body_summary: `body for ${id}`,
    created_at: "2026-06-01T00:00:00.000Z",
    read_at: null,
    status: "UNREAD",
    sender: {
      entity_id: "ent-david",
      display_name: "David",
      role_title: "Engineer",
      source_kind: "HUMAN",
      authority_label: "Teammate",
    },
    ...over,
  };
}

// A self-scoped inbox of `total` notifications; `targetId` is placed at
// `targetIndex` (or omitted entirely when targetIndex < 0).
function buildInbox(total: number, targetId: string, targetIndex: number): SafeNotificationView[] {
  const items: SafeNotificationView[] = [];
  for (let i = 0; i < total; i += 1) {
    items.push(i === targetIndex ? notif(targetId) : notif(`n-${i}`));
  }
  return items;
}

// MSW list handler that honors `page`/`page_size` by slicing — so a target at
// index 120 genuinely sits on page 2 (size 100), exercising the real fix.
function pagedListHandler(all: SafeNotificationView[]) {
  return http.get(`${API_BASE}/notifications`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("page_size") ?? "100");
    const start = (page - 1) * pageSize;
    const slice = all.slice(start, start + pageSize);
    return HttpResponse.json({
      ok: true,
      page,
      page_size: pageSize,
      total: all.length,
      notifications: slice,
    });
  });
}

function threadHandler(messages: unknown[]) {
  return http.get(`${API_BASE}/work-os/threads/with/:entityId`, () =>
    HttpResponse.json({ ok: true, thread_key: "tk", messages }),
  );
}

const markReadHandler = http.put(`${API_BASE}/notifications/:id/read`, () =>
  HttpResponse.json({ ok: true }),
);

function renderInbox(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/app/inbox/${id}`]}>
      <Routes>
        <Route path="/app/inbox/:id" element={<InboxThread />} />
        <Route path="/app/comms" element={<div>Comms surface</div>} />
        <Route path="/app/my-work" element={<div>My Work surface</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const DAVID_THREAD = [
  {
    message_id: "m1",
    sender_entity_id: "ent-david",
    sender_display_name: "David",
    sender_role_title: "Engineer",
    body: "Did you see the pricing note?",
    created_at: "2026-06-01T00:00:00.000Z",
    from_me: false,
  },
  {
    message_id: "m2",
    sender_entity_id: "ent-me",
    sender_display_name: "You",
    sender_role_title: null,
    body: "Looking now.",
    created_at: "2026-06-01T00:05:00.000Z",
    from_me: true,
  },
];

describe("InboxThread — notification resolution beyond the first page", () => {
  it("resolves a notification on page 1 and loads the entity-keyed thread (Sadeil <-> David path unchanged)", async () => {
    server.use(
      pagedListHandler(buildInbox(10, "n-target", 0)),
      threadHandler(DAVID_THREAD),
      markReadHandler,
    );
    renderInbox("n-target");
    const msgs = await screen.findByTestId("inbox-thread-messages");
    expect(msgs).toHaveTextContent("Did you see the pricing note?");
    expect(msgs).toHaveTextContent("Looking now.");
  });

  it("resolves a notification beyond the first page instead of falsely showing 'not available'", async () => {
    // 150 items, target at index 120 → page 2 (size 100). The old first-100
    // scan would false-negative here.
    server.use(
      pagedListHandler(buildInbox(150, "n-old", 120)),
      threadHandler(DAVID_THREAD),
      markReadHandler,
    );
    renderInbox("n-old");
    expect(await screen.findByTestId("inbox-thread")).toBeInTheDocument();
    expect(screen.queryByTestId("inbox-thread-not-found")).not.toBeInTheDocument();
  });

  it("treats a mid-scan fetch failure as an ERROR, not a false 'gone'", async () => {
    // Page 1 ok (100 items, target absent), page 2 fails → must be error, the
    // exact false-negative class this phase fixes.
    const all = buildInbox(150, "n-deep", 130);
    server.use(
      http.get(`${API_BASE}/notifications`, ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page") ?? "1");
        if (page >= 2) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({
          ok: true,
          page,
          page_size: 100,
          total: all.length,
          notifications: all.slice(0, 100),
        });
      }),
    );
    renderInbox("n-deep");
    expect(await screen.findByTestId("inbox-thread-error")).toBeInTheDocument();
    expect(screen.queryByTestId("inbox-thread-not-found")).not.toBeInTheDocument();
  });

  it("shows an honest, navigable state when the thread is truly absent", async () => {
    server.use(pagedListHandler(buildInbox(20, "irrelevant", -1)), markReadHandler);
    renderInbox("n-missing");
    const notFound = await screen.findByTestId("inbox-thread-not-found");
    expect(notFound).toHaveTextContent(/available in your current inbox view/i);
    // Honest: never claims the thread is "gone".
    expect(notFound).not.toHaveTextContent(/no longer/i);
    expect(screen.getByRole("button", { name: /open comms/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to my work/i })).toBeInTheDocument();
  });

  it("is bounded — a backend that ignores `page` cannot loop forever", async () => {
    // Always return the same first 100 with a huge total; the target lives in
    // the unreachable tail. The resolver's MAX page cap must terminate it.
    const page1 = buildInbox(100, "irrelevant", -1);
    server.use(
      http.get(`${API_BASE}/notifications`, () =>
        HttpResponse.json({
          ok: true,
          page: 1,
          page_size: 100,
          total: 5000,
          notifications: page1,
        }),
      ),
      markReadHandler,
    );
    renderInbox("n-unreachable");
    // If unbounded, this render would hang and the test would time out. A
    // resolved not-found proves termination.
    expect(await screen.findByTestId("inbox-thread-not-found")).toBeInTheDocument();
  });
});
