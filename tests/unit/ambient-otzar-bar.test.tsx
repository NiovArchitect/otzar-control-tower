// FILE: tests/unit/ambient-otzar-bar.test.tsx
// PURPOSE: Page-level coverage for the AmbientOtzarBar — the
//          ambient voice / text dock mounted in EmployeeLayout per
//          [FOUNDER-AUTH — EMPLOYEE AMBIENT VOICE WORKSPACE].
//
// COVERAGE:
//   - Renders collapsed by default; expand toggle works
//   - Mic button hidden behind capability detection (no
//     SpeechRecognition → fallback copy + disabled mic)
//   - Send button calls voice-intents API with transcript_text
//   - Approval / collaboration / correction badges render from
//     the Foundation response shape
//   - speechSynthesis.speak() called with safe speech_ready_text
//   - mute prevents speak()
//   - stop cancels the in-flight utterance
//   - Privacy: NO surveillance / productivity-score / manager-
//     visibility / Sesame-active copy
//   - Privacy: only transcript_text crosses the wire (no raw
//     audio body fields)

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { AmbientOtzarBar } from "@/components/otzar/AmbientOtzarBar";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

// Capture every body posted to /voice-intents so we can assert
// the privacy invariant (only transcript_text crosses the wire).
const recordedBodies: unknown[] = [];

beforeEach(() => {
  recordedBodies.length = 0;
  // Default handler returns a deterministic Foundation-shaped
  // VoiceIntentResponse with approval_required = true so the
  // badge-rendering paths are exercised.
  server.use(
    http.post(`${API_BASE}/otzar/my-twin/voice-intents`, async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      recordedBodies.push(body);
      return HttpResponse.json({
        ok: true,
        response: "**Markdown** response body",
        context_used: 0,
        tokens_consumed: 12,
        conversation_id: "conv-test",
        next_step: "NEEDS_APPROVAL",
        correction_capture_available: true,
        speech_ready_text: "Markdown response body",
        voice_output_supported: false,
        clarification_needed: false,
        action_proposed: false,
        approval_required: true,
        policy_blocked: false,
        dmw_scope_blocked: false,
        collaboration_suggested: true,
        memory_used_summary: { layer_0: 0, layer_1: 0 },
        provider_mode: "TEXT_ONLY",
      });
    }),
  );
});

// Stub out the speechSynthesis global between tests so each
// assertion gets a fresh spy. The Web Speech Recognition API is
// NOT polyfilled — that's intentional; the bar must work
// correctly in the "STT unsupported" path which is jsdom's
// default.
let speakMock: Mock;
let cancelMock: Mock;

beforeEach(() => {
  speakMock = vi.fn();
  cancelMock = vi.fn();
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      speak: speakMock,
      cancel: cancelMock,
      getVoices: () => [],
    },
  });
  // Stub the SpeechSynthesisUtterance constructor.
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    vi.fn().mockImplementation((text: string) => ({
      text,
      onstart: null,
      onend: null,
      onerror: null,
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderBar(): void {
  render(
    <MemoryRouter>
      <AmbientOtzarBar />
    </MemoryRouter>,
  );
}

describe("AmbientOtzarBar — render + expand", () => {
  it("renders an obvious 'Talk to Otzar' pill when collapsed", () => {
    renderBar();
    // Two surfaces with the same accessible label intentionally: the
    // outer region wrapper + the inner pill button. The visible label
    // "Talk to Otzar" must appear at least once in the DOM.
    expect(screen.getAllByText(/Talk to Otzar/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: /Talk to Otzar/i })).toBeInTheDocument();
  });

  it("starts collapsed — Send button NOT visible until clicked", () => {
    renderBar();
    expect(screen.queryByRole("button", { name: /^send$/i })).not.toBeInTheDocument();
  });

  it("expands when the 'Talk to Otzar' pill is clicked", async () => {
    const user = userEvent.setup();
    renderBar();
    // Click the collapsed pill (it's both the region + a clickable button).
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    expect(screen.getByRole("button", { name: /^send$/i })).toBeInTheDocument();
  });
});

describe("AmbientOtzarBar — voice-input capability fallback", () => {
  it("shows 'Voice input unavailable' copy when SpeechRecognition is missing", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    // jsdom does NOT expose SpeechRecognition — so the bar should
    // fall back to disabled mic + text-only copy.
    expect(
      screen.getByText(
        /Voice input unavailable in this shell\. Type to Otzar instead\./i,
      ),
    ).toBeInTheDocument();
    const mic = screen.getByRole("button", { name: /voice input unavailable/i });
    expect(mic).toBeDisabled();
  });
});

describe("AmbientOtzarBar — send flow", () => {
  it("sends transcript_text to /voice-intents and renders the response", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const input = screen.getByLabelText(/Message to Otzar/i);
    await user.type(input, "what should I focus on next");
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Markdown response body/).length).toBeGreaterThan(0);
    });
    // Privacy invariant: exactly one body was posted; it carries
    // transcript_text only; never any audio-shaped key.
    expect(recordedBodies.length).toBe(1);
    const body = recordedBodies[0] as Record<string, unknown>;
    expect(body.transcript_text).toBe("what should I focus on next");
    expect(body).not.toHaveProperty("audio");
    expect(body).not.toHaveProperty("audio_blob");
    expect(body).not.toHaveProperty("audio_ref");
    expect(body).not.toHaveProperty("waveform");
  });

  it("a navigation command navigates and NEVER reaches the Twin/chat path", async () => {
    // Regression guard for the live failure: "Take me to the onboarding
    // screen" must be intercepted deterministically — Sadeil's Twin must
    // never answer "I can't navigate your UI".
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.type(
      screen.getByLabelText(/Message to Otzar/i),
      "Take me to the onboarding screen",
    );
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    // The Voice Action Runtime panel shows Heard + Action(navigation).
    await waitFor(() => {
      expect(screen.getByTestId("voice-action-panel")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Internal navigation → Onboarding/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Opened Onboarding\./i).length,
    ).toBeGreaterThan(0);
    // The governed chat / Twin endpoint was NEVER called for navigation.
    expect(recordedBodies.length).toBe(0);
  });

  it("renders Approval / Collaboration / Correction badges from the response", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.type(screen.getByLabelText(/Message to Otzar/i), "ping");
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Approval needed/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Collaboration suggested/)).toBeInTheDocument();
    expect(screen.getByText(/Correct Otzar/)).toBeInTheDocument();
    expect(screen.getByText("NEEDS_APPROVAL")).toBeInTheDocument();
  });
});

describe("AmbientOtzarBar — speech synthesis", () => {
  it("AUTO-SPEAK IS OFF BY DEFAULT — a response does NOT speak unless the operator toggles auto-speak on", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.type(screen.getByLabelText(/Message to Otzar/i), "hi");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    // Wait for the response card to render so we know the
    // request/response cycle completed.
    await waitFor(() => {
      expect(screen.getAllByText(/Markdown response body/).length).toBeGreaterThan(0);
    });
    // Critical: speak() must NOT have been called automatically.
    expect(speakMock).not.toHaveBeenCalled();
  });

  it("speaks the speech_ready_text exactly ONCE when auto-speak is enabled", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.click(screen.getByLabelText(/Auto-speak responses/i));
    await user.type(screen.getByLabelText(/Message to Otzar/i), "hi");
    await user.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => expect(speakMock).toHaveBeenCalledTimes(1));
    // speak() received the SAFE projection, not the raw markdown.
    const utterance = speakMock.mock.calls[0]?.[0] as { text: string };
    expect(utterance.text).toBe("Markdown response body");
    // The markdown asterisks were never spoken (we passed
    // speech_ready_text, not response).
    expect(utterance.text).not.toContain("**");
  });

  it("muting prevents speak() AND cancels any in-flight utterance", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.click(screen.getByLabelText(/Auto-speak responses/i));
    await user.click(screen.getByRole("button", { name: /mute otzar/i }));
    await user.type(screen.getByLabelText(/Message to Otzar/i), "hi");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/Markdown response body/).length).toBeGreaterThan(0);
    });
    expect(speakMock).not.toHaveBeenCalled();
    // muting cancels any in-flight utterance for safety.
    expect(cancelMock).toHaveBeenCalled();
  });
});

describe("AmbientOtzarBar — emergency TTS loop guard (Phase 12e)", () => {
  it("Stop voice button calls speechSynthesis.cancel()", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    cancelMock.mockClear();
    await user.click(screen.getByRole("button", { name: /Stop voice/i }));
    expect(cancelMock).toHaveBeenCalled();
  });

  it("Test Otzar voice clicked TWICE only queues ONE utterance (in-flight dedupe)", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const button = screen.getByRole("button", { name: /Test Otzar voice/i });
    await user.click(button);
    // We never call utterance.onend(), so the hook still treats the
    // first utterance as in-flight. A second click must NOT enqueue
    // another speak().
    await user.click(button);
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it("Auto-speak toggle defaults UNCHECKED", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const toggle = screen.getByLabelText(/Auto-speak responses/i) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
  });
});

describe("AmbientOtzarBar — voice permission + Test Otzar voice (Phase 12)", () => {
  it("permission line reports an honest browser-class headline under jsdom (no STT, no Chrome)", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    // jsdom: not Tauri, not Chrome, no SpeechRecognition → the
    // browser_other branch of micCopyFor fires with "Voice input
    // unavailable in this browser" + an actionable Chrome
    // suggestion. We assert the headline + the actionable detail
    // both render.
    const line = await screen.findByTestId("ambient-permission-state");
    expect(line.textContent ?? "").toMatch(
      /Voice input unavailable in this browser/i,
    );
    expect(line.textContent ?? "").toMatch(/Open Otzar in Chrome/i);
  });

  it("Test Otzar voice button speaks the canonical test phrase", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.click(
      screen.getByRole("button", { name: /Test Otzar voice/i }),
    );
    expect(speakMock).toHaveBeenCalledTimes(1);
    const utterance = speakMock.mock.calls[0]?.[0] as { text: string };
    expect(utterance.text).toBe(
      "OatZar voice is active. I can speak responses back to you.",
    );
  });
});

describe("AmbientOtzarBar — privacy / safety copy", () => {
  it("renders 'No raw audio is stored' explicitly when expanded", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    expect(screen.getByText(/No raw audio is stored/i)).toBeInTheDocument();
  });

  it("NEVER mentions surveillance / productivity score / manager visibility / Sesame active", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const html = document.body.innerHTML.toLowerCase();
    expect(html).not.toContain("surveillance");
    expect(html).not.toContain("productivity score");
    expect(html).not.toContain("manager visibility");
    expect(html).not.toContain("sesame active");
    expect(html).not.toContain("full sesame voice");
    expect(html).not.toContain("recording in background");
    expect(html).not.toContain("monitoring employee");
  });
});

// ── Phase 1265 Work OS commands — never fall into the Twin chatbot ───
describe("AmbientOtzarBar — Work OS commands", () => {
  const actionPosts: Array<Record<string, unknown>> = [];
  beforeEach(() => {
    actionPosts.length = 0;
    // Founder is an org admin; admin destinations + OAuth status read.
    useAuthStore.setState({
      token: "tok",
      entity: { email: "founder@niovlabs.com" },
      isAuthenticated: true,
      capabilities: {
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: true,
        can_admin_org: true,
        can_admin_niov: false,
      },
    });
    // Real roster so target resolution can resolve "David".
    server.use(
      http.get(`${API_BASE}/org/entities`, () =>
        HttpResponse.json({
          ok: true,
          items: [
            {
              entity_id: "ent-david",
              entity_type: "PERSON",
              display_name: "David",
              email: "david@niovlabs.com",
              status: "ACTIVE",
              clearance_level: 1,
              public_key: "",
              failed_auth_attempts: 0,
              suspended_at: null,
              created_at: "",
              updated_at: "",
              deleted_at: null,
            },
          ],
          total: 1,
          skip: 0,
          take: 200,
        }),
      ),
      // Governed Action create — capture the body; return a PROPOSED
      // (approval-required) action. NEVER an external send.
      http.post(`${API_BASE}/actions`, async ({ request }) => {
        actionPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "act-1",
              action_type: "SEND_INTERNAL_NOTIFICATION",
              status: "PROPOSED",
            },
          },
          { status: 201 },
        );
      }),
    );
  });

  async function speak(text: string): Promise<HTMLElement> {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.type(screen.getByLabelText(/Message to Otzar/i), text);
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    let panel!: HTMLElement;
    await waitFor(() => {
      panel = screen.getByTestId("voice-action-panel");
    });
    return panel;
  }

  it("'What's connected?' summarizes real connector state — never the Twin", async () => {
    server.use(
      http.get(`${API_BASE}/connectors/oauth/status`, () =>
        HttpResponse.json({
          ok: true,
          providers: [
            { provider: "GOOGLE", display_name: "Google Workspace", slug: "google", app_credentials_present: true, status: "VERIFIED", scopes: [], account_label: null, connected_at: null, last_verified_at: null, redirect_uri: "" },
            { provider: "MICROSOFT", display_name: "Microsoft 365", slug: "microsoft", app_credentials_present: false, status: "APP_CREDENTIALS_MISSING", scopes: [], account_label: null, connected_at: null, last_verified_at: null, redirect_uri: "" },
          ],
        }),
      ),
    );
    await speak("What's connected?");
    await waitFor(() => {
      expect(screen.getAllByText(/Google Workspace: Verified/i).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Microsoft 365: needs app credentials/i).length).toBeGreaterThan(0);
    expect(recordedBodies.length).toBe(0); // Twin chat never called
  });

  it("'Show me what needs my approval' fetches the REAL pending count, no chat", async () => {
    server.use(
      http.get(`${API_BASE}/escalations/pending`, () =>
        HttpResponse.json({
          ok: true,
          escalations: [
            { escalation_id: "e1" },
            { escalation_id: "e2" },
          ],
        }),
      ),
    );
    await speak("Show me what needs my approval.");
    await waitFor(() => {
      expect(screen.getAllByText(/2 items waiting on your approval/i).length).toBeGreaterThan(0);
    });
    expect(recordedBodies.length).toBe(0);
  });

  it("'Draft a message to David…' creates a REAL governed internal-notification action (approval required), no external send, no chat", async () => {
    await speak("Draft a message to David saying we need to review this.");
    await waitFor(() => {
      expect(actionPosts.length).toBe(1);
    });
    // The governed Action is an INTERNAL notification to the resolved
    // recipient — never an external send.
    const body = actionPosts[0]!;
    expect(body.action_type).toBe("SEND_INTERNAL_NOTIFICATION");
    expect((body.payload_redacted as Record<string, unknown>).recipient_entity_id).toBe(
      "ent-david",
    );
    expect(screen.getByTestId("voice-action-status").textContent).toMatch(
      /Approval required/i,
    );
    expect(recordedBodies.length).toBe(0); // no Twin chat
  });

  it("'Send David this message' creates an approval-required action and NEVER sends externally", async () => {
    await speak("Send David this message.");
    await waitFor(() => {
      expect(actionPosts.length).toBe(1);
    });
    expect(actionPosts[0]!.action_type).toBe("SEND_INTERNAL_NOTIFICATION");
    expect(screen.getByTestId("voice-action-status").textContent).toMatch(
      /Approval required/i,
    );
    expect(recordedBodies.length).toBe(0);
  });

  it("conversation thread persists prompts + results and is scrollable", async () => {
    await speak("What should I do next?");
    await waitFor(() => {
      expect(screen.getByTestId("otzar-conversation")).toBeInTheDocument();
    });
    // Send a second prompt; the FIRST must still be visible.
    await userEvent.setup().type(
      screen.getByLabelText(/Message to Otzar/i),
      "Take me to connectors.",
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => {
      const entries = screen.getAllByTestId("otzar-conversation-entry");
      const texts = entries.map((e) => e.textContent ?? "").join(" | ");
      expect(texts).toMatch(/What should I do next\?/);
      expect(texts).toMatch(/connectors|Workspace connections/i);
    });
  });

  it("'Ask David's Twin…' routes to collaboration and never fakes David's answer", async () => {
    const panel = await speak("Ask David's Twin what he thinks.");
    expect(panel.textContent).toMatch(/Ask Twin → David/i);
    // No fabricated answer and no Twin chat call.
    expect(recordedBodies.length).toBe(0);
    const html = document.body.innerHTML.toLowerCase();
    expect(html).not.toContain("david thinks");
    expect(html).not.toContain("david says");
  });

  it("'Schedule a meeting with Vishesh tomorrow' drafts an approval-gated proposal, no auto-create", async () => {
    const panel = await speak("Schedule a meeting with Vishesh tomorrow.");
    expect(panel.textContent).toMatch(/Draft meeting proposal → Vishesh/i);
    expect(screen.getByTestId("voice-action-status").textContent).toMatch(
      /Approval required/i,
    );
    expect(recordedBodies.length).toBe(0);
  });

  it("'Take me to connectors' navigates and never calls the Twin", async () => {
    const panel = await speak("Take me to connectors.");
    expect(panel.textContent).toMatch(/Workspace connections/i);
    expect(recordedBodies.length).toBe(0);
  });

  it("'What should I do next?' still reaches governed chat (Twin called)", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.type(screen.getByLabelText(/Message to Otzar/i), "What should I do next?");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => {
      expect(recordedBodies.length).toBe(1);
    });
  });

  it("a Work OS command never produces a chatbot 'I can't navigate' refusal", async () => {
    await speak("Draft a message to David saying we need to review this.");
    const html = document.body.innerHTML.toLowerCase();
    expect(html).not.toContain("i can't navigate");
    expect(html).not.toContain("i cannot navigate");
    expect(html).not.toContain("use the platform navigation");
  });
});
