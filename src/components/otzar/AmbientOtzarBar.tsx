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
//   - No raw audio crosses the boundary to Otzar; only the resulting
//     transcript STRING is sent. NOTE: the browser's own Web Speech API
//     may stream audio to its vendor's speech service to PRODUCE that
//     transcript — that is the browser's path, outside Otzar's boundary.
//     We never claim on-device-only transcription.
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
import {
  usePresenceStore,
  usePresenceState,
  presenceIntensity,
  humanPresenceState,
  type PresenceIntensity,
} from "@/lib/stores/presence";
import { presenceRing } from "@/lib/ambient/presence-ring";
import {
  detectNativeMicCapability,
  nativeMicCopy,
  requestNativeMicAccess,
  type NativeMicStatus,
} from "@/lib/voice/native-mic";
import {
  speakWithOtzarVoice,
  cancelVoicePlayback,
  getLastVoicePath,
} from "@/lib/voice/premium-tts";
import {
  classifyVoiceAction,
  safeOpenExternalUrl,
  type VoiceAction,
} from "@/lib/voice/voice-action-runtime";
import {
  recordVoiceAction,
  recordArtifactEdit,
} from "@/lib/voice/voice-action-log";
import {
  appendConversationEntry,
  useConversationStore,
} from "@/lib/work-os/conversation-store";
import {
  resolveTarget,
  resolveTargetGoverned,
} from "@/lib/work-os/target-resolution";
import {
  interpretAmbientOutboundWork,
  isSelfKind,
  type AmbientOutboundKind,
  type CollaborationRequestType,
} from "@/lib/work-os/ambient-outbound";
import {
  decideAmbientVisibility,
  type AmbientEventKind,
} from "@/lib/work-os/ambient-visibility";
import {
  resolveWorkContext,
  contextLabel,
} from "@/lib/work-os/work-context";
import {
  useCurrentSurfaceContextStore,
  getActiveSurfaceContext,
} from "@/lib/stores/current-surface-context";
import {
  detectTranscriptCommand,
  extractTranscriptDigest,
  digestCounts,
  whyThisMatters,
  pickItems,
  type TranscriptDigest,
  type TranscriptWorkItem,
} from "@/lib/work-os/transcript-intelligence";
import {
  digestToProposedActions,
  proposedActionsCount,
  type TranscriptProposedAction,
} from "@/lib/work-os/transcript-actions";
import { TranscriptActionReview } from "@/components/otzar/TranscriptActionReview";
import {
  detectTrackingCommand,
  deriveTrackingFromActions,
  composeTrackingAnswer,
  type WorkTrackingSummary,
  type WorkTrackingItem,
} from "@/lib/work-os/work-tracking";
import {
  detectIngestionCommand,
  meetingCapturesToCandidates,
  ingestFromCandidates,
} from "@/lib/work-os/transcript-ingestion";
import {
  detectCorrection,
  applyCorrection,
  correctionTypeFor,
  persistenceStatusLabel,
  correctionTypeLabel,
  correctionScopeLabel,
  correctionStateLabel,
  type WorkCorrection,
  type WorkCorrectionHistoryItem,
  type CorrectionPersistenceStatus,
} from "@/lib/work-os/work-corrections";
import type { TwinCorrectionSafeView } from "@/lib/types/foundation";
import { entityLabel } from "@/lib/identity/canonical-entity";
import {
  isPendingConfirmPhrase,
  isExplicitActionCenterNav,
} from "@/lib/work-os/pending-confirm";
import {
  parseRecipientList,
  isCancelPhrase,
  composeRequestBody,
  formatRecipientList,
  isClarificationExpired,
  detectFirstTurnRecipients,
  type PendingClarification,
} from "@/lib/work-os/pending-clarification";
import { buildWorkNodes } from "@/lib/work-os/work-nodes";
import { formatPersonName } from "@/lib/identity/person-name";
import { emitFlow } from "@/lib/stores/flow";
import { sanitizeOutboundMessage } from "@/lib/work-os/message-sanitize";
import {
  detectVagueWorkIntent,
  vagueWorkQuestion,
} from "@/lib/work-os/vague-work";
import {
  classifyThreadQuery,
  composeThreadAnswer,
  composeWaitingOnAnswer,
  composeRelationshipAnswer,
  RELATIONSHIP_QUERY_TYPES,
} from "@/lib/work-os/thread-query";
import { classifyClarityPhrase, isBackgroundSubjectQuestion } from "@/lib/work-os/clarity-phrases";
import {
  tomorrowWorkWindow,
  freeWindowsFromBusy,
  DEFAULT_MEETING_MINUTES,
} from "@/lib/work-os/availability";
import {
  planWorkCommand,
  extractExplicitTime,
  type PlannedAction,
} from "@/lib/work-os/command-planner";
import {
  formatProposedTime,
  interpretTimezoneLabel,
  displayForIana,
} from "@/lib/work-os/timezone";
import { getCalendarCreateGateCopy } from "@/lib/work-os/calendar-gate-copy";
import {
  extractionSourceLabel,
  type PythonRuntimeStatus,
} from "@/lib/work-os/extraction-source";
import {
  WorkArtifactCard,
  type WorkArtifact,
} from "@/components/otzar/WorkArtifactCard";
import { useDesktopVoiceCapture } from "@/hooks/useDesktopVoiceCapture";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth";
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
  clampDockBottom,
  clampOrbPoint,
  DEFAULT_ORB_SIZE,
  isDragThresholdExceeded,
  ORB_EDGE_MARGIN,
  ORB_POSITION_STORAGE_KEY,
  orbPositionToStyle,
  parseStoredOrbPosition,
  serializeOrbPosition,
  snapOrbPosition,
  type OrbPosition,
  type OrbSize,
} from "@/lib/ambient/orb-position";
import { describeAmbientVoiceMode } from "@/lib/voice/ambient-voice-capture";

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

// The presenceRing ambient state palette moved to
// src/lib/ambient/presence-ring.ts (shared lib logic, fast-refresh-safe).

// [OTZAR-LIVE-6] The living bloom drifts only when Otzar is actively WORKING
// (listening / thinking / routing / drafting) — Siri-like, calm. Idle is nearly
// still; attention/critical hold steady so the glow itself carries the signal.
function bloomShouldLive(intensity: PresenceIntensity): boolean {
  return intensity === "working";
}

// Small status-dot color per intensity for the work-node chips.
function intensityDot(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "bg-amber-400";
    case "critical":
      return "bg-rose-400";
    case "working":
      return "bg-sky-400";
    case "ambient":
    default:
      return "bg-slate-300";
  }
}

// Glass styling for the ambient memory chip, scaled by intensity: quiet when
// Otzar is passively holding a draft (working), forward when it NEEDS the
// human's answer (attention), contained when something failed (critical).
function chipIntensityClass(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "bg-white/80 text-slate-900 ring-1 ring-black/[0.06] shadow-sm";
    case "critical":
      return "bg-rose-50/80 text-rose-900 ring-1 ring-rose-200/70";
    case "working":
      return "bg-white/55 text-slate-700";
    case "ambient":
    default:
      return "bg-white/40 text-slate-600";
  }
}

// [OTZAR-LIVE-6] The visible ambient "memory" chip — a calm, plain-language
// reflection of what Otzar is currently holding in EPHEMERAL working memory (the
// pending clarification it asked for, or a draft awaiting confirm). Real state
// only; returns null when nothing is pending so the chip disappears on
// resolve/cancel/expire. Never fabricated.
function memoryChipLabel(
  clar: PendingClarification | null,
  artifact: WorkArtifact | null,
): string | null {
  if (clar !== null) {
    switch (clar.awaiting) {
      case "recipient":
        // Name the teammates already gathered (partial multi-recipient hold),
        // else the generic prompt.
        return clar.recipients.length > 0
          ? `Waiting for ${formatRecipientList(clar.recipients)}`
          : "Waiting for recipient";
      case "confirm":
        return clar.recipients.length > 0
          ? `Ready to send to ${formatRecipientList(clar.recipients)}`
          : "Ready to send";
      case "context":
        return "Need context";
      case "owner":
        return "Need owner";
      case "which_item":
        return "Which item?";
      case "approver":
        return "Need approver";
      case "due":
        return "Need due date";
      default:
        return "Holding this";
    }
  }
  if (artifact !== null && artifact.proposed !== true) {
    if (artifact.externalChannel === true) return "Draft (local)";
    return artifact.targetLabel !== undefined
      ? `Ready to send to ${artifact.targetLabel}`
      : "Draft ready";
  }
  if (artifact !== null && artifact.proposed === true) {
    return "Pending approval";
  }
  return null;
}

// Chip intensity from REAL state: when Otzar is waiting on the human for a slot
// (or an approval is pending) it rises to "attention"; a draft it's merely
// holding stays "working".
function memoryChipIntensity(
  clar: PendingClarification | null,
  artifact: WorkArtifact | null,
): PresenceIntensity {
  if (clar !== null && clar.awaiting !== "confirm") return "attention";
  if (artifact !== null && artifact.proposed === true) return "attention";
  return "working";
}

export function AmbientOtzarBar(): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  // [OTZAR-LIVE-6] The ambient work surface (and any edge affordance) opens the
  // orb via a window event — invocation lives in the surface, the engine is here.
  useEffect(() => {
    const open = (): void => setExpanded(true);
    window.addEventListener("otzar:open", open);
    return () => window.removeEventListener("otzar:open", open);
  }, []);
  const [draft, setDraft] = useState("");
  // ── P0H — draggable orb position (per device, persisted) ──────────
  // null = the default bottom-right anchor (pre-P0H classes, unchanged).
  // A stored/dragged position renders as inline styles instead.
  const [orbPos, setOrbPos] = useState<OrbPosition | null>(null);
  // Live top-left point while a drag is in flight (free movement; the
  // release snaps to the nearest horizontal edge).
  const [orbDragPoint, setOrbDragPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const orbWrapperRef = useRef<HTMLDivElement | null>(null);
  const orbDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    dragging: boolean;
  } | null>(null);
  // A completed drag must NOT count as a click (click expands the dock).
  const orbSuppressClickRef = useRef(false);
  // Restore + validate the per-device position once on mount. Anything
  // off-screen for THIS viewport (or malformed) resets to the default
  // bottom-right and clears the stale entry.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(ORB_POSITION_STORAGE_KEY);
      const stored = parseStoredOrbPosition(raw, {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      if (stored !== null) {
        setOrbPos(stored);
      } else if (raw !== null) {
        window.localStorage.removeItem(ORB_POSITION_STORAGE_KEY);
      }
    } catch {
      /* storage unavailable (private mode etc.) → default position */
    }
  }, []);
  function measureOrb(): OrbSize {
    const el = orbWrapperRef.current;
    if (el !== null) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }
    }
    return DEFAULT_ORB_SIZE;
  }
  function handleOrbPointerDown(
    e: React.PointerEvent<HTMLButtonElement>,
  ): void {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const rect = orbWrapperRef.current?.getBoundingClientRect();
    orbDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: rect?.left ?? e.clientX,
      originTop: rect?.top ?? e.clientY,
      dragging: false,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture unsupported — drag still works via bubbling */
    }
  }
  function handleOrbPointerMove(
    e: React.PointerEvent<HTMLButtonElement>,
  ): void {
    const drag = orbDragRef.current;
    if (drag === null || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.dragging && !isDragThresholdExceeded(dx, dy)) return;
    drag.dragging = true;
    setOrbDragPoint(
      clampOrbPoint(
        drag.originLeft + dx,
        drag.originTop + dy,
        { width: window.innerWidth, height: window.innerHeight },
        measureOrb(),
      ),
    );
  }
  function handleOrbPointerUp(e: React.PointerEvent<HTMLButtonElement>): void {
    const drag = orbDragRef.current;
    if (drag === null || drag.pointerId !== e.pointerId) return;
    orbDragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!drag.dragging) return; // plain tap → onClick expands as before
    orbSuppressClickRef.current = true;
    const snapped = snapOrbPosition(
      drag.originLeft + (e.clientX - drag.startX),
      drag.originTop + (e.clientY - drag.startY),
      { width: window.innerWidth, height: window.innerHeight },
      measureOrb(),
    );
    setOrbDragPoint(null);
    setOrbPos(snapped);
    try {
      window.localStorage.setItem(
        ORB_POSITION_STORAGE_KEY,
        serializeOrbPosition(snapped),
      );
    } catch {
      /* storage unavailable → position holds for this page only */
    }
  }
  function handleOrbPointerCancel(): void {
    orbDragRef.current = null;
    setOrbDragPoint(null);
  }
  function handleOrbClick(): void {
    if (orbSuppressClickRef.current) {
      orbSuppressClickRef.current = false;
      return;
    }
    setExpanded(true);
  }
  function handleResetOrbPosition(): void {
    setOrbPos(null);
    setOrbDragPoint(null);
    try {
      window.localStorage.removeItem(ORB_POSITION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
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
  // Phase 1278 — the live Python intelligence runtime status, read once
  // from the runtime registry so conversation-to-work artifacts can show
  // an HONEST extraction source (deterministic vs. Python enrichment).
  const pythonRuntimeRef = useRef<PythonRuntimeStatus>(null);
  useEffect(() => {
    let cancelled = false;
    void api.system
      .runtimeCapabilities()
      .then((r) => {
        if (!cancelled && r.ok) {
          pythonRuntimeRef.current = r.data.runtimes.python_worker
            .status as PythonRuntimeStatus;
        }
      })
      .catch(() => {
        /* registry unreachable → stays null → "Deterministic extraction" */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();
  const recognitionRef = useRef(recognition);
  recognitionRef.current = recognition;
  const synthesisRef = useRef(synthesis);
  synthesisRef.current = synthesis;
  const micPerm = useMicrophonePermission();
  const intent = useOtzarVoiceIntent();
  // Phase 1264 — desktop voice input. The Tauri WKWebView has no Web
  // Speech API, so on desktop we record with MediaRecorder and
  // transcribe through Foundation (OpenAI Whisper). In a browser the
  // existing local Web Speech API path stays the labeled fallback.
  const desktopCap = useDesktopVoiceCapture();
  const desktopCapRef = useRef(desktopCap);
  desktopCapRef.current = desktopCap;
  // ── P0G — browser voice → server STT fallback ──────────────────────
  // The same MediaRecorder→server hook above (shell-agnostic) becomes
  // the browser fallback: once Web Speech fails with a "network" error
  // this session, this surface prefers server transcription directly
  // (no flapping between engines).
  const [serverSttPreferred, setServerSttPreferred] = useState(false);
  // The automatic mid-error switch fires at most ONCE per session on
  // this surface; afterwards serverSttPreferred routes the mic button
  // straight to server STT.
  const autoSttFallbackUsedRef = useRef(false);
  /** Capture selection on pointerdown — button click clears the selection
   *  before click handlers run, which previously made "Add current context"
   *  silently no-op (matrix D / transcript→actions broken). */
  const pendingSelectionRef = useRef("");
  // True right after a server transcript landed in the draft (browser
  // path) — drives the honest "Transcribed via server" note.
  const [serverTranscribed, setServerTranscribed] = useState(false);
  // Phase 1266 — the persistent, scrollable Otzar conversation thread.
  const conversation = useConversationStore((s) => s.entries);
  const clearConversation = useConversationStore((s) => s.clear);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  // True only while PREMIUM audio is actually playing (device speech
  // has its own reactive `synthesis.speaking`). Drives the orb's
  // "Speaking…" state honestly — never shown when silent.
  const [premiumSpeaking, setPremiumSpeaking] = useState(false);
  // Phase 1264 Voice Action Runtime display: what was heard, what was
  // decided, what happened, and which voice path spoke.
  const [actionHeard, setActionHeard] = useState<string | null>(null);
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [actionVoicePath, setActionVoicePath] = useState<string | null>(null);
  // Phase 3A — the transcript/meeting digest, shown compactly (counts) with the
  // full sections collapsed behind "View digest".
  const [transcriptDigest, setTranscriptDigest] =
    useState<TranscriptDigest | null>(null);
  // Phase 3B — transcript-derived proposed actions the user reviews
  // (save / send / dismiss). Nothing is "done" until a governed rail confirms.
  const [transcriptActions, setTranscriptActions] = useState<
    TranscriptProposedAction[]
  >([]);
  // Phase 3C — a derived, read-only tracking summary (blockers / follow-ups /
  // waiting / needs-attention) over the current proposed actions.
  const [trackingSummary, setTrackingSummary] =
    useState<WorkTrackingSummary | null>(null);
  // Phase 3E — in-session history of corrections + their honest persistence
  // status (local / saved as evidence / preference candidate).
  const [correctionHistory, setCorrectionHistory] = useState<
    WorkCorrectionHistoryItem[]
  >([]);
  // Phase 4B — cross-session readback of saved corrections from the typed
  // governed rail. Loaded on demand when the user opens "Saved corrections".
  const [savedCorrections, setSavedCorrections] = useState<
    TwinCorrectionSafeView[]
  >([]);
  const [savedCorrectionsStatus, setSavedCorrectionsStatus] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  async function loadSavedCorrections(): Promise<void> {
    if (savedCorrectionsStatus === "loading") return;
    setSavedCorrectionsStatus("loading");
    const res = await api.otzar.correctionMemory.list({ take: 20 });
    if (res.ok) {
      setSavedCorrections(res.data.corrections);
      setSavedCorrectionsStatus("loaded");
    } else {
      setSavedCorrectionsStatus("error");
    }
  }
  async function handleRevokeCorrection(
    item: TwinCorrectionSafeView,
  ): Promise<void> {
    const res = await api.otzar.correctionMemory.revoke(item.correction_id);
    if (res.ok) {
      setSavedCorrections((prev) =>
        prev.map((c) =>
          c.correction_id === item.correction_id
            ? { ...c, state: "REVOKED" }
            : c,
        ),
      );
    }
  }
  // Phase 1265 — Work OS status line (Draft only / Approval required /
  // Read-only / Runtime not available / Routed / Blocked).
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  // Phase 1267 — the visible, editable work artifact (draft message /
  // proposed action / meeting proposal) so Otzar is never "hearsay UI".
  const [pendingArtifact, setPendingArtifact] = useState<WorkArtifact | null>(
    null,
  );
  // Phase 1273 — a multi-intent WorkPlan renders as several linked,
  // independently-inspectable artifact cards (never one flattened card).
  const [planArtifacts, setPlanArtifacts] = useState<WorkArtifact[]>([]);
  // [OTZAR-LIVE-6] EPHEMERAL conversational working memory — the one focused
  // question Otzar just asked ("Who should receive this?") and the preserved
  // draft, so the NEXT turn ("David and Samiksha are the recipients") binds to
  // the awaited slot and RESUMES the action instead of being re-classified from
  // scratch (founder live failure). A ref is the synchronous logic
  // source-of-truth read inside the async handler (mirrors the pendingArtifact
  // closure discipline); the `pendingClarUi` state mirror drives the visible
  // ambient "memory" chip so the user can SEE that Otzar remembers what it asked.
  const pendingClarRef = useRef<PendingClarification | null>(null);
  const [pendingClarUi, setPendingClarUi] = useState<PendingClarification | null>(
    null,
  );
  function setPendingClar(c: PendingClarification | null): void {
    pendingClarRef.current = c;
    setPendingClarUi(c);
  }
  function clearPendingClar(): void {
    pendingClarRef.current = null;
    setPendingClarUi(null);
  }
  // Which STT engine produced the spoken command's transcript
  // (desktop path only): "openai-whisper" or "deepgram".
  const [transcriptionProvider, setTranscriptionProvider] = useState<
    string | null
  >(null);
  // When a desktop external-link open can't hand off automatically, we
  // surface a clickable link instead of silently failing.
  const [externalLinkPending, setExternalLinkPending] = useState<string | null>(
    null,
  );
  // Phase 1251 — publish ambient signals to the presence store so
  // the edge glow + ambient cards speak the same state language.
  const presenceState = usePresenceState();
  // [OTZAR-LIVE-6] The orb's frosted edge ring + status dot for the CURRENT
  // presence state — same color language as the edge glow.
  const ring = presenceRing(presenceState);
  // Calibrated presence: the whole surface scales by this, not per-component.
  const intensity = presenceIntensity(presenceState);
  // Living bloom drift only while actively working (calm, motion-safe at span).
  const bloomLiving = bloomShouldLive(intensity);
  // The visible "memory" chip — what Otzar is holding right now (real ephemeral
  // working-memory state; null when nothing is pending, gone once the
  // clarification TTL lapses). Its own intensity rises when Otzar needs an answer.
  const memoryClar =
    pendingClarUi !== null && !isClarificationExpired(pendingClarUi, Date.now())
      ? pendingClarUi
      : null;
  const memoryChipText = memoryChipLabel(memoryClar, pendingArtifact);
  const memoryChipTone = chipIntensityClass(
    memoryChipIntensity(memoryClar, pendingArtifact),
  );
  const setPresenceSignals = usePresenceStore((s) => s.setSignals);
  const markPresenceSuccess = usePresenceStore((s) => s.markSuccess);
  const markPresenceFailure = usePresenceStore((s) => s.markFailure);
  // Phase 2.9 — the explicitly-provided current-surface context ("use what I'm
  // looking at"). Visible while active, easy to clear; never auto-captured.
  const surfaceContext = useCurrentSurfaceContextStore((s) => s.context);
  const provideSurfaceContext = useCurrentSurfaceContextStore((s) => s.provide);
  const clearSurfaceContext = useCurrentSurfaceContextStore((s) => s.clear);
  // [OTZAR-LIVE-6] Real work-node model — built ONLY from current state the orb
  // already holds (active recipients, the draft, approvals, replies, context,
  // saved corrections). No node exists without its backing state; nothing renders
  // when nothing is in flight. Collapsed by default in the UI below.
  const approvalsCount = usePresenceStore((s) => s.approvalsCount);
  const unreadCount = usePresenceStore((s) => s.unreadCount);
  const workNodes = buildWorkNodes({
    recipients: memoryClar?.recipients ?? [],
    awaitingRecipient: memoryClar?.awaiting === "recipient",
    draft:
      pendingArtifact !== null
        ? {
            targetLabel: pendingArtifact.targetLabel ?? null,
            proposed: pendingArtifact.proposed === true,
            externalChannel: pendingArtifact.externalChannel === true,
          }
        : null,
    contextTitle:
      surfaceContext !== null && surfaceContext.active
        ? surfaceContext.title ?? surfaceContext.summary ?? "Current context"
        : null,
    approvalsCount,
    unreadCount,
    correctionsActive: savedCorrections.filter((c) => c.state !== "REVOKED").length,
  });
  function capturePendingSelection(): void {
    if (typeof window === "undefined") return;
    const live = window.getSelection()?.toString() ?? "";
    if (live.trim().length > 0) {
      pendingSelectionRef.current = live;
    }
  }

  function handleAddContext(): void {
    // Prefer live selection; fall back to pointerdown-captured text
    // (click on the button often collapses the selection first).
    const live =
      typeof window !== "undefined"
        ? (window.getSelection()?.toString() ?? "")
        : "";
    const text = (live.trim().length > 0 ? live : pendingSelectionRef.current).trim();
    pendingSelectionRef.current = "";
    if (text.length === 0) return; // nothing selected — never capture silently
    provideSurfaceContext({
      type: "selected_text",
      text,
      ...(typeof document !== "undefined" && document.title.length > 0
        ? { sourceLabel: document.title }
        : {}),
    });
  }
  useEffect(() => {
    setPresenceSignals({
      listening: recognition.listening || desktopCap.state === "recording",
      thinking: intent.processing || desktopCap.state === "transcribing",
      quiet,
      quietReason: autoQuietReason,
      voiceBlocked:
        micPerm.state === "denied" ||
        (!recognition.supported && !desktopCap.supported),
    });
  }, [
    recognition.listening,
    recognition.supported,
    desktopCap.state,
    desktopCap.supported,
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

  // Phase 1264 — assistant speech goes through the single
  // VoicePlaybackController: ONE active utterance, premium-first, the
  // device voice only as a labeled fallback AFTER premium fails, and a
  // newer prompt cancels the older one (no double-speak, no robot
  // voice "second"). premiumSpeaking drives the honest orb state.
  function speakAssistant(
    text: string,
    opts: { source: "auto" | "replay" | "manual"; force: boolean },
  ): void {
    void speakWithOtzarVoice(
      text,
      (t) => synthesis.speak(t, opts),
      {
        muted: synthesisRef.current.muted,
        onPremiumStart: () => setPremiumSpeaking(true),
        onPremiumEnd: () => setPremiumSpeaking(false),
      },
    ).then(() => {
      setActionVoicePath(getLastVoicePath());
    });
  }

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
    speakAssistant(sayable, { source: "auto", force: false });
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

  // Phase 1264 — desktop shells use the MediaRecorder→Whisper path;
  // browser shells keep the local Web Speech API path.
  // P0G: the gate is now the pure decideSttPath matrix. Tauri behavior
  // is IDENTICAL ("desktop_capture"); browsers additionally get
  // "server_stt" as fallback/primary when Web Speech fails or is absent.
  const sttPath = decideSttPath({
    shell: detectShellMode(),
    webSpeechAvailable: recognition.supported,
    recorderAvailable: desktopCap.supported,
    serverSttPreferred,
  });
  const useDesktopCapture = sttPath === "desktop_capture";
  const useServerStt = sttPath === "server_stt";
  // Both routes drive the SAME capture hook — one MediaRecorder impl.
  const useRecorderCapture = useDesktopCapture || useServerStt;

  // P0G — automatic ONE-TIME switch: a Web Speech "network" failure
  // (the browser's own speech service unreachable) flips this surface
  // to server transcription and starts capture immediately, so the
  // employee can just speak again. Subsequent turns route to server
  // STT directly via serverSttPreferred — never flapping back.
  useEffect(() => {
    if (
      !shouldAutoFallbackToServerStt({
        shell: detectShellMode(),
        webSpeechError: recognition.error,
        recorderAvailable: desktopCap.supported,
        alreadyFellBackThisSession: autoSttFallbackUsedRef.current,
      })
    ) {
      return;
    }
    autoSttFallbackUsedRef.current = true;
    setServerSttPreferred(true);
    // Clear the web-speech error so the surface shows the live server
    // capture state instead of a stale failure line.
    recognitionRef.current.reset();
    if (!quiet) void desktopCapRef.current.start();
  }, [recognition.error, desktopCap.supported, quiet]);

  // The "Transcribed via server" note lives only while the transcript
  // sits in the draft awaiting review.
  useEffect(() => {
    if (draft.trim().length === 0) setServerTranscribed(false);
  }, [draft]);

  async function handleMicToggle(): Promise<void> {
    if (quiet) return;
    if (useRecorderCapture) {
      // Desktop (unchanged) + browser server-STT: record → stop →
      // transcribe. Desktop auto-submits the transcript; the browser
      // fallback fills the draft for review (see the transcript effect).
      if (
        desktopCap.state === "recording" ||
        desktopCap.state === "transcribing"
      ) {
        desktopCap.stop();
        return;
      }
      setServerTranscribed(false);
      await desktopCap.start();
      return;
    }
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
    void speakWithOtzarVoice(TEST_VOICE_PHRASE, (t) =>
      synthesis.speak(t, { source: "test", force: true }),
    );
  }

  // Speak a confirmation through the single controller (premium-first,
  // device fallback labeled), and record which path spoke.
  function speakConfirmation(text: string): void {
    if (text.length === 0) return;
    void speakWithOtzarVoice(
      text,
      (t) => synthesis.speak(t, { source: "manual", force: true }),
      {
        muted: synthesisRef.current.muted,
        onPremiumStart: () => setPremiumSpeaking(true),
        onPremiumEnd: () => setPremiumSpeaking(false),
      },
    ).then(() => setActionVoicePath(getLastVoicePath()));
  }

  // Phase 1265 — humanize a provider's connection status for the spoken
  // summary. NEVER says "Verified" unless the live status is VERIFIED
  // (no fake green).
  function humanizeOAuthStatus(status: string): string {
    switch (status) {
      case "VERIFIED":
        return "Verified";
      case "CONNECTED_UNVERIFIED":
        return "connected (verify to confirm)";
      case "READY_FOR_CONSENT":
        return "ready to connect";
      case "APP_CREDENTIALS_MISSING":
        return "needs app credentials (parked)";
      case "ERROR_NEEDS_RECONNECT":
        return "needs reconnect";
      case "REVOKED":
        return "revoked";
      default:
        return status.toLowerCase().replace(/_/g, " ");
    }
  }

  // Phase 1265 — build a REAL connector status summary. Prefers the
  // OAuth status endpoint (admin); falls back to the adapter registry
  // (presence only) for non-admins; honest message if neither loads.
  async function buildConnectorSummary(): Promise<string> {
    const oauth = await api.otzar.oauthStatus();
    if (oauth.ok && oauth.data.providers.length > 0) {
      const parts = oauth.data.providers.map(
        (p) => `${p.display_name}: ${humanizeOAuthStatus(p.status)}`,
      );
      return parts.join(". ") + ".";
    }
    const adapters = await api.otzar.connectorAdapters();
    if (adapters.ok && adapters.data.adapters.length > 0) {
      const parts = adapters.data.adapters
        .slice(0, 8)
        .map((a) => {
          const label =
            a.status === "CONFIGURED"
              ? "configured"
              : a.status === "BLOCKED_BY_CREDENTIAL"
                ? "needs credentials"
                : a.status === "BLOCKED_BY_APP_REVIEW"
                  ? "app review pending"
                  : a.status.toLowerCase().replace(/_/g, " ");
          return `${a.display_name}: ${label}`;
        });
      return (
        "Connector presence (verify for live state). " + parts.join(". ") + "."
      );
    }
    return "I couldn't load connector status right now. Open Workspace connections to check.";
  }

  // Phase 1265 — Work OS status badge from a classified action.
  function workStatusFor(a: VoiceAction): string {
    if (a.kind === "DRAFT_MESSAGE") return "Draft only · Approval required";
    if (a.kind === "SEND_REQUIRES_APPROVAL") return "Approval required";
    if (a.kind === "SCHEDULE_MEETING") return "Draft · Approval required";
    if (a.kind === "ASK_TWIN") return "Routed to Collaboration";
    if (a.kind === "READ_ONLY_SUMMARY" || a.kind === "CONNECTOR_STATUS_SUMMARY")
      return "Read-only";
    if (a.kind === "APPROVALS_REVIEW") return "Read-only";
    if (a.kind === "ZOOM_RECORDINGS") return "Read-only";
    if (a.kind === "WORKFLOW_START" || a.kind === "MEETING_NOTES_TO_ACTIONS")
      return "Runtime not available yet";
    if (a.kind === "UNSUPPORTED") return "Blocked";
    return "Done";
  }

  // Phase 1265 — generic executor for navigate-and-announce work
  // actions (draft/send/ask/schedule/zoom/workflow/notes/read-only).
  // Speaks the honest result, records audit, sets the status badge, and
  // navigates if a real route is attached. NEVER performs an external
  // write.
  function runWorkAction(
    action: VoiceAction,
    at: string,
    result: "success" | "blocked" | "needs_confirmation",
  ): void {
    setActionResult(action.spoken);
    setActionStatus(workStatusFor(action));
    speakConfirmation(action.spoken);
    recordVoiceAction({
      at,
      transcript: action.heard,
      actionType: action.kind,
      target: action.route ?? action.targetEntity ?? null,
      result,
    });
    appendConversationEntry({
      role: "action",
      text: action.spoken,
      at,
      kind: action.kind,
      status: workStatusFor(action),
    });
    if (action.route !== undefined) navigate(action.route);
  }

  // Phase 1284 Wave 2 — REAL draft/send bridge. Resolve the recipient and
  // create a governed SEND_INTERNAL_NOTIFICATION ProposedAction (which
  // runs the ADR-0057 policy evaluator → AUTO_APPROVE/standing-authority
  // or approval-required). NEVER sends externally; never fabricates a
  // recipient id. Unresolved → draft + target picker.
  // Phase 1269 — a "Draft …" command creates a LOCAL draft artifact
  // ONLY. It does NOT create a backend ProposedAction (that conflated
  // DRAFT with PROPOSE and made Open look like auto-confirm). The user
  // reviews/edits the visible draft, then CONFIRM proposes it. Open
  // never confirms/sends. External (Slack/email) drafts are local and
  // never auto-routed/auto-submitted.
  const COMMS_ROUTE = "/app/comms";
  const ACTION_CENTER_ROUTE = "/app/action-center";

  async function executeMessageAction(
    action: VoiceAction,
    at: string,
  ): Promise<void> {
    const isSend = action.kind === "SEND_REQUIRES_APPROVAL";
    const channel = action.connector ?? "internal";
    const external = channel === "slack" || channel === "email";
    const recipientName = action.targetEntity;
    const body = action.draftPayload ?? action.heard;

    // Resolve the recipient for a label + later Confirm — but DO NOT
    // create any backend object yet.
    let recipientEntityId: string | undefined;
    let label = recipientName;
    let resolveNote: string | undefined;
    if (recipientName !== undefined) {
      const resolved = await resolveTarget(recipientName);
      if (
        (resolved.kind === "RESOLVED_HUMAN" ||
          resolved.kind === "RESOLVED_AI_AGENT") &&
        resolved.entityId !== undefined
      ) {
        recipientEntityId = resolved.entityId;
        label = resolved.displayName ?? recipientName;
      } else if (resolved.kind === "AMBIGUOUS") {
        resolveNote = `More than one teammate matches "${recipientName}". Open Work Comms to pick the right one.`;
      } else if (resolved.kind === "NOT_FOUND") {
        resolveNote = `"${recipientName}" isn't in your organization. Open Work Comms to pick a teammate.`;
      } else {
        resolveNote =
          "Resolving teammates from voice needs the org roster (not available to you here). Open Work Comms to pick the recipient.";
      }
    } else {
      resolveNote = "Tell me who it's for, then Confirm to propose.";
    }

    const status = external
      ? "Local draft — external send not wired"
      : recipientEntityId !== undefined
        ? "Draft — Confirm to propose"
        : "Local draft — pick a recipient";
    const runtimeNote = external
      ? "External send (Slack/email) isn't wired yet. This stays a local draft until that bridge lands — it is never auto-sent."
      : resolveNote;

    setPendingArtifact({
      kind: action.kind,
      title: `${isSend ? "Send" : "Draft"} message${label !== undefined ? ` → ${label}` : ""}`,
      ...(label !== undefined ? { targetLabel: label } : {}),
      channel,
      body,
      status,
      ...(recipientEntityId !== undefined ? { recipientEntityId } : {}),
      externalChannel: external,
      sourceCommand: action.heard,
      // Open routes to the Work Comms DRAFT surface — it never confirms
      // or proposes. Once proposed, Confirm rewrites the route to the
      // focused Action Center entry.
      route: COMMS_ROUTE,
      ...(runtimeNote !== undefined ? { runtimeNote } : {}),
    });

    const msg = external
      ? "Draft created. External send isn't wired — nothing is sent. Edit, then Confirm to keep it for review."
      : recipientEntityId !== undefined
        ? `Draft to ${label} created. Review it, then Confirm to propose — nothing is sent yet.`
        : "Draft created. Pick the recipient, then Confirm to propose — nothing is sent.";
    setActionResult(msg);
    setActionStatus(status);
    appendConversationEntry({ role: "action", text: msg, at, kind: action.kind, status });
    speakConfirmation(msg);
    recordVoiceAction({
      at,
      transcript: action.heard,
      actionType: action.kind,
      target: action.targetEntity ?? null,
      result: "needs_confirmation",
    });
    // [OTZAR-LIVE-6] When the draft has no recipient yet, remember that we're
    // waiting for one and preserve the composed body — so the NEXT turn ("David
    // and Samiksha are the recipients") resumes and sends, instead of being
    // re-classified into an empty "what would you like me to do?" dead end.
    if (!external && recipientEntityId === undefined) {
      setPendingClar({
        id: `clar-${at}`,
        kind: "outbound_message",
        awaiting: "recipient",
        originalText: action.heard,
        draftMessage: composeRequestBody(action.heard),
        recipients: [],
        createdAt: Date.now(),
      });
    }
    // NOTE: deliberately NO navigate() — the draft stays in view; the
    // user opens it explicitly.
  }

  // Phase 1286 — REAL ambient governed teammate routing for ASK_TWIN.
  // "Ask David to review this …" resolves David in-org and creates a
  // governed collaboration request. Prefers the Twin-mediated EMPLOYEE_TWIN
  // target so the request surfaces to BOTH David and David's Twin (inbound
  // is an OR over target_entity_id + target_twin_entity_id); falls back to
  // EMPLOYEE when the teammate's Twin can't be resolved. The request is sent
  // BY the caller's own Twin (requester_twin_entity_id), and the backend
  // enforces same-org / RBAC/ABAC/TAR / org-collaboration policy (approval
  // gating) / audit. NEVER answers AS the teammate or their Twin; never a
  // fake send — unresolved/blocked yields an honest message.
  // Governed outbound message on the caller's behalf. The backend resolves the
  // recipient org-scoped under the caller's OWN authority, delivers a real
  // Otzar-inbox notification, and records a durable Work Ledger proof (RULE 0
  // cross-org DENY + recipient-active + audit). Never external, never
  // impersonates the teammate or their Twin. `message` is the COMPOSED,
  // recipient-facing body — NEVER the raw command verbatim.
  async function executeOutboundMessage(
    recipient: string,
    message: string,
    heard: string,
    kind: VoiceAction["kind"],
    at: string,
  ): Promise<void> {
    function report(
      msg: string,
      result: "success" | "blocked",
      status: string,
      target: string | null,
    ): void {
      setActionResult(msg);
      setActionStatus(status);
      speakConfirmation(msg);
      appendConversationEntry({ role: "action", text: msg, at, kind, status });
      recordVoiceAction({ at, transcript: heard, actionType: kind, target, result });
    }

    const sent = await api.workOs.internalMessage(recipient, message);

    if (sent.ok && sent.data.status === "DELIVERED") {
      const delivered = sent.data.recipient_display_name ?? "";
      const rawLabel = delivered.trim().length > 0 ? delivered : recipient;
      const label = formatPersonName(rawLabel) || rawLabel;
      // Real work moved: Otzar → teammate. A brief directional flow trace.
      emitFlow("otzar_to_person", `Routed to ${label}`, "working");
      report(
        `I sent ${label} a message on your behalf and created the governed record. I'll track the response here.`,
        "success",
        "Sent · governed",
        sent.data.recipient_entity_id ?? recipient,
      );
      return;
    }

    // Honest failure states — never a silent dead end, never a fabricated send.
    const httpStatus = sent.ok ? sent.data.status : sent.status;
    const why =
      httpStatus === 422 || httpStatus === "NEEDS_RESOLUTION"
        ? `I couldn't identify "${recipient}" in your organization. Open Collaboration to pick the teammate.`
        : httpStatus === 409 || httpStatus === "GATED"
          ? `That message needs approval before it reaches ${recipient}. Open Collaboration to route it.`
          : `I couldn't send that to ${recipient}. Open Collaboration to route it.`;
    report(why, "blocked", "Blocked", recipient);
    navigate("/app/collaboration");
  }

  // [OTZAR-LIVE-6] Resume a pending recipient clarification with the gathered
  // name(s) and deliver the PRESERVED draft through the same governed rail —
  // recipient-count-agnostic (1 or N through one path). Resolves EVERY name
  // first; if any is unknown/ambiguous, asks ONE focused question about that one
  // and holds the resolved rest in working memory (never a silent drop, never a
  // partial fan-out before the set is known). Reports the REAL per-recipient
  // outcome — never a fabricated "sent to both".
  async function resumeOutboundToRecipients(
    clar: PendingClarification,
    newNames: string[],
    heard: string,
    at: string,
  ): Promise<void> {
    appendConversationEntry({ role: "user", text: heard, at });
    const allNames = Array.from(
      new Set(
        [...clar.recipients, ...newNames]
          .map((n) => n.trim())
          .filter((n) => n.length > 0),
      ),
    );
    const resolved: Array<{ name: string; display: string }> = [];
    const problems: Array<{ name: string; ambiguous: boolean }> = [];
    for (const name of allNames) {
      const r = await resolveTargetGoverned(name);
      if (
        (r.kind === "RESOLVED_HUMAN" || r.kind === "RESOLVED_AI_AGENT") &&
        r.entityId !== undefined
      ) {
        resolved.push({ name, display: r.displayName ?? name });
      } else {
        problems.push({ name, ambiguous: r.kind === "AMBIGUOUS" });
      }
    }

    if (problems.length > 0) {
      const p = problems[0]!;
      const msg = p.ambiguous
        ? `More than one teammate matches "${p.name}". Who do you mean?`
        : `I couldn't find "${p.name}" in your organization. Who do you mean?`;
      // Hold what resolved; keep awaiting the recipient so the next turn merges.
      setPendingClar({
        ...clar,
        recipients: resolved.map((r) => r.display),
        createdAt: Date.now(),
      });
      setActionResult(msg);
      setActionStatus("Waiting for the recipient");
      appendConversationEntry({ role: "otzar", text: msg, at });
      speakConfirmation(msg);
      return;
    }

    clearPendingClar();
    const delivered: string[] = [];
    const failed: string[] = [];
    for (const r of resolved) {
      const sent = await api.workOs.internalMessage(r.display, clar.draftMessage);
      // Name each recipient by the canonical resolved display (deterministic
      // per teammate) for the calm combined outcome.
      if (sent.ok && sent.data.status === "DELIVERED") {
        delivered.push(r.display);
      } else {
        failed.push(r.display);
      }
    }

    let msg: string;
    let status: string;
    let result: "success" | "blocked";
    if (delivered.length > 0 && failed.length === 0) {
      msg = `Sent the request to ${formatRecipientList(delivered)} on your behalf. I'll track ${delivered.length > 1 ? "their replies" : "the reply"} here.`;
      status = "Sent · governed";
      result = "success";
    } else if (delivered.length > 0) {
      msg = `Sent to ${formatRecipientList(delivered)}. I couldn't reach ${formatRecipientList(failed)} — open Collaboration to route ${failed.length > 1 ? "those" : "that"}.`;
      status = "Partly sent";
      result = "success";
    } else {
      msg = `I couldn't reach ${formatRecipientList(failed)}. Open Collaboration to route ${failed.length > 1 ? "them" : "it"}.`;
      status = "Blocked";
      result = "blocked";
    }
    // Real work moved: Otzar → teammate(s). One brief directional trace.
    if (delivered.length > 0) {
      emitFlow("otzar_to_person", `Routed to ${formatRecipientList(delivered)}`, "working");
    }
    setActionResult(msg);
    setActionStatus(status);
    appendConversationEntry({
      role: "action",
      text: msg,
      at,
      kind: "SEND_REQUIRES_APPROVAL",
      status,
    });
    speakConfirmation(msg);
    recordVoiceAction({
      at,
      transcript: heard,
      actionType: "SEND_REQUIRES_APPROVAL",
      target: delivered.join(", ") || null,
      result,
    });
    if (delivered.length === 0) navigate("/app/collaboration");
  }

  // ASK_TWIN execution: compose a recipient-facing message from the command
  // (never verbatim) via the general ambient-outbound interpreter, then send it
  // through the governed rail above.
  async function executeAskTwinAction(
    action: VoiceAction,
    at: string,
  ): Promise<void> {
    const interp = interpretAmbientOutboundWork(action.heard);
    const recipient =
      interp !== null && interp.kind === "INTERNAL_MESSAGE" && interp.recipient.length > 0
        ? interp.recipient
        : (action.targetEntity ?? "").trim();

    if (recipient.length === 0) {
      const msg =
        interp !== null && interp.kind === "CLARIFY"
          ? interp.recipientFacingMessage
          : 'Tell me who this is for — e.g. "ask a teammate to review this note" — and I\'ll route a governed message.';
      setActionResult(msg);
      setActionStatus("Needs a teammate");
      speakConfirmation(msg);
      appendConversationEntry({ role: "action", text: msg, at, kind: action.kind, status: "Needs a teammate" });
      recordVoiceAction({ at, transcript: action.heard, actionType: action.kind, target: null, result: "blocked" });
      return;
    }

    const message =
      interp !== null && interp.kind === "INTERNAL_MESSAGE" && interp.recipientFacingMessage.length > 0
        ? interp.recipientFacingMessage
        : action.heard;
    await executeOutboundMessage(recipient, message, action.heard, action.kind, at);
  }

  // ── Phase 1+2: self-work rail + Twin-mediated collaboration ─────────────
  // Current user's own identity (human entity + own Twin entity), fetched once
  // and cached. Used to detect a self-directed message ("Message David" while
  // signed in as David) and route it to the self rail instead of a message to
  // oneself. context-health.viewer.user_id is the caller's human entity_id and
  // twin.twin_id is the caller's OWN Twin entity_id (both confirmed server-side).
  const selfIdentityRef = useRef<{ human: string | null; twin: string | null } | null>(
    null,
  );
  async function getSelfIdentity(): Promise<{ human: string | null; twin: string | null }> {
    if (selfIdentityRef.current !== null) return selfIdentityRef.current;
    const health = await api.otzar.contextHealth();
    const id = health.ok
      ? {
          human: health.data.identity.viewer.user_id,
          twin: health.data.identity.twin.twin_id,
        }
      : { human: null, twin: null };
    selfIdentityRef.current = id;
    return id;
  }

  // Phase 2.5 — route ONE ambient outcome through the visibility policy:
  // proof/audit is recorded silently, a low-risk success is a quiet
  // confirmation, and approval / blocked / ambiguous / failure interrupt. The
  // voice action is always recorded (the silent proof); the panel + spoken
  // line follow the decision (quiet mode suppresses a spoken low-risk success,
  // never an interrupt).
  function surfaceOutcome(args: {
    eventKind: AmbientEventKind;
    copy: string;
    status: string;
    at: string;
    heard: string;
    result: "success" | "blocked";
    target: string | null;
  }): void {
    const decision = decideAmbientVisibility({
      kind: args.eventKind,
      userFacingCopy: args.copy,
    });
    // Phase 2.8 — drive the ambient presence layer (edge glow). A confirmation
    // flashes the calm SUCCESS state (auto-fades); a real block/failure flashes
    // FAILURE. Interrupts that need a focused answer (approval / ambiguity /
    // missing context) stay in the panel and do NOT mis-tint the glow red.
    if (
      args.eventKind === "BLOCKED_DENIED" ||
      args.eventKind === "ACTION_FAILED"
    ) {
      markPresenceFailure();
    } else if (decision.visibility === "confirmation") {
      markPresenceSuccess();
    }
    if (decision.shouldShowInline) {
      setActionResult(args.copy);
      setActionStatus(args.status);
      appendConversationEntry({
        role: "action",
        text: args.copy,
        at: args.at,
        kind: "ASK_TWIN",
        status: args.status,
      });
    }
    if (decision.shouldSpeak) speakConfirmation(args.copy);
    // The record/proof is always written, regardless of visibility level.
    recordVoiceAction({
      at: args.at,
      transcript: args.heard,
      actionType: "ASK_TWIN",
      target: args.target,
      result: args.result,
    });
  }

  // SELF rail — a note / task / reminder / memory the user records for
  // themselves. Persisted as a durable Work Ledger entry (TASK for tasks and
  // reminders, COMMITMENT for notes and memory). Confirmation is human and
  // inline — never a page hand-off, never a "proposal to confirm".
  async function executeSelfWork(
    kind: AmbientOutboundKind,
    message: string,
    heard: string,
    at: string,
  ): Promise<void> {
    // Phase 2.6 — recover the referenced object so this isn't a contextless
    // artifact. If the text references something ("what I received") we resolve
    // it from available context; if it can't be resolved, ask ONE focused
    // question instead of saving an empty task.
    const ctx = await resolveWorkContext(message, getActiveSurfaceContext());
    if (ctx !== null && ctx.needsClarification) {
      surfaceOutcome({
        eventKind: "MISSING_CONTEXT",
        copy:
          ctx.clarificationQuestion ??
          "I can save that, but I'm missing what it refers to — can you say which one?",
        status: "Which one?",
        at,
        heard,
        result: "blocked",
        target: null,
      });
      return;
    }

    const ledgerType =
      kind === "SELF_TASK" || kind === "SELF_REMINDER" ? "TASK" : "COMMITMENT";
    const title = kind === "SELF_REMINDER" ? `Reminder: ${message}` : message;
    const linkedNotification =
      ctx !== null && ctx.resolved && ctx.contextType === "notification"
        ? ctx.contextId
        : undefined;
    const res = await api.workOs.createLedgerEntry({
      ledger_type: ledgerType,
      title,
      source_type: "VOICE_COMMAND",
      source_command: heard,
      status: "PROPOSED",
      extraction_source: "TYPESCRIPT_DETERMINISTIC",
      evidence: [],
      // Link the resolved context via the route's first-class typed fields so
      // the work item carries its source (the message it refers to), not a bare
      // title. notification_id is a validated field; details holds the rest.
      ...(linkedNotification !== undefined
        ? { notification_id: linkedNotification }
        : {}),
      ...(ctx !== null && ctx.resolved
        ? {
            details: {
              context_type: ctx.contextType,
              ...(ctx.contextId !== undefined
                ? { context_ref: ctx.contextId }
                : {}),
              context_label: contextLabel(ctx),
            },
          }
        : {}),
    });
    const ok = res.ok;
    const linked =
      ctx !== null && ctx.resolved ? ` linked to ${contextLabel(ctx)}` : "";
    const confirm = !ok
      ? "I couldn't save that just now — want me to try again?"
      : kind === "SELF_REMINDER"
        ? `I saved that reminder for you${linked}.`
        : kind === "SELF_TASK"
          ? `I added that as a task for you${linked}.`
          : kind === "TWIN_MEMORY"
            ? "I'll remember that for you."
            : `I saved that as a note to yourself${linked}.`;
    surfaceOutcome({
      eventKind: ok ? "SELF_WORK_SAVED" : "ACTION_FAILED",
      copy: confirm,
      status: ok ? "Saved" : "Couldn't save",
      at,
      heard,
      result: ok ? "success" : "blocked",
      target: null,
    });
  }

  // If a teammate name resolves to the current user (or their own Twin), the
  // message is really self-directed — reroute to the self rail with the
  // FIRST-PERSON body (never "Hey <Name>"). Uses the read-scoped backend
  // resolver, so this works for standard employees, not only admins. Returns
  // true only when it handled the input as self-work.
  async function maybeRerouteSelfMessage(
    recipient: string,
    selfBody: string,
    heard: string,
    at: string,
  ): Promise<boolean> {
    const resolved = await resolveTargetGoverned(recipient);
    if (resolved.entityId === undefined) return false;
    const me = await getSelfIdentity();
    const isSelf =
      (me.human !== null && resolved.entityId === me.human) ||
      (me.twin !== null && resolved.entityId === me.twin);
    if (!isSelf) return false;
    await executeSelfWork("SELF_TASK", selfBody, heard, at);
    return true;
  }

  // ONE focused clarification for an ambiguous recipient — name at most two
  // candidates (never a long picklist).
  function focusedAmbiguityCopy(
    recipient: string,
    candidates?: Array<{ entityId: string; displayName: string }>,
  ): string {
    const names = (candidates ?? [])
      .map((c) => c.displayName)
      .filter((n) => n.length > 0);
    if (names.length === 2) {
      return `I found more than one ${recipient} — do you mean ${names[0]} or ${names[1]}?`;
    }
    if (names.length > 2) {
      return `I found a few people named ${recipient} — which one do you mean?`;
    }
    return `Which ${recipient} do you mean?`;
  }

  // COLLABORATION rail — a governed work / review / approval request sent BY the
  // caller's own Twin to a teammate. The target is the teammate's HUMAN (the org
  // member); the request is mediated by the caller's Twin (requester twin). The
  // backend enforces same-org / RBAC / ABAC / TAR / org-collaboration policy /
  // audit. Never targets the teammate's Twin directly (not an org member →
  // cross-org deny). Copy stays human and inline — no backend terms, no codes.
  async function executeCollaborationRequest(
    recipient: string,
    message: string,
    selfBody: string,
    requestType: CollaborationRequestType,
    heard: string,
    at: string,
  ): Promise<void> {
    const resolved = await resolveTargetGoverned(recipient);

    // Self-directed → the self rail (first-person), never a request to oneself.
    if (resolved.entityId !== undefined) {
      const meSelf = await getSelfIdentity();
      if (
        (meSelf.human !== null && resolved.entityId === meSelf.human) ||
        (meSelf.twin !== null && resolved.entityId === meSelf.twin)
      ) {
        await executeSelfWork("SELF_TASK", selfBody, heard, at);
        return;
      }
    }

    if (resolved.kind === "AMBIGUOUS") {
      surfaceOutcome({
        eventKind: "AMBIGUOUS_TARGET",
        copy: focusedAmbiguityCopy(recipient, resolved.candidates),
        status: "Which one?",
        at,
        heard,
        result: "blocked",
        target: null,
      });
      return;
    }
    const targetEntityId = resolved.entityId;
    if (
      (resolved.kind !== "RESOLVED_HUMAN" && resolved.kind !== "RESOLVED_AI_AGENT") ||
      targetEntityId === undefined
    ) {
      surfaceOutcome({
        eventKind: "NEEDS_CLARIFICATION",
        copy: `I couldn't find ${recipient} on your team — who do you mean?`,
        status: "Who is this for?",
        at,
        heard,
        result: "blocked",
        target: null,
      });
      return;
    }

    // Phase 2.6 — recover the referenced object ("this client note", "the
    // transcript") so the request carries its context. If it references
    // something we can't resolve, ask ONE focused question rather than send a
    // contextless request.
    const ctx = await resolveWorkContext(message, getActiveSurfaceContext());
    if (ctx !== null && ctx.needsClarification) {
      surfaceOutcome({
        eventKind: "MISSING_CONTEXT",
        copy:
          ctx.clarificationQuestion ??
          "I can send that, but I'm missing what it refers to — which one do you mean?",
        status: "Which one?",
        at,
        heard,
        result: "blocked",
        target: null,
      });
      return;
    }
    const safeSummary =
      ctx !== null && ctx.resolved
        ? `${message} (re: ${contextLabel(ctx)})`
        : message;

    const me = await getSelfIdentity();
    const res = await api.otzar.collaboration.create({
      target_type: "EMPLOYEE",
      target_entity_id: targetEntityId,
      request_type: requestType,
      safe_summary: safeSummary,
      requested_by_ai: true,
      ...(me.twin !== null ? { requester_twin_entity_id: me.twin } : {}),
    });

    const who = resolved.displayName ?? recipient;
    if (res.ok) {
      // Real work moved: an approval/review routed to a person — attention flow.
      emitFlow(
        requestType === "APPROVAL_REQUEST" ? "blocker_to_approval" : "otzar_to_person",
        requestType === "APPROVAL_REQUEST"
          ? `Approval routed to ${who}`
          : `Routed to ${who}`,
        requestType === "APPROVAL_REQUEST" ? "attention" : "working",
      );
      const kindword =
        requestType === "REVIEW_REQUEST"
          ? "review request"
          : requestType === "APPROVAL_REQUEST"
            ? "approval request"
            : "follow-up";
      const forCtx =
        ctx !== null && ctx.resolved ? ` for ${contextLabel(ctx)}` : "";
      surfaceOutcome({
        eventKind: "COLLABORATION_SENT",
        copy: `I sent ${who} a ${kindword}${forCtx} on your behalf and I'll track their response here.`,
        status: "Sent",
        at,
        heard,
        result: "success",
        target: targetEntityId,
      });
      return;
    }

    // Honest, human outcome — no backend codes, no page hand-off. A 409 here is
    // the GOVERNED path working (standard twins are approval-required): the
    // request is queued for approval, not failed.
    const eventKind: AmbientEventKind =
      res.status === 409
        ? "APPROVAL_NEEDED"
        : res.status === 403
          ? "BLOCKED_DENIED"
          : "ACTION_FAILED";
    const why =
      res.status === 409
        ? `That needs approval first — I've queued it for ${who} and I'll keep track of it.`
        : res.status === 403
          ? `I can't reach ${who} — they're outside your organization.`
          : `I couldn't send that to ${who} just now — want me to try again?`;
    surfaceOutcome({
      eventKind,
      copy: why,
      status: res.status === 409 ? "Needs approval" : "Held",
      at,
      heard,
      result: "blocked",
      target: targetEntityId,
    });
  }

  // Phase 3A — transcript / meeting intelligence on PROVIDED text. Runs on the
  // active current-surface context (a pasted/selected transcript). Produces a
  // compact digest, answers "why this matters" from context, or routes the
  // extracted items to a teammate through the governed collaboration rail.
  // Returns true when it handled the input. Never captures live audio, never
  // sends transcript text anywhere except through existing governed rails, and
  // treats the provided text as UNTRUSTED content (parsed, never executed).
  // Phase 4C — bring an EXISTING governed meeting transcript into the current
  // context, then reuse the same digest/actions/tracking flow. Only safe
  // summary text from the consent-gated MeetingCapture rail; no recording, no
  // raw transcript, no faked text. Returns true when handled.
  async function handleTranscriptIngestion(text: string): Promise<boolean> {
    const cmd = detectIngestionCommand(text);
    if (cmd === null) return false;
    const res = await api.meetingCaptures.list();
    const candidates = meetingCapturesToCandidates(
      res.ok ? res.data.meeting_captures : [],
    );
    const result = ingestFromCandidates(candidates, cmd.latest);

    if (
      result.kind === "loaded" &&
      result.candidate !== undefined &&
      result.candidate.text !== undefined
    ) {
      // Load the safe transcript text into explicit, visible current context.
      provideSurfaceContext({
        type: "meeting",
        text: result.candidate.text,
        sourceLabel: result.candidate.title,
      });
      // Chain into the existing flow on the freshly-loaded context.
      if (cmd.followOn === "digest") {
        return handleTranscriptCommand("Summarize this transcript.");
      }
      if (cmd.followOn === "actions") {
        return handleTranscriptCommand("Create action items from this meeting.");
      }
      if (cmd.followOn === "tracking") {
        return handleTrackingCommand("What is blocked?");
      }
      const at = new Date().toISOString();
      setDraft("");
      setActionHeard(text);
      setActionLabel("Transcript");
      appendConversationEntry({ role: "user", text, at });
      surfaceOutcome({
        eventKind: "DIGEST_READY",
        copy: result.message,
        status: "Loaded",
        at,
        heard: text,
        result: "success",
        target: null,
      });
      markPresenceSuccess();
      return true;
    }

    // needs_choice / missing_text / not_found — one calm message, no fake digest.
    const at = new Date().toISOString();
    setDraft("");
    setActionHeard(text);
    setActionLabel("Transcript");
    appendConversationEntry({ role: "user", text, at });
    surfaceOutcome({
      eventKind: "MISSING_CONTEXT",
      copy: result.message,
      status: result.kind === "needs_choice" ? "Which one?" : "Need a transcript",
      at,
      heard: text,
      result: "blocked",
      target: null,
    });
    return true;
  }

  async function handleTranscriptCommand(text: string): Promise<boolean> {
    const cmd = detectTranscriptCommand(text);
    if (cmd === null) return false;
    const at = new Date().toISOString();
    setDraft("");
    setActionHeard(text);
    setTranscriptDigest(null);
    setTranscriptActions([]);
    setTrackingSummary(null);
    appendConversationEntry({ role: "user", text, at });

    const ctx = getActiveSurfaceContext();
    const sourceText = (ctx?.text ?? ctx?.summary ?? "").trim();
    // No provided text → one focused question, never fabricate a digest.
    if (sourceText.length === 0) {
      setActionLabel("Transcript");
      surfaceOutcome({
        eventKind: "MISSING_CONTEXT",
        copy: "Paste or select the transcript you want me to use.",
        status: "Need the transcript",
        at,
        heard: text,
        result: "blocked",
        target: null,
      });
      return true;
    }

    const digest = extractTranscriptDigest(sourceText);

    if (cmd.kind === "WHY") {
      // A calm, context-grounded answer — never an internal message.
      setActionLabel("Why this matters");
      const answer = whyThisMatters(digest);
      setActionResult(answer);
      setActionStatus("Answered");
      appendConversationEntry({
        role: "otzar",
        text: answer,
        at,
        status: "Answered",
      });
      speakConfirmation(answer);
      markPresenceSuccess();
      return true;
    }

    if (cmd.kind === "ROUTE") {
      const items = pickItems(digest, cmd.selector);
      const label = cmd.selector.replace(/_/g, " ");
      if (items.length === 0) {
        setActionLabel("Transcript");
        surfaceOutcome({
          eventKind: "MISSING_CONTEXT",
          copy: `I didn't find any ${label} in that transcript. Want me to send something else?`,
          status: "Nothing to send",
          at,
          heard: text,
          result: "blocked",
          target: null,
        });
        return true;
      }
      setActionLabel(`${label} → ${cmd.targetName}`);
      const summary = items.map((i) => i.text).join("; ");
      const message = `Here are the ${label} from the meeting: ${summary}`;
      // Route through the governed collaboration rail (resolves the teammate,
      // applies authority/approval, attaches the transcript context, tracks).
      await executeCollaborationRequest(
        cmd.targetName,
        message,
        summary,
        "FOLLOW_UP",
        text,
        at,
      );
      return true;
    }

    // ACTIONS — turn the meeting into REVIEWABLE proposed actions (Phase 3B).
    // The user saves / sends / dismisses each; nothing is auto-sent, nothing is
    // faked as done.
    if (cmd.kind === "ACTIONS") {
      const contextRef =
        ctx !== null
          ? { type: ctx.type, id: ctx.id, label: "the current context" }
          : undefined;
      const proposals = digestToProposedActions(digest, contextRef);
      setActionLabel("Proposed actions");
      setTranscriptActions(proposals);
      surfaceOutcome({
        eventKind: "DIGEST_READY",
        copy: proposedActionsCount(proposals),
        status: "Ready for review",
        at,
        heard: text,
        result: "success",
        target: null,
      });
      markPresenceSuccess();
      return true;
    }

    // DIGEST — compact counts up top, full sections collapsed behind the digest.
    setActionLabel("Meeting digest");
    setTranscriptDigest(digest);
    surfaceOutcome({
      eventKind: "DIGEST_READY",
      copy: digestCounts(digest),
      status: "Digest ready",
      at,
      heard: text,
      result: "success",
      target: null,
    });
    markPresenceSuccess();
    return true;
  }

  // Phase 3B — proposed-action handlers. Update the card to a real status only
  // after a governed rail confirms; never fake completion.
  function updateActionStatus(
    id: string,
    status: TranscriptProposedAction["status"],
  ): void {
    setTranscriptActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
  }

  async function handleSaveAction(a: TranscriptProposedAction): Promise<void> {
    const at = new Date().toISOString();
    updateActionStatus(a.id, "saving"); // [OTZAR-LIVE-6] immediate feedback
    const ledgerType =
      a.sourceKind === "blocker" || a.sourceKind === "risk" ? "TASK" : "FOLLOW_UP";
    const title = a.sourceKind === "blocker" ? `Blocker: ${a.body}` : a.body;
    const res = await api.workOs.createLedgerEntry({
      ledger_type: ledgerType,
      title,
      source_type: "VOICE_COMMAND",
      source_command: a.body,
      status: "PROPOSED",
      extraction_source: "TYPESCRIPT_DETERMINISTIC",
      evidence: [],
      ...(a.contextRef !== undefined
        ? {
            details: {
              context_type: a.contextRef.type,
              context_ref: a.contextRef.id,
              context_label: a.contextRef.label,
              ...(a.ownerName !== undefined ? { owner_hint: a.ownerName } : {}),
              ...(a.dueHint !== undefined ? { due_hint: a.dueHint } : {}),
            },
          }
        : {}),
    });
    if (res.ok) {
      updateActionStatus(a.id, "saved");
      surfaceOutcome({
        eventKind: "SELF_WORK_SAVED",
        copy: "Saved.",
        status: "Saved",
        at,
        heard: a.body,
        result: "success",
        target: null,
      });
    } else {
      updateActionStatus(a.id, "proposed"); // failed — let the user retry
      surfaceOutcome({
        eventKind: "ACTION_FAILED",
        copy: "I couldn't save that just now — want me to try again?",
        status: "Couldn't save",
        at,
        heard: a.body,
        result: "blocked",
        target: null,
      });
    }
  }

  async function handleSendAction(a: TranscriptProposedAction): Promise<void> {
    const at = new Date().toISOString();
    const target = a.targetName ?? a.ownerName;
    // [OTZAR-LIVE-6] immediate in-flight feedback; reset to "proposed" on any
    // early-return so the card's buttons come back (never a stuck "Sending…").
    updateActionStatus(a.id, "sending");
    if (target === undefined) {
      updateActionStatus(a.id, "proposed");
      surfaceOutcome({
        eventKind: "NEEDS_CLARIFICATION",
        copy: "Who should own this? Tell me a name, or I can save it for you.",
        status: "Who is this for?",
        at,
        heard: a.body,
        result: "blocked",
        target: null,
      });
      return;
    }
    const resolved = await resolveTargetGoverned(target);
    if (resolved.kind === "AMBIGUOUS") {
      updateActionStatus(a.id, "proposed");
      surfaceOutcome({
        eventKind: "AMBIGUOUS_TARGET",
        copy: focusedAmbiguityCopy(target, resolved.candidates),
        status: "Which one?",
        at,
        heard: a.body,
        result: "blocked",
        target: null,
      });
      return;
    }
    const targetId = resolved.entityId;
    if (
      (resolved.kind !== "RESOLVED_HUMAN" && resolved.kind !== "RESOLVED_AI_AGENT") ||
      targetId === undefined
    ) {
      updateActionStatus(a.id, "proposed");
      surfaceOutcome({
        eventKind: "NEEDS_CLARIFICATION",
        copy: `I couldn't find ${target} on your team — who do you mean?`,
        status: "Who is this for?",
        at,
        heard: a.body,
        result: "blocked",
        target: null,
      });
      return;
    }
    const me = await getSelfIdentity();
    const safeSummary =
      a.contextRef !== undefined ? `${a.body} (re: ${a.contextRef.label})` : a.body;
    const res = await api.otzar.collaboration.create({
      target_type: "EMPLOYEE",
      target_entity_id: targetId,
      request_type: "FOLLOW_UP",
      safe_summary: safeSummary,
      requested_by_ai: true,
      ...(me.twin !== null ? { requester_twin_entity_id: me.twin } : {}),
    });
    const who = resolved.displayName ?? target;
    if (res.ok) {
      updateActionStatus(a.id, "sent");
      surfaceOutcome({
        eventKind: "COLLABORATION_SENT",
        copy: `I sent ${who} a follow-up on your behalf and I'll track their response here.`,
        status: "Sent",
        at,
        heard: a.body,
        result: "success",
        target: targetId,
      });
    } else if (res.status === 409) {
      updateActionStatus(a.id, "blocked");
      surfaceOutcome({
        eventKind: "APPROVAL_NEEDED",
        copy: `That needs approval first — I've queued it for ${who} and I'll keep track of it.`,
        status: "Needs approval",
        at,
        heard: a.body,
        result: "blocked",
        target: targetId,
      });
    } else {
      updateActionStatus(a.id, "proposed"); // failed — let the user retry
      surfaceOutcome({
        eventKind: "ACTION_FAILED",
        copy: `I couldn't send that to ${who} just now — want me to try again?`,
        status: "Held",
        at,
        heard: a.body,
        result: "blocked",
        target: targetId,
      });
    }
  }

  function handleDismissAction(a: TranscriptProposedAction): void {
    updateActionStatus(a.id, "dismissed");
  }

  function handleAskAction(a: TranscriptProposedAction): void {
    const at = new Date().toISOString();
    const q =
      a.sourceKind === "open_question"
        ? `Open question: ${a.body} Want me to send it to someone, or save it for you?`
        : "Who should own this? Tell me a name, or I can save it for you.";
    surfaceOutcome({
      eventKind: "NEEDS_CLARIFICATION",
      copy: q,
      status: "One question",
      at,
      heard: a.body,
      result: "blocked",
      target: null,
    });
  }

  // Phase 3C — answer tracking questions ("what is blocked?", "who is waiting
  // on whom?", "what follow-ups came out?") from the CURRENT proposed actions,
  // or derive fresh from the active transcript/context. Read-only and honest:
  // no completion is faked, no staleness is invented. Returns true when handled.
  async function handleTrackingCommand(text: string): Promise<boolean> {
    const cmd = detectTrackingCommand(text);
    if (cmd === null) return false;
    const at = new Date().toISOString();
    setDraft("");
    setActionHeard(text);
    appendConversationEntry({ role: "user", text, at });

    // Prefer the live proposed actions (they reflect saves/sends); else derive
    // from the current digest or the provided transcript.
    let actions: TranscriptProposedAction[] = transcriptActions;
    if (actions.length === 0) {
      const ctx = getActiveSurfaceContext();
      const contextRef =
        ctx !== null
          ? { type: ctx.type, id: ctx.id, label: "the current context" }
          : undefined;
      if (transcriptDigest !== null) {
        actions = digestToProposedActions(transcriptDigest, contextRef);
      } else {
        const sourceText = (ctx?.text ?? ctx?.summary ?? "").trim();
        if (sourceText.length > 0) {
          actions = digestToProposedActions(
            extractTranscriptDigest(sourceText),
            contextRef,
          );
        }
      }
    }

    if (actions.length === 0) {
      setActionLabel("Tracking");
      setTrackingSummary(null);
      surfaceOutcome({
        eventKind: "MISSING_CONTEXT",
        copy: "Which meeting or transcript should I track?",
        status: "Need a meeting",
        at,
        heard: text,
        result: "blocked",
        target: null,
      });
      return true;
    }

    const summary = deriveTrackingFromActions(actions);
    setActionLabel("Tracking");
    setTrackingSummary(summary);
    surfaceOutcome({
      eventKind: "DIGEST_READY",
      copy: composeTrackingAnswer(summary, cmd.focus),
      status: "Tracking",
      at,
      heard: text,
      result: "success",
      target: null,
    });
    markPresenceSuccess();
    return true;
  }

  // Phase 3D — capture a CORRECTION to Otzar's work interpretation and apply it
  // to the current proposed actions / tracking. Item corrections only fire when
  // there's an active flow to correct; preferences fire anytime. Best-effort
  // governed persistence to the employee's own wallet; never auto-sends, never
  // fakes global learning. Returns true when handled.
  async function handleCorrectionCommand(text: string): Promise<boolean> {
    const correction = detectCorrection(text);
    if (correction === null) return false;
    const isPreference = correction.scope === "future_preference_candidate";
    if (!isPreference && transcriptActions.length === 0) {
      // [OTZAR-LIVE-6] A recognized work correction with no active work to
      // correct: ask ONE focused question instead of falling to generic chat or
      // minting an artifact. With current context → which item; otherwise → what
      // context. (Preferences don't need an active item, so they skip this.)
      const at0 = new Date().toISOString();
      setDraft("");
      setActionHeard(text);
      setActionLabel("Correction");
      appendConversationEntry({ role: "user", text, at: at0 });
      const hasCtx = getActiveSurfaceContext() !== null;
      surfaceOutcome({
        eventKind: "NEEDS_CLARIFICATION",
        copy: hasCtx
          ? "Which item should I update?"
          : "What should I use as the current context?",
        status: hasCtx ? "Which one?" : "Needs context",
        at: at0,
        heard: text,
        result: "blocked",
        target: null,
      });
      return true;
    }

    const at = new Date().toISOString();
    setDraft("");
    setActionHeard(text);
    setActionLabel("Correction");
    appendConversationEntry({ role: "user", text, at });

    const result = applyCorrection(correction, transcriptActions);
    if (result.needsClarification === true) {
      surfaceOutcome({
        eventKind: "NEEDS_CLARIFICATION",
        copy: result.clarificationQuestion ?? "Which item should I correct?",
        status: "Which one?",
        at,
        heard: text,
        result: "blocked",
        target: null,
      });
      return true;
    }
    if (result.actions !== undefined) {
      const updated = result.actions;
      setTranscriptActions(updated);
      // Recompute tracking only if it was already on screen.
      setTrackingSummary((prev) =>
        prev !== null ? deriveTrackingFromActions(updated) : prev,
      );
    }

    // Record it in the in-session history (applied locally first), then attempt
    // governed persistence and update the status honestly.
    const historyId = `corr-${at}-${correctionHistory.length}`;
    const initialStatus: CorrectionPersistenceStatus = isPreference
      ? "preference_candidate"
      : "local_applied";
    setCorrectionHistory((prev) => [
      {
        id: historyId,
        correctionKind: correction.kind,
        rawText: text,
        appliedMessage: result.message,
        scope: correction.scope,
        persistenceStatus: initialStatus,
        createdAt: at,
      },
      ...prev,
    ]);

    surfaceOutcome({
      eventKind: "SELF_WORK_SAVED",
      copy: result.message,
      status: "Updated",
      at,
      heard: text,
      result: "success",
      target: null,
    });
    markPresenceSuccess();

    // Best-effort governed persistence via the typed TwinCorrectionMemory rail
    // (EDX-5 / Foundation #274): minimal safe_summary only — NO raw transcript,
    // self-scoped (PERSONAL). Never blocks the local update; never retries.
    void persistCorrection(correction, historyId, isPreference);
    return true;
  }

  // [OTZAR-LIVE-6] Endpoint-clarity guard. Vague work with no clear owner/target
  // ("Handle this", "Someone should follow up", "Send this to them") asks ONE
  // focused question — never mints an ownerless/contextless artifact, never falls
  // to generic chat. Runs after the outbound path, so "Ask David to handle this"
  // (recipient-directed) is already routed before we get here.
  function handleVagueWorkCommand(text: string): boolean {
    const vague = detectVagueWorkIntent(text);
    if (vague === null) return false;
    const at = new Date().toISOString();
    setDraft("");
    setActionHeard(text);
    setActionLabel("Needs detail");
    appendConversationEntry({ role: "user", text, at });
    const hasContext =
      getActiveSurfaceContext() !== null ||
      transcriptActions.some((a) => a.status !== "dismissed");
    surfaceOutcome({
      eventKind: "NEEDS_CLARIFICATION",
      copy: vagueWorkQuestion(vague, hasContext),
      status: "Needs detail",
      at,
      heard: text,
      result: "blocked",
      target: null,
    });
    // [OTZAR-LIVE-6] Slot-fill continuity for the CONTEXT question: remember that
    // we asked "what context?", so the next turn ("the latest meeting note")
    // binds and sets the current context instead of being re-classified.
    if (!hasContext) {
      setPendingClar({
        id: `clar-${at}`,
        kind: "work_clarification",
        awaiting: "context",
        originalText: text,
        draftMessage: "",
        recipients: [],
        createdAt: Date.now(),
      });
    }
    return true;
  }

  async function persistCorrection(
    c: WorkCorrection,
    historyId: string,
    isPreference: boolean,
  ): Promise<void> {
    const res = await api.otzar.correctionMemory.create({
      scope_type: "PERSONAL",
      correction_type: correctionTypeFor(c.kind),
      // The correction text the user spoke — never the transcript/context body.
      safe_summary: c.rawText,
      retention_class: "STANDARD",
    });
    const status: CorrectionPersistenceStatus = res.ok
      ? isPreference
        ? "typed_preference_persisted"
        : "persisted"
      : "persistence_failed";
    setCorrectionHistory((prev) =>
      prev.map((h) =>
        h.id === historyId ? { ...h, persistenceStatus: status } : h,
      ),
    );
  }

  // Phase 1269 — CONFIRM is the only operation that proposes/creates a
  // governed action. Open never reaches here.
  async function confirmArtifact(body: string): Promise<void> {
    const a = pendingArtifact;
    if (a === null) return;
    const now = new Date().toISOString();
    if (body !== a.body) {
      recordArtifactEdit({
        at: now,
        kind: a.kind,
        originalChars: a.body.length,
        editedChars: body.length,
        confirmed: true,
      });
    }
    // Already proposed → Confirm just opens the focused action; never
    // re-creates.
    if (a.proposed === true && a.actionId !== undefined) {
      navigate(`${ACTION_CENTER_ROUTE}?focus=${encodeURIComponent(a.actionId)}`);
      return;
    }
    // Meeting proposals: Confirm ATTEMPTS a GATED create via the real
    // backend. It never auto-creates — the backend returns the precise
    // unmet gate (no selected time / needs confirmation / needs Google
    // reconnect for event creation / …) which we surface honestly. No
    // event is created and no invite sent while any gate is unmet.
    if (a.kind === "SCHEDULE_MEETING") {
      // Phase 1274/1275 Task E — an unresolved participant blocks the
      // whole lifecycle: never call event-create; ask to resolve first.
      if (a.status === "Participant unresolved") {
        setPendingArtifact({ ...a, body, status: "Resolve participant first." });
        return;
      }
      // Phase 1274/1275 Task D — if the user GAVE an explicit time, do NOT
      // send selected_time: null and then say "Choose a time". We have the
      // clock time but converting "tomorrow" + timezone to a concrete
      // datetime is a separate bridge — say so honestly, don't pretend.
      if (a.explicitTime !== undefined) {
        setPendingArtifact({
          ...a,
          body,
          status: "Selected-time normalization not wired",
          runtimeNote: `I have the time (${a.proposedTime ?? a.explicitTime}), but converting "tomorrow" + timezone to a concrete datetime isn't wired yet. No event created, no invite sent.`,
        });
        return;
      }
      const gateStatus: Record<string, string> = {
        NEEDS_SELECTED_TIME: "Choose a time.",
        PARTICIPANT_UNRESOLVED: a.targetLabel
          ? `Needs ${a.targetLabel} resolved.`
          : "Needs a participant.",
        NEEDS_PARTICIPANT_CONFIRMATION: a.prerequisite ?? "Needs confirmation.",
        NEEDS_APPROVAL: "Needs approval.",
        NEEDS_CALLER_CONFIRMATION: "Confirm the proposal to continue.",
        POLICY_BLOCKED: "Blocked by policy.",
        GOOGLE_RECONNECT_REQUIRED:
          "Needs Google reconnect for event creation.",
        EVENT_WRITE_SCOPE_MISSING:
          "Needs Google reconnect for event creation (event-write scope).",
        CALENDAR_PROVIDER_UNAVAILABLE: "Ready to create — create runtime pending.",
      };
      const r = await api.connectorData.calendarEventCreate({
        title: a.title,
        participants:
          a.targetLabel !== undefined
            ? [{ label: a.targetLabel, resolved: a.recipientEntityId !== undefined }]
            : [],
        selected_time: null, // slot-selection UI is the next bridge
        caller_confirmed: true, // the user clicked Confirm
        ...(a.prerequisite !== undefined
          ? { prerequisite: a.prerequisite, participant_confirmations_satisfied: false }
          : { participant_confirmations_satisfied: true }),
        source_command: a.sourceCommand ?? body,
      });
      const status = r.ok
        ? "Created."
        : (gateStatus[r.code] ?? "Proposal saved (gated).");
      // Drop the prior runtimeNote on success (exactOptionalPropertyTypes
      // forbids assigning undefined — omit the key instead).
      const { runtimeNote: _priorNote, ...rest } = a;
      void _priorNote;
      setPendingArtifact({
        ...rest,
        body,
        status,
        ...(r.ok
          ? {}
          : {
              runtimeNote:
                "No event was created — the proposal is held at the gate above. No invite sent.",
            }),
      });
      return;
    }
    if (a.externalChannel === true) {
      setPendingArtifact({
        ...a,
        body,
        status: "Local draft — external send not wired",
        runtimeNote:
          "Slack/email send isn't wired yet, so this can't be proposed for external send. Saved as a local draft.",
      });
      return;
    }
    // Internal direct note → deliver under the sender's OWN human authority
    // via the human-authority path (Phase 1284 Wave 2). The recipient ref is
    // the resolved entity_id when we have it, else the typed name (the
    // backend resolves + governs either way; nothing external is sent).
    const recipientRef = a.recipientEntityId ?? a.targetLabel ?? a.sourceCommand ?? "";
    // Recipient-facing cleanup: natural punctuation (no em dashes) on the
    // delivered note, even if the draft body was edited in the card.
    const r = await api.workOs.internalMessage(recipientRef, sanitizeOutboundMessage(body));
    if (r.ok && r.data.status === "DELIVERED") {
      const to = entityLabel(r.data.recipient_display_name ?? a.targetLabel);
      const status = `Delivered to ${to}`;
      // Proof (message + ledger ids) is recorded silently — the user sees only
      // the calm confirmation, never the backend identifiers.
      const { runtimeNote: _clearedNote, ...rest } = a;
      void _clearedNote;
      setPendingArtifact({
        ...rest,
        body,
        proposed: true,
        status,
        ...(r.data.notification_id !== undefined ? { actionId: r.data.notification_id } : {}),
      });
      appendConversationEntry({
        role: "action",
        text: `Delivered your note to ${to}.`,
        at: now,
        kind: a.kind,
        status,
      });
      speakConfirmation(`Delivered your note to ${to}.`);
      return;
    }
    // Honest non-delivered states — never a dead end.
    const status =
      r.ok && r.data.status === "NEEDS_RESOLUTION"
        ? "Pick a recipient"
        : r.ok && r.data.status === "GATED"
          ? "Needs approval"
          : "Blocked";
    const note =
      r.ok && r.data.resolution !== undefined
        ? r.data.resolution.reason
        : r.ok && r.data.reason !== undefined
          ? r.data.reason
          : "The note could not be delivered.";
    setPendingArtifact({ ...a, body, status, runtimeNote: note });
    appendConversationEntry({ role: "action", text: note, at: now, kind: a.kind, status });
  }

  // Edit-Save revises the body locally; if already proposed, re-propose
  // a new governed action with the edits.
  async function reviseArtifact(body: string): Promise<void> {
    const a = pendingArtifact;
    if (a === null) return;
    if (body !== a.body) {
      recordArtifactEdit({
        at: new Date().toISOString(),
        kind: a.kind,
        originalChars: a.body.length,
        editedChars: body.length,
        confirmed: false,
      });
    }
    if (a.proposed === true) {
      // Re-propose with the edited body (a new governed action).
      await confirmArtifact(body);
      return;
    }
    setPendingArtifact({ ...a, body });
  }

  // Phase 1264 Voice Action Runtime — voice OPERATES the app. Every
  // utterance (spoken OR typed) is classified into a SAFE action:
  // internal navigation, connector-status navigation, a safe external
  // URL open, a draft-only (approval-gated) action, or a fall-through
  // to the SAME governed chat path as typed input. Each is audited
  // (safe metadata only) and confirmed in premium voice.
  // Phase 1273 — map a planned-action kind to its backend Work OS action.
  function workOsActionFor(kind: PlannedAction["kind"]): string {
    if (kind === "SCHEDULE_MEETING") return "CREATE_INTERNAL_MEETING";
    if (kind === "TASK") return "ASSIGN_TASK";
    return "CREATE_FOLLOW_UP_NOTE";
  }

  function statusForDecision(decision: string): string {
    switch (decision) {
      case "ALLOW":
        return "Ready";
      case "ALLOW_WITH_CONFIRMATION":
        return "Ready to confirm";
      case "ALLOW_WITH_STANDING_AUTHORITY":
        return "Ready (standing authority)";
      case "REQUIRES_TARGET_CONFIRMATION":
        return "Needs participant confirmation";
      case "REQUIRES_APPROVAL":
        return "Needs approval";
      case "REQUIRES_DUAL_CONTROL":
        return "Needs dual control";
      case "BLOCKED":
        return "Blocked";
      case "RUNTIME_MISSING":
        return "Runtime not wired";
      default:
        return "Draft · needs confirmation";
    }
  }

  // Build one inspectable WorkArtifact from a planned action, enriching
  // it with the REAL backend authority decision (never a generic draft;
  // never a guessed target). The target is resolved server-side — an
  // unknown name surfaces as an honest "unresolved" status.
  async function buildArtifactFromAction(
    action: PlannedAction,
    sourceCommand: string,
    planId: string | undefined,
  ): Promise<WorkArtifact> {
    const target = action.target_name;
    let authorityNote: string | undefined;
    let status = "Draft · needs confirmation";

    // Phase 1274 — explicit proposed time on a meeting action.
    const proposedTime =
      action.kind === "SCHEDULE_MEETING" && action.explicit_time !== undefined
        ? formatProposedTime(action.explicit_time, action.explicit_timezone_label)
        : undefined;
    const tzInterp =
      action.explicit_timezone_label !== undefined
        ? interpretTimezoneLabel(action.explicit_timezone_label)
        : null;
    const timezoneNote =
      action.explicit_timezone_label !== undefined && tzInterp !== null
        ? `Interpreted ${action.explicit_timezone_label.toUpperCase()} as ${tzInterp.display}.`
        : undefined;

    let targetEntityId: string | undefined;
    let targetUnresolved = false;
    if (target !== undefined) {
      const r = await api.workOs.authorityContext({
        target_name: target,
        actions: [workOsActionFor(action.kind)],
      });
      if (r.ok) {
        const a = r.data.authority;
        const pol = r.data.policies[0];
        if (a.target_entity_id !== null) targetEntityId = a.target_entity_id;
        if (a.target_resolution === "NOT_FOUND") {
          status = "Participant unresolved";
          targetUnresolved = true;
          authorityNote = `I don't know which ${target}. Choose a teammate or enter an email/calendar.`;
        } else if (a.target_resolution === "AMBIGUOUS") {
          status = "Participant ambiguous";
          targetUnresolved = true;
          authorityNote = `More than one teammate matches "${target}" — pick one.`;
        } else if (pol !== undefined) {
          status =
            action.kind === "SCHEDULE_MEETING" && proposedTime !== undefined
              ? action.prerequisite !== undefined
                ? "Time proposed · needs confirmation"
                : "Time proposed · event creation gated"
              : statusForDecision(pol.decision);
          const who = a.target_display_name ?? target;
          const tzDisplay =
            a.target_timezone !== null
              ? displayForIana(a.target_timezone)
              : `using org default (${displayForIana(a.org_default_timezone)}) — ${who}'s timezone not configured`;
          authorityNote = a.caller_is_manager_of_target
            ? `Manager authority over ${who}. ${pol.reason} ${who} local time: ${tzDisplay}.`
            : `${pol.reason} ${who} local time: ${tzDisplay}.`;
        }
      }
    }

    const title =
      action.kind === "SCHEDULE_MEETING"
        ? target
          ? `Meeting proposal → ${target}`
          : "Meeting proposal"
        : action.kind === "TASK"
          ? target
            ? `Task → ${target}`
            : "Task proposal"
          : target
            ? `Follow up with ${target}`
            : "Follow-up note";
    const channel = action.kind === "SCHEDULE_MEETING" ? "calendar" : "internal";
    const body =
      action.kind === "FOLLOW_UP_NOTE"
        ? `Follow up with ${target ?? "them"}${
            action.context_label !== undefined
              ? ` about ${action.context_label}`
              : ""
          }.`
        : action.source_segment;

    const artifact: WorkArtifact = {
      kind: action.kind,
      title,
      ...(target !== undefined ? { targetLabel: target } : {}),
      channel,
      body,
      status,
      ...(action.prerequisite !== undefined
        ? { prerequisite: `Requires ${action.prerequisite}` }
        : {}),
      ...(action.context_label !== undefined
        ? { contextLabel: action.context_label }
        : {}),
      weight: action.weight,
      ...(authorityNote !== undefined ? { authorityNote } : {}),
      ...(proposedTime !== undefined ? { proposedTime } : {}),
      ...(action.explicit_time !== undefined
        ? { explicitTime: action.explicit_time }
        : {}),
      ...(timezoneNote !== undefined ? { timezoneNote } : {}),
      ...(action.evidence.length > 0 ? { evidence: action.evidence } : {}),
      extractionSource: extractionSourceLabel(pythonRuntimeRef.current),
      sourceCommand,
      ...(planId !== undefined ? { planId } : {}),
      runtimeNote:
        action.kind === "SCHEDULE_MEETING"
          ? getCalendarCreateGateCopy({
              status,
              ...(action.prerequisite !== undefined
                ? { prerequisite: `Requires ${action.prerequisite}` }
                : {}),
              ...(action.explicit_time !== undefined
                ? { explicitTime: action.explicit_time }
                : {}),
              ...(proposedTime !== undefined ? { proposedTime } : {}),
              ...(target !== undefined ? { targetLabel: target } : {}),
            })
          : action.kind === "TASK"
            ? "Task proposal"
            : "Follow-up draft",
    };

    // Phase 1279 — persist to the durable Work Ledger (tenant-scoped,
    // runtime-attributed). Honest: ledger status is data, not execution;
    // failure shows a safe note and NEVER claims saved.
    const persisted = await persistArtifactToLedger({
      kind: action.kind,
      title,
      sourceCommand,
      contextLabel: action.context_label,
      evidence: action.evidence,
      targetEntityId,
      targetUnresolved,
      workPlanId: planId,
      prerequisite: action.prerequisite,
    });
    if (persisted.ledgerEntryId !== undefined) {
      artifact.ledgerEntryId = persisted.ledgerEntryId;
      if (persisted.coordinationRuntime !== undefined) {
        artifact.coordinationRuntime = persisted.coordinationRuntime;
      }
    } else {
      artifact.ledgerError = "Couldn't save that right now. Want me to try again?";
    }
    return artifact;
  }

  // Map a conversation-to-work artifact to a durable ledger entry and
  // persist it via Foundation. Returns the ledger id on success. Never
  // fakes persistence; the caller surfaces a safe error if it fails.
  async function persistArtifactToLedger(args: {
    kind: PlannedAction["kind"];
    title: string;
    sourceCommand: string;
    contextLabel: string | undefined;
    evidence: PlannedAction["evidence"];
    targetEntityId: string | undefined;
    targetUnresolved: boolean;
    workPlanId: string | undefined;
    prerequisite: string | undefined;
  }): Promise<{ ledgerEntryId?: string; coordinationRuntime?: string }> {
    const ledgerType =
      args.kind === "FOLLOW_UP_NOTE"
        ? "FOLLOW_UP"
        : args.kind === "TASK"
          ? "TASK"
          : args.kind === "SCHEDULE_MEETING"
            ? "MEETING"
            : "COMMITMENT";
    const status = args.targetUnresolved
      ? "NEEDS_TARGET_RESOLUTION"
      : args.prerequisite !== undefined
        ? "NEEDS_PARTICIPANT_CONFIRMATION"
        : "PROPOSED";
    const r = await api.workOs.createLedgerEntry({
      ledger_type: ledgerType,
      title: args.title,
      source_type: "VOICE_COMMAND",
      source_command: args.sourceCommand,
      status,
      extraction_source: "TYPESCRIPT_DETERMINISTIC",
      evidence: args.evidence,
      ...(args.contextLabel !== undefined
        ? { details: { context_label: args.contextLabel } }
        : {}),
      ...(args.targetEntityId !== undefined
        ? { target_entity_id: args.targetEntityId }
        : {}),
      ...(args.workPlanId !== undefined ? { work_plan_id: args.workPlanId } : {}),
    });
    return r.ok
      ? {
          ledgerEntryId: r.data.entry.ledger_entry_id,
          ...(r.data.entry.coordination_runtime !== undefined
            ? { coordinationRuntime: r.data.entry.coordination_runtime }
            : {}),
        }
      : {};
  }

  // Render a multi-intent plan as several linked, inspectable cards.
  async function renderWorkPlan(
    actions: PlannedAction[],
    sourceCommand: string,
    at: string,
  ): Promise<void> {
    const planId = `plan-${at}`;
    const planned = actions.filter(
      (a) =>
        a.kind === "SCHEDULE_MEETING" ||
        a.kind === "FOLLOW_UP_NOTE" ||
        a.kind === "TASK",
    );
    const artifacts = await Promise.all(
      planned.map((a) => buildArtifactFromAction(a, sourceCommand, planId)),
    );
    setPlanArtifacts(artifacts);
    const summary = `I split that into ${artifacts.length} linked actions: ${artifacts
      .map((x) => x.title)
      .join("; ")}.`;
    setActionResult(summary);
    setActionStatus("Plan · review each");
    appendConversationEntry({
      role: "action",
      text: summary,
      at,
      kind: "WORK_PLAN",
      status: "Plan",
    });
    speakConfirmation("I split that into linked actions — review each below.");
    recordVoiceAction({
      at,
      transcript: sourceCommand,
      actionType: "WORK_PLAN",
      target: null,
      result: "needs_confirmation",
    });
  }

  // Render a single follow-up commitment as one inspectable artifact.
  async function renderFollowUp(
    action: PlannedAction,
    sourceCommand: string,
    at: string,
  ): Promise<void> {
    const artifact = await buildArtifactFromAction(action, sourceCommand, undefined);
    setPendingArtifact(artifact);
    setActionResult(artifact.title);
    setActionStatus(artifact.status);
    appendConversationEntry({
      role: "action",
      text: `${artifact.title} — ${artifact.status}.`,
      at,
      kind: "FOLLOW_UP_NOTE",
      status: artifact.status,
    });
    speakConfirmation(`I created a follow-up draft: ${artifact.title}.`);
    recordVoiceAction({
      at,
      transcript: sourceCommand,
      actionType: "FOLLOW_UP_NOTE",
      target: action.target_name ?? null,
      result: "needs_confirmation",
    });
  }

  // Confirm ONE artifact within a plan — never the others (Phase 1273).
  // A meeting attempts the gated create (which blocks honestly); a
  // follow-up/task is confirmed as a local draft (no send, no fake
  // completion). Persistent task/collab substrate is the next bridge.
  async function confirmPlanArtifact(index: number, body: string): Promise<void> {
    const a = planArtifacts[index];
    if (a === undefined) return;
    let status: string;
    let note: string | undefined;
    // Task E — unresolved participant blocks the lifecycle (no create).
    if (a.kind === "SCHEDULE_MEETING" && a.status === "Participant unresolved") {
      setPlanArtifacts((prev) =>
        prev.map((x, j) =>
          j === index ? { ...x, body, status: "Resolve participant first." } : x,
        ),
      );
      return;
    }
    // Task D — explicit time given: don't send null + say "Choose a time".
    if (a.kind === "SCHEDULE_MEETING" && a.explicitTime !== undefined) {
      setPlanArtifacts((prev) =>
        prev.map((x, j) =>
          j === index
            ? {
                ...x,
                body,
                status: "Selected-time normalization not wired",
                runtimeNote: `I have the time (${a.proposedTime ?? a.explicitTime}), but converting "tomorrow" + timezone to a concrete datetime isn't wired yet. No event created.`,
              }
            : x,
        ),
      );
      return;
    }
    if (a.kind === "SCHEDULE_MEETING") {
      const r = await api.connectorData.calendarEventCreate({
        title: a.title,
        participants:
          a.targetLabel !== undefined
            ? [{ label: a.targetLabel, resolved: true }]
            : [],
        selected_time: null,
        caller_confirmed: true,
        ...(a.prerequisite !== undefined
          ? { prerequisite: a.prerequisite, participant_confirmations_satisfied: false }
          : { participant_confirmations_satisfied: true }),
        source_command: a.sourceCommand ?? body,
      });
      if (r.ok) {
        status = "Created.";
      } else if (r.code === "NEEDS_SELECTED_TIME") {
        status = "Choose a time.";
      } else if (
        r.code === "EVENT_WRITE_SCOPE_MISSING" ||
        r.code === "GOOGLE_RECONNECT_REQUIRED"
      ) {
        status = "Needs Google reconnect for event creation.";
      } else if (r.code === "NEEDS_PARTICIPANT_CONFIRMATION") {
        status = a.prerequisite ?? "Needs participant confirmation.";
      } else {
        status = "Held at gate.";
      }
      note = r.ok ? undefined : "No event created — held at the gate. No invite sent.";
    } else {
      // Follow-up / task: confirm as a local governed draft. No send,
      // no fake completion — real persistence is the next bridge.
      status =
        a.kind === "TASK"
          ? "Task proposal confirmed (local)"
          : "Follow-up confirmed (local draft)";
      note = "Saved locally — no message sent, no task marked complete.";
    }
    setPlanArtifacts((prev) =>
      prev.map((x, j) => {
        if (j !== index) return x;
        const { runtimeNote: _drop, ...rest } = x;
        void _drop;
        return {
          ...rest,
          body,
          status,
          ...(note !== undefined ? { runtimeNote: note } : {}),
        };
      }),
    );
  }

  async function handleSendText(raw: string): Promise<void> {
    const text = raw.trim();
    if (text.length === 0 || intent.processing) return;
    // A new prompt cancels any current speech cleanly — no double-speak.
    cancelVoicePlayback();
    setExternalLinkPending(null);
    setActionVoicePath(null);
    setActionStatus(null);
    setPendingArtifact(null);
    setPlanArtifacts([]);
    // Typed input has no transcription engine; the desktop-voice effect
    // re-sets this after calling handleSendText.
    setTranscriptionProvider(null);

    // Phase 1284 Wave 2 — natural-language confirmation of an ACTIVE pending
    // draft. "I approve" / "send it" / "confirm" / "go ahead" applies to the
    // pending internal-message draft and delivers it — it does NOT navigate
    // to Action Center (only an explicit "open Action Center" does). This
    // runs before any classification so the confirmation can't be swallowed
    // as a navigation/approvals-review intent.
    if (
      pendingArtifact !== null &&
      pendingArtifact.proposed !== true &&
      pendingArtifact.externalChannel !== true &&
      isPendingConfirmPhrase(text) &&
      !isExplicitActionCenterNav(text)
    ) {
      const at0 = new Date().toISOString();
      setDraft("");
      appendConversationEntry({ role: "user", text, at: at0 });
      await confirmArtifact(pendingArtifact.body);
      return;
    }

    // Phase 1285 slice 1 — thread-aware answers. "Did I receive a message
    // from X?" / "What did X say?" / "What did I ask X?" are answered from
    // the REAL authorized thread records (GET /work-os/threads/with/:id),
    // never the LLM. Runs before classification so it isn't routed as chat.
    {
      const tq = classifyThreadQuery(text);
      if (tq !== null) {
        // A confident thread/relationship/inbound query is a different intent —
        // abandon any pending clarification so a stale "who?" can't bind later.
        clearPendingClar();
        const at0 = new Date().toISOString();
        setDraft("");
        // Surface the answer in the calm outcome line (not only the transcript)
        // so a thread/inbound answer reflects "what changed" even as the first
        // interaction — the ambient surface, not a chat-only log.
        setActionHeard(text);
        setActionLabel("Work answer");
        appendConversationEntry({ role: "user", text, at: at0 });
        // Use the READ-scoped governed resolver (same path the outbound
        // send uses) so a STANDARD employee can resolve a same-org teammate
        // for a thread/response-status query. resolveTarget alone hits the
        // admin-only org roster and returns NOT_FOUND for non-admins — that
        // was the founder-exposed "I couldn't find David" regression.
        const resolved = await resolveTargetGoverned(tq.person);
        const resolvedOk =
          (resolved.kind === "RESOLVED_HUMAN" ||
            resolved.kind === "RESOLVED_AI_AGENT") &&
          resolved.entityId !== undefined;
        const display = resolvedOk ? resolved.displayName ?? tq.person : tq.person;
        const sayMiss = (): void => {
          const miss =
            resolved.kind === "AMBIGUOUS"
              ? `More than one teammate matches "${tq.person}". Who do you mean?`
              : `I couldn't find "${tq.person}" in your organization.`;
          setActionResult(miss);
          appendConversationEntry({ role: "otzar", text: miss, at: at0 });
          speakConfirmation(miss);
        };
        const sayAnswer = (answer: string): void => {
          setActionResult(answer);
          appendConversationEntry({ role: "otzar", text: answer, at: at0 });
          speakConfirmation(answer);
        };

        // Durable-only ref: client-resolved entity id, else the raw name (the
        // backend resolves + governs it). We NEVER fall back to memory/LLM for
        // a recognized relationship/work query.
        const ref = resolvedOk ? resolved.entityId! : tq.person;

        if (tq.type === "WAITING_ON") {
          const w = await api.workOs.waitingOn(ref);
          if (w.ok && w.data.ok) {
            sayAnswer(composeWaitingOnAnswer(display, w.data.waiting_on_them ?? []));
          } else {
            sayMiss();
          }
          return;
        }

        // Relationship work-graph queries (Phase 1285-M) — completed / blockers
        // / decisions / inverse-waiting-on / overdue / changed / summary, all
        // from durable records.
        if (RELATIONSHIP_QUERY_TYPES.includes(tq.type)) {
          const r = await api.workOs.relationship(ref);
          if (r.ok && r.data.ok) {
            sayAnswer(composeRelationshipAnswer(tq.type, r.data.other_display_name ?? display, r.data));
          } else {
            sayMiss();
          }
          return;
        }

        // RECEIVED_FROM / LATEST_FROM / LATEST_TO read the durable thread.
        if (resolvedOk) {
          const t = await api.workOs.thread(resolved.entityId!);
          const messages =
            t.ok && t.data.ok && t.data.messages != null ? t.data.messages : [];
          // Real reply arriving to the human → inbound flow trace.
          if (messages.some((m) => m.from_me === false)) {
            emitFlow("reply_to_user", `${display} replied`, "working");
          }
          sayAnswer(composeThreadAnswer(tq, display, messages));
        } else {
          sayMiss();
        }
        return;
      }
    }

    // [CE-AMBIENT] Clarity questions about the SELECTED work item — "why is
    // this here?", "where did this come from?", "who can clarify this?" —
    // answered by the READ-ONLY deterministic clarity-answer route (the same
    // truth as the item's in-panel ask row), never the LLM. Requires an
    // explicitly opened/selected work item (work_item surface context); a
    // deictic "this" with no selection gets honest copy, never a guess.
    {
      const cq = classifyClarityPhrase(text);
      const workCtx = useCurrentSurfaceContextStore.getState().context;
      const hasWorkItem =
        workCtx !== null &&
        workCtx.active &&
        workCtx.type === "work_item" &&
        workCtx.ledgerEntryId !== undefined;
      // Contextual phrases ("what should I do next?") are item-clarity ONLY
      // when an item is selected — bare, they keep their existing route
      // (day-level Twin question; locked behavior).
      if (cq === "deictic" || (cq === "contextual" && hasWorkItem)) {
        clearPendingClar();
        const at0 = new Date().toISOString();
        setDraft("");
        setActionHeard(text);
        setActionLabel("Work answer");
        appendConversationEntry({ role: "user", text, at: at0 });
        const say = (answer: string): void => {
          setActionResult(answer);
          appendConversationEntry({ role: "otzar", text: answer, at: at0 });
          speakConfirmation(answer);
        };
        if (!hasWorkItem) {
          say('Open or select a work item first so Otzar knows what "this" means.');
          return;
        }
        const r = await api.workOs.ledgerClarityAnswer(workCtx.ledgerEntryId!, text);
        say(r.ok ? r.data.answer : "Otzar couldn't answer that right now. Try again.");
        return;
      }
    }

    // [AIX-6] NAMED-SUBJECT background questions — "What do we know about
    // Project Phoenix?" with no item selected. Routed verbatim to the
    // READ-ONLY org-scoped background-answer rail (live work leads, seeded
    // background follows with attribution; the server refuses honestly
    // when the subject can't be resolved). Never the LLM, never a guess,
    // never a write. Runs AFTER the deictic block so "about this" stays
    // item-scoped.
    if (isBackgroundSubjectQuestion(text)) {
      clearPendingClar();
      const at0 = new Date().toISOString();
      setDraft("");
      setActionHeard(text);
      setActionLabel("Background answer");
      appendConversationEntry({ role: "user", text, at: at0 });
      const say = (answer: string): void => {
        setActionResult(answer);
        appendConversationEntry({ role: "otzar", text: answer, at: at0 });
        speakConfirmation(answer);
      };
      const r = await api.workOs.backgroundAnswer(text);
      if (r.ok && typeof r.data.answer === "string") {
        say(r.data.answer);
      } else {
        say(
          'Otzar couldn\'t look that up as a named topic. Try naming the project or subject — for example, "What do we know about Project Phoenix?"',
        );
      }
      return;
    }

    // [OTZAR-LIVE-6] Conversational working memory — resume a pending
    // clarification. Otzar just asked one focused question ("Who should receive
    // this?"); this turn ("David and Samiksha are the recipients") binds to the
    // awaited slot and RESUMES the action instead of being re-classified into a
    // new/empty intent (the founder's "what would you like me to do regarding
    // David and Samiksha?" dead end). Runs AFTER classifyThreadQuery so a real
    // query ("Did David respond?") still wins, and BEFORE correction/outbound so
    // a bare recipient answer isn't mangled. A non-answer abandons the pending
    // clarification so it can never bind a later unrelated turn.
    {
      const clar = pendingClarRef.current;
      if (clar !== null && !isClarificationExpired(clar, Date.now())) {
        const at0 = new Date().toISOString();
        if (isCancelPhrase(text)) {
          clearPendingClar();
          setDraft("");
          appendConversationEntry({ role: "user", text, at: at0 });
          const msg = "Okay, I won't send that.";
          setActionResult(msg);
          setActionStatus("Cancelled");
          appendConversationEntry({ role: "otzar", text: msg, at: at0 });
          speakConfirmation(msg);
          return;
        }
        if (clar.awaiting === "recipient") {
          const names = parseRecipientList(text);
          if (names.length > 0) {
            setDraft("");
            await resumeOutboundToRecipients(clar, names, text, at0);
            return;
          }
        }
        if (clar.awaiting === "approver") {
          // The answer to "who should approve this?" is an APPROVER — resolve the
          // named person and route a governed APPROVAL_REQUEST through the
          // existing collaboration/approval rail (never a fabricated approval).
          const names = parseRecipientList(text);
          if (names.length > 0) {
            clearPendingClar();
            setDraft("");
            await executeCollaborationRequest(
              names[0]!,
              clar.draftMessage,
              "approve this",
              "APPROVAL_REQUEST",
              text,
              at0,
            );
            return;
          }
        }
        if (clar.awaiting === "context") {
          // The answer to "what context?" IS the context — set it explicitly
          // (user-provided provenance) and confirm. A short, real reference like
          // "the latest meeting note" / "today's standup".
          const ref = text.trim();
          if (ref.length > 0 && !/^\?+$/.test(ref)) {
            clearPendingClar();
            setDraft("");
            appendConversationEntry({ role: "user", text, at: at0 });
            // Context flowing into the work — a calm inbound trace.
            emitFlow("context_to_action", "Context remembered", "ambient");
            provideSurfaceContext({
              type: "unknown",
              title: ref,
              sourceLabel: "You told Otzar",
            });
            const msg = `Got it. I'll use "${ref}" as the current context.`;
            setActionResult(msg);
            setActionStatus("Context set");
            appendConversationEntry({ role: "otzar", text: msg, at: at0 });
            speakConfirmation(msg);
            return;
          }
        }
        // Not an answer to the pending question — abandon it (TTL-bounded too)
        // so a later bare name can't accidentally bind to a stale ask.
        clearPendingClar();
      }
    }

    // Phase 3D — a correction to Otzar's work interpretation ("No, David owns
    // that", "that's not blocked anymore", "this is due next Friday"). Runs
    // first so it's applied to the active flow, never mis-routed as a message.
    if (await handleCorrectionCommand(text)) return;

    // Phase 4C — bring an EXISTING governed meeting transcript into context
    // ("use/summarize the latest transcript"). Runs before the provided-text
    // handlers so "the latest transcript" loads the artifact, not asks to paste.
    if (await handleTranscriptIngestion(text)) return;

    // Phase 3C — tracking questions ("what is blocked?", "who is waiting on
    // whom?") answered from the current proposed actions / transcript.
    if (await handleTrackingCommand(text)) return;

    // Phase 3A — transcript/meeting intelligence on PROVIDED text. Runs before
    // outbound routing so "summarize this transcript", "send William the
    // decisions", and "why does this matter" use the provided context. A
    // delegation ("tell Samiksha to summarize this") is NOT intercepted here —
    // it falls through to the outbound path, which attaches the transcript.
    if (await handleTranscriptCommand(text)) return;

    // [OTZAR-LIVE-6] First-turn MULTI-recipient recognition. "I need David and
    // Samiksha to send me their updates" / "ask David and Samiksha to review"
    // names BOTH recipients up front — resolve them now and route to both,
    // instead of dropping the 2nd name and asking "pick the recipient". Only
    // fires for 2+ names (single-recipient stays on the existing tested
    // interpreter below); resolve-all-before-send + honest partial via the same
    // resume path as the clarification flow.
    {
      const firstTurn = detectFirstTurnRecipients(text);
      if (firstTurn !== null && firstTurn.recipients.length >= 2) {
        const at0 = new Date().toISOString();
        setDraft("");
        setActionHeard(text);
        setActionLabel(`Request → ${formatRecipientList(firstTurn.recipients)}`);
        await resumeOutboundToRecipients(
          {
            id: `clar-${at0}`,
            kind: "outbound_message",
            awaiting: "recipient",
            originalText: text,
            draftMessage: firstTurn.body,
            recipients: [],
            createdAt: Date.now(),
          },
          firstTurn.recipients,
          text,
          at0,
        );
        return;
      }
    }

    // Ambient outbound work — recipient-directed natural language ("Ask David
    // to review …", "David, can you confirm …", "Tell the product team …") is
    // COMPOSED into a clean recipient-facing message and sent through the
    // governed internal-message rail. This runs BEFORE the generic task planner
    // so a message to a teammate is never mis-parsed into fake tasks (e.g. a
    // pronoun "you" / verb "sent" becoming task recipients).
    {
      const outbound = interpretAmbientOutboundWork(text);
      if (outbound !== null) {
        const at0 = new Date().toISOString();
        setDraft("");
        // Surface the action panel (gated on actionHeard) like the other paths.
        setActionHeard(text);
        setActionLabel(
          isSelfKind(outbound.kind)
            ? outbound.kind === "SELF_REMINDER"
              ? "Reminder to yourself"
              : outbound.kind === "SELF_TASK"
                ? "Task for yourself"
                : outbound.kind === "TWIN_MEMORY"
                  ? "Remember this"
                  : "Note to yourself"
            : outbound.kind === "COLLABORATION_REQUEST"
              ? `${
                  outbound.requestType === "REVIEW_REQUEST"
                    ? "Review request"
                    : outbound.requestType === "APPROVAL_REQUEST"
                      ? "Approval request"
                      : "Follow-up"
                } → ${outbound.recipient}`
              : outbound.kind === "INTERNAL_MESSAGE" && outbound.recipient.length > 0
                ? `Message → ${outbound.recipient}`
                : "Who is this for?",
        );
        setRouterAck(null);
        appendConversationEntry({ role: "user", text, at: at0 });
        // First-person form used only if the named recipient turns out to be
        // the caller (by-name self reroute): "Validate what I received.", never
        // "Hey David…". Falls back to the composed body when not derivable.
        const selfBody =
          outbound.selfFacingMessage ?? outbound.recipientFacingMessage;
        if (isSelfKind(outbound.kind)) {
          // SELF rail — a note / task / reminder / memory for oneself.
          await executeSelfWork(
            outbound.kind,
            outbound.recipientFacingMessage,
            text,
            at0,
          );
        } else if (outbound.kind === "COLLABORATION_REQUEST") {
          // Governed Twin-mediated work / review / approval request.
          await executeCollaborationRequest(
            outbound.recipient,
            outbound.recipientFacingMessage,
            selfBody,
            outbound.requestType ?? "FOLLOW_UP",
            text,
            at0,
          );
        } else if (
          outbound.kind === "INTERNAL_MESSAGE" &&
          outbound.recipient.length > 0
        ) {
          // Plain teammate message — but if the named person is really the
          // current user, reroute to the self rail instead of self-messaging.
          const rerouted = await maybeRerouteSelfMessage(
            outbound.recipient,
            selfBody,
            text,
            at0,
          );
          if (!rerouted) {
            await executeOutboundMessage(
              outbound.recipient,
              outbound.recipientFacingMessage,
              text,
              "ASK_TWIN",
              at0,
            );
          }
        } else {
          // CLARIFY — ask for the missing detail, never fabricate a send.
          setActionResult(outbound.recipientFacingMessage);
          setActionStatus("Needs detail");
          speakConfirmation(outbound.recipientFacingMessage);
          appendConversationEntry({
            role: "otzar",
            text: outbound.recipientFacingMessage,
            at: at0,
          });
          recordVoiceAction({
            at: at0,
            transcript: text,
            actionType: "ASK_TWIN",
            target: null,
            result: "blocked",
          });
          // [OTZAR-LIVE-6] Remember WHAT we asked for, with the objective
          // preserved — so the next turn resumes. If we asked "who should
          // APPROVE this?", the awaited slot is an APPROVER (routed through the
          // governed approval rail); otherwise it's a recipient (a message).
          const askedForApprover = /\bapprove\b/i.test(
            outbound.recipientFacingMessage,
          );
          setPendingClar({
            id: `clar-${at0}`,
            kind: askedForApprover ? "collaboration_request" : "outbound_message",
            awaiting: askedForApprover ? "approver" : "recipient",
            originalText: text,
            draftMessage: askedForApprover
              ? "Can you approve this?"
              : composeRequestBody(text),
            recipients: [],
            createdAt: Date.now(),
          });
        }
        return;
      }
    }

    // [OTZAR-LIVE-6] Endpoint-clarity guard — vague, endpoint-less work
    // ("Handle this", "Someone should follow up", "Send this to them") asks one
    // focused question BEFORE the planner can mint an ownerless follow-up note.
    if (handleVagueWorkCommand(text)) return;

    // Phase 1273 — multi-intent + commitment interception. A compound
    // command becomes a WorkPlan of linked cards; a stated commitment
    // ("I told X I would follow up") becomes a follow-up artifact. Single
    // meeting/draft/navigation commands fall through to the existing
    // classifier (which carries the free/busy + gated-create flow).
    {
      const plan = planWorkCommand(text);
      const nonTrivial = plan.actions.filter(
        (a) =>
          a.kind === "SCHEDULE_MEETING" ||
          a.kind === "FOLLOW_UP_NOTE" ||
          a.kind === "TASK",
      );
      const at0 = new Date().toISOString();
      if (plan.multi_intent && nonTrivial.length > 1) {
        setActionHeard(text);
        setActionLabel("Work plan");
        setDraft("");
        appendConversationEntry({ role: "user", text, at: at0 });
        await renderWorkPlan(plan.actions, text, at0);
        return;
      }
      if (
        plan.actions.length === 1 &&
        plan.actions[0]!.kind === "FOLLOW_UP_NOTE"
      ) {
        setActionHeard(text);
        setActionLabel(
          plan.actions[0]!.target_name !== undefined
            ? `Follow up → ${plan.actions[0]!.target_name}`
            : "Follow-up note",
        );
        setDraft("");
        appendConversationEntry({ role: "user", text, at: at0 });
        await renderFollowUp(plan.actions[0]!, text, at0);
        return;
      }
    }

    const action = classifyVoiceAction(text, capabilities);
    setActionHeard(action.heard);
    setActionLabel(action.actionLabel);
    setDraft("");
    setRouterAck(null);
    const at = new Date().toISOString();
    // Persist the prompt to the scrollable Otzar conversation thread.
    appendConversationEntry({ role: "user", text, at });
    // Local helper to log a terminal Work-OS result to the thread.
    const logAction = (resultText: string, status?: string): void =>
      appendConversationEntry({
        role: "action",
        text: resultText,
        at,
        kind: action.kind,
        ...(status !== undefined ? { status } : {}),
      });

    switch (action.kind) {
      case "INTERNAL_NAVIGATION":
      case "CONNECTOR_STATUS_NAVIGATION": {
        const dest = action.actionLabel.replace(/^.*→\s*/, "");
        setActionResult(`Opened ${dest}.`);
        logAction(`Opened ${dest}.`, "Navigated");
        speakConfirmation(action.spoken);
        recordVoiceAction({
          at,
          transcript: text,
          actionType: action.kind,
          target: action.route ?? null,
          result: "success",
        });
        if (action.route !== undefined) navigate(action.route);
        return;
      }
      case "EXTERNAL_URL_OPEN": {
        const url = action.url ?? "";
        const opened = safeOpenExternalUrl(url);
        if (opened === "OPENED") {
          setActionResult(action.spoken);
          speakConfirmation(action.spoken);
          recordVoiceAction({
            at,
            transcript: text,
            actionType: action.kind,
            target: url,
            result: "success",
          });
        } else {
          // Never silently fail: surface a clickable link instead.
          setExternalLinkPending(url);
          setActionResult("Tap the link below to open it in your browser.");
          speakConfirmation("Here's the link — tap it to open in your browser.");
          recordVoiceAction({
            at,
            transcript: text,
            actionType: action.kind,
            target: url,
            result: "needs_confirmation",
          });
        }
        return;
      }
      case "BLOCKED_URL": {
        setActionResult(
          `Blocked: ${action.blockedReason ?? "unsafe link"}.`,
        );
        logAction(`Blocked: ${action.blockedReason ?? "unsafe link"}.`, "Blocked");
        speakConfirmation(action.spoken);
        recordVoiceAction({
          at,
          transcript: text,
          actionType: action.kind,
          target: null,
          result: "blocked",
        });
        return;
      }
      case "UNSUPPORTED": {
        // A navigation/work request we can't satisfy. Handle it HERE
        // with honest copy — never hand it to the Twin.
        setActionResult(action.spoken);
        setActionStatus("Blocked");
        logAction(action.spoken, "Blocked");
        speakConfirmation(action.spoken);
        recordVoiceAction({
          at,
          transcript: text,
          actionType: action.kind,
          target: null,
          result: "blocked",
        });
        return;
      }
      case "CONNECTOR_STATUS_SUMMARY": {
        // Real read-only summary of connector/OAuth state — no fake green.
        setActionStatus("Read-only");
        setActionResult("Checking what's connected…");
        recordVoiceAction({
          at,
          transcript: text,
          actionType: action.kind,
          target: null,
          result: "success",
        });
        void buildConnectorSummary().then((summary) => {
          setActionResult(summary);
          appendConversationEntry({
            role: "action",
            text: summary,
            at,
            kind: action.kind,
            status: "Read-only",
          });
          speakConfirmation(
            summary.length > 220 ? "Here's your connector status." : summary,
          );
        });
        return;
      }
      case "APPROVALS_REVIEW": {
        // Navigate to Action Center AND fetch the REAL pending count.
        setActionStatus("Read-only");
        if (action.route !== undefined) navigate(action.route);
        recordVoiceAction({
          at,
          transcript: text,
          actionType: action.kind,
          target: action.route ?? null,
          result: "success",
        });
        void api.escalations.pending({ limit: 50 }).then((r) => {
          let msg: string;
          if (r.ok) {
            const n = r.data.escalations.length;
            msg =
              n === 0
                ? "I opened Action Center. Nothing is waiting on your approval right now."
                : `I opened Action Center. You have ${n} item${n === 1 ? "" : "s"} waiting on your approval.`;
          } else {
            msg =
              "I opened Action Center. The pending-approval summary isn't available right now.";
          }
          setActionResult(msg);
          appendConversationEntry({
            role: "action",
            text: msg,
            at,
            kind: action.kind,
            status: "Read-only",
          });
          speakConfirmation(msg);
        });
        return;
      }
      case "DRAFT_MESSAGE":
      case "SEND_REQUIRES_APPROVAL": {
        // REAL execution bridge: resolve the recipient and create a
        // governed ProposedAction (SEND_INTERNAL_NOTIFICATION) that
        // enters the ADR-0057 policy pipeline. NEVER sends externally;
        // the Action lands PROPOSED/approval-gated unless standing
        // authority auto-approves it. If the recipient can't be
        // resolved, fall back to a draft + target picker (no fake id).
        void executeMessageAction(action, at);
        return;
      }
      case "SCHEDULE_MEETING": {
        // A VISIBLE meeting-proposal card — NEVER routes to transcripts,
        // NEVER creates a calendar event. Preserves any "after X
        // confirms" prerequisite.
        const prereqMatch = action.spoken.match(
          /requires ([A-Za-z]+'s? confirmation[^.]*)/i,
        );
        // Phase 1274 — parse an explicit time ("at 11am pst") so the card
        // shows a Proposed time, not just "Choose a time".
        const explicit = extractExplicitTime(text);
        const proposedTime =
          explicit !== undefined
            ? formatProposedTime(explicit.time, explicit.timezone_label)
            : undefined;
        const tzInterp =
          explicit?.timezone_label !== undefined
            ? interpretTimezoneLabel(explicit.timezone_label)
            : null;
        const tzNote =
          explicit?.timezone_label !== undefined && tzInterp !== null
            ? `Interpreted ${explicit.timezone_label.toUpperCase()} as ${tzInterp.display}.`
            : undefined;
        const baseStatus =
          explicit !== undefined
            ? prereqMatch !== null
              ? "Time proposed · needs confirmation"
              : "Time proposed · event creation gated"
            : "Draft · choose a time";
        setPendingArtifact({
          kind: action.kind,
          title: action.targetEntity
            ? `Meeting proposal → ${action.targetEntity}`
            : "Meeting proposal",
          ...(action.targetEntity !== undefined
            ? { targetLabel: action.targetEntity }
            : {}),
          channel: "calendar",
          body: action.heard,
          status: baseStatus,
          ...(prereqMatch !== null
            ? { prerequisite: `Requires ${prereqMatch[1]}` }
            : {}),
          ...(proposedTime !== undefined ? { proposedTime } : {}),
          ...(explicit !== undefined ? { explicitTime: explicit.time } : {}),
          ...(tzNote !== undefined ? { timezoneNote: tzNote } : {}),
          runtimeNote: getCalendarCreateGateCopy({
            ...(prereqMatch !== null
              ? { prerequisite: `Requires ${prereqMatch[1]}` }
              : {}),
            ...(explicit !== undefined ? { explicitTime: explicit.time } : {}),
            ...(proposedTime !== undefined ? { proposedTime } : {}),
            ...(action.targetEntity !== undefined
              ? { targetLabel: action.targetEntity }
              : {}),
          }),
        });
        setActionResult(action.spoken);
        setActionStatus(baseStatus);
        logAction(action.spoken, baseStatus);
        speakConfirmation(action.spoken);
        recordVoiceAction({
          at,
          transcript: text,
          actionType: action.kind,
          target: action.targetEntity ?? null,
          result: "needs_confirmation",
        });
        // Phase 1273/1274 — REAL authority context FIRST. Free/busy is
        // gated on resolution: an unresolved participant NEVER triggers a
        // free/busy read and NEVER shows candidate windows (the Alex bug).
        if (action.targetEntity !== undefined) {
          void api.workOs
            .authorityContext({
              target_name: action.targetEntity,
              actions: ["CREATE_INTERNAL_MEETING", "READ_CALENDAR_FREEBUSY_TARGET"],
            })
            .then((r) => {
              if (!r.ok) return;
              const a = r.data.authority;
              const meetingPol = r.data.policies.find(
                (p) => p.action === "CREATE_INTERNAL_MEETING",
              );
              const who = a.target_display_name ?? action.targetEntity;
              if (
                a.target_resolution === "NOT_FOUND" ||
                a.target_resolution === "AMBIGUOUS"
              ) {
                const note =
                  a.target_resolution === "AMBIGUOUS"
                    ? `More than one teammate matches "${action.targetEntity}" — pick one.`
                    : `I don't know which ${action.targetEntity}. Choose a teammate or enter an email/calendar.`;
                // Unresolved → no availability, no free/busy call.
                setPendingArtifact((prev) =>
                  prev !== null && prev.kind === "SCHEDULE_MEETING"
                    ? {
                        ...prev,
                        authorityNote: note,
                        status: "Participant unresolved",
                        runtimeNote: getCalendarCreateGateCopy({
                          status: "Participant unresolved",
                        }),
                      }
                    : prev,
                );
                return;
              }
              // Resolved: surface authority + target local time honestly.
              const tzDisplay =
                a.target_timezone !== null
                  ? displayForIana(a.target_timezone)
                  : `using org default (${displayForIana(a.org_default_timezone)}) — ${who}'s timezone not configured`;
              const note = a.caller_is_manager_of_target
                ? `Manager authority over ${who} — internal scheduling allowed. ${who} local time: ${tzDisplay}.`
                : `${meetingPol?.reason ?? "Peer scheduling needs the teammate's confirmation."} ${who} local time: ${tzDisplay}.`;
              setPendingArtifact((prev) =>
                prev !== null && prev.kind === "SCHEDULE_MEETING"
                  ? { ...prev, authorityNote: note }
                  : prev,
              );
              // Free/busy ONLY now (resolved). Labelled honestly as the
              // caller's own calendar (target calendar address not wired).
              const win = tomorrowWorkWindow();
              void api.connectorData
                .calendarFreeBusy({ time_min: win.time_min, time_max: win.time_max })
                .then((fb) => {
                  let avail: string;
                  if (fb.ok) {
                    const free = freeWindowsFromBusy(
                      fb.data.busy,
                      win.time_min,
                      win.time_max,
                      DEFAULT_MEETING_MINUTES,
                    );
                    avail =
                      free.length === 0
                        ? `Checked your calendar only — no open ${DEFAULT_MEETING_MINUTES}-min slot in tomorrow's work hours.`
                        : `Checked your calendar only (${who}'s calendar address not wired):\n` +
                          free.slice(0, 3).map((w) => `• ${w}`).join("\n");
                  } else if (
                    fb.code === "SCOPE_REAUTH_REQUIRED" ||
                    fb.code === "NOT_CONNECTED" ||
                    fb.code === "TOKEN_REFRESH_FAILED"
                  ) {
                    avail =
                      "Google reconnect required for calendar availability.";
                  } else {
                    avail = "Couldn't check calendar availability right now.";
                  }
                  setPendingArtifact((prev) =>
                    prev !== null && prev.kind === "SCHEDULE_MEETING"
                      ? { ...prev, availabilityNote: avail }
                      : prev,
                  );
                });
            });
        }
        return;
      }
      case "ZOOM_RECORDINGS": {
        // REAL read-only bridge (Phase 1270): fetch the org's actual
        // Zoom cloud recordings via GET /api/v1/zoom/recordings. Honest
        // empty / reconnect / error states — never a faked recording.
        setActionStatus("Read-only");
        setActionResult("Pulling your Zoom cloud recordings…");
        if (action.route !== undefined) navigate(action.route);
        recordVoiceAction({
          at,
          transcript: text,
          actionType: action.kind,
          target: action.route ?? null,
          result: "success",
        });
        void api.connectorData.zoomRecordings({ page_size: 10 }).then((r) => {
          let msg: string;
          if (r.ok) {
            const recs = r.data.recordings;
            if (recs.length === 0) {
              msg =
                "Zoom is connected, but there are no cloud recordings on this account yet.";
            } else {
              const lines = recs.slice(0, 5).map((rec) => {
                const when = rec.start_time
                  ? new Date(rec.start_time).toLocaleString()
                  : "unknown time";
                return `• ${rec.topic} — ${when} · ${rec.duration_minutes} min`;
              });
              const more =
                recs.length > 5 ? `\n…and ${recs.length - 5} more.` : "";
              msg = `You have ${recs.length} Zoom recording${recs.length === 1 ? "" : "s"}:\n${lines.join("\n")}${more}`;
            }
          } else if (
            r.code === "NOT_CONNECTED" ||
            r.code === "TOKEN_REFRESH_FAILED" ||
            r.code === "SCOPE_REAUTH_REQUIRED"
          ) {
            msg =
              "Your Zoom connection needs a reconnect before I can read recordings. Open Workspace connections to fix it.";
          } else {
            msg =
              "I couldn't reach Zoom for your recordings right now. Try again in a moment.";
          }
          setActionResult(msg);
          appendConversationEntry({
            role: "action",
            text: msg,
            at,
            kind: action.kind,
            status: "Read-only",
          });
          speakConfirmation(
            msg.length > 220 ? "Here are your Zoom recordings." : msg,
          );
        });
        return;
      }
      case "ASK_TWIN": {
        // Phase 1286 — REAL ambient governed teammate routing. Resolve the
        // teammate in-org and CREATE a governed collaboration request via the
        // existing backend (same-org + RBAC/ABAC/TAR + policy approval + audit
        // enforced server-side). NEVER answers AS the teammate or their Twin —
        // it only creates a request they can act on under their own authority.
        void executeAskTwinAction(action, at);
        return;
      }
      case "MEETING_NOTES_TO_ACTIONS":
      case "WORKFLOW_START":
      case "READ_ONLY_SUMMARY": {
        // Governed work: drafted / proposed / routed / honestly blocked.
        // NEVER an external write, NEVER a faked agent answer.
        const result: "success" | "blocked" | "needs_confirmation" =
          action.requiresApproval === true || action.needsConfirmation === true
            ? "needs_confirmation"
            : action.blockedReason !== undefined && action.route === undefined
              ? "blocked"
              : "success";
        runWorkAction(action, at, result);
        return;
      }
      case "ADMIN_BLOCKED": {
        setActionResult(action.spoken);
        setRouterAck(action.spoken);
        logAction(action.spoken, "Blocked");
        speakConfirmation(action.spoken);
        recordVoiceAction({
          at,
          transcript: text,
          actionType: action.kind,
          target: null,
          result: "blocked",
        });
        return;
      }
      case "DRAFT_ONLY": {
        setActionResult(action.spoken);
        logAction(
          action.spoken,
          action.needsConfirmation === true ? "Approval required" : "Draft only",
        );
        speakConfirmation(action.spoken);
        recordVoiceAction({
          at,
          transcript: text,
          actionType: action.kind,
          target: action.route ?? null,
          result:
            action.needsConfirmation === true ? "needs_confirmation" : "success",
        });
        if (action.route !== undefined) navigate(action.route);
        return;
      }
      case "GOVERNED_CHAT":
      default: {
        setActionResult(null);
        recordVoiceAction({
          at,
          transcript: text,
          actionType: "GOVERNED_CHAT",
          target: null,
          result: "success",
        });
        // Same governed path as typed input; auto-speak effect voices
        // the response (premium-first) when enabled.
        const resp = await intent.send(text);
        if (resp !== null) {
          const answer =
            resp.speech_ready_text.length > 0
              ? resp.speech_ready_text
              : resp.response;
          appendConversationEntry({
            role: "otzar",
            text: answer,
            at: new Date().toISOString(),
          });
        } else if (intent.error !== null) {
          appendConversationEntry({
            role: "error",
            text: llmErrorCopy(intent.error),
            at: new Date().toISOString(),
          });
        }
        return;
      }
    }
  }

  async function handleSend(): Promise<void> {
    await handleSendText(draft);
  }

  // Phase 1264 — when the desktop (Whisper) transcript lands, submit it
  // through the SAME governed action/chat path as typed input. A ref
  // keeps the effect mount-stable while always calling the latest
  // handler.
  const handleSendTextRef = useRef(handleSendText);
  handleSendTextRef.current = handleSendText;
  useEffect(() => {
    const t = desktopCap.transcript.trim();
    if (t.length === 0) return;
    // Capture which engine transcribed BEFORE reset() clears it.
    const prov = desktopCapRef.current.provider;
    if (detectShellMode() === "tauri_webview") {
      // Desktop (unchanged): auto-submit through the governed path.
      setDraft(t);
      void handleSendTextRef.current(t);
      // handleSendText clears transcriptionProvider for typed input;
      // re-set it AFTER so the desktop-voice provider wins.
      setTranscriptionProvider(prov);
      desktopCapRef.current.reset();
      return;
    }
    // P0G browser fallback: the server transcript fills the SAME draft
    // the Web Speech path fills — the employee reviews, then sends.
    setDraft(t);
    setTranscriptionProvider(prov);
    setServerTranscribed(true);
    desktopCapRef.current.reset();
  }, [desktopCap.transcript]);

  // Phase 1266 — keep the conversation transcript scrolled to the
  // newest message as the thread grows.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.length]);

  function handleReplay(): void {
    if (intent.response === null) return;
    const sayable =
      intent.response.speech_ready_text.length > 0
        ? intent.response.speech_ready_text
        : intent.response.response;
    // force=true so an explicit replay can bypass the auto-speak
    // dedupe even if the same text was already auto-spoken once.
    speakAssistant(sayable, { source: "replay", force: true });
  }

  // ────────────────────────────────────────────────────────────
  // Status copy — the canonical orb state vocabulary (Phase 1264):
  // Idle / Listening / Transcribing / Thinking / Speaking / Error.
  // Closed-vocab + safety-honest. NEVER claims Sesame is active.
  // ────────────────────────────────────────────────────────────
  const hasVoiceError =
    desktopCap.state === "error" ||
    recognition.error !== null ||
    intent.error !== null;
  let status: string;
  let statusClass = "text-muted-foreground";
  if (recognition.listening || desktopCap.state === "recording") {
    status = "Listening…";
    statusClass = "text-primary";
  } else if (desktopCap.state === "transcribing") {
    status = "Transcribing…";
    statusClass = "text-primary";
  } else if (intent.processing) {
    status = "Thinking…";
    statusClass = "text-primary";
  } else if (premiumSpeaking || synthesis.speaking) {
    status = "Speaking…";
    statusClass = "text-primary";
  } else if (hasVoiceError) {
    status = "Error";
    statusClass = "text-destructive";
  } else if (serverTranscribed) {
    // P0G — the browser fallback finished: the transcript is in the
    // draft, waiting for the employee's review + send.
    status = "Transcribed via server";
    statusClass = "text-primary";
  } else if (synthesis.muted) {
    status = "Muted";
  } else if (intent.response !== null || actionResult !== null) {
    status = "Idle";
  } else {
    status = "Idle · speak or type";
  }

  // Phase 1264 — unified mic availability across shells. Desktop uses
  // MediaRecorder→Whisper; browser uses the local Web Speech API.
  // P0G: browsers additionally count the server-STT capture path.
  const voiceInputAvailable = sttPath !== "text_only";
  const micActive =
    recognition.listening || desktopCap.state === "recording";
  const micEnabled =
    !quiet &&
    voiceInputAvailable &&
    micPerm.state !== "denied" &&
    desktopCap.state !== "transcribing";

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
    // P0H — the wrapper is content-sized (never a full-width strip) and
    // the halo is pointer-events-none, so nothing outside the visible
    // pill can intercept clicks meant for the page underneath. Position:
    // default Tailwind anchor until the employee drags; then inline
    // styles (safe-area aware), snapped to the nearest horizontal edge
    // and persisted per device.
    const orbAnchorStyle =
      orbDragPoint !== null
        ? { left: `${orbDragPoint.x}px`, top: `${orbDragPoint.y}px` }
        : orbPos !== null
          ? orbPositionToStyle(orbPos)
          : undefined;
    const orbAnchorClass =
      orbDragPoint !== null || orbPos !== null
        ? "fixed z-[60]"
        : "fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[60]";
    return (
      <div
        ref={orbWrapperRef}
        className={orbAnchorClass}
        style={orbAnchorStyle}
        data-orb-edge={orbPos?.edge ?? "right"}
        data-orb-dragging={orbDragPoint !== null ? "true" : "false"}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute -inset-2 rounded-full blur-md transition-colors duration-700 ${orbHalo}`}
        />
        <button
          type="button"
          role="region"
          aria-label="Talk to Otzar"
          data-testid="ambient-otzar-bar"
          data-quiet={quiet ? "true" : "false"}
          data-presence={presenceState}
          data-presence-human={humanPresenceState(presenceState)}
          onClick={handleOrbClick}
          onPointerDown={handleOrbPointerDown}
          onPointerMove={handleOrbPointerMove}
          onPointerUp={handleOrbPointerUp}
          onPointerCancel={handleOrbPointerCancel}
          className={`relative flex touch-none items-center gap-2 overflow-hidden rounded-full border border-white/60 bg-white/70 supports-[backdrop-filter]:bg-white/55 ${ring.glow} px-5 py-3 text-sm font-semibold text-slate-900 ring-1 ring-black/[0.04] backdrop-blur-2xl backdrop-saturate-150 transition-[box-shadow] duration-700 hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-sky-400/40 ${
            quiet ? "px-4 py-2 text-xs text-slate-600" : ""
          }`}
        >
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 -z-10 ${ring.bloom} ${
              bloomLiving ? "motion-safe:animate-bloom-breathe" : ""
            }`}
          />
          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${ring.dot} ${quiet ? "" : "motion-safe:animate-pulse"}`} />
          {quiet ? <MoonStar className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          <span>{collapsedLabel}</span>
        </button>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // EXPANDED — full ambient dock with mic + text + response.
  // P0H: the dock anchors to the orb's CURRENT edge (left or right)
  // with its bottom clamped so the max-h-[88vh] panel never renders
  // off-screen. Default (never dragged) keeps the pre-P0H classes.
  // ────────────────────────────────────────────────────────────
  const dockAnchorStyle =
    orbPos !== null
      ? {
          ...(orbPos.edge === "left"
            ? {
                left: `calc(env(safe-area-inset-left, 0px) + ${ORB_EDGE_MARGIN}px)`,
              }
            : {
                right: `calc(env(safe-area-inset-right, 0px) + ${ORB_EDGE_MARGIN}px)`,
              }),
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${clampDockBottom(
            orbPos.bottom,
            typeof window !== "undefined" ? window.innerHeight : 800,
          )}px)`,
        }
      : undefined;
  const dockAnchorClass =
    orbPos !== null
      ? "fixed z-[60]"
      : "fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[60]";
  return (
    <div
      role="region"
      aria-label="Talk to Otzar"
      data-testid="ambient-otzar-bar"
      data-presence={presenceState}
      data-presence-human={humanPresenceState(presenceState)}
      data-orb-edge={orbPos?.edge ?? "right"}
      style={dockAnchorStyle}
      className={`group ${dockAnchorClass} flex max-h-[88vh] w-[min(92vw,440px)] flex-col overflow-hidden rounded-[1.4rem] border border-white/60 bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-2xl backdrop-saturate-150 text-slate-900 ring-1 ring-black/[0.04] transition-[box-shadow] duration-700 ${ring.glow}`}
    >
      {/* Siri-like ambient color field, diffused UNDER the glass — the state
          color blooms through the frost, it is not a hard border. Active states
          get a slow living drift (motion-safe). */}
      <span
        aria-hidden
        data-bloom={presenceState}
        className={`pointer-events-none absolute inset-0 -z-10 transition-opacity duration-1000 ${ring.bloom} ${
          bloomLiving ? "motion-safe:animate-bloom-breathe" : ""
        }`}
      />
      <div className="relative flex items-center justify-between gap-2 border-b border-black/[0.06] px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block h-2 w-2 rounded-full ${ring.dot} ${
              presenceState === "IDLE" || presenceState === "QUIET"
                ? ""
                : "motion-safe:animate-pulse"
            }`}
          />
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

      {/* [OTZAR-LIVE-6] Ambient memory chip — a calm, plain-language reflection
          of what Otzar is holding in working memory right now. Driven by real
          pendingClarification / draft state; disappears on resolve/cancel/expire.
          So the user can SEE that Otzar remembers what it just asked. */}
      {memoryChipText !== null ? (
        <div
          className={`relative flex items-center gap-1.5 border-b border-black/[0.06] px-3 py-1.5 transition-colors duration-500 ${memoryChipTone}`}
          data-testid="ambient-memory-chip"
          data-chip-intensity={memoryChipIntensity(memoryClar, pendingArtifact)}
        >
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${ring.dot} motion-safe:animate-pulse`}
          />
          <span className="text-[11px] font-medium">{memoryChipText}</span>
          <span className="text-[10px] opacity-60">· Otzar is holding this</span>
        </div>
      ) : null}

      {/* [OTZAR-LIVE-6] Related work nodes — a small, REAL node cluster grounded
          only in current state (people in the request, the draft, approvals,
          replies, context, corrections). Collapsed by default; nothing renders
          when nothing is in flight. Not a graph dashboard — a glanceable strip
          where each chip's intensity says whether it needs the human. */}
      {workNodes.length > 0 ? (
        <details
          className="group relative border-b border-black/[0.06]"
          data-testid="ambient-work-nodes"
        >
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-1.5 text-[11px] text-slate-600 hover:text-slate-900">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
            <span className="font-medium">Work nodes</span>
            <span className="opacity-60">· {workNodes.length}</span>
            <ChevronDown
              className="ml-auto h-3 w-3 opacity-50 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div
            className="flex flex-wrap gap-1.5 px-3 pb-2"
            data-testid="ambient-work-nodes-list"
          >
            {workNodes.map((n) => (
              <span
                key={n.id}
                data-testid="work-node"
                data-kind={n.kind}
                data-intensity={n.intensity}
                title={n.detail}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${chipIntensityClass(n.intensity)}`}
              >
                <span
                  aria-hidden
                  className={`inline-block h-1 w-1 rounded-full ${intensityDot(n.intensity)}`}
                />
                {n.label}
              </span>
            ))}
          </div>
        </details>
      ) : null}

      {(
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-2">
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
            if (shell === "tauri_webview" && desktopCap.supported) {
              // Phase 1264 — desktop voice is LIVE: record → transcribe
              // (Whisper) → governed action/chat. Honest copy by state.
              const desktopCopy =
                desktopCap.state === "error" && desktopCap.errorCode !== null
                  ? transcribeErrorCopy(desktopCap.errorCode)
                  : desktopCap.state === "recording"
                    ? "Listening on desktop — tap the mic again to send."
                    : desktopCap.state === "transcribing"
                      ? "Transcribing your audio…"
                      : "Desktop voice is on. Tap the mic and talk — Otzar transcribes and routes it the same way as typing.";
              const tone =
                desktopCap.state === "error" ? "error" : "muted";
              return (
                <div
                  className={`flex items-start gap-2 text-xs ${toneClass(tone)}`}
                  data-testid="ambient-permission-state"
                  data-native-mic={nativeMic}
                  data-desktop-capture={desktopCap.state}
                >
                  <Mic className="h-3 w-3 mt-0.5 shrink-0" aria-hidden />
                  <div className="flex-1 min-w-0">{desktopCopy}</div>
                </div>
              );
            }
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
            // P0G — browser server-STT path: live, honest state copy for
            // the MediaRecorder→server transcription flow (mirrors the
            // desktop branch above; typing always keeps working).
            if (useServerStt) {
              const serverCopy =
                desktopCap.state === "error" && desktopCap.errorCode !== null
                  ? transcribeErrorCopy(desktopCap.errorCode)
                  : desktopCap.state === "recording"
                    ? "Listening — tap the mic again to finish."
                    : desktopCap.state === "transcribing"
                      ? "Transcribing your audio…"
                      : "Voice is on. Tap the mic and talk — Otzar transcribes your words securely and puts the text here to review before sending.";
              const serverTone =
                desktopCap.state === "error" ? "error" : "muted";
              return (
                <div
                  className={`flex items-start gap-2 text-xs ${toneClass(serverTone)}`}
                  data-testid="ambient-permission-state"
                  data-server-stt={desktopCap.state}
                >
                  <Mic className="h-3 w-3 mt-0.5 shrink-0" aria-hidden />
                  <div className="flex-1 min-w-0">{serverCopy}</div>
                </div>
              );
            }
            const copy = micCopyFor(
              shell,
              micPerm.state,
              recognition.supported,
              desktopCap.supported,
            );
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
              variant={micActive ? "destructive" : "default"}
              onClick={() => void handleMicToggle()}
              data-testid="ambient-mic-button"
              data-mic-active={micActive ? "true" : "false"}
              aria-label={
                quiet
                  ? "Voice is paused in quiet mode"
                  : micActive
                    ? "Stop listening"
                    : voiceInputAvailable
                      ? "Start listening"
                      : "Voice input unavailable"
              }
              title={
                quiet
                  ? "Voice is paused in quiet mode"
                  : voiceInputAvailable
                    ? micActive
                      ? "Stop listening"
                      : "Speak to Otzar"
                    : "Voice input unavailable in this shell. Type instead."
              }
              disabled={!micEnabled}
              className="h-12 w-12 rounded-full p-0 shrink-0"
            >
              {voiceInputAvailable ? (
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
                voiceInputAvailable
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

          {/* Phase 2.9 — permissioned current-surface context. The user
              EXPLICITLY provides what they're looking at; it is visibly
              indicated and easy to clear. Not screen capture, not surveillance. */}
          <div className="flex items-center gap-2 text-xs">
            {surfaceContext !== null && surfaceContext.active ? (
              <div
                className="flex items-center gap-1.5 rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-0.5"
                data-testid="surface-context-chip"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-teal-500"
                  aria-hidden
                />
                <span className="text-muted-foreground">
                  Using current context
                  {surfaceContext.sourceLabel !== undefined &&
                  surfaceContext.sourceLabel.length > 0 ? (
                    <span className="opacity-70">
                      {" "}
                      · {surfaceContext.sourceLabel.slice(0, 40)}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground/70 underline hover:text-foreground"
                  onClick={() => clearSurfaceContext()}
                  data-testid="surface-context-clear"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="text-muted-foreground/70 hover:text-foreground"
                onPointerDown={capturePendingSelection}
                onMouseDown={capturePendingSelection}
                onClick={handleAddContext}
                data-testid="surface-context-add"
              >
                Add current context
              </button>
            )}
          </div>

          {!voiceInputAvailable ? (
            <p className="text-xs text-muted-foreground">
              Voice input unavailable in this shell. Type to Otzar instead.
            </p>
          ) : null}
          {/* P0G — honest post-transcription note + the existing server
              disclosure whenever the server engine is the active path. */}
          {serverTranscribed ? (
            <p
              className="text-xs text-muted-foreground"
              data-testid="server-stt-note"
            >
              {SERVER_STT_TRANSCRIBED_NOTE}
            </p>
          ) : null}
          {useServerStt ? (
            <p
              className="text-[10px] text-muted-foreground"
              data-testid="server-stt-disclosure"
            >
              {SERVER_STT_DISCLOSURE}
            </p>
          ) : null}
          {!synthesis.supported ? (
            <p className="text-xs text-muted-foreground">
              Speech output unavailable. Showing speech-ready text.
            </p>
          ) : null}
          {desktopCap.state === "error" && desktopCap.errorCode !== null ? (
            <p
              className="text-xs text-destructive"
              data-testid="desktop-capture-error"
            >
              {transcribeErrorCopy(desktopCap.errorCode)}
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

          {/* Phase 1266 — the persistent, scrollable Otzar conversation
              thread. Survives navigation + reloads (localStorage). Shows
              prompts, Otzar answers, Work-OS action results, and errors
              with ordering — so messages never disappear. */}
          {conversation.length > 0 ? (
            <div
              className="rounded-md border border-border bg-background/60"
              data-testid="otzar-conversation"
            >
              <div className="flex items-center justify-between px-2 py-1 border-b border-border">
                <span className="text-[11px] font-medium text-foreground">
                  Conversation
                </span>
                <button
                  type="button"
                  onClick={() => clearConversation()}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                  data-testid="otzar-conversation-clear"
                  aria-label="Clear conversation"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-44 overflow-y-auto px-2 py-1 space-y-1 text-xs">
                {conversation.map((m) => (
                  <div
                    key={m.id}
                    data-testid="otzar-conversation-entry"
                    data-role={m.role}
                    className={
                      m.role === "user"
                        ? "text-foreground"
                        : m.role === "error"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    <span className="font-medium">
                      {m.role === "user"
                        ? "You: "
                        : m.role === "otzar"
                          ? "Otzar: "
                          : m.role === "error"
                            ? "Error: "
                            : "Action: "}
                    </span>
                    <span className="whitespace-pre-wrap break-words">
                      {m.text}
                    </span>
                    {m.status !== undefined ? (
                      <span className="ml-1 text-[10px] opacity-70">
                        [{m.status}]
                      </span>
                    ) : null}
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          ) : null}

          {/* Phase 2.8 — compress the Voice Action Runtime into ONE calm
              outcome. The default surface is the human result; the machinery
              (Heard / Transcription / Action / Status / Voice) collapses behind
              "Details" so it stays available for recall + proof without making
              the orb a debug log. An actionable external link stays visible. */}
          {actionHeard !== null ? (
            <div
              className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs"
              data-testid="voice-action-panel"
            >
              <div className="text-foreground" data-testid="voice-action-outcome">
                {actionResult ?? actionLabel ?? `“${actionHeard}”`}
              </div>
              {externalLinkPending !== null ? (
                <div className="mt-1">
                  <a
                    href={externalLinkPending}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all"
                    data-testid="voice-external-link"
                  >
                    {externalLinkPending}
                  </a>
                </div>
              ) : null}
              <details className="mt-1">
                <summary className="cursor-pointer select-none text-[10px] text-muted-foreground/70 hover:text-muted-foreground">
                  Details
                </summary>
                <div className="mt-1 space-y-1">
                  <div>
                    <span className="font-medium text-foreground">Heard:</span>{" "}
                    <span className="text-muted-foreground">“{actionHeard}”</span>
                  </div>
                  {transcriptionProvider !== null ? (
                    <div data-testid="voice-transcription-provider">
                      <span className="font-medium text-foreground">
                        Transcription:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {transcriptionProvider === "deepgram"
                          ? "Deepgram"
                          : transcriptionProvider === "openai-whisper"
                            ? "OpenAI Whisper"
                            : transcriptionProvider}
                      </span>
                    </div>
                  ) : null}
                  {/* Only when the compact line is showing the RESULT — else the
                      label is already the compact outcome (avoid duplication). */}
                  {actionLabel !== null && actionResult !== null ? (
                    <div>
                      <span className="font-medium text-foreground">
                        Action:
                      </span>{" "}
                      <span className="text-muted-foreground">{actionLabel}</span>
                    </div>
                  ) : null}
                  {actionStatus !== null ? (
                    <div data-testid="voice-action-status">
                      <span className="font-medium text-foreground">
                        Status:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {actionStatus}
                      </span>
                    </div>
                  ) : null}
                  {actionVoicePath !== null ? (
                    <div>
                      <span className="font-medium text-foreground">
                        Voice:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {actionVoicePath === "premium_voice"
                          ? "Premium voice"
                          : actionVoicePath === "fallback_device_voice"
                            ? "Device fallback (premium unavailable)"
                            : actionVoicePath === "muted"
                              ? "Muted"
                              : "No audio"}
                      </span>
                    </div>
                  ) : null}
                </div>
              </details>
            </div>
          ) : null}

          {/* Phase 3A — the meeting digest. The compact counts live in the
              outcome line above; the full sections (decisions / blockers /
              follow-ups / risks / open questions) stay collapsed here, never a
              raw transcript dump. */}
          {transcriptDigest !== null ? (
            <details
              className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs"
              data-testid="transcript-digest"
            >
              <summary className="cursor-pointer select-none text-[11px] font-medium text-muted-foreground">
                View digest
              </summary>
              <div className="mt-1 space-y-1.5">
                <div className="text-muted-foreground">
                  {transcriptDigest.summary}
                </div>
                {(
                  [
                    ["Decisions", transcriptDigest.decisions],
                    ["Blockers", transcriptDigest.blockers],
                    [
                      "Follow-ups",
                      [
                        ...transcriptDigest.followUps,
                        ...transcriptDigest.commitments,
                      ],
                    ],
                    ["Risks", transcriptDigest.risks],
                    ["Open questions", transcriptDigest.openQuestions],
                  ] as Array<[string, TranscriptWorkItem[]]>
                )
                  .filter(([, items]) => items.length > 0)
                  .map(([title, items]) => (
                    <div key={title}>
                      <div className="font-medium text-foreground">{title}</div>
                      <ul className="ml-3 list-disc text-muted-foreground">
                        {items.map((item, i) => (
                          <li key={`${title}-${i}`}>
                            {item.text}
                            {item.ownerName !== undefined ? (
                              <span className="opacity-70">
                                {" "}
                                · {item.ownerName}
                              </span>
                            ) : null}
                            {item.dueHint !== undefined ? (
                              <span className="opacity-70">
                                {" "}
                                · {item.dueHint}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                <div className="text-[10px] text-muted-foreground/60">
                  Say "Create action items" to turn these into proposals.
                </div>
              </div>
            </details>
          ) : null}

          {/* Phase 3C — derived, read-only tracking. Compact answer is in the
              outcome line; the breakdown stays collapsed here. Honest: no faked
              completion, no invented staleness. */}
          {trackingSummary !== null ? (
            <details
              className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs"
              data-testid="work-tracking"
            >
              <summary className="cursor-pointer select-none text-[11px] font-medium text-muted-foreground">
                View tracking
              </summary>
              <div className="mt-1 space-y-1.5">
                {(
                  [
                    ["Blocked", trackingSummary.blockers],
                    ["Follow-ups", trackingSummary.followUps],
                    ["Waiting on", trackingSummary.waiting],
                    ["Needs attention", trackingSummary.needsAttention],
                  ] as Array<[string, WorkTrackingItem[]]>
                )
                  .filter(([, items]) => items.length > 0)
                  .map(([title, items]) => (
                    <div key={title}>
                      <div className="font-medium text-foreground">{title}</div>
                      <ul className="ml-3 list-disc text-muted-foreground">
                        {items.map((item) => (
                          <li key={`${title}-${item.id}`}>
                            {item.title}
                            {item.waitingOn !== undefined ? (
                              <span className="opacity-70">
                                {" "}
                                · waiting on {item.waitingOn}
                              </span>
                            ) : item.ownerName !== undefined ? (
                              <span className="opacity-70">
                                {" "}
                                · {item.ownerName}
                              </span>
                            ) : null}
                            {item.dueHint !== undefined ? (
                              <span className="opacity-70"> · {item.dueHint}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </details>
          ) : null}

          {/* Phase 3E — recent corrections + honest persistence status, so the
              employee sees Otzar heard and applied their correction. Collapsed,
              calm; no raw ids, no global-learning claims. */}
          {correctionHistory.length > 0 ? (
            <details
              className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs"
              data-testid="correction-history"
            >
              <summary className="cursor-pointer select-none text-[11px] font-medium text-muted-foreground">
                Recent corrections{" "}
                <span className="font-normal opacity-60">· this conversation</span>
              </summary>
              <ul className="mt-1 space-y-1">
                {correctionHistory.slice(0, 6).map((h) => (
                  <li key={h.id} data-testid="correction-history-item">
                    <span className="text-foreground">{h.appliedMessage}</span>{" "}
                    <span className="opacity-70">
                      · {persistenceStatusLabel(h.persistenceStatus)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {/* Phase 4B — cross-session readback of saved corrections/preferences
              from the typed governed rail. Collapsed; loads on open; human
              labels only; no raw ids / backend enums / global-learning claims. */}
          <details
            className="rounded-md border border-border bg-muted/20 px-2 py-1.5 text-xs"
            data-testid="saved-corrections"
            onToggle={(e) => {
              if (
                e.currentTarget.open &&
                savedCorrectionsStatus === "idle"
              ) {
                void loadSavedCorrections();
              }
            }}
          >
            <summary className="cursor-pointer select-none text-[11px] font-medium text-muted-foreground">
              Saved corrections{" "}
              <span className="font-normal opacity-60">· across sessions</span>
            </summary>
            <div className="mt-1">
              {savedCorrectionsStatus === "loading" ? (
                <div className="text-muted-foreground">Loading…</div>
              ) : savedCorrectionsStatus === "error" ? (
                <div
                  className="text-muted-foreground"
                  data-testid="saved-corrections-error"
                >
                  I couldn't load saved corrections just now.
                </div>
              ) : savedCorrectionsStatus === "loaded" &&
                savedCorrections.length === 0 ? (
                <div className="text-muted-foreground">
                  No saved corrections yet.
                </div>
              ) : savedCorrectionsStatus === "loaded" ? (
                <ul className="space-y-1">
                  {savedCorrections.map((c) => (
                    <li
                      key={c.correction_id}
                      className="flex items-start justify-between gap-2"
                      data-testid="saved-correction-item"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">
                          {correctionTypeLabel(c.correction_type)}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {c.safe_summary}
                        </span>
                        <span className="opacity-70">
                          {" "}
                          · {correctionScopeLabel(c.scope_type)} ·{" "}
                          {correctionStateLabel(c.state)}
                        </span>
                      </div>
                      {c.revocable && c.state === "ACTIVE" ? (
                        <button
                          type="button"
                          className="shrink-0 rounded border border-input bg-background/60 px-1.5 py-0.5 text-[10px] hover:bg-accent"
                          onClick={() => void handleRevokeCorrection(c)}
                          data-testid="saved-correction-revoke"
                        >
                          Stop using
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>

          {/* Phase 3B — transcript-derived proposed actions, reviewed calmly:
              save / send / dismiss, governed, no fake completion. */}
          {transcriptActions.length > 0 ? (
            <TranscriptActionReview
              actions={transcriptActions}
              onSave={(a) => void handleSaveAction(a)}
              onSend={(a) => void handleSendAction(a)}
              onDismiss={(a) => handleDismissAction(a)}
              onAsk={(a) => handleAskAction(a)}
            />
          ) : null}

          {/* Phase 1267 — the VISIBLE, EDITABLE work artifact (draft /
              proposed action / meeting proposal). No more hearsay UI. */}
          {pendingArtifact !== null ? (
            <WorkArtifactCard
              artifact={pendingArtifact}
              onConfirm={(body) => void confirmArtifact(body)}
              onCancel={() => setPendingArtifact(null)}
              onEdit={(body) => void reviseArtifact(body)}
              onOpen={(route) => navigate(route)}
            />
          ) : null}

          {/* Phase 1273 — a multi-intent plan renders as several linked
              cards. Confirming/cancelling one NEVER touches the others. */}
          {planArtifacts.length > 0 ? (
            <div className="space-y-1.5" data-testid="work-plan">
              <div className="text-[11px] font-medium text-muted-foreground">
                Plan · {planArtifacts.length} linked actions
              </div>
              {planArtifacts.map((pa, i) => (
                <WorkArtifactCard
                  key={`${pa.planId ?? "plan"}-${i}`}
                  artifact={pa}
                  onConfirm={(body) => void confirmPlanArtifact(i, body)}
                  onCancel={() =>
                    setPlanArtifacts((prev) => prev.filter((_, j) => j !== i))
                  }
                  onEdit={(body) =>
                    setPlanArtifacts((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, body } : x)),
                    )
                  }
                />
              ))}
            </div>
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
            {/* P0H — restore the default bottom-right anchor. Only
                shown once the orb has actually been moved. */}
            {orbPos !== null ? (
              <button
                type="button"
                onClick={handleResetOrbPosition}
                className="text-[11px] text-muted-foreground underline hover:text-foreground"
                data-testid="orb-position-reset"
                title="Move Otzar back to the bottom-right corner"
              >
                Reset position
              </button>
            ) : null}
          </div>

          <p
            className="text-[10px] text-muted-foreground"
            // Phase OTZAR-RETURN-3 — honest capture copy from the shared ambient
            // model, on hover. Only for the browser/text path: the desktop Tauri
            // path transcribes via the backend, so the model's "never raw audio"
            // copy does not describe it (the visible "no raw audio is stored"
            // line below stays accurate for both).
            title={
              useDesktopCapture || useServerStt
                ? undefined
                : describeAmbientVoiceMode({
                    device_mode: "desktop_browser",
                    capture_mode: recognition.supported ? "browser_stt" : "text_only",
                    status: recognition.supported ? "ready" : "unsupported",
                    browserRecognitionSupported: recognition.supported,
                  })
            }
          >
            Voice input:{" "}
            {useDesktopCapture
              ? "desktop mic → transcription"
              : useServerStt
                ? "microphone → secure server transcription"
                : recognition.supported
                  ? "browser STT"
                  : "text only"}
            {" · "}
            Voice output:{" "}
            {synthesis.muted
              ? "muted"
              : "premium voice · device fallback only if premium fails"}
            {" · "}
            No raw audio is stored.
          </p>

          {/* [OTZAR-LIVE-6] Removed the bottom deep-link row (My Twin / Approvals
              / Collaboration / Corrections / full Voice page) — it duplicated the
              left nav and pointed at a debug page. The ambient surface routes by
              voice/text ("show my approvals", "open collaboration"); it is not a
              second navigation bar. */}
        </div>
      )}
    </div>
  );
}
