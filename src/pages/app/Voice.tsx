// FILE: Voice.tsx
// PURPOSE: Full-size voice page at /app/voice — the dedicated
//          surface the Founder reaches from the admin Control
//          Tower's "Talk to Otzar" header button + from the
//          ambient dock's "Open full Voice page" link.
//
//          Reuses the SAME hooks as the ambient dock
//          (useSpeechRecognition / useSpeechSynthesis /
//          useOtzarVoiceIntent / useMicrophonePermission) so the
//          two surfaces stay behaviorally identical — only the
//          layout differs.
//
//          The existing /app/voice-ready page is the typed-only
//          Phase 3 surface. This page is the "mic + permission +
//          test voice" surface explicitly built so the operator
//          can see the talking-Otzar loop end-to-end in one place.

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Square,
  ShieldCheck,
  ShieldQuestion,
  ShieldX,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ContextHealthBadge } from "@/components/otzar/ContextHealthBadge";
import { ProposedActionCard } from "@/components/otzar/ProposedActionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
// P0G — the shell-agnostic MediaRecorder→server transcription hook
// (the desktop path's engine) doubles as the browser fallback here.
import { useDesktopVoiceCapture } from "@/hooks/useDesktopVoiceCapture";
import { speakWithOtzarVoice } from "@/lib/voice/premium-tts";
import { useOtzarVoiceIntent } from "@/hooks/useOtzarVoiceIntent";
import { useMicrophonePermission } from "@/hooks/useMicrophonePermission";
import {
  decideSttPath,
  detectShellMode,
  llmErrorCopy,
  micCopyFor,
  SERVER_STT_DISCLOSURE,
  SERVER_STT_TRANSCRIBED_NOTE,
  shouldAutoFallbackToServerStt,
  speechRecognitionErrorCopy,
  transcribeErrorCopy,
} from "@/lib/voice/diagnostics";
import {
  describeAmbientVoiceMode,
  inferVoiceIntentRoute,
  ambientVoiceDeviceOptions,
  ambientVoiceRouteLabel,
  createAmbientVoiceCaptureEvent,
  type AmbientVoiceCaptureMode,
  type AmbientVoiceCaptureStatus,
} from "@/lib/voice/ambient-voice-capture";
import {
  createVoiceTurn,
  createVoiceTurnBuffer,
  addVoiceTurn,
  updateVoiceTurnConfirmation,
  clearVoiceTurnBuffer,
  latestVoiceTurn,
} from "@/lib/voice/voice-turn-buffer";
import {
  createConfirmedVoiceActionHandoff,
  describeConfirmedActionHandoff,
} from "@/lib/voice/confirmed-action-handoff";
import {
  executeVoiceNoteCapture,
  type VoiceNoteExecutionResult,
} from "@/lib/voice/voice-note-execution";
import {
  buildVoiceNoteProvenance,
  voiceNoteReadbackCopy,
  voiceNoteUndoCopy,
} from "@/lib/voice/voice-note-provenance";
import {
  buildVoiceNoteRevokePlan,
  voiceNoteRevokePlanCopy,
} from "@/lib/voice/voice-note-revoke-plan";
import type {
  VoiceNoteRevokePlanResponse,
  VoiceNoteRevokeApplyResponse,
} from "@/lib/types/foundation";
import {
  AuditAwareButton,
  type AuditAwareButtonResult,
} from "@/components/audit/AuditAwareButton";
import { api } from "@/lib/api";
import {
  describePushToTalkState,
  pushToTalkStateLabel,
  type PushToTalkState,
} from "@/lib/voice/push-to-talk-state";
import {
  createVoiceProposedAction,
  voiceConfirmationCopy,
  voiceSafetyLevelLabel,
} from "@/lib/voice/voice-approval-safety";

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

export function Voice() {
  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();
  const intent = useOtzarVoiceIntent();
  const micPerm = useMicrophonePermission();
  const [draft, setDraft] = useState("");
  // ── P0G — browser voice → server STT fallback ────────────────────
  const serverCap = useDesktopVoiceCapture();
  const serverCapRef = useRef(serverCap);
  serverCapRef.current = serverCap;
  const recognitionRef = useRef(recognition);
  recognitionRef.current = recognition;
  // Once Web Speech fails with a "network" error this session, this
  // surface prefers the server transcription path directly.
  const [serverSttPreferred, setServerSttPreferred] = useState(false);
  const autoSttFallbackUsedRef = useRef(false);
  // True while a server transcript sits in the draft awaiting review.
  const [serverTranscribed, setServerTranscribed] = useState(false);
  // EMERGENCY TTS LOOP GUARD per [FOUNDER-AUTH — EMERGENCY FIX]:
  // auto-speak is OFF by default. Operator explicitly enables it.
  const [autoSpeak, setAutoSpeak] = useState(false);
  // Stable ref guard against React StrictMode + re-render double-fire.
  const lastAutoSpokenKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (recognition.transcript.length > 0) setDraft(recognition.transcript);
  }, [recognition.transcript]);

  // P0G — a server transcript fills the SAME draft the Web Speech path
  // fills; the operator reviews, then sends. (The Tauri desktop shell
  // keeps its own flow inside AmbientOtzarBar — this page is browser-
  // facing, so no auto-submit here either way.)
  useEffect(() => {
    const t = serverCap.transcript.trim();
    if (t.length === 0) return;
    setDraft(t);
    setServerTranscribed(true);
    serverCapRef.current.reset();
  }, [serverCap.transcript]);
  useEffect(() => {
    if (draft.trim().length === 0) setServerTranscribed(false);
  }, [draft]);

  // P0G — automatic ONE-TIME switch to server STT when the browser's
  // own speech service fails with a "network" error; afterwards the
  // mic routes to server transcription directly (no engine flapping).
  useEffect(() => {
    if (
      !shouldAutoFallbackToServerStt({
        shell: detectShellMode(),
        webSpeechError: recognition.error,
        recorderAvailable: serverCap.supported,
        alreadyFellBackThisSession: autoSttFallbackUsedRef.current,
      })
    ) {
      return;
    }
    autoSttFallbackUsedRef.current = true;
    setServerSttPreferred(true);
    recognitionRef.current.reset();
    void serverCapRef.current.start();
  }, [recognition.error, serverCap.supported]);

  // AUTO-SPEAK effect — gated on the toggle + a stable response key.
  // The key combines conversation_id + tokens_consumed so a new turn
  // (which advances tokens_consumed) is a new utterance, but a
  // re-render of the same response is not.
  const responseKey =
    intent.response !== null
      ? `${intent.response.conversation_id}:${intent.response.tokens_consumed}`
      : null;
  useEffect(() => {
    if (!autoSpeak) return;
    if (responseKey === null) return;
    if (lastAutoSpokenKeyRef.current === responseKey) return;
    if (intent.response === null) return;
    const sayable =
      intent.response.speech_ready_text.length > 0
        ? intent.response.speech_ready_text
        : intent.response.response;
    lastAutoSpokenKeyRef.current = responseKey;
    void speakWithOtzarVoice(sayable, (t) =>
      synthesis.speak(t, { source: "auto", force: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, responseKey]);

  // P0G — which STT engine drives the mic button on this page. Web
  // Speech stays primary when it works; the server transcription path
  // is the fallback (and the primary when Web Speech is unavailable).
  const sttPath = decideSttPath({
    shell: detectShellMode(),
    webSpeechAvailable: recognition.supported,
    recorderAvailable: serverCap.supported,
    serverSttPreferred,
  });
  // "desktop_capture" (Tauri) is deliberately EXCLUDED on this page —
  // the desktop voice flow lives in AmbientOtzarBar; this page keeps
  // its existing typed-fallback copy in the Tauri shell, unchanged.
  const useServerStt = sttPath === "server_stt";

  async function handleMicToggle(): Promise<void> {
    if (useServerStt) {
      // Record → stop → transcribe on the server; the transcript
      // effect above fills the draft for review.
      if (
        serverCap.state === "recording" ||
        serverCap.state === "transcribing"
      ) {
        serverCap.stop();
        return;
      }
      setServerTranscribed(false);
      await serverCap.start();
      return;
    }
    if (recognition.listening) {
      recognition.stop();
      return;
    }
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

  async function handleSend(): Promise<void> {
    const text = draft.trim();
    if (text.length === 0 || intent.processing) return;
    synthesis.stop();
    setDraft("");
    await intent.send(text);
  }

  function handleTestVoice(): void {
    // force=true bypasses auto-speak dedupe; the in-flight check
    // inside the hook still prevents queue duplication from rapid
    // clicks.
    void speakWithOtzarVoice(TEST_VOICE_PHRASE, (t) =>
      synthesis.speak(t, { source: "test", force: true }),
    );
  }

  function handleReplay(): void {
    if (intent.response === null) return;
    const sayable =
      intent.response.speech_ready_text.length > 0
        ? intent.response.speech_ready_text
        : intent.response.response;
    void speakWithOtzarVoice(sayable, (t) =>
      synthesis.speak(t, { source: "replay", force: true }),
    );
  }

  const shellMode = detectShellMode();
  // P0G: 4th arg — the recorder→server fallback capability. When Web
  // Speech is missing but the recorder exists, the mic stays usable.
  const micCopy = micCopyFor(
    shellMode,
    micPerm.state,
    recognition.supported,
    serverCap.supported,
  );
  const PermIcon = toneIcon(micCopy.tone);
  const serverCapActive =
    serverCap.state === "recording" || serverCap.state === "transcribing";
  const response = intent.response;

  // Phase OTZAR-RETURN-3 — honest ambient capture readiness, sourced from the
  // shared model so the Voice page and ambient dock describe voice identically.
  // The current shell is the desktop browser; wearable/tray modes are surfaced
  // as planned-only (no fake "connect" affordance).
  const providerBlocked =
    recognition.error === "service-not-allowed" || recognition.error === "not-allowed";
  const captureMode: AmbientVoiceCaptureMode = recognition.supported
    ? "browser_stt"
    : "text_only";
  const captureStatus: AmbientVoiceCaptureStatus = providerBlocked
    ? "provider_blocked"
    : recognition.supported
      ? "ready"
      : "unsupported";
  // P0G: when the server transcription path drives the mic, the shared
  // model's "text only" copy would be dishonest — voice DOES work here.
  const ambientCaptureCopy = useServerStt
    ? `Push-to-talk voice is available. ${SERVER_STT_DISCLOSURE}`
    : describeAmbientVoiceMode({
        device_mode: "desktop_browser",
        capture_mode: captureMode,
        status: captureStatus,
        browserRecognitionSupported: recognition.supported,
        providerBlocked,
      });
  const trimmedDraft = draft.trim();
  const routeHint =
    trimmedDraft.length > 0 ? inferVoiceIntentRoute(trimmedDraft) : null;
  const deviceOptions = ambientVoiceDeviceOptions();

  // Phase OTZAR-RETURN-5/6 — voice confirm-before-act, backed by a LOCAL,
  // in-memory, session-only voice turn buffer (RETURN-6). The route hint becomes
  // a draft VoiceProposedAction held as a turn; privileged routes require an
  // explicit local confirm. Confirming performs NO send/approve/complete/
  // reminder and NO external write, and NOTHING is persisted (no localStorage /
  // sessionStorage / IndexedDB / backend / files; no raw audio).
  const [turnBuffer, setTurnBuffer] = useState(() => createVoiceTurnBuffer());
  const [turnsDismissed, setTurnsDismissed] = useState(false);
  // (Re)build the live turn whenever the transcript or route changes. Typing
  // resets any prior local decision cleanly (a fresh, unconfirmed turn).
  useEffect(() => {
    if (routeHint === null || trimmedDraft.length === 0) return;
    const capture = createAmbientVoiceCaptureEvent({
      transcript: trimmedDraft,
      device_mode: "desktop_browser",
      capture_mode: "push_to_talk",
      status: "ready",
    });
    const proposed = createVoiceProposedAction({ transcript: trimmedDraft, route: routeHint });
    const turn = createVoiceTurn({
      transcript: trimmedDraft,
      capture_event: capture,
      proposed_action: proposed,
      turn_id: `live-${routeHint}`,
    });
    setTurnBuffer(addVoiceTurn(createVoiceTurnBuffer(), turn));
    setTurnsDismissed(false);
  }, [trimmedDraft, routeHint]);

  // baseProposed is lag-free (derived from the current route); the buffer turn
  // overlays the confirmation decision once it matches this exact route+text.
  const baseProposed =
    routeHint !== null && trimmedDraft.length > 0
      ? createVoiceProposedAction({ transcript: trimmedDraft, route: routeHint })
      : null;
  const bufferTurn = turnsDismissed ? null : latestVoiceTurn(turnBuffer);
  const decisionApplies =
    bufferTurn !== null &&
    baseProposed !== null &&
    bufferTurn.proposed_action.route === baseProposed.route &&
    bufferTurn.transcript_text === baseProposed.transcript_text;
  const proposedAction =
    baseProposed === null
      ? null
      : decisionApplies && bufferTurn !== null
        ? bufferTurn.proposed_action
        : baseProposed;
  const activeTurn = decisionApplies ? bufferTurn : null;

  function decideVoiceTurn(decision: "confirm" | "decline"): void {
    if (activeTurn === null) return;
    setTurnBuffer((prev) => updateVoiceTurnConfirmation(prev, activeTurn.turn_id, decision).buffer);
  }
  function clearVoiceTurns(): void {
    setTurnBuffer((prev) => clearVoiceTurnBuffer(prev));
    setTurnsDismissed(true);
  }

  // The inert confirmed-action handoff, only once a privileged turn is confirmed.
  const handoffResult = activeTurn !== null ? createConfirmedVoiceActionHandoff(activeTurn) : null;
  const handoff = handoffResult !== null && handoffResult.ok ? handoffResult.handoff : null;

  // Phase OTZAR-RETURN-7 — the FIRST governed voice EXECUTION route: an internal
  // note capture, note_capture ONLY, click-triggered. It calls the SAME governed
  // audit-aware write the Observe page uses (POST /otzar/observe, event_type
  // "NOTE"), which writes the caller's own memory capsule. It is internal — no
  // external message/email/Slack/calendar, no approval/task/reminder.
  const [noteResult, setNoteResult] = useState<VoiceNoteExecutionResult | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  // The note result belongs to one turn; clear it when the turn changes.
  useEffect(() => {
    setNoteResult(null);
  }, [trimmedDraft, routeHint]);
  async function saveInternalNote(): Promise<void> {
    if (activeTurn === null || activeTurn.proposed_action.route !== "note_capture") return;
    setSavingNote(true);
    const result = await executeVoiceNoteCapture(activeTurn, (req) => api.otzar.observe(req));
    setSavingNote(false);
    setNoteResult(result);
  }
  // Phase OTZAR-RETURN-8 — provenance for the saved note. A NOTE observation can
  // fan out to multiple capsules across wallets, so read-back has no safe by-id
  // path and undo needs a governed note-scoped revoke contract (not the existing
  // per-capsule, caller-wallet revoke). Read-back/undo are reported honestly; NO
  // revoke/delete is performed in this build.
  const noteProvenance = noteResult !== null ? buildVoiceNoteProvenance(noteResult) : null;
  // Phase OTZAR-RETURN-9 — an HONEST, read-only revoke PLAN (plan-first, never
  // destructive). With no durable grouping id, the plan is always
  // CANNOT_IDENTIFY_GROUP with apply_allowed false. It calls nothing and revokes
  // nothing — it explains, truthfully, why undo isn't available yet.
  const noteRevokePlan =
    noteProvenance !== null
      ? buildVoiceNoteRevokePlan({
          capsuleIds: noteProvenance.capsule_ids,
          planLabel: noteProvenance.source_result_id ?? "voice-note",
          ...(noteProvenance.voice_note_id !== undefined
            ? { groupingId: noteProvenance.voice_note_id }
            : {}),
        })
      : null;

  // Phase OTZAR-RETURN-11 — the REAL, governed, read-only revoke PLAN from
  // Foundation, fetched on demand. "Review undo plan" calls the read-only
  // endpoint (POST /otzar/voice-notes/:id/revoke-plan); it revokes/deletes
  // NOTHING and shows no apply button. Only available once a note has a
  // voice_note_id grouping (RETURN-10).
  const [reviewedPlan, setReviewedPlan] =
    useState<VoiceNoteRevokePlanResponse | null>(null);
  const [reviewingPlan, setReviewingPlan] = useState(false);
  const [reviewPlanError, setReviewPlanError] = useState(false);
  // Phase OTZAR-RETURN-12 — the first MUTATING undo step. The governed apply is
  // OFFERED only when a reviewed plan says the caller can revoke (COMPLETE or
  // PARTIAL); it soft-revokes the caller-owned capsules and reports the honest
  // outcome inline. It never hard-deletes and never claims a complete undo when
  // org/unknown capsules were skipped.
  const [applyResult, setApplyResult] =
    useState<VoiceNoteRevokeApplyResponse | null>(null);
  useEffect(() => {
    setReviewedPlan(null);
    setReviewPlanError(false);
    setApplyResult(null);
  }, [trimmedDraft, routeHint]);
  async function reviewUndoPlan(): Promise<void> {
    const groupId = noteProvenance?.voice_note_id;
    if (groupId === undefined) return;
    setReviewingPlan(true);
    setReviewPlanError(false);
    const r = await api.otzar.voiceNotes.revokePlan(groupId, {
      reason: "user_requested_undo_plan",
    });
    setReviewingPlan(false);
    if (r.ok) setReviewedPlan(r.data);
    else setReviewPlanError(true);
  }
  // The apply runs inside AuditAwareButton's 4-stage flow (confirm -> in-flight
  // -> toast with audit id). We store the full response for the inline status
  // panel, then map to the button's success/failure result: a real soft-revoke
  // surfaces its summary audit_id; a no-op (nothing revoked) carries no audit id
  // per the audit contract, so it reports the honest message without one.
  async function applyUndo(): Promise<AuditAwareButtonResult> {
    const groupId = noteProvenance?.voice_note_id;
    if (groupId === undefined) {
      return { ok: false, error: "This note can't be identified for undo." };
    }
    const r = await api.otzar.voiceNotes.revokeApply(groupId, {
      reason: "user_requested_undo",
    });
    if (!r.ok) {
      return { ok: false, error: "Couldn't apply the undo right now. No note was changed." };
    }
    setApplyResult(r.data);
    if (r.data.audit_id !== undefined && r.data.revoked_capsule_ids.length > 0) {
      return { ok: true, audit_event_id: r.data.audit_id };
    }
    return { ok: false, error: r.data.message };
  }

  // Phase OTZAR-RETURN-4 — derive the push-to-talk capture state from REAL
  // signals (mic support, permission, live listening, captured transcript). The
  // machine is explicit-only: there is no background/always-on path, which is
  // exactly what this surface communicates.
  // P0G: when the server transcription path drives the mic, derive the
  // push-to-talk state from the recorder instead of Web Speech — the
  // old mapping would have shown "blocked" while voice actually works.
  const pttState: PushToTalkState = useServerStt
    ? micPerm.state === "denied"
      ? "permission_denied"
      : serverCap.state === "recording"
        ? "listening"
        : serverCap.state === "transcribing"
          ? "captured"
          : serverCap.state === "error"
            ? "error"
            : serverTranscribed
              ? "captured"
              : "idle"
    : !recognition.supported
      ? "blocked"
      : micPerm.state === "denied"
        ? "permission_denied"
        : recognition.listening
          ? "listening"
          : recognition.error !== null
            ? "error"
            : recognition.transcript.trim().length > 0
              ? "captured"
              : "idle";

  let status = "Ambient. Click the microphone or type to Otzar.";
  let statusClass = "text-muted-foreground";
  if (recognition.listening || serverCap.state === "recording") {
    status = "Listening…";
    statusClass = "text-primary";
  } else if (serverCap.state === "transcribing") {
    status = "Transcribing…";
    statusClass = "text-primary";
  } else if (intent.processing) {
    status = "Processing…";
    statusClass = "text-primary";
  } else if (synthesis.speaking) {
    status = "Otzar is speaking…";
    statusClass = "text-primary";
  } else if (serverTranscribed) {
    status = "Transcribed via server";
    statusClass = "text-primary";
  } else if (synthesis.muted) {
    status = "Muted";
  } else if (intent.response !== null) {
    status = "Ready for next turn.";
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 space-y-6">
      <PageHeader
        title="Talk to Otzar"
        description="Speak or type. Otzar responds with text + your device's TTS. No raw audio is stored."
      />

      <ContextHealthBadge />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Microphone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`flex items-start gap-2 text-sm ${toneClass(micCopy.tone)}`}
            data-testid="voice-permission-state"
          >
            <PermIcon className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="font-medium">{micCopy.headline}</div>
              {micCopy.detail.length > 0 ? (
                <div className="text-xs text-muted-foreground">
                  {micCopy.detail}
                </div>
              ) : null}
              {shellMode === "tauri_webview" && import.meta.env.DEV ? (
                <a
                  href="http://localhost:5173/app/voice"
                  className="text-xs underline text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    // Dev-only: the Vite dev server URL exists only on a
                    // dev machine; production shells get the honest
                    // browser-fallback copy without a dead link.
                    e.preventDefault();
                    try {
                      window.open("http://localhost:5173/app/voice", "_blank");
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Open in Chrome →
                </a>
              ) : null}
            </div>
            {micCopy.showRequestButton ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void micPerm.request()}
                disabled={micPerm.requesting}
                className="ml-auto"
              >
                {micPerm.requesting
                  ? "Requesting…"
                  : "Request microphone permission"}
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant={
                recognition.listening || serverCapActive
                  ? "destructive"
                  : "default"
              }
              onClick={() => void handleMicToggle()}
              disabled={!micCopy.micButtonEnabled}
              aria-label={
                recognition.listening || serverCapActive
                  ? "Stop listening"
                  : recognition.supported || useServerStt
                    ? "Start listening"
                    : "Voice input unavailable"
              }
              className="h-16 w-16 rounded-full p-0 shrink-0"
            >
              {recognition.supported || useServerStt ? (
                <Mic className="h-8 w-8" />
              ) : (
                <MicOff className="h-8 w-8" />
              )}
            </Button>
            <div className="flex-1">
              <div className={`text-sm font-medium ${statusClass}`}>
                {status}
              </div>
              <div className="text-xs text-muted-foreground">
                {useServerStt
                  ? SERVER_STT_DISCLOSURE
                  : recognition.supported
                    ? "Your browser transcribes your speech (some browsers use their provider's speech service to do this). Otzar only ever receives the text, never the audio."
                    : "Voice input unavailable in this shell. Type to Otzar."}
              </div>
            </div>
          </div>

          {serverTranscribed ? (
            <div
              className="text-xs text-muted-foreground"
              data-testid="voice-server-stt-note"
            >
              {SERVER_STT_TRANSCRIBED_NOTE}
            </div>
          ) : null}
          {serverCap.state === "error" && serverCap.errorCode !== null ? (
            <div
              className="text-sm text-destructive"
              data-testid="voice-server-stt-error"
            >
              {transcribeErrorCopy(serverCap.errorCode)}
            </div>
          ) : null}
          {recognition.error !== null ? (
            <div className="text-sm text-destructive">
              {speechRecognitionErrorCopy(recognition.error)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card data-testid="ambient-capture-card">
        <CardHeader>
          <CardTitle className="text-base">Ambient capture readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1" data-testid="ptt-capture-model">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Capture model:</span>
              <Badge variant="outline">Push-to-talk</Badge>
              <Badge
                variant={pttState === "listening" ? "default" : "secondary"}
                data-testid="ptt-state-badge"
                data-ptt-state={pttState}
              >
                {pushToTalkStateLabel(pttState)}
              </Badge>
            </div>
            <p
              className="text-xs text-muted-foreground"
              data-testid="ptt-state-copy"
            >
              {describePushToTalkState(pttState)}
            </p>
          </div>

          <p
            className="text-sm text-muted-foreground"
            data-testid="ambient-capture-copy"
          >
            {ambientCaptureCopy}
          </p>

          {routeHint !== null ? (
            <div
              className="flex items-center gap-2 text-xs"
              data-testid="ambient-route-hint"
            >
              <span className="text-muted-foreground">Intent route:</span>
              <Badge variant="outline" data-testid="ambient-route-hint-value">
                {ambientVoiceRouteLabel(routeHint)}
              </Badge>
              <span className="text-muted-foreground">
                A local hint only — Otzar still confirms before any action.
              </span>
            </div>
          ) : null}

          {proposedAction !== null ? (
            <div
              className="space-y-2 rounded-md border border-border bg-background/60 p-2"
              data-testid="voice-safety-card"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Voice safety:</span>
                <Badge
                  variant={
                    proposedAction.safety_level === "confirm_required"
                      ? "default"
                      : proposedAction.safety_level === "blocked"
                        ? "destructive"
                        : "secondary"
                  }
                  data-testid="voice-safety-level"
                  data-safety-level={proposedAction.safety_level}
                >
                  {voiceSafetyLevelLabel(proposedAction.safety_level)}
                </Badge>
              </div>
              <p
                className="text-xs text-muted-foreground"
                data-testid="voice-confirmation-copy"
              >
                {voiceConfirmationCopy(proposedAction)}
              </p>
              {proposedAction.safety_level === "confirm_required" &&
              proposedAction.confirmation_state === "required" ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => decideVoiceTurn("confirm")}
                    data-testid="voice-confirm-local"
                  >
                    Confirm locally
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => decideVoiceTurn("decline")}
                    data-testid="voice-decline-local"
                  >
                    Decline
                  </Button>
                </div>
              ) : null}

              {/* Phase OTZAR-RETURN-7 — the ONLY governed voice write: save an
                  internal note. Shown for note_capture ONLY; never for comms /
                  approval / action_runtime / reminder / chat / ask_twin /
                  unknown. Click-triggered; internal note, no external send. */}
              {proposedAction.route === "note_capture" ? (
                <div className="space-y-2" data-testid="voice-note-capture">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void saveInternalNote()}
                    disabled={savingNote || noteResult?.internal_note_created === true}
                    data-testid="voice-save-note"
                  >
                    {savingNote ? "Saving…" : "Save internal note"}
                  </Button>
                  {noteResult !== null ? (
                    <div
                      className={`rounded border p-1.5 ${
                        noteResult.execution_status === "succeeded"
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-amber-500/40 bg-amber-500/5"
                      }`}
                      data-testid="voice-note-result"
                      data-execution-status={noteResult.execution_status}
                      data-internal-note-created={String(noteResult.internal_note_created)}
                    >
                      <p
                        className={`text-[11px] ${
                          noteResult.execution_status === "succeeded"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-amber-700 dark:text-amber-400"
                        }`}
                        data-testid="voice-note-result-copy"
                      >
                        {noteResult.message}
                      </p>
                      {noteResult.note_id !== undefined ? (
                        <p
                          className="text-[10px] text-muted-foreground"
                          data-testid="voice-note-id"
                        >
                          Note id: {noteResult.note_id}
                        </p>
                      ) : null}
                      {noteResult.audit_url !== undefined ? (
                        <a
                          className="text-[10px] underline text-muted-foreground hover:text-foreground"
                          href={noteResult.audit_url}
                          data-testid="voice-note-audit-link"
                        >
                          View audit record
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {noteProvenance !== null ? (
            <div
              className="space-y-1 rounded-md border border-border bg-background/60 p-2"
              data-testid="voice-note-provenance"
            >
              <div className="text-xs font-medium text-foreground/80">
                Internal note saved — provenance
              </div>
              <p className="text-[11px] text-muted-foreground" data-testid="voice-note-capsule-id">
                {noteProvenance.capsule_count > 1
                  ? `Capsule ids (${noteProvenance.capsule_count}): ${noteProvenance.capsule_ids.join(", ")}`
                  : `Capsule id: ${noteProvenance.note_id ?? "—"}`}
              </p>
              {noteProvenance.voice_note_id !== undefined ? (
                <p
                  className="text-[10px] text-muted-foreground"
                  data-testid="voice-note-group-id"
                >
                  Voice note group id: {noteProvenance.voice_note_id} — recorded for
                  future governed undo planning.
                </p>
              ) : null}
              <p className="text-[10px] text-muted-foreground">
                Event type: NOTE · Source: voice note capture · No external message
                was sent · No raw audio was stored.
              </p>
              {noteProvenance.capsule_count > 1 ? (
                <p className="text-[10px] text-muted-foreground" data-testid="voice-note-fanout">
                  This note was extracted into {noteProvenance.capsule_count} capsules
                  (some may sit in your organization's wallet).
                </p>
              ) : null}
              {noteProvenance.audit_url !== undefined ? (
                <a
                  className="text-[10px] underline text-muted-foreground hover:text-foreground"
                  href={noteProvenance.audit_url}
                  data-testid="voice-note-provenance-audit-link"
                >
                  View audit record
                </a>
              ) : null}
              <p
                className="text-[10px] text-muted-foreground"
                data-testid="voice-note-readback-status"
                data-readback-status={noteProvenance.readback_status}
              >
                {voiceNoteReadbackCopy(noteProvenance.readback_status)}
              </p>
              <p
                className="text-[10px] text-amber-700 dark:text-amber-400"
                data-testid="voice-note-undo-status"
                data-undo-status={noteProvenance.undo_status}
              >
                {voiceNoteUndoCopy(noteProvenance.undo_status)}
              </p>
              {noteProvenance.undo_status === "available" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="voice-note-undo-button"
                >
                  Undo / revoke note
                </Button>
              ) : (
                <p
                  className="text-[10px] text-muted-foreground"
                  data-testid="voice-note-undo-unavailable"
                >
                  A governed revoke path is required before Otzar can remove this
                  note safely.
                </p>
              )}
              {noteRevokePlan !== null ? (
                <p
                  className="text-[10px] text-muted-foreground"
                  data-testid="voice-note-revoke-plan-status"
                  data-plan-status={noteRevokePlan.plan_status}
                  data-apply-allowed={String(noteRevokePlan.apply_allowed)}
                >
                  Revoke plan (plan only): {voiceNoteRevokePlanCopy(noteRevokePlan)}{" "}
                  A future governed undo would soft-revoke (tombstone) each capsule
                  with per-wallet authority and audit — never a hard delete.
                </p>
              ) : null}

              {/* Phase OTZAR-RETURN-11 — once the note has a grouping id, the user
                  can fetch the REAL governed read-only plan. This calls the
                  revoke-plan endpoint only; it never revokes/deletes/applies and
                  shows no apply button. */}
              {noteProvenance.voice_note_id !== undefined ? (
                <div className="space-y-1 pt-1" data-testid="voice-note-review-plan">
                  {reviewedPlan === null ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void reviewUndoPlan()}
                      disabled={reviewingPlan}
                      data-testid="voice-note-review-plan-button"
                    >
                      {reviewingPlan ? "Reviewing…" : "Review undo plan"}
                    </Button>
                  ) : null}
                  {reviewPlanError ? (
                    <p className="text-[10px] text-amber-600" data-testid="voice-note-review-plan-error">
                      Couldn't fetch the undo plan right now. No note was removed.
                    </p>
                  ) : null}
                  {reviewedPlan !== null ? (
                    <div
                      className="rounded border border-border bg-background/60 p-1.5"
                      data-testid="voice-note-reviewed-plan"
                      data-plan-status={reviewedPlan.plan_status}
                      data-apply-allowed={String(reviewedPlan.apply_allowed)}
                    >
                      <p className="text-[11px] text-foreground/80">
                        Undo plan reviewed. No note was removed.
                      </p>
                      <p className="text-[10px] text-muted-foreground" data-testid="voice-note-reviewed-plan-status">
                        {reviewedPlan.plan_status === "COMPLETE_CAN_APPLY"
                          ? `All ${reviewedPlan.capsule_count} knowledge item(s) in this note can be revoked by you.`
                          : reviewedPlan.plan_status === "PARTIAL_REQUIRES_AUTHORITY"
                            ? "Some items require organization authority and will be left untouched."
                            : reviewedPlan.plan_status === "ALREADY_REVOKED"
                              ? "This note group is already revoked."
                              : reviewedPlan.plan_status === "NOT_FOUND"
                                ? "This note group isn't available."
                                : "A safe plan can't be formed for this note yet."}
                      </p>
                      {/* OTZAR-RETURN-12 — the governed APPLY is offered only when
                          the plan says the caller can revoke (COMPLETE / PARTIAL).
                          ALREADY_REVOKED / NOT_FOUND / UNSAFE show no apply button:
                          there is nothing safe to apply. Soft revoke only — never a
                          hard delete; org/unknown items are skipped, not removed. */}
                      {applyResult === null &&
                      (reviewedPlan.plan_status === "COMPLETE_CAN_APPLY" ||
                        reviewedPlan.plan_status === "PARTIAL_REQUIRES_AUTHORITY") ? (
                        <div className="pt-1" data-testid="voice-note-apply-affordance">
                          <AuditAwareButton
                            variant="destructive"
                            auditEventType="VOICE_NOTE_REVOKE_APPLIED"
                            requireConfirmation
                            confirmationTitle="Apply governed undo?"
                            confirmationDescription="This soft-revokes the knowledge items you own from this voice note. Nothing is hard-deleted, no message is sent, and items requiring organization authority are left untouched."
                            targetDescription="Your knowledge items captured from this voice note"
                            onConfirm={applyUndo}
                          >
                            Apply governed undo
                          </AuditAwareButton>
                        </div>
                      ) : null}
                      {applyResult !== null ? (
                        <div
                          className="mt-1 rounded border border-border bg-background/80 p-1.5"
                          data-testid="voice-note-apply-result"
                          data-apply-status={applyResult.apply_status}
                          data-hard-delete={String(applyResult.hard_delete_performed)}
                        >
                          <p className="text-[11px] text-foreground/80" data-testid="voice-note-apply-result-message">
                            {applyResult.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Revoked {applyResult.revoked_capsule_ids.length} ·
                            already revoked {applyResult.already_revoked_capsule_ids.length} ·
                            left untouched {applyResult.skipped_capsules.length}.
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Soft revoke only. No item was hard-deleted, no external
                            message was sent, and no raw audio was exposed.
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">
                          Soft revoke only. No item is hard-deleted, no external
                          message is sent, and no raw audio is exposed.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTurn !== null ? (
            <div
              className="space-y-1 rounded-md border border-border bg-background/60 p-2"
              data-testid="voice-turn-buffer-card"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground/80">
                  Local voice turn
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  onClick={clearVoiceTurns}
                  data-testid="voice-turn-clear"
                >
                  Clear local voice turns
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground" data-testid="voice-turn-latest">
                "{activeTurn.transcript_text}" · {ambientVoiceRouteLabel(activeTurn.proposed_action.route)} ·{" "}
                {voiceSafetyLevelLabel(activeTurn.proposed_action.safety_level)} ·{" "}
                {activeTurn.confirmation_state.replace(/_/g, " ")}
              </p>
              <p
                className="text-[10px] text-muted-foreground"
                data-testid="voice-turn-retention"
              >
                Retention: in-memory session only. No raw audio is stored. No
                external write has been performed.
              </p>
              {handoff !== null ? (
                <div
                  className="mt-1 rounded border border-emerald-500/40 bg-emerald-500/5 p-1.5"
                  data-testid="confirmed-action-handoff"
                  data-execution-status={handoff.execution_status}
                >
                  <p
                    className="text-[11px] text-emerald-700 dark:text-emerald-400"
                    data-testid="confirmed-action-handoff-copy"
                  >
                    {describeConfirmedActionHandoff(handoff)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1" data-testid="ambient-device-readiness">
            <div className="text-xs font-medium text-foreground/80">
              Device readiness
            </div>
            <ul className="space-y-1">
              {deviceOptions.map((d) => (
                <li
                  key={d.mode}
                  className="flex items-start gap-2 text-xs"
                  data-testid={`ambient-device-${d.mode}`}
                >
                  <Badge
                    variant={d.availability === "current" ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {d.availability === "current" ? "Available" : "Planned"}
                  </Badge>
                  <span>
                    <span className="font-medium text-foreground">{d.label}</span>
                    <span className="text-muted-foreground"> — {d.honest_status}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compose</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              recognition.supported
                ? "Speak or type to Otzar…"
                : "Type to Otzar (voice input unsupported in this shell)…"
            }
            aria-label="Message to Otzar"
            className="w-full min-h-[6rem] rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={intent.processing}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={draft.trim().length === 0 || intent.processing}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {intent.processing ? "Sending…" : "Send to Otzar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestVoice}
              disabled={!synthesis.supported || synthesis.muted}
              className="gap-2"
            >
              <Volume2 className="h-4 w-4" />
              Test Otzar voice
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => synthesis.setMuted(!synthesis.muted)}
              disabled={!synthesis.supported}
              className="gap-2"
            >
              {synthesis.muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              {synthesis.muted ? "Unmute" : "Mute"}
            </Button>
            {/* Stop voice — ALWAYS visible (not gated on
                synthesis.speaking) so the operator can silence
                Otzar without hunting. ESC also stops (bound at
                window level inside the hook). */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={synthesis.stop}
              disabled={!synthesis.supported}
              className="gap-2"
              aria-label="Stop voice"
              title="Stop speaking (or press Escape)"
            >
              <Square className="h-4 w-4" />
              Stop voice
            </Button>
            {/* Auto-speak toggle — OFF by default per the emergency
                TTS loop guard. Operator enables it explicitly. */}
            <label
              className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer ml-2"
              title="When on, Otzar speaks every new response once through your device's TTS. Each response is deduped — re-renders never re-speak."
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
              Auto-speak responses
            </label>
          </div>
          {intent.error !== null ? (
            <div className="text-sm text-destructive">
              {llmErrorCopy(intent.error)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {response !== null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Otzar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">
              {response.speech_ready_text.length > 0
                ? response.speech_ready_text
                : response.response}
            </p>
            {response.proposed_action !== undefined ? (
              <ProposedActionCard
                proposedAction={response.proposed_action}
              />
            ) : null}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{response.next_step}</Badge>
              {response.approval_required ? (
                <Badge variant="destructive">Approval required</Badge>
              ) : null}
              {response.collaboration_suggested ? (
                <Badge variant="secondary">Collaboration suggested</Badge>
              ) : null}
              {response.correction_capture_available ? (
                <Badge variant="outline">Correction available</Badge>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReplay}
                disabled={!synthesis.supported || synthesis.muted}
              >
                <Volume2 className="h-4 w-4 mr-1" />
                Replay
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Voice input:{" "}
              {useServerStt
                ? "microphone → secure server transcription"
                : recognition.supported
                  ? "browser STT"
                  : "text only"}{" "}
              ·
              Voice output:{" "}
              {synthesis.supported
                ? synthesis.muted
                  ? "muted"
                  : "browser/device TTS"
                : "speech-ready text"}
              {response !== null && !response.voice_output_supported ? (
                <span> · Live Sesame voice not enabled yet.</span>
              ) : null}{" "}
              · No raw audio is stored.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
