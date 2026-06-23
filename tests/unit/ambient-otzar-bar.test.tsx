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

  it("Confirm with an explicit time does NOT send selected_time:null / 'Choose a time' — says normalization not wired (Phase 1274/1275 Task D)", async () => {
    let createCalls = 0;
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
      http.post(`${API_BASE}/calendar/events/create`, () => {
        createCalls += 1;
        return HttpResponse.json({ ok: false, code: "NEEDS_SELECTED_TIME" }, { status: 409 });
      }),
    );
    await speak("Schedule a meeting with Vishesh tomorrow at 11am PST.");
    await waitFor(() =>
      expect(screen.getByTestId("work-artifact-confirm")).toBeInTheDocument(),
    );
    await userEvent.setup().click(screen.getByTestId("work-artifact-confirm"));
    await waitFor(() => {
      expect(screen.getByTestId("work-artifact-card").textContent).toMatch(
        /Selected-time normalization not wired/i,
      );
    });
    const card = screen.getByTestId("work-artifact-card").textContent ?? "";
    expect(card).not.toMatch(/Choose a time/i);
    expect(createCalls).toBe(0); // never sent selected_time: null
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
