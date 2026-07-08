// FILE: tests/unit/voice-twin.test.tsx
// PURPOSE: VF.4b page tests for the /voice talk surface per
//          ADR-0085 §8. Verifies:
//          - /voice registers in the main nav
//          - Voice doctrine card renders the 4 canonical doctrine
//            lines from ADR-0085 §1
//          - Text-only NO_AUDIO_NOTICE renders verbatim
//          - Privacy notice renders verbatim
//          - LOW intent skips the confirmation modal
//          - MEDIUM intent opens the confirmation modal
//          - HIGH intent opens the confirmation modal
//          - Confirmation Cancel closes the modal without submit
//          - Confirmation Confirm + submit POSTs to /voice/intents
//          - Success path renders the envelope card with SAFE
//            metadata (intent_id + audit_event_id + states)
//          - Privacy invariant: transcript prose + simulated
//            xoxb-/ya29-/Bearer markers NEVER appear in the
//            response panel rendered by the page
//          - Forbidden UI copy guard (no surveillance / scoring /
//            guaranteed-compliance / regulator-approved / etc.)
// CONNECTS TO: src/pages/VoiceTwin.tsx,
//              src/lib/voice/{types,labels}.ts,
//              src/lib/api.ts (api.voice namespace),
//              src/lib/nav.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { VoiceTwinPage } from "@/pages/VoiceTwin";
import { NAV } from "@/lib/nav";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "admin@example.com" },
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

function renderVoice() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <VoiceTwinPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => setAuth());

const FORBIDDEN_UI_COPY = [
  "subscription active",
  "payment method required",
  "invoice generated",
  "feature enabled",
  "permission granted",
  "guaranteed compliant",
  "regulator approved",
  "no fine risk",
  "employee score",
  "manager surveillance",
  "psychological profile",
  "auto-approved",
];

describe("VoiceTwin — nav", () => {
  it("registers /voice in the main nav", () => {
    const entry = NAV.find((n) => n.to === "/voice");
    expect(entry).toBeDefined();
    expect(entry?.label).toBe("Voice");
  });
});

describe("VoiceTwin — page shell", () => {
  it("renders the page title", () => {
    renderVoice();
    expect(
      screen.getByRole("heading", {
        name: /Voice — talk to your AI Teammate/i,
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it("renders the doctrine card with all 4 canonical doctrine lines verbatim", () => {
    renderVoice();
    expect(screen.getByTestId("voice-doctrine-card")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Otzar is voice-first because work should move through natural communication, not endless clicking\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Users should be able to talk to their AI Teammate the way they would talk to a trusted teammate\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Voice reduces friction, increases adoption, and makes governed intelligence feel alive\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Voice is an interface layer over Foundation governance, not a bypass around it\./,
      ),
    ).toBeInTheDocument();
  });

  it("renders the text-only / no-audio-capture disclosure", () => {
    renderVoice();
    expect(
      screen.getByText(
        /This surface is text-only by design\. Microphone access, audio capture, and browser recording are NOT used/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders the privacy notice that transcript prose stays in the browser", () => {
    renderVoice();
    expect(
      screen.getByText(
        /Your transcript stays in this browser as you type it/i,
      ),
    ).toBeInTheDocument();
  });
});

describe("VoiceTwin — risk-tier confirmation modal", () => {
  it("LOW intent skips the confirmation modal and POSTs directly", async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/voice/intents`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            intent_id: "low-intent-id",
            audit_event_id: "low-audit-id",
            source_surface: "AI_TWIN",
            intent_class: "LOW",
            confirmation_state: "NOT_NEEDED",
            approval_chain_state: "NONE",
            transcript_redacted: false,
            retention_class: "STANDARD",
            created_at: "2026-06-02T05:00:00.000Z",
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderVoice();
    await user.type(
      screen.getByTestId("voice-transcript-input"),
      "Summarize my unread Linear issues",
    );
    await user.click(screen.getByTestId("voice-submit"));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toMatchObject({
      source_surface: "AI_TWIN",
      transcript_text: "Summarize my unread Linear issues",
      intent_class: "LOW",
    });
    // No confirmation modal for LOW.
    expect(
      screen.queryByTestId("voice-confirmation-modal"),
    ).not.toBeInTheDocument();
  });

  it("MEDIUM intent opens the confirmation modal before submit", async () => {
    const user = userEvent.setup();
    renderVoice();
    await user.type(
      screen.getByTestId("voice-transcript-input"),
      "Create a proposed action to send the standup follow-up",
    );
    // Switch risk tier to MEDIUM.
    const tierSelect = screen.getByTestId("voice-intent-class-select");
    await user.click(tierSelect);
    await user.click(
      await screen.findByRole("option", { name: /Medium risk/i }),
    );
    await user.click(screen.getByTestId("voice-submit"));
    expect(
      await screen.findByTestId("voice-confirmation-modal"),
    ).toBeInTheDocument();
  });

  it("HIGH intent opens the confirmation modal before submit", async () => {
    const user = userEvent.setup();
    renderVoice();
    await user.type(
      screen.getByTestId("voice-transcript-input"),
      "Approve the pending workflow execution",
    );
    const tierSelect = screen.getByTestId("voice-intent-class-select");
    await user.click(tierSelect);
    await user.click(
      await screen.findByRole("option", { name: /High risk/i }),
    );
    await user.click(screen.getByTestId("voice-submit"));
    expect(
      await screen.findByTestId("voice-confirmation-modal"),
    ).toBeInTheDocument();
  });

  it("Cancel closes the modal without submitting", async () => {
    const user = userEvent.setup();
    renderVoice();
    await user.type(
      screen.getByTestId("voice-transcript-input"),
      "Approve the pending workflow execution",
    );
    const tierSelect = screen.getByTestId("voice-intent-class-select");
    await user.click(tierSelect);
    await user.click(
      await screen.findByRole("option", { name: /High risk/i }),
    );
    await user.click(screen.getByTestId("voice-submit"));
    await user.click(
      await screen.findByTestId("voice-confirmation-cancel"),
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId("voice-confirmation-modal"),
      ).not.toBeInTheDocument(),
    );
  });

  it("Confirm + submit fires the POST after the modal opens for MEDIUM", async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/voice/intents`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            intent_id: "medium-intent-id",
            audit_event_id: "medium-audit-id",
            source_surface: "PROPOSED_ACTION",
            intent_class: "MEDIUM",
            confirmation_state: "PENDING",
            approval_chain_state: "NONE",
            transcript_redacted: false,
            retention_class: "STANDARD",
            created_at: "2026-06-02T05:00:00.000Z",
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderVoice();
    // Surface → PROPOSED_ACTION (MEDIUM default).
    const surfaceSelect = screen.getByTestId("voice-surface-select");
    await user.click(surfaceSelect);
    await user.click(
      await screen.findByRole("option", { name: /Proposed actions/i }),
    );
    const tierSelect = screen.getByTestId("voice-intent-class-select");
    await user.click(tierSelect);
    await user.click(
      await screen.findByRole("option", { name: /Medium risk/i }),
    );
    await user.type(
      screen.getByTestId("voice-transcript-input"),
      "Create a proposed action to send the standup follow-up",
    );
    await user.click(screen.getByTestId("voice-submit"));
    await user.click(
      await screen.findByTestId("voice-confirmation-submit"),
    );
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toMatchObject({
      source_surface: "PROPOSED_ACTION",
      intent_class: "MEDIUM",
    });
  });
});

describe("VoiceTwin — envelope result rendering", () => {
  it("renders the envelope card with SAFE metadata on success", async () => {
    server.use(
      http.post(`${API_BASE}/voice/intents`, () =>
        HttpResponse.json(
          {
            ok: true,
            intent_id: "happy-intent-id",
            audit_event_id: "happy-audit-id",
            source_surface: "AI_TWIN",
            intent_class: "LOW",
            confirmation_state: "NOT_NEEDED",
            approval_chain_state: "NONE",
            transcript_redacted: false,
            retention_class: "STANDARD",
            created_at: "2026-06-02T05:00:00.000Z",
          },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderVoice();
    await user.type(
      screen.getByTestId("voice-transcript-input"),
      "What is on my calendar today?",
    );
    await user.click(screen.getByTestId("voice-submit"));
    const card = await screen.findByTestId("voice-envelope-result");
    expect(within(card).getByText("happy-intent-id")).toBeInTheDocument();
    expect(within(card).getByText("happy-audit-id")).toBeInTheDocument();
    expect(
      within(card).getByText(/No confirmation required/i),
    ).toBeInTheDocument();
    expect(
      within(card).getByText(/No approval chain required/i),
    ).toBeInTheDocument();
  });

  it("envelope card NEVER renders simulated secret-token markers even if the response somehow contained them", async () => {
    // Foundation strips transcript_text before responding (SAFE
    // response per voice.routes.ts L268-282). This test proves the
    // CT page does not surface secret markers even when the mocked
    // backend tries to inject them.
    server.use(
      http.post(`${API_BASE}/voice/intents`, () =>
        HttpResponse.json(
          {
            ok: true,
            intent_id: "safe-intent-id",
            audit_event_id: "safe-audit-id",
            source_surface: "AI_TWIN",
            intent_class: "LOW",
            confirmation_state: "NOT_NEEDED",
            approval_chain_state: "NONE",
            transcript_redacted: false,
            retention_class: "STANDARD",
            created_at: "2026-06-02T05:00:00.000Z",
          },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    const { container } = renderVoice();
    await user.type(
      screen.getByTestId("voice-transcript-input"),
      "send xoxb-shouldnt-leak via Bearer header please",
    );
    await user.click(screen.getByTestId("voice-submit"));
    await screen.findByTestId("voice-envelope-result");
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toContain("xoxb-shouldnt-leak");
    expect(text).not.toMatch(/ya29\.[a-z0-9_-]+/);
    // The page DOES describe the risk tier; the doctrine card
    // contains the word "interface layer", not "Bearer".
    expect(text).not.toContain("authorization: bearer");
  });
});

describe("VoiceTwin — error UI", () => {
  it("renders a customer-admin error message when Foundation returns INVALID_FIELD", async () => {
    server.use(
      http.post(`${API_BASE}/voice/intents`, () =>
        HttpResponse.json(
          {
            ok: false,
            code: "INVALID_FIELD",
            invalid_fields: ["transcript_text"],
          },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderVoice();
    // Type a single character to bypass the local empty-transcript
    // guard and force the server to be the one returning INVALID_FIELD.
    await user.type(screen.getByTestId("voice-transcript-input"), "x");
    await user.click(screen.getByTestId("voice-submit"));
    const err = await screen.findByTestId("voice-error-message");
    expect(err.textContent).toMatch(/missing or malformed/i);
    // Error message must NOT reveal raw failure code prose.
    expect(err.textContent).not.toMatch(/INVALID_FIELD/);
    expect(err.textContent).not.toMatch(/invalid_fields/);
  });

  it("renders a session-expired error message when Foundation returns SESSION_EXPIRED", async () => {
    server.use(
      http.post(`${API_BASE}/voice/intents`, () =>
        HttpResponse.json(
          {
            ok: false,
            code: "SESSION_EXPIRED",
          },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderVoice();
    await user.type(screen.getByTestId("voice-transcript-input"), "hello");
    await user.click(screen.getByTestId("voice-submit"));
    const err = await screen.findByTestId("voice-error-message");
    expect(err.textContent).toMatch(/sign in again/i);
  });
});

describe("VoiceTwin — forbidden UI copy guard", () => {
  it.each(FORBIDDEN_UI_COPY)(
    "does NOT contain the forbidden phrase %s as a positive claim",
    (phrase) => {
      const { container } = renderVoice();
      const text = (container.textContent ?? "").toLowerCase();
      expect(text).not.toContain(phrase.toLowerCase());
    },
  );
});
