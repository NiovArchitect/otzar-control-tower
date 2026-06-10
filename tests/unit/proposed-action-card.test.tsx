// FILE: tests/unit/proposed-action-card.test.tsx
// PURPOSE: Phase 1208 -- locks the inline approval card surfaced
//          under the Otzar chat response. Covers: target rendering,
//          recipient-not-in-roster guard, draft edit flow, Send
//          button hitting POST /api/v1/actions with the resolved
//          SEND_INTERNAL_NOTIFICATION payload, Cancel without API
//          call, error state, "sent" terminal state.
// CONNECTS TO: src/components/otzar/ProposedActionCard.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ProposedActionCard } from "@/components/otzar/ProposedActionCard";
import { useAuthStore } from "@/lib/stores/auth";
import type { ProposedAction } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: false,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
}

function pa(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    action_type: "SEND_INTERNAL_NOTIFICATION",
    target: {
      display_name: "David Odie",
      email: "david@niovlabs.com",
      entity_id: "id-david",
    },
    draft_text: "Hey David — heads up.",
    reason: "Otzar drafted this from your request.",
    ...overrides,
  };
}

beforeEach(() => setAuth());

describe("ProposedActionCard — render", () => {
  it("renders recipient, draft, and reason from the envelope", () => {
    render(<ProposedActionCard proposedAction={pa()} />);
    expect(screen.getByTestId("ctx-recipient")).toHaveTextContent(
      "David Odie",
    );
    expect(screen.getByTestId("ctx-recipient")).toHaveTextContent(
      "david@niovlabs.com",
    );
    expect(screen.getByTestId("ctx-draft")).toHaveTextContent(
      "Hey David — heads up.",
    );
    expect(screen.getByTestId("ctx-reason")).toHaveTextContent(
      "Otzar drafted",
    );
    expect(
      screen.getByText("Needs your confirmation"),
    ).toBeInTheDocument();
  });

  it("never renders raw memory / TAR / vector internals (privacy invariant)", () => {
    render(<ProposedActionCard proposedAction={pa()} />);
    const html = screen.getByTestId("proposed-action-card").outerHTML;
    expect(html).not.toMatch(/tar_hash/i);
    expect(html).not.toMatch(/clearance_ceiling/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/permission_id/i);
    expect(html).not.toMatch(/embedding/i);
    expect(html).not.toMatch(/vector/i);
    expect(html).not.toMatch(/bearer/i);
  });
});

describe("ProposedActionCard — recipient-not-in-roster guard", () => {
  it("disables Send and shows a warning when target.entity_id is null", async () => {
    const user = userEvent.setup();
    render(
      <ProposedActionCard
        proposedAction={pa({
          target: {
            display_name: "Bob Stranger",
            email: null,
            entity_id: null,
          },
        })}
      />,
    );
    const sendBtn = screen.getByTestId("ctx-send-button");
    expect(sendBtn).toBeDisabled();
    expect(
      screen.getByTestId("ctx-recipient-warning"),
    ).toBeInTheDocument();
    // Even if the operator does click (shouldn't be possible) — no
    // POST goes out. We don't even need to set up a handler.
    await user.click(sendBtn);
    expect(screen.queryByTestId("proposed-action-card-sent")).toBeNull();
  });
});

describe("ProposedActionCard — Send hits POST /api/v1/actions and lands sent state", () => {
  it("posts SEND_INTERNAL_NOTIFICATION with the resolved entity_id + draft text", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/actions`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "act-12345",
              source_entity_id: "u-sadeil",
              org_entity_id: "o-niov",
              target_entity_id: "id-david",
              action_type: "SEND_INTERNAL_NOTIFICATION",
              risk_tier: "LOW",
              status: "APPROVED",
              payload_summary: "Otzar internal note to David Odie",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    render(<ProposedActionCard proposedAction={pa()} />);
    await user.click(screen.getByTestId("ctx-send-button"));

    await waitFor(() =>
      expect(
        screen.getByTestId("proposed-action-card-sent"),
      ).toBeInTheDocument(),
    );
    expect(capturedBody).not.toBeNull();
    const body = capturedBody as unknown as {
      action_type: string;
      idempotency_key: string;
      payload_redacted: {
        recipient_entity_id: string;
        notification_class: string;
        body_summary: string;
      };
    };
    expect(body.action_type).toBe("SEND_INTERNAL_NOTIFICATION");
    expect(body.payload_redacted.recipient_entity_id).toBe("id-david");
    expect(body.payload_redacted.notification_class).toBe(
      "OTZAR_INTERNAL_NOTE",
    );
    expect(body.payload_redacted.body_summary).toBe("Hey David — heads up.");
    expect(body.idempotency_key).toBeTruthy();
  });

  it("surfaces the action_id on the success card", async () => {
    server.use(
      http.post(`${API_BASE}/actions`, () =>
        HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "act-success-99",
              source_entity_id: "u-sadeil",
              org_entity_id: "o-niov",
              target_entity_id: "id-david",
              action_type: "SEND_INTERNAL_NOTIFICATION",
              risk_tier: "LOW",
              status: "APPROVED",
              payload_summary: "x",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<ProposedActionCard proposedAction={pa()} />);
    await user.click(screen.getByTestId("ctx-send-button"));
    await waitFor(() => {
      const sent = screen.getByTestId("proposed-action-card-sent");
      expect(sent.getAttribute("data-action-id")).toBe("act-success-99");
    });
  });
});

describe("ProposedActionCard — error state", () => {
  it("renders an inline error when the API rejects (no terminal success card)", async () => {
    server.use(
      http.post(`${API_BASE}/actions`, () =>
        HttpResponse.json(
          {
            ok: false,
            code: "POLICY_BLOCKED",
            message: "Org policy requires approval for this action.",
          },
          { status: 403 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<ProposedActionCard proposedAction={pa()} />);
    await user.click(screen.getByTestId("ctx-send-button"));
    await waitFor(() => {
      expect(screen.getByTestId("ctx-error")).toHaveTextContent(
        "POLICY_BLOCKED",
      );
    });
    expect(screen.queryByTestId("proposed-action-card-sent")).toBeNull();
  });
});

describe("ProposedActionCard — edit flow", () => {
  it("Edit reveals a textarea seeded with the draft text", async () => {
    const user = userEvent.setup();
    render(<ProposedActionCard proposedAction={pa()} />);
    await user.click(screen.getByTestId("ctx-edit-button"));
    const textarea = screen.getByTestId("ctx-draft-edit") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Hey David — heads up.");
  });

  it("Edited text is sent in the POST body, not the original draft", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/actions`, async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "act-edit-1",
              source_entity_id: "u-sadeil",
              org_entity_id: "o-niov",
              target_entity_id: "id-david",
              action_type: "SEND_INTERNAL_NOTIFICATION",
              risk_tier: "LOW",
              status: "APPROVED",
              payload_summary: "x",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    render(<ProposedActionCard proposedAction={pa()} />);
    await user.click(screen.getByTestId("ctx-edit-button"));
    const textarea = screen.getByTestId("ctx-draft-edit");
    await user.clear(textarea);
    await user.type(textarea, "Softer ping, David.");
    await user.click(screen.getByTestId("ctx-send-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("proposed-action-card-sent"),
      ).toBeInTheDocument(),
    );
    const body = capturedBody as unknown as {
      payload_redacted: { body_summary: string };
    } | null;
    expect(body?.payload_redacted.body_summary).toBe("Softer ping, David.");
  });
});

describe("ProposedActionCard — Cancel does NOT call the API (approval gate)", () => {
  it("Cancel click never produces an Action row", async () => {
    let postCalls = 0;
    server.use(
      http.post(`${API_BASE}/actions`, () => {
        postCalls += 1;
        return HttpResponse.json(
          { ok: false, code: "should_not_be_called" },
          { status: 500 },
        );
      }),
    );
    const user = userEvent.setup();
    render(<ProposedActionCard proposedAction={pa()} />);
    await user.click(screen.getByTestId("ctx-cancel-button"));
    expect(postCalls).toBe(0);
    expect(screen.queryByTestId("proposed-action-card-sent")).toBeNull();
    expect(screen.queryByTestId("ctx-error")).toBeNull();
  });
});
