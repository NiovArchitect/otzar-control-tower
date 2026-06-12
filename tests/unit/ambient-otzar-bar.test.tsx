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
      expect(screen.getByText(/Markdown response body/)).toBeInTheDocument();
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
      expect(screen.getByText(/Markdown response body/)).toBeInTheDocument();
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
      expect(screen.getByText(/Markdown response body/)).toBeInTheDocument();
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
