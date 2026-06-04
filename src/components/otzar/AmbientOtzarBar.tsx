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

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Square,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Users,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useOtzarVoiceIntent } from "@/hooks/useOtzarVoiceIntent";

/**
 * The ambient Otzar dock. Mount once per authenticated employee
 * shell. No props — it reads its own state from React hooks.
 */
export function AmbientOtzarBar(): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();
  const intent = useOtzarVoiceIntent();

  // When recognition transcribes, mirror it into the draft so the
  // employee can edit before sending.
  useEffect(() => {
    if (recognition.transcript.length > 0) {
      setDraft(recognition.transcript);
    }
  }, [recognition.transcript]);

  // When a Foundation response arrives, speak the safe
  // speech_ready_text projection (unless muted / unsupported).
  useEffect(() => {
    if (intent.response === null) return;
    const sayable =
      intent.response.speech_ready_text.length > 0
        ? intent.response.speech_ready_text
        : intent.response.response;
    if (synthesis.supported && !synthesis.muted) {
      synthesis.speak(sayable);
    }
  }, [intent.response, synthesis]);

  function handleMicToggle(): void {
    if (recognition.listening) {
      recognition.stop();
    } else {
      recognition.reset();
      recognition.start();
    }
  }

  async function handleSend(): Promise<void> {
    const text = draft.trim();
    if (text.length === 0 || intent.processing) return;
    // Cancel any in-flight speech before sending the next turn.
    synthesis.stop();
    setDraft("");
    await intent.send(text);
  }

  function handleReplay(): void {
    if (intent.response === null) return;
    const sayable =
      intent.response.speech_ready_text.length > 0
        ? intent.response.speech_ready_text
        : intent.response.response;
    synthesis.speak(sayable);
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
  // Render — semi-transparent dock; bottom-right; not modal.
  // ────────────────────────────────────────────────────────────
  return (
    <div
      role="region"
      aria-label="Ambient Otzar"
      data-testid="ambient-otzar-bar"
      className="fixed bottom-4 right-4 z-50 w-[min(92vw,420px)] rounded-2xl border border-border bg-background/80 backdrop-blur shadow-lg supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="text-xs font-medium truncate">Otzar</span>
          <span className={`text-xs ${statusClass} truncate`}>{status}</span>
        </div>
        <div className="flex items-center gap-1">
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
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            title={expanded ? "Collapse" : "Expand"}
            className="h-7 w-7"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              size="icon"
              variant={recognition.listening ? "destructive" : "outline"}
              onClick={handleMicToggle}
              aria-label={
                recognition.listening
                  ? "Stop listening"
                  : recognition.supported
                    ? "Start listening"
                    : "Voice input unavailable"
              }
              title={
                recognition.supported
                  ? recognition.listening
                    ? "Stop listening"
                    : "Speak to Otzar"
                  : "Voice input unavailable in this shell. Type instead."
              }
              disabled={!recognition.supported}
            >
              {recognition.supported ? (
                <Mic className="h-4 w-4" />
              ) : (
                <MicOff className="h-4 w-4" />
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
              Voice input error: {recognition.error}
            </p>
          ) : null}
          {intent.error !== null ? (
            <p className="text-xs text-destructive">Otzar error: {intent.error}</p>
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
