// FILE: tests/unit/chat.test.tsx
// PURPOSE: Page test for the employee Chat surface. Verifies a real
//          message round-trips through POST /otzar/conversation/message
//          (via MSW) and that close summarizes via /conversation/close.
// CONNECTS TO: src/pages/app/Chat.tsx, tests/msw/handlers.ts.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chat } from "@/pages/app/Chat";

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
});
