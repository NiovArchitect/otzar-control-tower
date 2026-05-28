// FILE: tests/unit/chat.test.tsx
// PURPOSE: Page test for the employee Chat surface. Verifies a real
//          message round-trips through POST /otzar/conversation/message
//          (via MSW) and that close summarizes via /conversation/close.
// CONNECTS TO: src/pages/app/Chat.tsx, tests/msw/handlers.ts.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { Chat } from "@/pages/app/Chat";
import {
  getRecordedCorrectionCalls,
  resetRecordedCorrectionCalls,
} from "../msw/handlers";

const API_BASE = "http://localhost:3000/api/v1";

beforeEach(() => {
  resetRecordedCorrectionCalls();
});
afterEach(() => {
  resetRecordedCorrectionCalls();
});

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

  it("keeps transparency quiet by default and reveals it on demand", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await screen.findByText(/Echo: hello/);

    // Default experience: calm. A small optional control, NOT the full
    // panel, and copy that reads as confidence, not surveillance.
    const toggle = await screen.findByTestId("transparency-toggle");
    expect(toggle).toHaveTextContent(/Why this answer\?/i);
    expect(screen.queryByTestId("transparency-panel")).not.toBeInTheDocument();

    // On demand: reveal the panel.
    await user.click(toggle);
    const panel = await screen.findByTestId("transparency-panel");
    expect(panel).toHaveTextContent(/How Otzar answered/i);
    expect(panel).toHaveTextContent(/Q4 pricing decision/);
    expect(screen.getByTestId("access-limited")).toHaveTextContent(
      /access rules/i,
    );

    // Collapsible again.
    await user.click(screen.getByTestId("transparency-toggle"));
    await waitFor(() =>
      expect(
        screen.queryByTestId("transparency-panel"),
      ).not.toBeInTheDocument(),
    );
  });

  it("Wave 2C: inline 'Correct this conversation' is hidden until a conversation is active", () => {
    render(<Chat />);
    // No message sent yet → conversationId === null → no affordance.
    expect(
      screen.queryByTestId("chat-correction-affordance"),
    ).not.toBeInTheDocument();
  });

  it("Wave 2C: inline correction submits with the active conversation_id", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    // 1. Send a message so conversationId becomes "conv-msw-0001"
    //    (the MSW message handler echoes back this id).
    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await screen.findByText(/Echo: hello/);

    // 2. Open the inline correction form.
    const toggle = await screen.findByTestId("chat-correction-toggle");
    await user.click(toggle);
    const form = await screen.findByTestId("chat-correction-form");

    // 3. Fill + submit.
    await user.type(
      screen.getByLabelText(/What was wrong/i),
      "Said pricing is fixed",
    );
    await user.type(
      screen.getByLabelText(/The correct behavior/i),
      "Pricing varies by tier",
    );
    await user.click(
      within(form).getByRole("button", { name: /Submit correction/i }),
    );

    // 4. Success surface + MSW recorded the conversation_id on the wire.
    expect(
      await screen.findByTestId("chat-correction-success"),
    ).toHaveTextContent(/Correction signal submitted for this conversation/i);
    await waitFor(() => {
      expect(getRecordedCorrectionCalls().count).toBe(1);
    });
    expect(getRecordedCorrectionCalls().lastBody).toMatchObject({
      incorrect_description: "Said pricing is fixed",
      correct_behavior: "Pricing varies by tier",
      conversation_id: "conv-msw-0001",
    });
    // No raw target_capsule_id surfaced from the Chat affordance.
    expect(getRecordedCorrectionCalls().lastBody).not.toHaveProperty(
      "target_capsule_id",
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
    // Quiet by default: the optional control is present, the panel is not.
    expect(screen.getByTestId("transparency-toggle")).toBeInTheDocument();
    expect(screen.queryByTestId("transparency-panel")).not.toBeInTheDocument();
    // Revealing on demand shows the graceful fallback, not a broken panel.
    await user.click(screen.getByTestId("transparency-toggle"));
    expect(
      await screen.findByTestId("transparency-empty"),
    ).toBeInTheDocument();
  });
});
