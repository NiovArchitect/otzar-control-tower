// FILE: tests/unit/conversations.test.tsx
// PURPOSE: Page tests for the employee Conversations (session metadata)
//          surface. Verifies metadata renders, status filtering, the
//          persistent transcript-not-active notice, Load more, empty
//          state, and that NO transcript / message body / raw ids leak.
// CONNECTS TO: src/pages/app/Conversations.tsx, tests/msw/handlers.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { Conversations } from "@/pages/app/Conversations";
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

function renderConversations() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Conversations />
    </QueryClientProvider>,
  );
}

beforeEach(() => setAuth());

describe("Conversations (employee Otzar)", () => {
  it("renders session metadata with Active and Closed labels", async () => {
    renderConversations();
    const list = await screen.findByTestId("conversations-list");
    expect(within(list).getByText("Active")).toBeInTheDocument();
    expect(within(list).getByText("Closed")).toBeInTheDocument();
    expect(list).toHaveTextContent(/Chat console/);
  });

  it("shows the persistent transcript-not-active notice", async () => {
    renderConversations();
    expect(await screen.findByTestId("transcript-notice")).toHaveTextContent(
      /Transcript retrieval is not active yet/i,
    );
  });

  it("does not render transcripts, message bodies, or raw ids", async () => {
    const { container } = renderConversations();
    await screen.findByTestId("conversations-list");
    const text = container.textContent ?? "";
    expect(text).not.toContain("conv-active-0001");
    expect(text).not.toContain("twin-self-0001");
    expect(text).not.toMatch(
      /transcript body|message body|conversation_history|capsule|vector/i,
    );
  });

  it("filters by status (Closed) and drops the active session", async () => {
    const user = userEvent.setup();
    renderConversations();
    await screen.findByTestId("conversations-list");
    await user.click(screen.getByRole("button", { name: /^closed$/i }));
    await waitFor(() => {
      const list = screen.getByTestId("conversations-list");
      expect(within(list).queryByText("Active")).not.toBeInTheDocument();
      expect(within(list).getByText("Closed")).toBeInTheDocument();
    });
  });

  it("renders the empty state when there are no sessions", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/conversations`, async () =>
        HttpResponse.json(
          { ok: true, items: [], total: 0, has_more: false },
          { status: 200 },
        ),
      ),
    );
    renderConversations();
    expect(
      await screen.findByTestId("conversations-empty"),
    ).toBeInTheDocument();
  });

  it("renders Load more when has_more is true", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/conversations`, async () =>
        HttpResponse.json(
          {
            ok: true,
            items: [
              {
                conversation_id: "c1",
                twin_id: "t1",
                source_type: "CHAT",
                status: "ACTIVE",
                message_count: 1,
                started_at: new Date().toISOString(),
                closed_at: null,
              },
            ],
            total: 50,
            has_more: true,
          },
          { status: 200 },
        ),
      ),
    );
    renderConversations();
    expect(
      await screen.findByRole("button", { name: /load more/i }),
    ).toBeInTheDocument();
  });
});
