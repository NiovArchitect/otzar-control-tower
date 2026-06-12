// FILE: AmbientOtzarBar.tsx
// PURPOSE: Persistent, semi-transparent ambient communication dock
//          for the employee Otzar workspace per [FOUNDER-AUTH —
//          EMPLOYEE AMBIENT VOICE WORKSPACE / TALK TO OTZAR + HEAR
//          OTZAR BACK NOW]. Mounted inside EmployeeLayout so it's
//          available on every authenticated employee page (Home,
//          Chat, Observe, Corrections, Approvals, My Twin,
//          Authority, Preferences, Collaboration, Projects, Voice,
//          Conversations) without taking over the page.
//
// EXPERIENCE:
//   - Collapsed by default — small dock in the bottom-right.
//   - Click to expand. Click mic to listen (or type fallback when
//     browser STT isn't supported).
//   - Transcript shows live as it accumulates.
//   - Otzar responds; browser speechSynthesis speaks the
//     `speech_ready_text` back unless muted.
//   - Approval / collaboration / correction signals show as
//     lightweight badges + deep-links into the existing pages.
//
// PRIVACY INVARIANT (load-bearing):
//   - No raw audio crosses the HTTP boundary. Browser STT is
//     local; only the resulting transcript STRING is sent.
//   - No transcript or response is written to localStorage,
//     IndexedDB, or any persistent client store.
//   - No "live Sesame voice" claim is made. The bar shows
//     "Voice output: browser/device TTS" when speech synthesis is
//     active, NOT "Sesame active".
//   - No surveillance copy. No "monitoring" / "productivity score"
//     / "manager visibility" language anywhere.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Mic,
  MicOff,
  MoonStar,
  Send,
  Volume2,
  VolumeX,
  Square,
  ChevronDown,
  AlertCircle,
  Users,
  MessageSquare,
  ShieldQuestion,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { CalendarContextResponse } from "@/lib/types/foundation";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useOtzarVoiceIntent } from "@/hooks/useOtzarVoiceIntent";
import { useMicrophonePermission } from "@/hooks/useMicrophonePermission";
import { usePresenceStore, usePresenceState } from "@/lib/stores/presence";
import {
  detectNativeMicCapability,
  nativeMicCopy,
  requestNativeMicAccess,
  type NativeMicStatus,
} from "@/lib/voice/native-mic";
import { routeVoiceCommand } from "@/lib/voice/command-router";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth";
import {
  detectShellMode,
  llmErrorCopy,
  micCopyFor,
  speechRecognitionErrorCopy,
} from "@/lib/voice/diagnostics";

/**
 * The ambient Otzar dock. Mount once per authenticated employee
 * shell. No props — it reads its own state from React hooks.
 */
const TEST_VOICE_PHRASE =
  "Otzar voice is active. I can speak responses back to you.";

function toneClass(tone: "ok" | "warn" | "error" | "muted"): string {
  switch (tone) {
    case "ok":
      return "text-emerald-600";
    case "warn":
      return "text-amber-600";
    case "error":
      return "text-destructive";
    case "muted":
    default:
      return "text-muted-foreground";
  }
}

function toneIcon(tone: "ok" | "warn" | "error" | "muted"): typeof ShieldCheck {
  switch (tone) {
    case "ok":
      return ShieldCheck;
    case "error":
      return ShieldX;
    case "warn":
    case "muted":
    default:
      return ShieldQuestion;
  }
}

export function AmbientOtzarBar(): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  // Phase 1253 — the router's last calm acknowledgement ("I opened
  // Integrations…"), shown inline so voice routing feels intentional.
  const [routerAck, setRouterAck] = useState<string | null>(null);
  // Phase 1256A — native desktop mic capability (detection only;
  // the OS prompt fires only from the explicit "Allow microphone"
  // button; no audio is ever captured here).
  const [nativeMic, setNativeMic] = useState<NativeMicStatus>("UNSUPPORTED");
  useEffect(() => {
    let cancelled = false;
    void detectNativeMicCapability().then((cap) => {
      if (!cancelled) setNativeMic(cap.status);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const navigate = useNavigate();
  const capabilities = useAuthStore((s) => s.capabilities);
  // EMERGENCY TTS LOOP GUARD per [FOUNDER-AUTH — EMERGENCY FIX]:
  // auto-speak is OFF by default. The operator enables it
  // explicitly via the "Auto-speak responses" toggle.
  const [autoSpeak, setAutoSpeak] = useState(false);
  // Phase 1235b — quiet mode: Otzar won't speak or listen. For
  // meetings / shared spaces / focus. Voice resumes when the
  // employee turns it back off. When calendar connectors land,
  // meeting detection will flip this automatically.
  const [quiet, setQuiet] = useState(false);
  // Phase 1236 — calendar-aware automatic quiet mode. autoQuiet
  // marks that quiet was entered for the user (meeting/focus), so
  // the banner explains why and offers "Resume voice". The session
  // override stops auto-quiet from re-engaging in a loop after the
  // user deliberately resumes; it clears when the quiet
  // recommendation lifts.
  const [autoQuietReason, setAutoQuietReason] = useState<
    "IN_MEETING" | "FOCUS_TIME" | "OTHER" | null
  >(null);
  const [calendarProviderMode, setCalendarProviderMode] = useState<
    CalendarContextResponse["provider_mode"] | null
  >(null);
  const voiceOverrideRef = useRef(false);
  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();
  const recognitionRef = useRef(recognition);
  recognitionRef.current = recognition;
  const synthesisRef = useRef(synthesis);
  synthesisRef.current = synthesis;
  const micPerm = useMicrophonePermission();
  const intent = useOtzarVoiceIntent();
  // Phase 1251 — publish ambient signals to the presence store so
  // the edge glow + ambient cards speak the same state language.
  const presenceState = usePresenceState();
  const setPresenceSignals = usePresenceStore((s) => s.setSignals);
  const markPresenceSuccess = usePresenceStore((s) => s.markSuccess);
  const markPresenceFailure = usePresenceStore((s) => s.markFailure);
  useEffect(() => {
    setPresenceSignals({
      listening: recognition.listening,
      thinking: intent.processing,
      quiet,
      quietReason: autoQuietReason,
      voiceBlocked: micPerm.state === "denied" || !recognition.supported,
    });
  }, [
    recognition.listening,
    recognition.supported,
    intent.processing,
    quiet,
    autoQuietReason,
    micPerm.state,
    setPresenceSignals,
  ]);
  useEffect(() => {
    if (intent.response !== null) markPresenceSuccess();
  }, [intent.response, markPresenceSuccess]);
  useEffect(() => {
    if (intent.error !== null) markPresenceFailure();
  }, [intent.error, markPresenceFailure]);
  // Stable ref guard against React StrictMode + re-render double-fire.
  // Keyed by conversation_id + tokens_consumed so a brand-new turn
  // (which advances tokens_consumed) is treated as a new utterance,
  // but a re-render of the same response is not.
  const lastAutoSpokenKeyRef = useRef<string | null>(null);

  // When recognition transcribes, mirror it into the draft so the
  // employee can edit before sending.
  useEffect(() => {
    if (recognition.transcript.length > 0) {
      setDraft(recognition.transcript);
    }
  }, [recognition.transcript]);

  // CALENDAR-AWARE QUIET effect (Phase 1236). Polls the safe
  // calendar context on mount and every 90s. Failure is
  // non-blocking: the shell works exactly as before.
  useEffect(() => {
    let cancelled = false;
    async function check(): Promise<void> {
      const r = await api.otzar.calendarContext();
      if (cancelled || !r.ok) return;
      setCalendarProviderMode(r.data.provider_mode);
      if (r.data.quiet_recommended) {
        if (!voiceOverrideRef.current) {
          const reason =
            r.data.quiet_reason === "IN_MEETING" ||
            r.data.quiet_reason === "FOCUS_TIME"
              ? r.data.quiet_reason
              : "OTHER";
          setAutoQuietReason(reason);
          setQuiet((prev) => {
            if (!prev) {
              if (recognitionRef.current.listening)
                recognitionRef.current.stop();
              synthesisRef.current.stop();
            }
            return true;
          });
        }
      } else {
        // Recommendation lifted — clear the override so the next
        // real meeting can auto-quiet again, and release auto quiet.
        voiceOverrideRef.current = false;
        setAutoQuietReason((prevReason) => {
          if (prevReason !== null) setQuiet(false);
          return null;
        });
      }
    }
    void check();
    const timer = setInterval(() => void check(), 90_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // recognition/synthesis are accessed via refs to keep this
    // effect mount-stable.
  }, []);

  // AUTO-SPEAK effect — only fires when:
  //   1. auto-speak is explicitly enabled by the operator
  //   2. there's a response
  //   3. its stable key differs from the last auto-spoken key
  //   4. synthesis is supported + not muted
  // The dep array uses ONLY stable values; synthesis.speak() is
  // also a stable callback (memoized inside the hook).
  const responseKey =
    intent.response !== null
      ? `${intent.response.conversation_id}:${intent.response.tokens_consumed}`
      : null;
  useEffect(() => {
    if (!autoSpeak) return;
    if (quiet) return;
    if (responseKey === null) return;
    if (lastAutoSpokenKeyRef.current === responseKey) return;
    if (intent.response === null) return;
    const sayable =
      intent.response.speech_ready_text.length > 0
        ? intent.response.speech_ready_text
        : intent.response.response;
    lastAutoSpokenKeyRef.current = responseKey;
    synthesis.speak(sayable, { source: "auto", force: false });
    // intent.response is intentionally NOT in the deps — we mirror
    // it via responseKey to keep the effect stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, quiet, responseKey]);

  function handleQuietToggle(): void {
    setQuiet((v) => {
      const next = !v;
      if (next) {
        // Entering quiet mode silences Otzar immediately.
        if (recognition.listening) recognition.stop();
        synthesis.stop();
      } else if (autoQuietReason !== null) {
        // The user deliberately resumed voice while a quiet
        // recommendation is active — honor it for this session.
        voiceOverrideRef.current = true;
        setAutoQuietReason(null);
      }
      return next;
    });
  }

  async function handleMicToggle(): Promise<void> {
    if (quiet) return;
    if (recognition.listening) {
      recognition.stop();
      return;
    }
    // Explicitly ask for mic permission BEFORE we start the speech-
    // recognition engine when the Permissions API actually supports
    // prompting. When the state is "unsupported" we let the
    // recognition.start() call surface the OS prompt directly.
    if (
      micPerm.state !== "granted" &&
      micPerm.state !== "unsupported" &&
      micPerm.state !== "unknown"
    ) {
      const next = await micPerm.request();
      if (next !== "granted") return;
    }
    recognition.reset();
    recognition.start();
  }

  function handleTestVoice(): void {
    // Browser speechSynthesis requires a user gesture in many
    // browsers; the click on this button satisfies that. Force=true
    // bypasses the auto-speak dedupe so a deliberate re-test
    // succeeds; but the in-flight-utterance check inside the hook
    // still prevents queue duplication from rapid clicks.
    synthesis.speak(TEST_VOICE_PHRASE, { source: "test", force: true });
  }

  async function handleSend(): Promise<void> {
    const text = draft.trim();
    if (text.length === 0 || intent.processing) return;
    // Cancel any in-flight speech before sending the next turn.
    synthesis.stop();
    // Phase 1253 — voice is the REMOTE CONTROL: spoken AND typed
    // input both ride the command router first. A match navigates
    // (read/route only — every write still happens on the governed
    // destination surface); admin surfaces are role-gated with a
    // warm refusal; no match falls through to the conversational
    // governed voice-intent API.
    const routed = routeVoiceCommand(text, capabilities);
    if (routed.kind === "NAVIGATE") {
      setDraft("");
      setRouterAck(routed.spoken);
      synthesis.speak(routed.spoken, { source: "manual", force: true });
      navigate(routed.surface.route);
      return;
    }
    if (routed.kind === "ADMIN_BLOCKED") {
      setDraft("");
      setRouterAck(routed.spoken);
      synthesis.speak(routed.spoken, { source: "manual", force: true });
      return;
    }
    setRouterAck(null);
    setDraft("");
    await intent.send(text);
  }

  function handleReplay(): void {
    if (intent.response === null) return;
    const sayable =
      intent.response.speech_ready_text.length > 0
        ? intent.response.speech_ready_text
        : intent.response.response;
    // force=true so an explicit replay can bypass the auto-speak
    // dedupe even if the same text was already auto-spoken once.
    synthesis.speak(sayable, { source: "replay", force: true });
  }

  // ────────────────────────────────────────────────────────────
  // Status copy. Closed-vocab + safety-honest. NEVER claims
  // Sesame is active.
  // ────────────────────────────────────────────────────────────
  let status: string;
  let statusClass = "text-muted-foreground";
  if (recognition.listening) {
    status = "Listening…";
    statusClass = "text-primary";
  } else if (intent.processing) {
    status = "Processing…";
    statusClass = "text-primary";
  } else if (synthesis.speaking) {
    status = "Otzar is speaking…";
    statusClass = "text-primary";
  } else if (synthesis.muted) {
    status = "Muted";
  } else if (intent.response !== null) {
    status = "Ready";
  } else {
    status = "Ambient. Speak or type.";
  }

  const response = intent.response;
  const approvalBadge =
    response?.approval_required === true ? (
      <Link to="/app/approvals">
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" /> Approval needed
        </Badge>
      </Link>
    ) : null;
  const collabBadge =
    response?.collaboration_suggested === true ? (
      <Link to="/app/collaboration">
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" /> Collaboration suggested
        </Badge>
      </Link>
    ) : null;
  const correctionBadge =
    response?.correction_capture_available === true ? (
      <Link to="/app/corrections">
        <Badge variant="outline" className="gap-1">
          <MessageSquare className="h-3 w-3" /> Correct Otzar
        </Badge>
      </Link>
    ) : null;

  // ────────────────────────────────────────────────────────────
  // COLLAPSED — the Otzar orb (Phase 1251). A presence, not a
  // widget: a calm pill with a breathing state dot and a soft
  // state-tinted halo behind it. Clicking expands the full dock.
  // ────────────────────────────────────────────────────────────
  if (!expanded) {
    const collapsedLabel = quiet
      ? "Otzar · quiet"
      : presenceState === "APPROVAL_REQUIRED"
        ? "Otzar · needs you"
        : presenceState === "LISTENING"
          ? "Otzar · listening"
          : presenceState === "THINKING"
            ? "Otzar · thinking"
            : "Talk to Otzar";
    const orbHalo =
      presenceState === "APPROVAL_REQUIRED"
        ? "bg-amber-400/30 motion-safe:animate-edge-pulse"
        : presenceState === "LISTENING"
          ? "bg-sky-400/30 motion-safe:animate-edge-breathe"
          : presenceState === "THINKING"
            ? "bg-indigo-400/25 motion-safe:animate-edge-breathe"
            : presenceState === "FAILURE"
              ? "bg-rose-400/25"
              : presenceState === "RECOMMENDATION"
                ? "bg-teal-400/20"
                : "bg-transparent";
    return (
      <div className="fixed bottom-6 right-6 z-[60]">
        <span
          aria-hidden
          className={`absolute -inset-2 rounded-full blur-md transition-colors duration-700 ${orbHalo}`}
        />
        <button
          type="button"
          role="region"
          aria-label="Talk to Otzar"
          data-testid="ambient-otzar-bar"
          data-quiet={quiet ? "true" : "false"}
          data-presence={presenceState}
          onClick={() => setExpanded(true)}
          className={
            quiet
              ? "relative flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2 text-xs font-medium text-muted-foreground shadow-md backdrop-blur hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              : "relative flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          }
        >
          {quiet ? <MoonStar className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
          <span>{collapsedLabel}</span>
        </button>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // EXPANDED — full ambient dock with mic + text + response.
  // ────────────────────────────────────────────────────────────
  return (
    <div
      role="region"
      aria-label="Talk to Otzar"
      data-testid="ambient-otzar-bar"
      className="fixed bottom-6 right-6 z-[60] w-[min(92vw,440px)] rounded-2xl border-2 border-primary/30 bg-background/95 backdrop-blur shadow-2xl supports-[backdrop-filter]:bg-background/85"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-semibold">Talk to Otzar</span>
          <span className={`text-xs ${statusClass} truncate`}>{status}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={quiet ? "secondary" : "ghost"}
            size="icon"
            onClick={handleQuietToggle}
            aria-label={quiet ? "Leave quiet mode" : "Quiet mode"}
            aria-pressed={quiet}
            title={
              quiet
                ? "Leave quiet mode"
                : "Quiet mode — Otzar won't speak or listen"
            }
            className="h-7 w-7"
            data-testid="ambient-quiet-toggle"
          >
            <MoonStar className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => synthesis.setMuted(!synthesis.muted)}
            aria-label={synthesis.muted ? "Unmute Otzar" : "Mute Otzar"}
            disabled={!synthesis.supported}
            title={synthesis.muted ? "Unmute" : "Mute"}
            className="h-7 w-7"
          >
            {synthesis.muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(false)}
            aria-label="Collapse"
            title="Collapse"
            className="h-7 w-7"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(
        <div className="px-3 pb-3 space-y-2">
          {quiet ? (
            <div
              className="rounded-md border border-border bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground"
              data-testid="ambient-quiet-banner"
              data-auto-quiet={autoQuietReason ?? "manual"}
            >
              <p className="font-medium text-foreground">
                {autoQuietReason === "IN_MEETING"
                  ? "Otzar went quiet for your meeting."
                  : autoQuietReason !== null
                    ? "Otzar went quiet for your focus time."
                    : "Quiet mode — Otzar won't speak or listen."}
              </p>
              <p>
                Voice is paused. You can still approve or type.
                {autoQuietReason === null &&
                calendarProviderMode === "MOCK_CALENDAR"
                  ? " Connect your calendar to make quiet mode automatic."
                  : ""}
              </p>
              {autoQuietReason !== null ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1 h-6 text-xs"
                  onClick={handleQuietToggle}
                  data-testid="ambient-resume-voice"
                >
                  Resume voice
                </Button>
              ) : null}
            </div>
          ) : null}
          {/* Permission state line — always visible when expanded so
              the operator knows whether the mic will actually work.
              Browser shells: micCopyFor(). Desktop shell (Phase
              1256A): the NATIVE mic capability bridge — detection,
              calm copy, and the real OS permission prompt. */}
          {(() => {
            const shell = detectShellMode();
            if (shell === "tauri_webview" && nativeMic !== "UNSUPPORTED") {
              return (
                <div
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                  data-testid="ambient-permission-state"
                  data-native-mic={nativeMic}
                >
                  <Mic className="h-3 w-3 mt-0.5 shrink-0" aria-hidden />
                  <div className="flex-1 min-w-0">{nativeMicCopy(nativeMic)}</div>
                  {nativeMic === "PERMISSION_NEEDED" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="ml-auto h-6 px-2 text-xs"
                      onClick={() => {
                        void requestNativeMicAccess().then(setNativeMic);
                      }}
                    >
                      Allow microphone
                    </Button>
                  ) : null}
                </div>
              );
            }
            const copy = micCopyFor(shell, micPerm.state, recognition.supported);
            const Icon = toneIcon(copy.tone);
            return (
              <div
                className={`flex items-start gap-2 text-xs ${toneClass(copy.tone)}`}
                data-testid="ambient-permission-state"
              >
                <Icon className="h-3 w-3 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{copy.headline}</div>
                  {copy.detail.length > 0 ? (
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {copy.detail}
                    </div>
                  ) : null}
                </div>
                {copy.showRequestButton ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="ml-auto h-6 px-2 text-xs"
                    onClick={() => void micPerm.request()}
                    disabled={micPerm.requesting}
                  >
                    {micPerm.requesting
                      ? "Requesting…"
                      : "Request microphone permission"}
                  </Button>
                ) : null}
              </div>
            );
          })()}

          <div className="flex gap-2 items-center">
            <Button
              type="button"
              variant={recognition.listening ? "destructive" : "default"}
              onClick={() => void handleMicToggle()}
              aria-label={
                quiet
                  ? "Voice is paused in quiet mode"
                  : recognition.listening
                    ? "Stop listening"
                    : recognition.supported
                      ? "Start listening"
                      : "Voice input unavailable"
              }
              title={
                quiet
                  ? "Voice is paused in quiet mode"
                  : recognition.supported
                    ? recognition.listening
                      ? "Stop listening"
                      : "Speak to Otzar"
                    : "Voice input unavailable in this shell. Type instead."
              }
              disabled={
                quiet ||
                !recognition.supported ||
                micPerm.state === "denied" ||
                detectShellMode() === "tauri_webview"
              }
              className="h-12 w-12 rounded-full p-0 shrink-0"
            >
              {recognition.supported ? (
                <Mic className="h-6 w-6" />
              ) : (
                <MicOff className="h-6 w-6" />
              )}
            </Button>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                recognition.supported
                  ? "Speak or type…"
                  : "Voice input unavailable. Type to Otzar."
              }
              aria-label="Message to Otzar"
              className="flex-1 rounded-md border border-input bg-background/60 px-2 py-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={intent.processing}
            />
            <Button
              type="button"
              size="icon"
              onClick={() => void handleSend()}
              disabled={draft.trim().length === 0 || intent.processing}
              aria-label="Send"
              title="Send to Otzar"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {!recognition.supported ? (
            <p className="text-xs text-muted-foreground">
              Voice input unavailable in this shell. Type to Otzar instead.
            </p>
          ) : null}
          {!synthesis.supported ? (
            <p className="text-xs text-muted-foreground">
              Speech output unavailable. Showing speech-ready text.
            </p>
          ) : null}
          {recognition.error !== null ? (
            <p className="text-xs text-destructive">
              {speechRecognitionErrorCopy(recognition.error)}
            </p>
          ) : null}
          {intent.error !== null ? (
            <p className="text-xs text-destructive">
              {llmErrorCopy(intent.error)}
            </p>
          ) : null}
          {routerAck !== null ? (
            <p
              className="text-xs text-muted-foreground"
              data-testid="voice-router-ack"
            >
              {routerAck}
            </p>
          ) : null}

          {response !== null ? (
            <div className="rounded-md border border-border bg-background/70 p-2 text-xs space-y-1">
              <div className="font-medium text-foreground">Otzar</div>
              <div className="text-muted-foreground whitespace-pre-wrap line-clamp-6">
                {response.speech_ready_text.length > 0
                  ? response.speech_ready_text
                  : response.response}
              </div>
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <Badge variant="outline">{response.next_step}</Badge>
                {approvalBadge}
                {collabBadge}
                {correctionBadge}
                <div className="ml-auto flex gap-1">
                  {synthesis.speaking ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={synthesis.stop}
                      className="h-6 w-6"
                      aria-label="Stop speaking"
                      title="Stop speaking"
                    >
                      <Square className="h-3 w-3" />
                    </Button>
                  ) : null}
                  {synthesis.supported && !synthesis.muted ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleReplay}
                      className="h-6 w-6"
                      aria-label="Replay"
                      title="Replay"
                    >
                      <Volume2 className="h-3 w-3" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestVoice}
              disabled={!synthesis.supported || synthesis.muted}
              className="h-7 px-2 text-xs"
              aria-label="Test Otzar voice"
              title={
                synthesis.supported
                  ? synthesis.muted
                    ? "Unmute to test"
                    : "Speak a test phrase using your device's TTS"
                  : "Speech output unsupported in this shell"
              }
            >
              <Volume2 className="h-3 w-3 mr-1" />
              Test Otzar voice
            </Button>
            {/* Emergency Stop voice — always visible so the
                operator can silence Otzar without hunting. ESC also
                works (bound at the window level inside the hook). */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={synthesis.stop}
              disabled={!synthesis.supported}
              className="h-7 px-2 text-xs"
              aria-label="Stop voice"
              title="Stop speaking (or press Escape)"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop voice
            </Button>
            {/* Auto-speak toggle — OFF by default per the emergency
                guard. The label is short + the title carries detail. */}
            <label
              className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer"
              title="When on, Otzar speaks every new response once through your device's TTS. Each response is deduped — re-renders never re-speak. Off by default."
            >
              <input
                type="checkbox"
                aria-label="Auto-speak responses"
                checked={autoSpeak}
                onChange={(e) => {
                  setAutoSpeak(e.target.checked);
                  if (e.target.checked) synthesis.resetDedupe();
                }}
                disabled={!synthesis.supported || synthesis.muted}
              />
              Auto-speak
            </label>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Voice input: {recognition.supported ? "browser STT (local)" : "text only"}
            {" · "}
            Voice output:{" "}
            {synthesis.supported
              ? synthesis.muted
                ? "muted"
                : "browser/device TTS"
              : "speech-ready text"}
            {response !== null && !response.voice_output_supported ? (
              <span> · Live Sesame voice not enabled yet.</span>
            ) : null}
            {" · "}
            No raw audio is stored.
          </p>

          <div className="flex flex-wrap gap-1 pt-1">
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Link to="/app/my-twin">My Twin</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Link to="/app/approvals">Approvals</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Link to="/app/collaboration">Collaboration</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Link to="/app/corrections">Corrections</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Link to="/app/voice-ready">Open full Voice page</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
