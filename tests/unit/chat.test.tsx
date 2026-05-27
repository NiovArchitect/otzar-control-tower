// FILE: tests/unit/chat.test.tsx
// PURPOSE: Page test for the employee Chat surface. Verifies a real
//          message round-trips through POST /otzar/conversation/message
//          (via MSW) and that close summarizes via /conversation/close.
// CONNECTS TO: src/pages/app/Chat.tsx, tests/msw/handlers.ts.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { Chat } from "@/pages/app/Chat";

const API_BASE = "http://localhost:3000/api/v1";

describe("Chat (employee Otzar)", () => {
  it("sends a message and renders the assistant response + transparency meta", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/Echo: hello/)).toBeInTheDocument();
    // Transparency counters (context_used/tokens) surface; NO audit link.
    expect(await screen.findByTestId("chat-meta")).toBeInTheDocument();
  });

  it("closes the conversation and renders the saved confirmation + topics", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await screen.findByText(/Echo: hello/);

    await user.click(
      screen.getByRole("button", { name: /close conversation/i }),
    );
    const summary = await screen.findByTestId("close-summary");
    expect(summary).toHaveTextContent(/Conversation saved/i);
    expect(summary).toHaveTextContent(/pricing/);
    // Product-safe copy: no raw substrate id / "capsule" wording surfaced.
    expect(summary).not.toHaveTextContent(/capsule/i);
  });

  it("renders the transparency panel after a successful response", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    const panel = await screen.findByTestId("transparency-panel");
    expect(panel).toHaveTextContent(/How Otzar answered/i);
    expect(panel).toHaveTextContent(/Q4 pricing decision/);
    expect(screen.getByTestId("access-limited")).toHaveTextContent(
      /access rules/i,
    );
  });

  it("remains backward-compatible when transparency fields are missing", async () => {
    server.use(
      http.post(
        `${API_BASE}/otzar/conversation/message`,
        async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(
            {
              ok: true,
              response: `Echo: ${String(body.message ?? "")}`,
              context_used: 0,
              tokens_consumed: 10,
              conversation_id: "conv-bc-0001",
            },
            { status: 200 },
          );
        },
      ),
    );

    const user = userEvent.setup();
    render(<Chat />);
    await user.type(screen.getByLabelText("Message"), "hi");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/Echo: hi/)).toBeInTheDocument();
    expect(screen.getByTestId("chat-meta")).toBeInTheDocument();
    // The panel renders its graceful fallback rather than breaking.
    expect(screen.getByTestId("transparency-empty")).toBeInTheDocument();
  });
});
