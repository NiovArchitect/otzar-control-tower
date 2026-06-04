// FILE: tests/unit/voice-ready.test.tsx
// PURPOSE: Phase 4G — page tests for the VoiceReady employee surface.
// CONNECTS TO: src/pages/app/VoiceReady.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { VoiceReady } from "@/pages/app/VoiceReady";
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

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <VoiceReady />
    </QueryClientProvider>,
  );
}

const BASE_RESPONSE = {
  ok: true as const,
  response: "Sure, here's the launch update.",
  context_used: 2,
  tokens_consumed: 120,
  conversation_id: "11111111-aaaa-bbbb-cccc-222222222222",
  next_step: "ANSWERED" as const,
  correction_capture_available: true,
  speech_ready_text: "Sure, here's the launch update.",
  voice_output_supported: false,
  clarification_needed: false,
  action_proposed: false,
  approval_required: false,
  policy_blocked: false,
  dmw_scope_blocked: false,
  collaboration_suggested: false,
  memory_used_summary: {
    layer_1_corrections: 1,
    layer_3_work_profile: 1,
    layer_4_foundational: 0,
    layer_5_relevant_context: 0,
    layer_8_history_messages: 0,
    total_capsules: 2,
  },
  provider_mode: "TEXT_ONLY" as const,
};

beforeEach(() => {
  setAuth();
});

describe("VoiceReady page", () => {
  it("renders honest header + input + no-result-card-yet", async () => {
    renderPage();
    expect(
      await screen.findByText(/Voice-ready/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Live microphone capture isn't enabled at this tier\./),
    ).toBeInTheDocument();
    expect(screen.getByTestId("voice-input-card")).toBeInTheDocument();
    expect(screen.queryByTestId("voice-result-card")).not.toBeInTheDocument();
  });

  it("submitting renders the response card with TEXT_ONLY provider mode", async () => {
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/voice-intents`, () =>
        HttpResponse.json(BASE_RESPONSE),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    const transcript = await screen.findByTestId("voice-transcript");
    await user.type(transcript, "Give me the launch update");
    await user.click(screen.getByTestId("voice-submit"));
    expect(
      await screen.findByTestId("voice-result-card"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("voice-next-step")).toHaveTextContent("Answered");
    expect(screen.getByTestId("voice-provider-mode")).toHaveTextContent(
      "Text only (today)",
    );
    expect(screen.getByTestId("voice-response-text")).toHaveTextContent(
      "Sure, here's the launch update.",
    );
    expect(screen.getByTestId("voice-memory-summary")).toHaveTextContent(
      "Memory used: 2 items",
    );
  });

  it("approval_required surfaces a closed-vocab badge + duration options", async () => {
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/voice-intents`, () =>
        HttpResponse.json({
          ...BASE_RESPONSE,
          next_step: "NEEDS_APPROVAL",
          approval_required: true,
          approval_reason: "CONNECTOR_ACCESS",
          approval_duration_options: ["ONE_TIME", "SESSION", "SHORT_TERM"],
        }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    const transcript = await screen.findByTestId("voice-transcript");
    await user.type(transcript, "Send a Slack message to the team");
    await user.click(screen.getByTestId("voice-submit"));
    expect(
      await screen.findByText(/Needs approval — Connector access/),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("voice-duration-options"),
    ).toBeInTheDocument();
  });

  it("never claims live audio when voice_output_supported is false", async () => {
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/voice-intents`, () =>
        HttpResponse.json(BASE_RESPONSE),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    const transcript = await screen.findByTestId("voice-transcript");
    await user.type(transcript, "hello");
    await user.click(screen.getByTestId("voice-submit"));
    await screen.findByTestId("voice-result-card");
    expect(
      screen.queryByText("Live audio supported"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Use device / browser TTS"),
    ).toBeInTheDocument();
  });
});
