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
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { AmbientOtzarBar } from "@/components/otzar/AmbientOtzarBar";
import { useAuthStore } from "@/lib/stores/auth";
import { usePresenceStore } from "@/lib/stores/presence";
import { useCurrentSurfaceContextStore } from "@/lib/stores/current-surface-context";

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

describe("AmbientOtzarBar — ambient node surface", () => {
  it("the expanded orb carries the presence-state attribute (state-driven glow)", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const dock = screen.getByTestId("ambient-otzar-bar");
    expect(dock).toHaveAttribute("data-presence");
    // Enterprise light Talk dock — white float, brand ink.
    expect(dock.className).toMatch(/backdrop-blur/);
    expect(dock.className).toMatch(/bg-white/);
    expect(dock.className).toMatch(/text-\[#1e1b4b\]/);
  });

  it("does NOT render the redundant bottom nav-link row (fewer clicks)", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    // The duplicate deep-link row (it pointed at a debug Voice page) is gone;
    // the orb is not a second navigation bar.
    expect(screen.queryByText(/Open full Voice page/i)).not.toBeInTheDocument();
  });

  it("shows NO work-node cluster when there is no real state (never decorative)", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    // A fresh orb with nothing in flight has no nodes — the strip is absent.
    expect(screen.queryByTestId("ambient-work-nodes")).not.toBeInTheDocument();
  });

  it("D-02 expanded orb is voice-first work rail (mic primary, text secondary)", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const dock = screen.getByTestId("ambient-otzar-bar");
    expect(dock).toHaveAttribute("data-voice-first", "true");
    expect(dock).toHaveAttribute("data-drives-work", "true");
    const rail = screen.getByTestId("voice-work-rail");
    expect(rail).toHaveAttribute("data-voice-first", "true");
    expect(rail).toHaveAttribute("data-drives-work", "true");
    expect(screen.getByTestId("voice-first-headline")).toBeInTheDocument();
    expect(screen.getByTestId("voice-work-path-copy")).toBeInTheDocument();
    expect(screen.getByTestId("ambient-mic-button")).toHaveAttribute(
      "data-voice-primary",
      "true",
    );
    expect(screen.getByTestId("ambient-text-secondary")).toHaveAttribute(
      "data-text-secondary",
      "true",
    );
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
    // D-02 work-path copy also states no raw audio — allow multiple hits.
    expect(screen.getAllByText(/No raw audio is stored/i).length).toBeGreaterThanOrEqual(1);
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
  // Phase 1284 Wave 2 — Confirm on a human direct note now uses the
  // human-authority path (POST /work-os/internal-messages), not the gated
  // Action ladder. Capture those posts.
  const internalMessagePosts: Array<Record<string, unknown>> = [];
  beforeEach(() => {
    actionPosts.length = 0;
    internalMessagePosts.length = 0;
    // Phase 2.9 — no current-surface context leaks between tests.
    useCurrentSurfaceContextStore.getState().clear();
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
      // Phase 2.5 — read-scoped governed resolver (works for standard users).
      // Resolves "David" → the single org teammate; anything else → NOT_FOUND.
      http.post(`${API_BASE}/work-os/resolve-target`, async ({ request }) => {
        const body = (await request.json()) as { target_name?: string };
        const name = (body.target_name ?? "").trim().toLowerCase();
        if (name.includes("david")) {
          return HttpResponse.json({
            ok: true,
            resolution: {
              code: "RESOLVED_INTERNAL_ENTITY",
              match: {
                entity_id: "ent-david",
                display_name: "David",
                role_title: "Engineer",
              },
              candidates: [
                {
                  entity_id: "ent-david",
                  display_name: "David",
                  role_title: "Engineer",
                },
              ],
            },
          });
        }
        return HttpResponse.json({
          ok: true,
          resolution: { code: "NOT_FOUND", match: null, candidates: [] },
        });
      }),
      // Phase 2.6 — default context sources. The inbox has one recent message
      // (so "what I received" resolves + links); recent artifacts are empty by
      // default (so "the transcript" / "this client note" ask unless a test
      // provides one).
      http.get(`${API_BASE}/notifications`, () =>
        HttpResponse.json({
          ok: true,
          page: 1,
          page_size: 20,
          total: 1,
          notifications: [
            {
              notification_id: "notif-1",
              action_id: null,
              notification_class: "DIRECT_MESSAGE",
              body_summary: "Please validate the figures.",
              created_at: "2026-06-23T10:00:00.000Z",
              read_at: null,
              status: "UNREAD",
              sender: {
                entity_id: "ent-sadeil",
                display_name: "Sadeil",
                role_title: "Founder",
                source_kind: "HUMAN",
                authority_label: "Founder",
              },
            },
          ],
        }),
      ),
      http.get(`${API_BASE}/work-os/comms/recent-artifacts`, () =>
        HttpResponse.json({ ok: true, artifacts: [], next_cursor: null }),
      ),
      // Phase 3D — generic governed correction persistence (best-effort).
      http.post(`${API_BASE}/otzar/correction`, () =>
        HttpResponse.json(
          { ok: true, correction_capsule_id: "corr-1" },
          { status: 201 },
        ),
      ),
      // Phase 3E — typed TwinCorrectionMemory persistence (best-effort).
      http.post(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json(
          {
            ok: true,
            correction: {
              correction_id: "tc-1",
              scope_type: "PERSONAL",
              scope_id: null,
              correction_type: "MEANING_CLARIFICATION",
              state: "ACTIVE",
            },
          },
          { status: 201 },
        ),
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
      // Phase 1284 Wave 2 — human-authority direct internal message.
      http.post(`${API_BASE}/work-os/internal-messages`, async ({ request }) => {
        internalMessagePosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          {
            ok: true,
            status: "DELIVERED",
            notification_id: "notif-1",
            ledger_entry_id: "led-1",
            recipient_entity_id: "ent-david",
            recipient_display_name: "David Odie",
            sender_display_name: "Sadeil Lewis",
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

  // [OTZAR-LIVE-6] The founder's EXACT 4-turn transcript, verbatim. This is the
  // acceptance gate for conversational working memory: Otzar must (1) treat
  // "did david send me anything" as an INBOUND lookup, not an outbound draft;
  // (2) keep that lookup intent on the awkward "Im asking if david messaged me";
  // (3) remember the pending update request; and (4) RESUME and send to BOTH
  // recipients when the user supplies them — never the "what would you like me
  // to do regarding David and Samiksha?" dead end.
  it("[OTZAR-LIVE-6] remembers the pending request and resumes from the recipient answer (founder 4-turn transcript)", async () => {
    server.use(
      // Resolve BOTH David and Samiksha (the founder's two recipients).
      http.post(`${API_BASE}/work-os/resolve-target`, async ({ request }) => {
        const body = (await request.json()) as { target_name?: string };
        const name = (body.target_name ?? "").trim().toLowerCase();
        const match = name.includes("david")
          ? { entity_id: "ent-david", display_name: "David", role_title: "Engineer" }
          : name.includes("samiksha")
            ? { entity_id: "ent-samiksha", display_name: "Samiksha", role_title: "PM" }
            : null;
        return HttpResponse.json({
          ok: true,
          resolution: match
            ? { code: "RESOLVED_INTERNAL_ENTITY", match, candidates: [match] }
            : { code: "NOT_FOUND", match: null, candidates: [] },
        });
      }),
      // Inbound lookups read the governed thread (empty → honest "nothing yet").
      http.get(`${API_BASE}/work-os/threads/with/:id`, () =>
        HttpResponse.json({ ok: true, messages: [] }),
      ),
    );

    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const input = screen.getByLabelText(/Message to Otzar/i);
    const send = (): Promise<void> =>
      user.click(screen.getByRole("button", { name: /^send$/i }));
    const outcome = (): string =>
      screen.getByTestId("voice-action-outcome").textContent ?? "";

    // Turn 1 — "did david send me anything" → INBOUND lookup, NOT a draft.
    await user.type(input, "did david send me anything");
    await send();
    await waitFor(() => expect(outcome().length).toBeGreaterThan(0));
    expect(outcome(), "turn 1 must not draft a message").not.toMatch(
      /pick the recipient|draft created/i,
    );

    // Turn 2 — "Im asking if david messaged me" keeps the lookup intent.
    await user.clear(input);
    await user.type(input, "Im asking if david messaged me");
    await send();
    await waitFor(() => expect(outcome().length).toBeGreaterThan(0));
    expect(outcome(), "turn 2 must not draft a message").not.toMatch(
      /pick the recipient|draft created/i,
    );

    // Turn 3 — "I need david and samiksha to send me their updates". With
    // first-turn multi-recipient recognition this now resolves BOTH and routes
    // immediately — the dead end is impossible, and no extra "they are the
    // recipients" turn is needed.
    await user.clear(input);
    await user.type(
      input,
      "I need david and samiksha to send me their updates",
    );
    await send();
    await waitFor(() =>
      expect(internalMessagePosts.length).toBeGreaterThanOrEqual(2),
    );
    expect(outcome()).not.toMatch(/pick the recipient/i);
    expect(outcome()).not.toMatch(/what would you like me to do/i);
    expect(outcome()).toMatch(/sent/i);
    expect(outcome()).toMatch(/David/);
    expect(outcome()).toMatch(/Samiksha/);
    const bodies = internalMessagePosts.map((p) => String(p.message ?? ""));
    expect(bodies.every((b) => /update/i.test(b))).toBe(true);
    expect(bodies.some((b) => /I need david/i.test(b))).toBe(false);

    // Turn 4 — restating the recipients after the send is harmless: it must
    // NEVER produce the founder's "what would you like me to do regarding David
    // and Samiksha?" dead end.
    await user.clear(input);
    await user.type(input, "david and samiksha are the recipients");
    await send();
    await waitFor(() => expect(outcome().length).toBeGreaterThan(0));
    expect(outcome()).not.toMatch(/what would you like me to do/i);
  });

  it("[OTZAR-LIVE-6] recipient-less draft → memory chip → recipient answer resumes the send", async () => {
    server.use(
      http.post(`${API_BASE}/work-os/resolve-target`, async ({ request }) => {
        const body = (await request.json()) as { target_name?: string };
        const name = (body.target_name ?? "").trim().toLowerCase();
        const match = name.includes("david")
          ? { entity_id: "ent-david", display_name: "David", role_title: "Eng" }
          : name.includes("samiksha")
            ? { entity_id: "ent-samiksha", display_name: "Samiksha", role_title: "PM" }
            : null;
        return HttpResponse.json({
          ok: true,
          resolution: match
            ? { code: "RESOLVED_INTERNAL_ENTITY", match, candidates: [match] }
            : { code: "NOT_FOUND", match: null, candidates: [] },
        });
      }),
    );
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const input = screen.getByLabelText(/Message to Otzar/i);
    const send = (): Promise<void> =>
      user.click(screen.getByRole("button", { name: /^send$/i }));

    // A recipient-less draft arms the pending clarification + the memory chip.
    await user.type(input, "Draft a message saying we should sync on the launch");
    await send();
    await waitFor(() =>
      expect(screen.getByTestId("ambient-memory-chip")).toHaveTextContent(
        /recipient/i,
      ),
    );
    expect(screen.getByTestId("ambient-memory-chip")).toHaveAttribute(
      "data-chip-intensity",
      "attention",
    );
    expect(internalMessagePosts.length).toBe(0);
    // The real work-node cluster appears (grounded in the draft), collapsed by
    // default, with a request node — not a decorative graph.
    const nodes = await screen.findByTestId("ambient-work-nodes");
    expect(nodes).not.toHaveAttribute("open"); // collapsed by default
    expect(screen.getByTestId("ambient-work-nodes-list")).toBeInTheDocument();
    const reqNode = screen
      .getAllByTestId("work-node")
      .find((n) => n.getAttribute("data-kind") === "request");
    expect(reqNode).toBeDefined();

    // The recipient answer RESUMES the held draft and sends to both.
    await user.clear(input);
    await user.type(input, "David and Samiksha are the recipients");
    await send();
    await waitFor(() =>
      expect(internalMessagePosts.length).toBeGreaterThanOrEqual(2),
    );
    expect(
      screen.getByTestId("voice-action-outcome").textContent ?? "",
    ).not.toMatch(/what would you like me to do/i);
    // Chip clears once resolved — real state, not sticky decoration.
    await waitFor(() =>
      expect(screen.queryByTestId("ambient-memory-chip")).not.toBeInTheDocument(),
    );
    // The work-node cluster also clears — nodes are real state, not decoration.
    await waitFor(() =>
      expect(screen.queryByTestId("ambient-work-nodes")).not.toBeInTheDocument(),
    );
  });

  it("[OTZAR-LIVE-6] first turn recognizes BOTH recipients and routes to both (no extra turn)", async () => {
    server.use(
      http.post(`${API_BASE}/work-os/resolve-target`, async ({ request }) => {
        const body = (await request.json()) as { target_name?: string };
        const name = (body.target_name ?? "").trim().toLowerCase();
        const match = name.includes("david")
          ? { entity_id: "ent-david", display_name: "David", role_title: "Engineer" }
          : name.includes("samiksha")
            ? { entity_id: "ent-samiksha", display_name: "Samiksha", role_title: "PM" }
            : null;
        return HttpResponse.json({
          ok: true,
          resolution: match
            ? { code: "RESOLVED_INTERNAL_ENTITY", match, candidates: [match] }
            : { code: "NOT_FOUND", match: null, candidates: [] },
        });
      }),
    );
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const input = screen.getByLabelText(/Message to Otzar/i);
    await user.type(input, "I need David and Samiksha to send me their updates");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    // ONE turn → BOTH governed sends, no "pick the recipient" clarification.
    await waitFor(() =>
      expect(internalMessagePosts.length).toBeGreaterThanOrEqual(2),
    );
    const outcome =
      screen.getByTestId("voice-action-outcome").textContent ?? "";
    expect(outcome).not.toMatch(/pick the recipient/i);
    expect(outcome).toMatch(/David/);
    expect(outcome).toMatch(/Samiksha/);
    // Preserved objective, not the raw command.
    const bodies = internalMessagePosts.map((p) => String(p.message ?? ""));
    expect(bodies.every((b) => /update/i.test(b))).toBe(true);
  });

  it("[OTZAR-LIVE-6] context slot-fill: 'what context?' → the answer sets the current context", async () => {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const input = screen.getByLabelText(/Message to Otzar/i);
    const send = (): Promise<void> =>
      user.click(screen.getByRole("button", { name: /^send$/i }));
    const outcome = (): string =>
      screen.getByTestId("voice-action-outcome").textContent ?? "";

    // A vague, context-less command asks for context and remembers it asked.
    await user.type(input, "Handle this");
    await send();
    await waitFor(() => expect(outcome()).toMatch(/current context/i));
    await waitFor(() =>
      expect(screen.getByTestId("ambient-memory-chip")).toHaveTextContent(
        /need context/i,
      ),
    );

    // The answer IS the context — it binds and sets it, not re-classified.
    await user.clear(input);
    await user.type(input, "the latest meeting note");
    await send();
    await waitFor(() => expect(outcome()).toMatch(/current context/i));
    expect(outcome()).toMatch(/latest meeting note/i);
    // The current-context chip is now active in the orb.
    await waitFor(() =>
      expect(screen.getByTestId("surface-context-chip")).toBeInTheDocument(),
    );
    // Memory chip cleared once resolved.
    await waitFor(() =>
      expect(screen.queryByTestId("ambient-memory-chip")).not.toBeInTheDocument(),
    );
  });

  it("[OTZAR-LIVE-6] approver slot-fill: 'who should approve?' → routes a governed APPROVAL_REQUEST", async () => {
    const collabPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/resolve-target`, async ({ request }) => {
        const body = (await request.json()) as { target_name?: string };
        const name = (body.target_name ?? "").trim().toLowerCase();
        const match = name.includes("sadeil")
          ? { entity_id: "ent-sadeil", display_name: "Sadeil", role_title: "Founder" }
          : null;
        return HttpResponse.json({
          ok: true,
          resolution: match
            ? { code: "RESOLVED_INTERNAL_ENTITY", match, candidates: [match] }
            : { code: "NOT_FOUND", match: null, candidates: [] },
        });
      }),
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, async ({ request }) => {
        collabPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, request: { request_id: "cr-1", status: "PROPOSED" } },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    // Give the orb a real current context so the governed approval rail has
    // something to attach (an approval references a work item).
    useCurrentSurfaceContextStore.getState().provide({
      type: "unknown",
      title: "the launch plan",
    });
    const input = screen.getByLabelText(/Message to Otzar/i);
    const send = (): Promise<void> =>
      user.click(screen.getByRole("button", { name: /^send$/i }));

    // Escalation with no named approver → asks who, and remembers it asked.
    await user.type(input, "Escalate this for approval");
    await send();
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome")).toHaveTextContent(
        /who should approve/i,
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId("ambient-memory-chip")).toHaveTextContent(
        /need approver/i,
      ),
    );

    // The named answer resolves the approver and routes a governed APPROVAL_REQUEST.
    await user.clear(input);
    await user.type(input, "Sadeil");
    await send();
    await waitFor(() => expect(collabPosts.length).toBeGreaterThanOrEqual(1));
    expect(collabPosts[0]!.request_type).toBe("APPROVAL_REQUEST");
    expect(collabPosts[0]!.target_entity_id).toBe("ent-sadeil");
    // Memory chip clears once the approval is routed.
    await waitFor(() =>
      expect(screen.queryByTestId("ambient-memory-chip")).not.toBeInTheDocument(),
    );
  });

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

  it("'Pull latest Zoom recordings' fetches the REAL recordings list, no chat (Phase 1270)", async () => {
    server.use(
      http.get(`${API_BASE}/zoom/recordings`, () =>
        HttpResponse.json({
          ok: true,
          provider: "zoom",
          recordings: [
            {
              meeting_uuid: "uuid-A",
              topic: "Quarterly review",
              start_time: "2026-06-01T15:00:00Z",
              duration_minutes: 42,
              recording_count: 2,
              total_size_bytes: 12345,
              file_types: ["MP4", "TRANSCRIPT"],
            },
          ],
        }),
      ),
    );
    await speak("Pull latest Zoom recordings.");
    await waitFor(() => {
      expect(
        screen.getAllByText(/Quarterly review/i).length,
      ).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/1 Zoom recording/i).length).toBeGreaterThan(0);
    expect(recordedBodies.length).toBe(0); // Twin chat never called
  });

  it("Zoom recordings with a needs-reconnect connection shows an honest reconnect message", async () => {
    server.use(
      http.get(`${API_BASE}/zoom/recordings`, () =>
        HttpResponse.json(
          { ok: false, code: "TOKEN_REFRESH_FAILED" },
          { status: 409 },
        ),
      ),
    );
    await speak("Pull latest Zoom recordings.");
    await waitFor(() => {
      expect(
        screen.getAllByText(/needs a reconnect/i).length,
      ).toBeGreaterThan(0);
    });
    expect(recordedBodies.length).toBe(0);
  });

  it("'Schedule a meeting with Vishesh tomorrow' shows REAL free/busy candidate windows, no event created (Phase 1271)", async () => {
    server.use(
      http.post(`${API_BASE}/calendar/freebusy`, () =>
        HttpResponse.json({
          ok: true,
          provider: "google",
          calendar_id: "primary",
          time_min: "2026-06-14T16:00:00Z",
          time_max: "2026-06-15T00:00:00Z",
          busy: [{ start: "2026-06-14T17:00:00Z", end: "2026-06-14T18:00:00Z" }],
        }),
      ),
    );
    await speak("Schedule a meeting with Vishesh tomorrow.");
    // The proposal card appears immediately.
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-card")).toBeInTheDocument(),
    );
    // Then real availability resolves into the card — honestly labelled
    // as the caller's own calendar (Phase 1274: target calendar not wired).
    await waitFor(() => {
      expect(
        screen.getByTestId("work-artifact-availability").textContent,
      ).toMatch(/Checked your calendar only/i);
    });
    // Event creation stays gated — now with PRECISE gate-aware copy
    // (Phase 1274/1275), not the stale "not enabled yet" blanket.
    expect(screen.getByTestId("work-artifact-card").textContent).toMatch(
      /No event created\. No invite sent\./i,
    );
    expect(screen.getByTestId("work-artifact-card").textContent).not.toMatch(
      /not enabled yet/i,
    );
    expect(actionPosts.length).toBe(0);
  });

  it("Meeting proposal shows 'Google reconnect required' when free/busy needs re-consent — never fake availability", async () => {
    server.use(
      http.post(`${API_BASE}/calendar/freebusy`, () =>
        HttpResponse.json(
          { ok: false, code: "SCOPE_REAUTH_REQUIRED" },
          { status: 409 },
        ),
      ),
    );
    await speak("Schedule a meeting with Vishesh tomorrow.");
    await waitFor(() => {
      expect(
        screen.getByTestId("work-artifact-availability").textContent,
      ).toMatch(/Google reconnect required/i);
    });
    // No fabricated candidate windows, no event created.
    expect(
      screen.getByTestId("work-artifact-availability").textContent,
    ).not.toMatch(/Candidate windows/i);
    expect(actionPosts.length).toBe(0);
  });

  it("'Draft a message to David…' creates a LOCAL draft (NO backend action until Confirm)", async () => {
    // Phase 1269 semantics: draft is local — proposing is an explicit
    // Confirm, never automatic.
    await speak("Draft a message to David saying we need to review this.");
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-card")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("work-artifact-card").textContent).toMatch(/David/);
    // No governed action was created just by drafting.
    expect(actionPosts.length).toBe(0);
    expect(recordedBodies.length).toBe(0); // no Twin chat
  });

  it("'Yes, ping David for a status update' shows a professional draft — never the raw command (RC2 Talk path)", async () => {
    // Founder defect gate: instruction to Otzar must not appear as the
    // recipient-facing body on the work artifact card.
    await speak("Yes, ping David for a status update");
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-card")).toBeInTheDocument(),
    );
    const body = screen.getByTestId("work-artifact-body").textContent ?? "";
    expect(body.toLowerCase()).not.toContain("ping david");
    expect(body.toLowerCase()).not.toMatch(/^yes[,.]?\s*ping/);
    expect(body).toMatch(/Hi David|Hey David/i);
    expect(body.toLowerCase()).toMatch(
      /status update|quick update|what is complete|blocked|need from me/,
    );
    expect(screen.getByTestId("work-artifact-card").textContent).toMatch(/David/);
    // Local draft only until Confirm — no gated Action, no Twin chat.
    expect(actionPosts.length).toBe(0);
    expect(recordedBodies.length).toBe(0);
  });

  it("Confirm on the draft delivers via the human-authority path (no external send, no gated Action)", async () => {
    await speak("Draft a message to David saying we need to review this.");
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-confirm")).toBeInTheDocument(),
    );
    await userEvent.setup().click(screen.getByTestId("work-artifact-confirm"));
    // Phase 1284 Wave 2: Confirm delivers a human note directly — it POSTs to
    // the human-authority endpoint, NOT the gated Action ladder.
    await waitFor(() => expect(internalMessagePosts.length).toBe(1));
    const body = internalMessagePosts[0]!;
    expect(body.recipient).toBe("ent-david");
    expect(typeof body.message).toBe("string");
    expect(actionPosts.length).toBe(0); // no gated Action created
    expect(recordedBodies.length).toBe(0); // no external send
  });

  it("'Draft a Slack message…' stays a LOCAL draft — never auto-routes, never auto-submits", async () => {
    await speak("Draft a Slack message to David saying we need to review this.");
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-card")).toBeInTheDocument(),
    );
    // External: no backend action created, no navigation away.
    expect(actionPosts.length).toBe(0);
    expect(screen.getByTestId("work-artifact-card").getAttribute("data-kind")).toBe(
      "DRAFT_MESSAGE",
    );
    // Confirm does NOT send externally (no send runtime) — still 0 posts.
    await userEvent.setup().click(screen.getByTestId("work-artifact-confirm"));
    expect(actionPosts.length).toBe(0);
  });

  it("'Send David this message' is a draft until Confirm; Confirm delivers via human-authority path", async () => {
    await speak("Send David this message.");
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-confirm")).toBeInTheDocument(),
    );
    expect(internalMessagePosts.length).toBe(0); // not delivered on the command
    await userEvent.setup().click(screen.getByTestId("work-artifact-confirm"));
    await waitFor(() => expect(internalMessagePosts.length).toBe(1));
    expect(actionPosts.length).toBe(0); // not the gated Action path
    expect(recordedBodies.length).toBe(0); // no external send
  });

  it("'Schedule a meeting with Vishesh tomorrow' renders a meeting proposal card and NEVER routes to transcripts/creates an event", async () => {
    await speak("Schedule a meeting with Vishesh tomorrow.");
    await waitFor(() => {
      expect(screen.getByTestId("work-artifact-card")).toBeInTheDocument();
    });
    const card = screen.getByTestId("work-artifact-card");
    expect(card.getAttribute("data-kind")).toBe("SCHEDULE_MEETING");
    expect(card.textContent).toMatch(/Meeting proposal/i);
    // No backend action (no event create), no Twin chat.
    expect(actionPosts.length).toBe(0);
    expect(recordedBodies.length).toBe(0);
  });

  it("'After Samiksha confirms, put it on the calendar' preserves the prerequisite", async () => {
    await speak("After Samiksha confirms, put it on the calendar.");
    await waitFor(() => {
      expect(screen.getByTestId("work-artifact-card")).toBeInTheDocument();
    });
    expect(screen.getByTestId("work-artifact-prereq").textContent).toMatch(
      /Samiksha/i,
    );
    expect(actionPosts.length).toBe(0);
  });

  it("Confirming a meeting proposal hits the GATED create endpoint and shows the blocker — no event, no internal action (Phase 1272)", async () => {
    server.use(
      http.post(`${API_BASE}/calendar/freebusy`, () =>
        HttpResponse.json({
          ok: true,
          provider: "google",
          calendar_id: "primary",
          time_min: "2026-06-14T16:00:00Z",
          time_max: "2026-06-15T00:00:00Z",
          busy: [],
        }),
      ),
      http.post(`${API_BASE}/calendar/events/create`, () =>
        HttpResponse.json(
          { ok: false, code: "EVENT_WRITE_SCOPE_MISSING" },
          { status: 409 },
        ),
      ),
    );
    await speak("Schedule a meeting with Vishesh tomorrow.");
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-confirm")).toBeInTheDocument(),
    );
    await userEvent.setup().click(screen.getByTestId("work-artifact-confirm"));
    // The gated create blocked → honest reconnect status, NOT "Created".
    await waitFor(() => {
      expect(screen.getByTestId("work-artifact-card").textContent).toMatch(
        /Needs Google reconnect for event creation/i,
      );
    });
    expect(screen.getByTestId("work-artifact-card").textContent).not.toMatch(
      /\bCreated\b/,
    );
    // No event created, no internal-notification action created.
    expect(actionPosts.length).toBe(0);
    expect(recordedBodies.length).toBe(0);
  });

  it("Scheduling Vishesh shows MANAGER AUTHORITY status, not a generic draft (Phase 1273)", async () => {
    server.use(
      http.post(`${API_BASE}/calendar/freebusy`, () =>
        HttpResponse.json({
          ok: true,
          provider: "google",
          calendar_id: "primary",
          time_min: "2026-06-14T16:00:00Z",
          time_max: "2026-06-15T00:00:00Z",
          busy: [],
        }),
      ),
    );
    await speak("Schedule a meeting with Vishesh tomorrow.");
    await waitFor(() => {
      expect(
        screen.getByTestId("work-artifact-authority").textContent,
      ).toMatch(/Manager authority/i);
    });
    expect(actionPosts.length).toBe(0);
  });

  it("Scheduling unknown Alex shows UNRESOLVED, calls NO free/busy, shows NO candidate windows (Phase 1274)", async () => {
    let freebusyCalls = 0;
    server.use(
      http.post(`${API_BASE}/calendar/freebusy`, () => {
        freebusyCalls += 1;
        return HttpResponse.json({
          ok: true,
          provider: "google",
          calendar_id: "primary",
          time_min: "2026-06-14T16:00:00Z",
          time_max: "2026-06-15T00:00:00Z",
          busy: [],
        });
      }),
    );
    await speak("Schedule a meeting with Alex tomorrow.");
    await waitFor(() => {
      expect(
        screen.getByTestId("work-artifact-authority").textContent,
      ).toMatch(/don't know which Alex/i);
    });
    const card = screen.getByTestId("work-artifact-card");
    // Critical: unresolved → no availability, no fabricated windows.
    expect(card.textContent).not.toMatch(/Candidate windows/i);
    expect(screen.queryByTestId("work-artifact-availability")).toBeNull();
    expect(freebusyCalls).toBe(0);
    expect(actionPosts.length).toBe(0);
  });

  it("Explicit '11am PST' shows a Proposed time + interpretation, not 'Choose a time' (Phase 1274)", async () => {
    server.use(
      http.post(`${API_BASE}/calendar/freebusy`, () =>
        HttpResponse.json({
          ok: true,
          provider: "google",
          calendar_id: "primary",
          time_min: "2026-06-14T16:00:00Z",
          time_max: "2026-06-15T00:00:00Z",
          busy: [],
        }),
      ),
    );
    await speak("Schedule a meeting with Vishesh tomorrow at 11am PST.");
    await waitFor(() => {
      expect(
        screen.getByTestId("work-artifact-proposed-time").textContent,
      ).toMatch(/11:00 AM Pacific Time/i);
    });
    expect(screen.getByTestId("work-artifact-timezone").textContent).toMatch(
      /Interpreted PST as Pacific Time/i,
    );
    expect(screen.getByTestId("work-artifact-card").textContent).not.toMatch(
      /Choose a time/i,
    );
    expect(actionPosts.length).toBe(0);
  });

  it("Meeting proposal card ALWAYS shows View/Open (inspect-only) — Phase 1273 regression fix", async () => {
    server.use(
      http.post(`${API_BASE}/calendar/freebusy`, () =>
        HttpResponse.json({
          ok: true,
          provider: "google",
          calendar_id: "primary",
          time_min: "2026-06-14T16:00:00Z",
          time_max: "2026-06-15T00:00:00Z",
          busy: [],
        }),
      ),
    );
    await speak("Schedule a meeting with Vishesh tomorrow.");
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-open")).toBeInTheDocument(),
    );
    // View opens an in-place inspector and creates nothing.
    await userEvent.setup().click(screen.getByTestId("work-artifact-open"));
    await waitFor(() =>
      expect(
        screen.getByTestId("work-artifact-view-details"),
      ).toBeInTheDocument(),
    );
    expect(actionPosts.length).toBe(0);
  });

  it("Multi-intent command renders TWO linked plan cards (meeting + David follow-up) — Phase 1273", async () => {
    server.use(
      http.post(`${API_BASE}/calendar/freebusy`, () =>
        HttpResponse.json({
          ok: true,
          provider: "google",
          calendar_id: "primary",
          time_min: "2026-06-14T16:00:00Z",
          time_max: "2026-06-15T00:00:00Z",
          busy: [],
        }),
      ),
    );
    await speak(
      "After Samiksha confirms, schedule a 30-minute meeting with Vishesh tomorrow during work hours about the Otzar voice runtime, and prepare a follow-up note for David.",
    );
    await waitFor(() =>
      expect(screen.getByTestId("work-plan")).toBeInTheDocument(),
    );
    const cards = screen.getAllByTestId("work-artifact-card");
    expect(cards.length).toBe(2);
    const text = cards.map((c) => c.textContent ?? "").join(" | ");
    expect(text).toMatch(/Meeting proposal → Vishesh/i);
    expect(text).toMatch(/Follow up with David/i);
    // Samiksha prerequisite preserved; context attached; nothing executed.
    expect(text).toMatch(/Samiksha/i);
    expect(text).toMatch(/Otzar voice runtime/i);
    expect(actionPosts.length).toBe(0);
  });

  it("Follow-up artifact View/Why details show evidence (confidence) — inspect only (Phase 1275)", async () => {
    await speak(
      "I told Vishesh I would follow up after the meeting about the Otzar voice runtime.",
    );
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-open")).toBeInTheDocument(),
    );
    // The follow-up card has no route → "View" toggles an inspector.
    await userEvent.setup().click(screen.getByTestId("work-artifact-open"));
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-evidence")).toBeInTheDocument(),
    );
    const ev = screen.getByTestId("work-artifact-evidence").textContent ?? "";
    expect(ev).toMatch(/context_label: Otzar voice runtime/i);
    // Inspect-only: no action created by opening Why details.
    expect(actionPosts.length).toBe(0);
  });

  it("Follow-up artifact PERSISTS to the durable Work Ledger and shows 'Saved' (Phase 1279)", async () => {
    await speak(
      "I told Vishesh I would follow up after the meeting about the Otzar voice runtime.",
    );
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-ledger-saved")).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId("work-artifact-ledger-saved").textContent,
    ).toMatch(/Saved/i);
    // Phase 1281 — View/Why shows the governed BEAM coordination result.
    await userEvent.setup().click(screen.getByTestId("work-artifact-open"));
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-coordination")).toBeInTheDocument(),
    );
    expect(
      screen.getByTestId("work-artifact-coordination").textContent,
    ).toMatch(/BEAM dispatched/i);
  });

  it("Failed ledger persistence shows a safe error — never fakes saved (Phase 1279)", async () => {
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, () =>
        HttpResponse.json({ ok: false, code: "INVALID_REQUEST", message: "x" }, { status: 422 }),
      ),
    );
    await speak("I told Vishesh I would follow up about the Otzar voice runtime.");
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-ledger-error")).toBeInTheDocument(),
    );
    // Calm, human failure copy — no backend "Work Ledger" term.
    expect(
      screen.getByTestId("work-artifact-ledger-error").textContent,
    ).toMatch(/Couldn't save that right now/i);
    expect(
      screen.getByTestId("work-artifact-ledger-error").textContent,
    ).not.toMatch(/Work Ledger/i);
    expect(screen.queryByTestId("work-artifact-ledger-saved")).toBeNull();
  });

  it("Conversation-to-work artifact shows HONEST extraction source — deterministic, never fake Python (Phase 1278)", async () => {
    // Default MSW runtime registry reports Python NOT_CONFIGURED.
    await speak(
      "I told Vishesh I would follow up after the meeting about the Otzar voice runtime.",
    );
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-open")).toBeInTheDocument(),
    );
    await userEvent.setup().click(screen.getByTestId("work-artifact-open"));
    await waitFor(() =>
      expect(
        screen.getByTestId("work-artifact-extraction-source"),
      ).toBeInTheDocument(),
    );
    const src =
      screen.getByTestId("work-artifact-extraction-source").textContent ?? "";
    expect(src).toMatch(/Deterministic extraction/i);
    expect(src).not.toMatch(/Python enrichment used/i);
  });

  it("'I told Vishesh I would follow up…' creates a FOLLOW-UP artifact (commitment), no send (Phase 1273)", async () => {
    await speak(
      "I told Vishesh I would follow up after the meeting about the Otzar voice runtime.",
    );
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-card")).toBeInTheDocument(),
    );
    const card = screen.getByTestId("work-artifact-card");
    expect(card.textContent).toMatch(/Follow up with Vishesh/i);
    expect(card.textContent).toMatch(/Otzar voice runtime/i);
    // No send, no governed action created.
    expect(actionPosts.length).toBe(0);
    expect(recordedBodies.length).toBe(0);
  });

  it("Confirm with an explicit time normalizes selected_time (N-04) — never not-wired or null clock", async () => {
    let createCalls = 0;
    let selectedStart: string | null = null;
    let selectedEnd: string | null = null;
    server.use(
      http.post(`${API_BASE}/calendar/freebusy`, () =>
        HttpResponse.json({
          ok: true,
          provider: "google",
          calendar_id: "primary",
          time_min: "2026-06-14T16:00:00Z",
          time_max: "2026-06-15T00:00:00Z",
          busy: [],
        }),
      ),
      http.post(`${API_BASE}/calendar/events/create`, async ({ request }) => {
        createCalls += 1;
        const body = (await request.json()) as {
          selected_time?: { start?: string; end?: string } | null;
        };
        selectedStart = body.selected_time?.start ?? null;
        selectedEnd = body.selected_time?.end ?? null;
        return HttpResponse.json({
          ok: true,
          start: "2026-06-15T18:00:00.000Z",
          end: "2026-06-15T18:30:00.000Z",
          html_link: "https://calendar.example/event/1",
        });
      }),
    );
    await speak("Schedule a meeting with Vishesh tomorrow at 11am PST.");
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-confirm")).toBeInTheDocument(),
    );
    await userEvent.setup().click(screen.getByTestId("work-artifact-confirm"));
    await waitFor(() => {
      expect(createCalls).toBeGreaterThanOrEqual(1);
    });
    expect(selectedStart).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(selectedEnd).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const card = screen.getByTestId("work-artifact-card").textContent ?? "";
    expect(card).not.toMatch(/normalization not wired/i);
    expect(card).not.toMatch(/selected_time:\s*null/i);
    expect(actionPosts.length).toBe(0);
  });

  it("Confirm on an unresolved Alex blocks with 'Resolve participant first', no event-create call (Phase 1274/1275 Task E)", async () => {
    let createCalls = 0;
    server.use(
      http.post(`${API_BASE}/calendar/events/create`, () => {
        createCalls += 1;
        return HttpResponse.json({ ok: false, code: "PARTICIPANT_UNRESOLVED" }, { status: 409 });
      }),
    );
    await speak("Schedule a meeting with Alex tomorrow.");
    await waitFor(() => {
      expect(
        screen.getByTestId("work-artifact-authority").textContent,
      ).toMatch(/don't know which Alex/i);
    });
    await userEvent.setup().click(screen.getByTestId("work-artifact-confirm"));
    await waitFor(() => {
      expect(screen.getByTestId("work-artifact-card").textContent).toMatch(
        /Resolve participant first/i,
      );
    });
    expect(createCalls).toBe(0);
    expect(actionPosts.length).toBe(0);
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

  it("'Ask David's Twin…' sends David a governed message and never fakes David's answer", async () => {
    await speak("Ask David's Twin what he thinks.");
    // New doctrine: the question is routed to David as a GOVERNED internal
    // message (recipient = the PERSON behind the Twin; body = a composed
    // second-person question) — never a fabricated answer, never a Twin chat.
    await waitFor(() => expect(internalMessagePosts.length).toBe(1));
    const body = internalMessagePosts[0]!;
    expect(body.recipient).toBe("David");
    expect(String(body.message).toLowerCase()).toContain("what do you think");
    expect(String(body.message).toLowerCase()).not.toContain("twin");
    // No fabricated answer and no Twin chat call.
    expect(recordedBodies.length).toBe(0);
    const html = document.body.innerHTML.toLowerCase();
    expect(html).not.toContain("david thinks");
    expect(html).not.toContain("david says");
  });

  it("'Schedule a meeting with Vishesh tomorrow' (no time given) drafts a proposal asking to choose a time, no auto-create", async () => {
    const panel = await speak("Schedule a meeting with Vishesh tomorrow.");
    expect(panel.textContent).toMatch(/Draft meeting proposal → Vishesh/i);
    // Phase 1274: with no explicit time, the honest status is "choose a
    // time" (not a generic "Approval required").
    expect(screen.getByTestId("voice-action-status").textContent).toMatch(
      /choose a time/i,
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

  // ── Phase 1+2: self-work rail + Twin-mediated collaboration ───────────
  it("'Remind me to validate what I received' saves a self Work Ledger entry — never a teammate message", async () => {
    const ledgerPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, entry: { ledger_entry_id: "led-self-1" } },
          { status: 201 },
        );
      }),
    );
    const panel = await speak("Remind me to validate what I received.");
    expect(panel.textContent).toMatch(/Reminder to yourself/i);
    await waitFor(() => expect(ledgerPosts.length).toBe(1));
    // Self reminder → TASK ledger, title prefixed "Reminder:", first person.
    expect(ledgerPosts[0]!.ledger_type).toBe("TASK");
    expect(String(ledgerPosts[0]!.title)).toMatch(/^Reminder: /);
    expect(String(ledgerPosts[0]!.title).toLowerCase()).toContain("what i received");
    // Phase 2.6 — "what I received" resolved to the inbox message and LINKED
    // (notification_id set; confirmation names the source).
    expect(ledgerPosts[0]!.notification_id).toBe("notif-1");
    expect(
      screen.getAllByText(
        /I saved that reminder for you linked to the message you received from Sadeil/i,
      ).length,
    ).toBeGreaterThan(0);
    // Never a teammate message, never a Twin chat.
    expect(internalMessagePosts.length).toBe(0);
    expect(recordedBodies.length).toBe(0);
  });

  it("'Ask David to review the transcript' sends a governed review request via the caller's Twin, with the transcript context attached", async () => {
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      // Caller is the founder (NOT David) → collaboration proceeds.
      http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
        HttpResponse.json({
          ok: true,
          status: "READY",
          identity: {
            viewer: {
              user_id: "ent-founder",
              email: "founder@niovlabs.com",
              display_name: "Sadeil",
              title: "FOUNDER",
              org_role: "FOUNDER",
              is_founder_admin: true,
            },
            org: { org_id: "o-1", name: "NIOV", domain: null },
            twin: { twin_id: "twin-founder", display_name: "Otzar", active: true },
            projects: [],
          },
        }),
      ),
      // A recent meeting capture exists → "the transcript" resolves + attaches.
      http.get(`${API_BASE}/work-os/comms/recent-artifacts`, () =>
        HttpResponse.json({
          ok: true,
          artifacts: [
            {
              artifact_id: "art-mtg-1",
              artifact_type: "MEETING_CAPTURE",
              title: "Q3 planning meeting",
              summary: "Roadmap + hiring",
              created_at: "2026-06-23T09:00:00.000Z",
              updated_at: "2026-06-23T09:30:00.000Z",
              status: "ACTIVE",
              scope: "personal",
              related_person: null,
              source: {
                source_system: "otzar",
                source_message_id: null,
                ledger_entry_id: "led-mtg-1",
              },
              destination: { kind: "work", route: null },
            },
          ],
          next_cursor: null,
        }),
      ),
      http.post(
        `${API_BASE}/otzar/my-twin/collaboration-requests`,
        async ({ request }) => {
          collaborationPosts.push((await request.json()) as Record<string, unknown>);
          return HttpResponse.json(
            { ok: true, request: { request_id: "collab-1", status: "PENDING" } },
            { status: 201 },
          );
        },
      ),
    );
    await speak("Ask David to review the transcript.");
    await waitFor(() => expect(collaborationPosts.length).toBe(1));
    const body = collaborationPosts[0]!;
    // Target the teammate HUMAN (the org member), mediated by the caller's Twin.
    expect(body.target_type).toBe("EMPLOYEE");
    expect(body.target_entity_id).toBe("ent-david");
    expect(body.request_type).toBe("REVIEW_REQUEST");
    expect(body.requester_twin_entity_id).toBe("twin-founder");
    // safe_summary is the COMPOSED message + the resolved context, never the
    // verbatim command.
    expect(String(body.safe_summary).toLowerCase()).toContain("review the transcript");
    expect(String(body.safe_summary).toLowerCase()).toContain("re: the transcript");
    expect(String(body.safe_summary)).not.toContain("Ask David");
    // Never targets the teammate's Twin directly (cross-org deny risk).
    expect(body).not.toHaveProperty("target_twin_entity_id");
    // Governed rail — NOT the plain internal-message rail, NOT Twin chat.
    expect(internalMessagePosts.length).toBe(0);
    expect(recordedBodies.length).toBe(0);
    expect(
      screen.getAllByText(/I sent David a review request for the transcript/i).length,
    ).toBeGreaterThan(0);
  });

  it("'Ask David to review this client note' with no attachable note asks ONE focused question — never a contextless request", async () => {
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, async ({ request }) => {
        collaborationPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, request: { request_id: "collab-x", status: "PENDING" } },
          { status: 201 },
        );
      }),
    );
    const panel = await speak("Ask David to review this client note.");
    // No client-note source → one focused question, NOT a sent request.
    await waitFor(() =>
      expect(
        screen.getAllByText(/Which client note should I attach\?/i).length,
      ).toBeGreaterThan(0),
    );
    expect(collaborationPosts.length).toBe(0);
    expect(internalMessagePosts.length).toBe(0);
    expect(panel.innerHTML).not.toMatch(/client_note/i);
  });

  it("'Message David…' while signed in AS David reroutes to a self task — never messages oneself", async () => {
    const ledgerPosts: Array<Record<string, unknown>> = [];
    server.use(
      // context-health reports the current user IS David (resolved self).
      http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
        HttpResponse.json({
          ok: true,
          status: "READY",
          identity: {
            viewer: {
              user_id: "ent-david",
              email: "david@niovlabs.com",
              display_name: "David",
              title: "",
              org_role: "EMPLOYEE",
              is_founder_admin: false,
            },
            org: { org_id: "o-1", name: "NIOV", domain: null },
            twin: { twin_id: "twin-david", display_name: "Twin", active: true },
            projects: [],
          },
        }),
      ),
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, entry: { ledger_entry_id: "led-self-2" } },
          { status: 201 },
        );
      }),
    );
    await speak("Message David and ask him to validate what he received.");
    // Resolved to self → self task ledger, NOT a message delivered to a teammate.
    await waitFor(() => expect(ledgerPosts.length).toBe(1));
    expect(ledgerPosts[0]!.ledger_type).toBe("TASK");
    // Phase 2.5 — stored in FIRST person, NEVER the "Hey David…" teammate body.
    const selfTitle = String(ledgerPosts[0]!.title);
    expect(selfTitle.toLowerCase()).toContain("what i received");
    expect(selfTitle).not.toMatch(/hey david/i);
    expect(selfTitle.toLowerCase()).not.toContain("what he received");
    expect(internalMessagePosts.length).toBe(0);
    expect(recordedBodies.length).toBe(0);
  });

  // ── Phase 2.5: governed resolver (standard users) + visibility/flow ───
  it("standard (non-admin) user resolves a same-org teammate via the read-scoped resolver — not an admin-only failure", async () => {
    // Non-admin session: no can_admin_org, so the roster endpoint is forbidden.
    useAuthStore.setState({
      capabilities: {
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: true,
        can_admin_org: false,
        can_admin_niov: false,
      },
    });
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      // Admin-only roster is forbidden for this caller…
      http.get(`${API_BASE}/org/entities`, () =>
        HttpResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }),
      ),
      // …but the read-scoped resolver still resolves David for any employee.
      http.post(`${API_BASE}/work-os/resolve-target`, () =>
        HttpResponse.json({
          ok: true,
          resolution: {
            code: "RESOLVED_INTERNAL_ENTITY",
            match: {
              entity_id: "ent-david",
              display_name: "David",
              role_title: "Engineer",
            },
            candidates: [],
          },
        }),
      ),
      http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
        HttpResponse.json({
          ok: true,
          status: "READY",
          identity: {
            viewer: {
              user_id: "ent-vishesh",
              email: "vishesh@niovlabs.com",
              display_name: "Vishesh",
              title: "",
              org_role: "EMPLOYEE",
              is_founder_admin: false,
            },
            org: { org_id: "o-1", name: "NIOV", domain: null },
            twin: { twin_id: "twin-vishesh", display_name: "Twin", active: true },
            projects: [],
          },
        }),
      ),
      http.post(
        `${API_BASE}/otzar/my-twin/collaboration-requests`,
        async ({ request }) => {
          collaborationPosts.push(
            (await request.json()) as Record<string, unknown>,
          );
          return HttpResponse.json(
            { ok: true, request: { request_id: "collab-2", status: "PENDING" } },
            { status: 201 },
          );
        },
      ),
    );
    // A named object (not a deictic reference) → no context lookup needed.
    await speak("Ask David to review the budget plan.");
    // Resolved via the read-scoped resolver → governed request actually sent.
    await waitFor(() => expect(collaborationPosts.length).toBe(1));
    expect(collaborationPosts[0]!.target_entity_id).toBe("ent-david");
    expect(collaborationPosts[0]!.requester_twin_entity_id).toBe("twin-vishesh");
    expect(
      screen.getAllByText(/I sent David a review request/i).length,
    ).toBeGreaterThan(0);
  });

  it("standard user's work request that needs approval → human 'needs approval' copy, no backend codes", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/context-health`, () =>
        HttpResponse.json({
          ok: true,
          status: "READY",
          identity: {
            viewer: {
              user_id: "ent-vishesh",
              email: "vishesh@niovlabs.com",
              display_name: "Vishesh",
              title: "",
              org_role: "EMPLOYEE",
              is_founder_admin: false,
            },
            org: { org_id: "o-1", name: "NIOV", domain: null },
            twin: { twin_id: "twin-vishesh", display_name: "Twin", active: true },
            projects: [],
          },
        }),
      ),
      // org-collaboration policy → approval required (409) for a standard twin.
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, () =>
        HttpResponse.json(
          { ok: false, error: "NEEDS_APPROVAL" },
          { status: 409 },
        ),
      ),
    );
    const panel = await speak("Ask David to approve the budget.");
    // Governed approval path → human "needs approval" copy, never a 409 / code.
    await waitFor(() =>
      expect(
        screen.getAllByText(/needs approval first/i).length,
      ).toBeGreaterThan(0),
    );
    const html = panel.innerHTML;
    expect(html).not.toContain("NEEDS_APPROVAL");
    expect(html).not.toContain("409");
    expect(html).not.toMatch(/collaboration-request/i);
  });

  it("ambiguous recipient → ONE focused clarification naming at most two people, never a picklist", async () => {
    server.use(
      http.post(`${API_BASE}/work-os/resolve-target`, () =>
        HttpResponse.json({
          ok: true,
          resolution: {
            code: "AMBIGUOUS",
            match: null,
            candidates: [
              { entity_id: "ent-d1", display_name: "David Odie", role_title: "Tech Lead" },
              { entity_id: "ent-d2", display_name: "David Ramirez", role_title: "Sales" },
            ],
          },
        }),
      ),
    );
    const panel = await speak("Ask David to review this client note.");
    await waitFor(() =>
      expect(
        screen.getAllByText(/do you mean David Odie or David Ramirez\?/i).length,
      ).toBeGreaterThan(0),
    );
    // Focused clarification — not a verbatim send, no governed request fired.
    expect(panel.innerHTML).not.toMatch(/entity[_-]id/i);
  });

  // ── Phase 2.6: self-work context resolution (no contextless artifacts) ──
  it("'Message myself and ask me to validate what I received' → self task LINKED to the inbox message", async () => {
    const ledgerPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, entry: { ledger_entry_id: "led-ctx-1" } },
          { status: 201 },
        );
      }),
    );
    await speak("Message myself and ask me to validate what I received.");
    await waitFor(() => expect(ledgerPosts.length).toBe(1));
    // Linked to the resolved inbox message via the first-class typed field.
    expect(ledgerPosts[0]!.ledger_type).toBe("TASK");
    expect(ledgerPosts[0]!.notification_id).toBe("notif-1");
    expect(
      screen.getAllByText(
        /I added that as a task for you linked to the message you received from Sadeil/i,
      ).length,
    ).toBeGreaterThan(0);
    expect(internalMessagePosts.length).toBe(0);
  });

  it("self work referencing 'what I received' with an EMPTY inbox asks ONE focused question — never a contextless task", async () => {
    const ledgerPosts: Array<Record<string, unknown>> = [];
    server.use(
      // Empty inbox → nothing to link.
      http.get(`${API_BASE}/notifications`, () =>
        HttpResponse.json({
          ok: true,
          page: 1,
          page_size: 20,
          total: 0,
          notifications: [],
        }),
      ),
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, entry: { ledger_entry_id: "led-ctx-2" } },
          { status: 201 },
        );
      }),
    );
    const panel = await speak("Remind me to validate what I received.");
    // No inbox message → focused question, NOT a contextless saved task.
    await waitFor(() =>
      expect(
        screen.getAllByText(/do you mean the latest message in your inbox\?/i).length,
      ).toBeGreaterThan(0),
    );
    expect(ledgerPosts.length).toBe(0);
    expect(panel.innerHTML).not.toMatch(/notification|NOT_FOUND/);
  });

  // ── Phase 2.8: orb compression + ambient presence wiring ──────────────
  it("successful save shows ONE compact outcome (machinery collapsed), and flashes presence SUCCESS", async () => {
    usePresenceStore.getState().reset();
    const ledgerPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, entry: { ledger_entry_id: "led-2-8" } },
          { status: 201 },
        );
      }),
    );
    await speak("Note to self: simplify the approval flow.");
    await waitFor(() => expect(ledgerPosts.length).toBe(1));
    // The compact outcome IS the human result — no Heard/Status wall on top.
    const outcome = screen.getByTestId("voice-action-outcome");
    expect(outcome.textContent).toMatch(/I saved that as a note to yourself/i);
    expect(outcome.textContent).not.toMatch(/Heard:|Status:|Action:/);
    // Machinery (Heard / Status / Voice) is collapsed behind <details>.
    const panel = screen.getByTestId("voice-action-panel");
    expect(panel.querySelector("details")).not.toBeNull();
    expect(panel.querySelector("summary")?.textContent).toMatch(/Details/i);
    // The edge-presence layer flashed SUCCESS (auto-fades; drives the glow).
    expect(usePresenceStore.getState().lastSuccessAt).not.toBeNull();
    expect(usePresenceStore.getState().lastFailureAt).toBeNull();
  });

  it("a failed save flashes presence FAILURE (not SUCCESS)", async () => {
    usePresenceStore.getState().reset();
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, () =>
        HttpResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 }),
      ),
    );
    await speak("Note to self: simplify the approval flow.");
    await waitFor(() =>
      expect(usePresenceStore.getState().lastFailureAt).not.toBeNull(),
    );
    expect(usePresenceStore.getState().lastSuccessAt).toBeNull();
  });

  // ── Phase 2.9: permissioned current-surface context ───────────────────
  it("active provided context resolves 'this' → governed request with the current context attached, no clarification", async () => {
    useCurrentSurfaceContextStore.getState().provide({
      type: "selected_text",
      text: "Client asked for revised pricing by Friday.",
    });
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, async ({ request }) => {
        collaborationPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, request: { request_id: "collab-ctx", status: "PENDING" } },
          { status: 201 },
        );
      }),
    );
    await speak("Ask David to review this.");
    await waitFor(() => expect(collaborationPosts.length).toBe(1));
    expect(String(collaborationPosts[0]!.safe_summary).toLowerCase()).toContain(
      "re: the current context",
    );
    expect(
      screen.getAllByText(/I sent David a review request for the current context/i).length,
    ).toBeGreaterThan(0);
  });

  it("no active context → 'review this' asks ONE focused question, never a contextless request", async () => {
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, async ({ request }) => {
        collaborationPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, request: { request_id: "collab-x", status: "PENDING" } },
          { status: 201 },
        );
      }),
    );
    await speak("Ask David to review this.");
    await waitFor(() =>
      expect(
        screen.getAllByText(/What should I use as the current context\?/i).length,
      ).toBeGreaterThan(0),
    );
    expect(collaborationPosts.length).toBe(0);
  });

  it("self-work links the current context ('follow up on this')", async () => {
    useCurrentSurfaceContextStore.getState().provide({
      type: "selected_text",
      text: "Client asked for revised pricing by Friday.",
    });
    const ledgerPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, entry: { ledger_entry_id: "led-ctx" } },
          { status: 201 },
        );
      }),
    );
    await speak("Remind me to follow up on this.");
    await waitFor(() => expect(ledgerPosts.length).toBe(1));
    // Linked to the provided context (details carry the reference), not empty.
    const details = ledgerPosts[0]!.details as Record<string, unknown> | undefined;
    expect(details?.context_type).toBe("selected_text");
    expect(
      screen.getAllByText(/linked to the current context/i).length,
    ).toBeGreaterThan(0);
  });

  it("clearing context makes a later 'this' ask again — never reuses stale context", async () => {
    useCurrentSurfaceContextStore.getState().provide({
      type: "selected_text",
      text: "stale selection",
    });
    useCurrentSurfaceContextStore.getState().clear();
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, () =>
        HttpResponse.json({ ok: true }, { status: 201 }),
      ),
    );
    await speak("Ask David to review this.");
    await waitFor(() =>
      expect(
        screen.getAllByText(/What should I use as the current context\?/i).length,
      ).toBeGreaterThan(0),
    );
  });

  // ── Phase 3A: transcript / meeting intelligence (provided text) ───────
  const TRANSCRIPT = [
    "We decided to ship the onboarding flow next week.",
    "David is blocked on the API keys.",
    "I will prepare the investor deck by Friday.",
    "We need to follow up with Samiksha about the pricing.",
    "There's a risk the demo could slip.",
  ].join(" ");

  it("'Summarize this transcript' on provided text → compact counts + collapsed digest (no raw dump)", async () => {
    useCurrentSurfaceContextStore.getState().provide({
      type: "selected_text",
      text: TRANSCRIPT,
    });
    await speak("Summarize this transcript.");
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /I found 1 decision, 2 follow-ups, and 1 blocker\./,
    );
    const digest = screen.getByTestId("transcript-digest");
    expect(digest.textContent).toMatch(/Decisions/);
    expect(digest.textContent).toMatch(/ship the onboarding flow/);
    expect(digest.textContent).toMatch(/Blockers/);
  });

  it("no provided context + transcript command → one focused question, no artifact", async () => {
    const ledgerPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, entry: { ledger_entry_id: "x" } }, { status: 201 });
      }),
    );
    await speak("Summarize this transcript.");
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /Paste or select the transcript you want me to use\./i,
    );
    expect(screen.queryByTestId("transcript-digest")).toBeNull();
    expect(ledgerPosts.length).toBe(0);
  });

  it("'send William the decisions' extracts decisions and routes them through the governed rail", async () => {
    useCurrentSurfaceContextStore.getState().provide({ type: "selected_text", text: TRANSCRIPT });
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/resolve-target`, () =>
        HttpResponse.json({
          ok: true,
          resolution: {
            code: "RESOLVED_INTERNAL_ENTITY",
            match: { entity_id: "ent-william", display_name: "William", role_title: "GTM" },
            candidates: [],
          },
        }),
      ),
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, async ({ request }) => {
        collaborationPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, request: { request_id: "collab-w", status: "PENDING" } },
          { status: 201 },
        );
      }),
    );
    await speak("After this meeting, send William the decisions.");
    await waitFor(() => expect(collaborationPosts.length).toBe(1));
    expect(collaborationPosts[0]!.target_entity_id).toBe("ent-william");
    expect(String(collaborationPosts[0]!.safe_summary)).toMatch(/ship the onboarding flow/);
    expect(String(collaborationPosts[0]!.safe_summary).toLowerCase()).toContain("decisions");
  });

  it("'Tell Samiksha to summarize this transcript' delegates through the governed rail with context attached", async () => {
    useCurrentSurfaceContextStore.getState().provide({ type: "selected_text", text: TRANSCRIPT });
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/resolve-target`, () =>
        HttpResponse.json({
          ok: true,
          resolution: {
            code: "RESOLVED_INTERNAL_ENTITY",
            match: { entity_id: "ent-samiksha", display_name: "Samiksha", role_title: "AI" },
            candidates: [],
          },
        }),
      ),
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, async ({ request }) => {
        collaborationPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, request: { request_id: "collab-s", status: "PENDING" } },
          { status: 201 },
        );
      }),
    );
    await speak("Tell Samiksha to summarize this transcript.");
    await waitFor(() => expect(collaborationPosts.length).toBe(1));
    expect(collaborationPosts[0]!.target_entity_id).toBe("ent-samiksha");
    expect(String(collaborationPosts[0]!.safe_summary).toLowerCase()).toContain(
      "re: the current context",
    );
    expect(internalMessagePosts.length).toBe(0);
  });

  it("'why does this matter' answers from context — never an internal message or Twin chat", async () => {
    useCurrentSurfaceContextStore.getState().provide({ type: "selected_text", text: TRANSCRIPT });
    await speak("ask my twin why this matters");
    expect(
      screen.getAllByText(/This matters because/i).length,
    ).toBeGreaterThan(0);
    expect(internalMessagePosts.length).toBe(0);
    expect(recordedBodies.length).toBe(0);
  });

  // ── Phase 3B: transcript-derived proposed-action review flow ──────────
  async function reviewActions(): Promise<void> {
    useCurrentSurfaceContextStore.getState().provide({
      type: "selected_text",
      text: `${TRANSCRIPT} It's unclear who owns the launch checklist.`,
    });
    await speak("Create action items from this meeting.");
    await waitFor(() =>
      expect(screen.getByTestId("transcript-action-review")).toBeInTheDocument(),
    );
  }

  it("'Create action items' → compact count + a review section (no raw dump, no auto-save)", async () => {
    const ledgerPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, entry: { ledger_entry_id: "x" } }, { status: 201 });
      }),
    );
    await reviewActions();
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /I found \d+ proposed actions from this meeting\./,
    );
    // A calm review section, not the raw digest dump, and nothing auto-saved.
    expect(screen.queryByTestId("transcript-digest")).toBeNull();
    expect(screen.getAllByTestId("transcript-action").length).toBeGreaterThan(0);
    expect(ledgerPosts.length).toBe(0);
  });

  it("Save on a follow-up → governed Work Ledger PROPOSED entry with context; card becomes Saved", async () => {
    const ledgerPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, entry: { ledger_entry_id: "led-pa" } }, { status: 201 });
      }),
    );
    await reviewActions();
    const user = userEvent.setup();
    await user.click(screen.getAllByTestId("transcript-action-save")[0]!);
    await waitFor(() => expect(ledgerPosts.length).toBe(1));
    expect(ledgerPosts[0]!.status).toBe("PROPOSED");
    const details = ledgerPosts[0]!.details as Record<string, unknown> | undefined;
    expect(details?.context_type).toBe("selected_text");
    expect(screen.getAllByTestId("transcript-action-status").some((n) => /Saved/i.test(n.textContent ?? ""))).toBe(true);
  });

  it("Send request on an owned item → governed collaboration request; card becomes Sent", async () => {
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, async ({ request }) => {
        collaborationPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, request: { request_id: "collab-pa", status: "PENDING" } },
          { status: 201 },
        );
      }),
    );
    await reviewActions();
    const user = userEvent.setup();
    // The blocker "David is blocked…" is owned → a Send request card.
    await user.click(screen.getAllByTestId("transcript-action-send")[0]!);
    await waitFor(() => expect(collaborationPosts.length).toBe(1));
    expect(collaborationPosts[0]!.target_entity_id).toBe("ent-david");
    expect(String(collaborationPosts[0]!.safe_summary)).toMatch(/blocked on the API keys/i);
    expect(internalMessagePosts.length).toBe(0);
  });

  it("Dismiss → no Work Ledger, no request; the card leaves the review calmly", async () => {
    const ledgerPosts: Array<Record<string, unknown>> = [];
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, entry: { ledger_entry_id: "x" } }, { status: 201 });
      }),
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, async ({ request }) => {
        collaborationPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true }, { status: 201 });
      }),
    );
    await reviewActions();
    const user = userEvent.setup();
    const before = screen.getAllByTestId("transcript-action").length;
    await user.click(screen.getAllByTestId("transcript-action-dismiss")[0]!);
    await waitFor(() =>
      expect(screen.getAllByTestId("transcript-action").length).toBe(before - 1),
    );
    expect(ledgerPosts.length).toBe(0);
    expect(collaborationPosts.length).toBe(0);
  });

  it("Ask on an open question → one focused question, nothing sent", async () => {
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, async ({ request }) => {
        collaborationPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true }, { status: 201 });
      }),
    );
    await reviewActions();
    const user = userEvent.setup();
    await user.click(screen.getAllByTestId("transcript-action-ask")[0]!);
    await waitFor(() =>
      expect(screen.getAllByText(/Open question:/i).length).toBeGreaterThan(0),
    );
    expect(collaborationPosts.length).toBe(0);
  });

  // ── Phase 3C: derived work tracking ──────────────────────────────────
  // Type a follow-up command into the ALREADY-rendered bar (don't re-render).
  async function ask(text: string): Promise<void> {
    const user = userEvent.setup();
    const input = screen.getByLabelText(/Message to Otzar/i);
    await user.clear(input);
    await user.type(input, text);
    await user.click(screen.getByRole("button", { name: /^send$/i }));
  }

  it("'What is blocked?' answers from the current actions, with a calm breakdown", async () => {
    await reviewActions();
    await ask("What is blocked?");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /I found \d+ blocker/,
      ),
    );
    const tracking = screen.getByTestId("work-tracking");
    expect(tracking.textContent).toMatch(/Blocked/);
    expect(tracking.textContent).toMatch(/API keys/i);
    expect(screen.queryByTestId("transcript-digest")).toBeNull();
  });

  it("'Who is waiting on whom?' reflects a sent request", async () => {
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, () =>
        HttpResponse.json(
          { ok: true, request: { request_id: "c", status: "PENDING" } },
          { status: 201 },
        ),
      ),
    );
    await reviewActions();
    const user = userEvent.setup();
    await user.click(screen.getAllByTestId("transcript-action-send")[0]!);
    await waitFor(() =>
      expect(
        screen.getAllByTestId("transcript-action-status").some((n) =>
          /Sent/i.test(n.textContent ?? ""),
        ),
      ).toBe(true),
    );
    await ask("Who is waiting on whom?");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /waiting/i,
      ),
    );
    expect(screen.getByTestId("work-tracking").textContent).toMatch(/David/);
  });

  it("'What follow-ups came out of this meeting?' lists them without mutating the Work Ledger", async () => {
    const ledgerPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, entry: { ledger_entry_id: "x" } }, { status: 201 });
      }),
    );
    await reviewActions();
    await ask("What follow-ups came out of this meeting?");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /follow-up/i,
      ),
    );
    expect(ledgerPosts.length).toBe(0);
  });

  it("no transcript/context → tracking asks one focused question", async () => {
    await speak("What is blocked?");
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /Which meeting or transcript should I track\?/i,
    );
    expect(screen.queryByTestId("work-tracking")).toBeNull();
  });

  // ── Phase 3D: correction capture ──────────────────────────────────────
  // A single provided line → exactly one proposed action (an obvious "that").
  async function reviewOneAction(): Promise<void> {
    useCurrentSurfaceContextStore.getState().provide({
      type: "selected_text",
      text: "David is blocked on the API keys.",
    });
    await speak("Create action items from this meeting.");
    await waitFor(() =>
      expect(screen.getByTestId("transcript-action-review")).toBeInTheDocument(),
    );
  }

  it("owner correction updates the single obvious item, governed-persisted via the typed rail", async () => {
    const corrections: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/corrections`, async ({ request }) => {
        corrections.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          {
            ok: true,
            correction: {
              correction_id: "tc-x",
              scope_type: "PERSONAL",
              scope_id: null,
              correction_type: "MEANING_CLARIFICATION",
              state: "ACTIVE",
            },
          },
          { status: 201 },
        );
      }),
    );
    await reviewOneAction();
    await ask("No, Samiksha owns that.");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /Samiksha owns that/,
      ),
    );
    expect(screen.getByTestId("transcript-action-review").textContent).toMatch(/Samiksha/);
    // Typed governed persistence — self-scoped, safe_summary only (no transcript).
    await waitFor(() => expect(corrections.length).toBe(1));
    expect(corrections[0]!.scope_type).toBe("PERSONAL");
    expect(corrections[0]!.correction_type).toBe("MEANING_CLARIFICATION");
    expect(String(corrections[0]!.safe_summary)).toMatch(/Samiksha owns that/i);
    expect(String(corrections[0]!.safe_summary)).not.toMatch(/API keys/i); // no transcript body
  });

  it("ambiguous 'that' across multiple items → one focused question", async () => {
    await reviewActions();
    await ask("No, David owns that.");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /Which item should I update\?/i,
      ),
    );
  });

  // ── [OTZAR-LIVE-6] intent-coverage repair ────────────────────────────────
  it("[OTZAR-LIVE-6] natural owner-correction variant ('Samiksha owns it now') updates the item", async () => {
    await reviewOneAction();
    await ask("That changed. Samiksha owns it now.");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(/Samiksha owns that/i),
    );
    expect(screen.getByTestId("voice-action-outcome").textContent).not.toMatch(/Ask Otzar/i);
  });

  it("[OTZAR-LIVE-6] vague 'Someone should follow up' (with context) asks who owns it — no ownerless artifact", async () => {
    const ledgerPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, entry: { ledger_entry_id: "x" } }, { status: 201 });
      }),
    );
    await reviewOneAction(); // context + one proposed action present
    await ask("Someone should follow up.");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(/Who should own this\?/i),
    );
    expect(screen.getByTestId("voice-action-outcome").textContent).not.toMatch(/Ask Otzar/i);
    expect(ledgerPosts.length).toBe(0); // no ownerless work minted
  });

  it("[OTZAR-LIVE-6] vague 'Handle this' with NO context asks for the context first", async () => {
    await speak("Handle this.");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /What should I use as the current context\?/i,
      ),
    );
    expect(screen.queryByTestId("transcript-action-review")).toBeNull();
  });

  it("[OTZAR-LIVE-6] escalation to a role term asks who should approve (not generic chat)", async () => {
    await speak("Escalate this to the founder for approval.");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(/Who should approve this\?/i),
    );
    expect(screen.getByTestId("voice-action-outcome").textContent).not.toMatch(/Ask Otzar/i);
  });

  it("due-date correction updates the hint locally", async () => {
    await reviewOneAction();
    await ask("That's due next Friday.");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /due next Friday/i,
      ),
    );
    expect(screen.getByTestId("transcript-action-review").textContent).toMatch(/next Friday/i);
  });

  it("'not blocked anymore' reclassifies the blocker without faking completion", async () => {
    await reviewOneAction();
    await ask("That's not blocked anymore.");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /won't treat that as blocked/i,
      ),
    );
    expect(screen.getByTestId("transcript-action-review").textContent).toMatch(/Follow-up/);
  });

  it("target correction retargets but does NOT send", async () => {
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, async ({ request }) => {
        collaborationPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true }, { status: 201 });
      }),
    );
    await reviewOneAction();
    await ask("Send that to Samiksha, not William.");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /I'll send that to Samiksha/i,
      ),
    );
    expect(collaborationPosts.length).toBe(0);
  });

  it("a preference correction confirms calmly (no global-learning claim), works with no active flow", async () => {
    await speak("Don't interrupt me for that.");
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /preference for this workflow/i,
    );
    const html = document.body.innerHTML.toLowerCase();
    expect(html).not.toContain("learned globally");
    expect(html).not.toContain("permanently");
  });

  // ── Phase 3E: correction history + persistence status ─────────────────
  it("a correction appears in Recent corrections and becomes 'Saved as correction evidence'", async () => {
    await reviewOneAction();
    await ask("No, Samiksha owns that.");
    await waitFor(() =>
      expect(screen.getByTestId("correction-history")).toBeInTheDocument(),
    );
    const item = screen.getAllByTestId("correction-history-item")[0]!;
    expect(item.textContent).toMatch(/Samiksha owns that/);
    // Status resolves to the saved-evidence label once persistence succeeds.
    await waitFor(() =>
      expect(
        screen.getAllByTestId("correction-history-item")[0]!.textContent,
      ).toMatch(/Saved as correction evidence/i),
    );
    // No raw correction id leaks into the UI.
    expect(screen.getByTestId("correction-history").textContent).not.toMatch(/tc-/);
  });

  it("persistence failure keeps the local correction and says so honestly", async () => {
    server.use(
      http.post(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 }),
      ),
    );
    await reviewOneAction();
    await ask("No, Samiksha owns that.");
    // Local correction still applied to the card.
    expect(screen.getByTestId("transcript-action-review").textContent).toMatch(/Samiksha/);
    await waitFor(() =>
      expect(
        screen.getAllByTestId("correction-history-item")[0]!.textContent,
      ).toMatch(/couldn't save evidence/i),
    );
  });

  it("a preference correction is saved as preference evidence, with no global-learning claim", async () => {
    await speak("Don't interrupt me for that.");
    await waitFor(() =>
      expect(screen.getByTestId("correction-history")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getAllByTestId("correction-history-item")[0]!.textContent,
      ).toMatch(/Saved as preference evidence/i),
    );
    const html = document.body.innerHTML.toLowerCase();
    expect(html).not.toContain("learned globally");
    expect(html).not.toContain("permanently");
    expect(html).not.toContain("training updated");
  });

  // ── Phase 3F: end-to-end employee flow (Communication → Governed Work
  //    Movement). One render, walked step by step. Deterministic, MSW-only. ──
  it("end-to-end: context → digest → actions → save → send → tracking → correction → history → missing-context", async () => {
    const FLOW_TRANSCRIPT = [
      "Team, we decided to ship the onboarding flow next week.",
      "David is blocked on the API keys.",
      "I will prepare the action list by Friday.",
      "We need to follow up with William about the investor demo decisions.",
      "There is a risk the demo could slip if API access is not resolved.",
      "It is unclear who owns the launch checklist.",
    ].join(" ");

    const ledgerPosts: Array<Record<string, unknown>> = [];
    const collaborationPosts: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API_BASE}/work-os/ledger`, async ({ request }) => {
        ledgerPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, entry: { ledger_entry_id: "led-f" } }, { status: 201 });
      }),
      http.post(`${API_BASE}/otzar/my-twin/collaboration-requests`, async ({ request }) => {
        collaborationPosts.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json(
          { ok: true, request: { request_id: "collab-f", status: "PENDING" } },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();

    // Step 1 — permissioned current context.
    useCurrentSurfaceContextStore.getState().provide({
      type: "selected_text",
      text: FLOW_TRANSCRIPT,
    });

    // Step 2 — digest (first command renders + expands the bar).
    await speak("Summarize this transcript.");
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /I found .*decision.*follow-up.*blocker/i,
    );
    expect(screen.getByTestId("transcript-digest")).toBeInTheDocument();

    // Step 3 — proposed actions.
    await ask("Create action items from this meeting.");
    await waitFor(() =>
      expect(screen.getByTestId("transcript-action-review")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /proposed actions from this meeting/i,
    );

    // Step 4 — save a follow-up → governed PROPOSED Work Ledger entry.
    await user.click(screen.getAllByTestId("transcript-action-save")[0]!);
    await waitFor(() => expect(ledgerPosts.length).toBe(1));
    expect(ledgerPosts[0]!.status).toBe("PROPOSED");

    // Step 5 — send an owned item → governed collaboration request.
    await user.click(screen.getAllByTestId("transcript-action-send")[0]!);
    await waitFor(() => expect(collaborationPosts.length).toBe(1));
    expect(collaborationPosts[0]!.target_entity_id).toBe("ent-david");

    // Step 6 — tracking.
    await ask("What is blocked?");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /blocker|Nothing is blocked/i,
      ),
    );
    await ask("Who is waiting on whom?");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /waiting/i,
      ),
    );

    // Step 7 — correction with ambiguous "that" across items → one focused question.
    await ask("No, Samiksha owns that.");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /Which item should I update\?/i,
      ),
    );

    // Step 8 — a clear preference correction → applied + recorded honestly.
    await ask("Don't interrupt me for that.");
    await waitFor(() =>
      expect(screen.getByTestId("correction-history")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getAllByTestId("correction-history-item")[0]!.textContent,
      ).toMatch(/Saved as preference evidence/i),
    );

    // Step 9 — missing context: clear it, then a deictic ask → one focused question.
    useCurrentSurfaceContextStore.getState().clear();
    await ask("Ask David to review this.");
    await waitFor(() =>
      expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
        /What should I use as the current context\?/i,
      ),
    );

    // Step 10 — across the whole flow: no backend machinery in normal UX.
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/CROSS_ORG_DENIED|RUNTIME_MISSING|entity_id|collaboration-requests|ledger_entry_id|correction_capsule_id/);
    expect(html.toLowerCase()).not.toContain("learned globally");
    expect(html.toLowerCase()).not.toContain("surveillance");
  });

  // ── Phase 4B: saved-corrections readback (typed governed rail) ────────
  function savedCorrection(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      correction_id: "tc-aaaa",
      scope_type: "PERSONAL",
      scope_id: null,
      correction_type: "MEANING_CLARIFICATION",
      state: "ACTIVE",
      sensitivity_class: "STANDARD",
      retention_class: "STANDARD",
      safe_summary: "No, Samiksha owns that.",
      effective_from: "2026-06-23T10:00:00.000Z",
      expires_at: null,
      revoked_at: null,
      superseded_by_id: null,
      revocable: true,
      created_at: "2026-06-23T10:00:00.000Z",
      ...overrides,
    };
  }

  async function openSavedCorrections(): Promise<void> {
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const details = screen.getByTestId("saved-corrections") as HTMLDetailsElement;
    details.open = true;
    // jsdom doesn't auto-fire toggle on programmatic open; dispatch it.
    fireEvent(details, new Event("toggle", { bubbles: true }));
  }

  it("reads back saved corrections with human labels and safe summaries (no raw ids/enums)", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json({
          ok: true,
          corrections: [
            savedCorrection(),
            savedCorrection({
              correction_id: "tc-bbbb",
              correction_type: "TONE_PREFERENCE",
              safe_summary: "Use a warmer tone with Annie.",
            }),
          ],
        }),
      ),
    );
    await openSavedCorrections();
    await waitFor(() =>
      expect(screen.getAllByTestId("saved-correction-item").length).toBe(2),
    );
    const section = screen.getByTestId("saved-corrections");
    expect(section.textContent).toMatch(/Meaning clarification/);
    expect(section.textContent).toMatch(/Tone preference/);
    expect(section.textContent).toMatch(/No, Samiksha owns that\./);
    expect(section.textContent).toMatch(/Personal/);
    expect(section.textContent).toMatch(/Active/);
    // No backend enums / raw ids / type names leak.
    const html = section.innerHTML;
    expect(html).not.toMatch(/MEANING_CLARIFICATION|TONE_PREFERENCE|scope_type|correction_id|tc-aaaa|TwinCorrection/);
  });

  it("empty saved corrections shows a calm 'none yet' message", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json({ ok: true, corrections: [] }),
      ),
    );
    await openSavedCorrections();
    await waitFor(() =>
      expect(
        screen.getByTestId("saved-corrections").textContent,
      ).toMatch(/No saved corrections yet\./i),
    );
  });

  it("a failed readback shows calm copy and never breaks the orb", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 }),
      ),
    );
    await openSavedCorrections();
    await waitFor(() =>
      expect(screen.getByTestId("saved-corrections-error")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("saved-corrections-error").textContent).toMatch(
      /couldn't load saved corrections just now/i,
    );
    // The composer still works.
    expect(screen.getByLabelText(/Message to Otzar/i)).toBeInTheDocument();
  });

  it("Stop using revokes an active saved correction via the typed rail", async () => {
    const revoked: string[] = [];
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/corrections`, () =>
        HttpResponse.json({ ok: true, corrections: [savedCorrection()] }),
      ),
      http.post(
        `${API_BASE}/otzar/my-twin/corrections/:id/revoke`,
        ({ params }) => {
          revoked.push(String(params.id));
          return HttpResponse.json(
            {
              ok: true,
              correction: savedCorrection({ state: "REVOKED", revocable: false }),
            },
            { status: 200 },
          );
        },
      ),
    );
    await openSavedCorrections();
    const user = userEvent.setup();
    await waitFor(() =>
      expect(screen.getByTestId("saved-correction-revoke")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("saved-correction-revoke"));
    await waitFor(() => expect(revoked).toEqual(["tc-aaaa"]));
    await waitFor(() =>
      expect(screen.getByTestId("saved-corrections").textContent).toMatch(/Revoked/),
    );
  });

  // ── Phase 4C: safe transcript ingestion from the MeetingCapture rail ──
  function meetingCapture(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      meeting_capture_id: "mc-1",
      provider: "MANUAL",
      provider_meeting_id: null,
      title: "Q3 planning",
      scheduled_start: null,
      scheduled_end: null,
      recorded_start: null,
      recorded_end: null,
      participant_count: 2,
      status: "READY",
      workspace_id: null,
      source_conversation_id: null,
      summary:
        "We decided to ship onboarding. David is blocked on the API keys. I will prepare the deck by Friday.",
      has_transcript: true,
      created_at: "2026-06-23T09:00:00Z",
      updated_at: "2026-06-23T09:30:00Z",
      ...overrides,
    };
  }

  it("'Use the latest transcript' loads the governed meeting transcript into context", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/meeting-captures`, () =>
        HttpResponse.json({ ok: true, meeting_captures: [meetingCapture()] }),
      ),
    );
    await speak("Use the latest transcript.");
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /Using the latest transcript\./i,
    );
    // The context chip now shows the loaded meeting (its title), not a raw id.
    expect(screen.getByTestId("surface-context-chip").textContent).toMatch(/Q3 planning/);
    expect(document.body.innerHTML).not.toMatch(/mc-1|meeting_capture_id/);
  });

  it("'Summarize the latest transcript' loads then digests, no manual paste", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/meeting-captures`, () =>
        HttpResponse.json({ ok: true, meeting_captures: [meetingCapture()] }),
      ),
    );
    await speak("Summarize the latest transcript.");
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /I found .*decision.*blocker/i,
    );
    expect(screen.getByTestId("transcript-digest")).toBeInTheDocument();
  });

  it("multiple meeting transcripts (no 'latest') → one focused question", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/meeting-captures`, () =>
        HttpResponse.json({
          ok: true,
          meeting_captures: [
            meetingCapture({ meeting_capture_id: "mc-1", title: "Standup" }),
            meetingCapture({ meeting_capture_id: "mc-2", title: "Roadmap" }),
          ],
        }),
      ),
    );
    await speak("Use the meeting transcript.");
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /Which transcript should I use\?/i,
    );
  });

  it("a meeting with no transcript text → honest message, no fake digest", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/meeting-captures`, () =>
        HttpResponse.json({
          ok: true,
          meeting_captures: [meetingCapture({ summary: null, has_transcript: true })],
        }),
      ),
    );
    await speak("Use the latest transcript.");
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /I found the meeting, but I don't have transcript text yet\./i,
    );
    expect(screen.queryByTestId("transcript-digest")).toBeNull();
  });

  it("no meeting captures → asks to paste/select (no contextless artifact)", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/meeting-captures`, () =>
        HttpResponse.json({ ok: true, meeting_captures: [] }),
      ),
    );
    await speak("Use the latest transcript.");
    expect(screen.getByTestId("voice-action-outcome").textContent).toMatch(
      /Paste or select the transcript you want me to use\./i,
    );
  });

  it("shows a calm active-context indicator with a Clear control and no surveillance language", async () => {
    useCurrentSurfaceContextStore.getState().provide({
      type: "selected_text",
      text: "Client asked for revised pricing by Friday.",
    });
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    const chip = screen.getByTestId("surface-context-chip");
    expect(chip.textContent).toMatch(/Using current context/i);
    expect(screen.getByTestId("surface-context-clear")).toBeInTheDocument();
    const html = document.body.innerHTML.toLowerCase();
    expect(html).not.toContain("watched");
    expect(html).not.toContain("monitored");
    expect(html).not.toContain("surveillance");
    expect(html).not.toContain("screen captured");
    expect(html).not.toContain("screen capture");
  });
});

// ── [CE-AMBIENT] clarity questions about the SELECTED work item ─────────────
// "Why is this here?" / "Where did this come from?" answered by the READ-ONLY
// clarity-answer route when a work_item surface context exists; honest copy
// when it doesn't; asking never POSTs.
describe("AmbientOtzarBar — selected-work clarity questions (CE-AMBIENT)", () => {
  it("with a selected work item, a clarity phrase calls clarity-answer (GET-only) and renders the truth answer", async () => {
    let clarityHits = 0;
    const mutations: string[] = [];
    server.events.removeAllListeners();
    server.events.on("request:start", ({ request }) => {
      if (request.method !== "GET") mutations.push(`${request.method} ${new URL(request.url).pathname}`);
    });
    server.use(
      http.get(`${API_BASE}/work-os/ledger/:id/clarity-answer`, ({ params, request }) => {
        clarityHits += 1;
        expect(params.id).toBe("led-ambient-1");
        expect(new URL(request.url).searchParams.get("question")).toBe("Where did this come from?");
        return HttpResponse.json({
          ok: true,
          answer: "This came from a Slack message. Eve shared it.",
          confidence: "high",
          used_sources: ["source_lineage"],
        });
      }),
    );
    useCurrentSurfaceContextStore.getState().provide({
      type: "work_item",
      title: "Grant the repo access",
      ledgerEntryId: "led-ambient-1",
      sourceLabel: "Work item",
    });
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.type(screen.getByLabelText(/Message to Otzar/i), "Where did this come from?");
    mutations.length = 0; // scope the GET-only assertion to the clarity ACTION (robust to unrelated background async landing late under full-suite load)
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => {
      expect(
        screen.getAllByText(/This came from a Slack message\. Eve shared it\./).length,
      ).toBeGreaterThan(0);
    });
    expect(clarityHits).toBe(1);
    // Voice-intents / chat was never reached, and nothing mutated.
    // GET-only intent: the CLARITY rail made no mutating call. Exclude unrelated background
    // features (voice TTS preview, calendar free/busy) whose async can land here late under
    // full-suite parallel load — the clarity path never touches those endpoints.
    expect(
      mutations.filter(
        (m) => !m.includes("/auth/") && !m.includes("/voice/tts-preview") && !m.includes("/calendar/freebusy"),
      ),
    ).toEqual([]);
    useCurrentSurfaceContextStore.getState().clear();
  });

  // [AIX-5] background questions ride the SAME governed rail: the ambient
  // bar sends the phrase verbatim to clarity-answer (GET-only), where the
  // AIX-4 retrieval answers with live-work-first attribution. No new
  // retrieval machinery in the client; asking never mutates.
  it("with a selected work item, 'What do we know about this?' gets the attributed background answer (GET-only)", async () => {
    let clarityHits = 0;
    const mutations: string[] = [];
    server.events.removeAllListeners();
    server.events.on("request:start", ({ request }) => {
      if (request.method !== "GET") mutations.push(`${request.method} ${new URL(request.url).pathname}`);
    });
    const backgroundAnswer =
      'Live work is the source of truth here: "Grant the repo access", owned by you. ' +
      'Possible background context — "Access policy 2025": Not confirmed — use as background only, never for action. Background only.';
    server.use(
      http.get(`${API_BASE}/work-os/ledger/:id/clarity-answer`, ({ params, request }) => {
        clarityHits += 1;
        expect(params.id).toBe("led-ambient-2");
        expect(new URL(request.url).searchParams.get("question")).toBe("What do we know about this?");
        return HttpResponse.json({
          ok: true,
          answer: backgroundAnswer,
          confidence: "low",
          used_sources: ["work_ledger", "seeded_background_retrieval"],
        });
      }),
    );
    useCurrentSurfaceContextStore.getState().provide({
      type: "work_item",
      title: "Grant the repo access",
      ledgerEntryId: "led-ambient-2",
      sourceLabel: "Work item",
    });
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.type(screen.getByLabelText(/Message to Otzar/i), "What do we know about this?");
    mutations.length = 0; // scope the GET-only assertion to the clarity ACTION (see note above)
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Live work is the source of truth here/).length,
      ).toBeGreaterThan(0);
    });
    expect(clarityHits).toBe(1);
    // Attribution + how-to-treat language reached the user verbatim.
    const body = document.body.textContent ?? "";
    expect(body).toContain("use as background only, never for action");
    // Read-only end to end: no POST/PATCH left the ambient bar.
    // GET-only intent: the CLARITY rail made no mutating call. Exclude unrelated background
    // features (voice TTS preview, calendar free/busy) whose async can land here late under
    // full-suite parallel load — the clarity path never touches those endpoints.
    expect(
      mutations.filter(
        (m) => !m.includes("/auth/") && !m.includes("/voice/tts-preview") && !m.includes("/calendar/freebusy"),
      ),
    ).toEqual([]);
    useCurrentSurfaceContextStore.getState().clear();
  });

  // [AIX-6] named-subject background questions need NO selection: they
  // ride the org-scoped background-answer rail (GET-only), where live
  // work leads and seeded background follows with attribution.
  it("with NO selection, 'What do we know about Project Phoenix?' gets the org-scoped background answer (GET-only)", async () => {
    let hits = 0;
    const mutations: string[] = [];
    server.events.removeAllListeners();
    server.events.on("request:start", ({ request }) => {
      if (request.method !== "GET") mutations.push(`${request.method} ${new URL(request.url).pathname}`);
    });
    const backgroundAnswer =
      'Live work is the source of truth here — it mentions Project Phoenix: "Phoenix launch checklist", owned by you. ' +
      'Possible background context — "Phoenix launch runbook" (covers 2025): not confirmed — use as background only, never for action. Background only.';
    server.use(
      http.get(`${API_BASE}/work-os/context/background-answer`, ({ request }) => {
        hits += 1;
        expect(new URL(request.url).searchParams.get("question")).toBe(
          "What do we know about Project Phoenix?",
        );
        return HttpResponse.json({
          ok: true,
          answer: backgroundAnswer,
          confidence: "medium",
          used_sources: ["work_ledger", "seeded_background_retrieval"],
        });
      }),
    );
    useCurrentSurfaceContextStore.getState().clear();
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.type(
      screen.getByLabelText(/Message to Otzar/i),
      "What do we know about Project Phoenix?",
    );
    mutations.length = 0; // scope the GET-only assertion to the clarity ACTION (see note above)
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Live work is the source of truth here — it mentions Project Phoenix/).length,
      ).toBeGreaterThan(0);
    });
    expect(hits).toBe(1);
    const body = document.body.textContent ?? "";
    expect(body).toContain("use as background only, never for action");
    // GET-only intent: the CLARITY rail made no mutating call. Exclude unrelated background
    // features (voice TTS preview, calendar free/busy) whose async can land here late under
    // full-suite parallel load — the clarity path never touches those endpoints.
    expect(
      mutations.filter(
        (m) => !m.includes("/auth/") && !m.includes("/voice/tts-preview") && !m.includes("/calendar/freebusy"),
      ),
    ).toEqual([]);
  });

  it("with NO selected work item, the same phrase gets honest copy — never a guess, never a fetch", async () => {
    let clarityHits = 0;
    server.use(
      http.get(`${API_BASE}/work-os/ledger/:id/clarity-answer`, () => {
        clarityHits += 1;
        return HttpResponse.json({ ok: true, answer: "x", confidence: "low", used_sources: [] });
      }),
    );
    useCurrentSurfaceContextStore.getState().clear();
    const user = userEvent.setup();
    renderBar();
    await user.click(screen.getByRole("region", { name: /Talk to Otzar/i }));
    await user.type(screen.getByLabelText(/Message to Otzar/i), "Why is this here?");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => {
      expect(
        screen.getAllByText(/Open or select a work item first so Otzar knows what/i).length,
      ).toBeGreaterThan(0);
    });
    expect(clarityHits).toBe(0);
  });
});
