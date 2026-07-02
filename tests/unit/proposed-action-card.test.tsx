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

// Generic factory -- David is only the original regression fixture;
// the card MUST work for any valid roster entry. Each helper below
// proves the card renders a specific person's identity, not "David".
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

function annieEnvelope(): ProposedAction {
  return {
    action_type: "SEND_INTERNAL_NOTIFICATION",
    target: { display_name: "Annie", email: "annie@niovlabs.com", entity_id: "id-annie" },
    draft_text: "Hey Annie, bandwidth for a compliance review this week?",
    reason: "Otzar drafted this from your request.",
  };
}

function samikshaEnvelope(): ProposedAction {
  return {
    action_type: "SEND_INTERNAL_NOTIFICATION",
    target: {
      display_name: "Samiksha Sharma",
      email: "samiksha@niovlabs.com",
      entity_id: "id-samiksha",
    },
    draft_text: "Hi Samiksha, please review the AI/NLP trial notes when you have a moment.",
    reason: "Otzar drafted this from your request.",
  };
}

function visheshEnvelope(): ProposedAction {
  return {
    action_type: "SEND_INTERNAL_NOTIFICATION",
    target: {
      display_name: "Vishesh Sharma",
      email: "vishesh@niovlabs.com",
      entity_id: "id-vishesh",
    },
    draft_text: "Hey Vishesh, can you check the UI flow?",
    reason: "Otzar drafted this from your request.",
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

  // [PROD-UX-APPROVAL-LOOP] Truth over optimism: a dual-control send is
  // SUBMITTED, not sent — "Sent" appears only past approval.
  it("a send that requires approval says 'Submitted for approval' — never 'Sent'", async () => {
    server.use(
      http.post(`${API_BASE}/actions`, () =>
        HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "act-dual-1",
              source_entity_id: "u-vishesh",
              org_entity_id: "o-niov",
              target_entity_id: "id-david",
              action_type: "SEND_INTERNAL_NOTIFICATION",
              risk_tier: "LOW",
              status: "PROPOSED",
              requires_approval: true,
              escalation_id: "esc-1",
              payload_summary: "Otzar internal note to David Odie",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          { status: 200 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<ProposedActionCard proposedAction={pa()} />);
    await user.click(screen.getByTestId("ctx-send-button"));
    const submitted = await screen.findByTestId("proposed-action-card-submitted");
    expect(submitted).toHaveTextContent("Submitted for approval");
    expect(submitted).toHaveTextContent(/an approver will review/i);
    expect(submitted).toHaveTextContent("David Odie");
    // The optimistic lie is gone: no "Sent to" anywhere.
    expect(screen.queryByTestId("proposed-action-card-sent")).toBeNull();
    expect(submitted.textContent).not.toMatch(/sent to/i);
    // No raw backend codes.
    expect(submitted.textContent).not.toContain("PROPOSED");
    expect(submitted.textContent).not.toContain("requires_approval");
  });

  it("a genuinely approved send still says 'Sent' (unchanged happy path)", async () => {
    server.use(
      http.post(`${API_BASE}/actions`, () =>
        HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "act-auto-1",
              source_entity_id: "u-sadeil",
              org_entity_id: "o-niov",
              target_entity_id: "id-david",
              action_type: "SEND_INTERNAL_NOTIFICATION",
              risk_tier: "LOW",
              status: "APPROVED",
              requires_approval: false,
              payload_summary: "Otzar internal note to David Odie",
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
    await waitFor(() =>
      expect(screen.getByTestId("proposed-action-card-sent")).toHaveTextContent("Sent to David Odie."),
    );
    expect(screen.queryByTestId("proposed-action-card-submitted")).toBeNull();
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
      const err = screen.getByTestId("ctx-error");
      // The friendly copy is what the user sees; the raw code is on
      // data-error-code for debug / telemetry.
      expect(err.textContent).toContain("policy blocks");
      expect(err.getAttribute("data-error-code")).toBe("POLICY_BLOCKED");
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

describe("ProposedActionCard — roster-aware generalization (NOT David-hardcoded)", () => {
  // Per [GENERALIZATION GUARDRAIL — DO NOT OVERFIT TO DAVID]:
  // the card must render whichever recipient Foundation surfaced;
  // it must not encode any David-specific path.

  it("renders Annie's identity verbatim when the envelope names Annie", () => {
    render(<ProposedActionCard proposedAction={annieEnvelope()} />);
    expect(screen.getByTestId("ctx-recipient")).toHaveTextContent("Annie");
    expect(screen.getByTestId("ctx-recipient")).toHaveTextContent(
      "annie@niovlabs.com",
    );
    expect(screen.getByTestId("ctx-draft")).toHaveTextContent(
      "compliance review",
    );
    // No David leaks.
    expect(screen.getByTestId("proposed-action-card").outerHTML).not.toMatch(
      /David/,
    );
  });

  it("renders Samiksha's identity verbatim when the envelope names Samiksha", () => {
    render(<ProposedActionCard proposedAction={samikshaEnvelope()} />);
    expect(screen.getByTestId("ctx-recipient")).toHaveTextContent(
      "Samiksha Sharma",
    );
    expect(screen.getByTestId("ctx-recipient")).toHaveTextContent(
      "samiksha@niovlabs.com",
    );
    expect(screen.getByTestId("ctx-draft")).toHaveTextContent("AI/NLP");
    expect(screen.getByTestId("proposed-action-card").outerHTML).not.toMatch(
      /David|Annie/,
    );
  });

  it("renders Vishesh's identity verbatim when the envelope names Vishesh", () => {
    render(<ProposedActionCard proposedAction={visheshEnvelope()} />);
    expect(screen.getByTestId("ctx-recipient")).toHaveTextContent(
      "Vishesh Sharma",
    );
    expect(screen.getByTestId("ctx-recipient")).toHaveTextContent(
      "vishesh@niovlabs.com",
    );
    expect(screen.getByTestId("ctx-draft")).toHaveTextContent("UI flow");
  });

  it("Send POST body carries the envelope's target.entity_id (never a hardcoded value)", async () => {
    let captured: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/actions`, async ({ request }) => {
        captured = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "act-generic",
              source_entity_id: "u",
              org_entity_id: "o",
              target_entity_id: "id-annie",
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
    render(<ProposedActionCard proposedAction={annieEnvelope()} />);
    await user.click(screen.getByTestId("ctx-send-button"));
    await waitFor(() =>
      expect(
        screen.getByTestId("proposed-action-card-sent"),
      ).toBeInTheDocument(),
    );
    const body = captured as unknown as {
      payload_redacted: { recipient_entity_id: string; body_summary: string };
    };
    expect(body.payload_redacted.recipient_entity_id).toBe("id-annie");
    expect(body.payload_redacted.body_summary).toContain("compliance review");
  });
});

describe("ProposedActionCard — friendly error copy (Warmwind language pass)", () => {
  it("translates DUAL_CONTROL_NO_APPROVER_AVAILABLE into human copy", async () => {
    server.use(
      http.post(`${API_BASE}/actions`, () =>
        HttpResponse.json(
          { ok: false, code: "DUAL_CONTROL_NO_APPROVER_AVAILABLE" },
          { status: 503 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<ProposedActionCard proposedAction={pa()} />);
    await user.click(screen.getByTestId("ctx-send-button"));
    await waitFor(() => {
      const err = screen.getByTestId("ctx-error");
      expect(err.textContent).toContain(
        "your organization has not configured who can approve",
      );
      // The raw code is still attached for debug, but not the
      // primary copy.
      expect(err.getAttribute("data-error-code")).toBe(
        "DUAL_CONTROL_NO_APPROVER_AVAILABLE",
      );
    });
  });

  it("translates POLICY_BLOCKED into human copy", async () => {
    server.use(
      http.post(`${API_BASE}/actions`, () =>
        HttpResponse.json({ ok: false, code: "POLICY_BLOCKED" }, { status: 403 }),
      ),
    );
    const user = userEvent.setup();
    render(<ProposedActionCard proposedAction={pa()} />);
    await user.click(screen.getByTestId("ctx-send-button"));
    await waitFor(() =>
      expect(screen.getByTestId("ctx-error").textContent).toContain(
        "policy blocks",
      ),
    );
  });

  it("falls through to a generic 'Otzar could not send that' for unknown codes", async () => {
    server.use(
      http.post(`${API_BASE}/actions`, () =>
        HttpResponse.json(
          { ok: false, code: "SOMETHING_NEW" },
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<ProposedActionCard proposedAction={pa()} />);
    await user.click(screen.getByTestId("ctx-send-button"));
    await waitFor(() => {
      const err = screen.getByTestId("ctx-error");
      expect(err.textContent).toContain("Otzar could not send that");
      expect(err.textContent).toContain("SOMETHING_NEW");
    });
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

// [SECTION-12-WORKGRAPH] An unsafe recipient-governance verdict must never show a
// normal "Send" — it is replaced by Review / Clarify / Needs approval and send
// is disabled.
describe("ProposedActionCard — recipient-governance send guard", () => {
  beforeEach(() => setAuth());

  it("replaces Send with the guard label and blocks sending when unsafe", async () => {
    const user = userEvent.setup();
    let postCalls = 0;
    server.use(
      http.post(`${API_BASE}/actions`, () => {
        postCalls += 1;
        return HttpResponse.json({ ok: true });
      }),
    );
    render(
      <ProposedActionCard
        proposedAction={pa()}
        sendGuard={{
          blocked: true,
          actionLabel: "Review recipient",
          reason: "This recipient isn't connected to this work — review before sending.",
        }}
      />,
    );
    const sendBtn = screen.getByTestId("ctx-send-button");
    expect(sendBtn).toHaveTextContent("Review recipient");
    expect(sendBtn).toBeDisabled();
    expect(
      screen.getByTestId("ctx-recipient-governance-warning"),
    ).toHaveTextContent(/isn't connected to this work/i);
    // Even forcing a click never posts.
    await user.click(sendBtn).catch(() => undefined);
    expect(postCalls).toBe(0);
  });

  it("shows a normal Send when there is no guard (confirmed recipient)", () => {
    render(<ProposedActionCard proposedAction={pa()} />);
    const sendBtn = screen.getByTestId("ctx-send-button");
    expect(sendBtn).toHaveTextContent("Send");
    expect(sendBtn).not.toBeDisabled();
    expect(
      screen.queryByTestId("ctx-recipient-governance-warning"),
    ).not.toBeInTheDocument();
  });
});
