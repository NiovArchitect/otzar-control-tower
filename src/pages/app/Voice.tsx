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

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useOtzarVoiceIntent } from "@/hooks/useOtzarVoiceIntent";
import {
  useMicrophonePermission,
  type MicrophonePermissionState,
} from "@/hooks/useMicrophonePermission";

const TEST_VOICE_PHRASE =
  "Otzar voice is active. I can speak responses back to you.";

function permissionLabel(state: MicrophonePermissionState): {
  label: string;
  icon: typeof ShieldCheck;
  className: string;
} {
  switch (state) {
    case "granted":
      return {
        label: "Microphone permission: granted",
        icon: ShieldCheck,
        className: "text-emerald-600",
      };
    case "denied":
      return {
        label:
          "Microphone permission: denied. Enable microphone access in your browser / shell to use voice input.",
        icon: ShieldX,
        className: "text-destructive",
      };
    case "prompt":
      return {
        label: "Microphone permission: not yet granted",
        icon: ShieldQuestion,
        className: "text-amber-600",
      };
    case "unsupported":
      return {
        label:
          "Microphone permission: unsupported in this shell. Use typed transcript instead.",
        icon: ShieldX,
        className: "text-muted-foreground",
      };
    case "unknown":
    default:
      return {
        label: "Microphone permission: unknown",
        icon: ShieldQuestion,
        className: "text-muted-foreground",
      };
  }
}

export function Voice() {
  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();
  const intent = useOtzarVoiceIntent();
  const micPerm = useMicrophonePermission();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (recognition.transcript.length > 0) setDraft(recognition.transcript);
  }, [recognition.transcript]);

  useEffect(() => {
    if (intent.response === null) return;
    const sayable =
      intent.response.speech_ready_text.length > 0
        ? intent.response.speech_ready_text
        : intent.response.response;
    if (synthesis.supported && !synthesis.muted) synthesis.speak(sayable);
  }, [intent.response, synthesis]);

  async function handleMicToggle(): Promise<void> {
    if (recognition.listening) {
      recognition.stop();
      return;
    }
    if (micPerm.state !== "granted" && micPerm.state !== "unsupported") {
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
    synthesis.speak(TEST_VOICE_PHRASE);
  }

  function handleReplay(): void {
    if (intent.response === null) return;
    const sayable =
      intent.response.speech_ready_text.length > 0
        ? intent.response.speech_ready_text
        : intent.response.response;
    synthesis.speak(sayable);
  }

  const pl = permissionLabel(micPerm.state);
  const PermIcon = pl.icon;
  const response = intent.response;

  let status = "Ambient. Click the microphone or type to Otzar.";
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
    status = "Ready for next turn.";
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 space-y-6">
      <PageHeader
        title="Talk to Otzar"
        description="Speak or type. Otzar responds with text + your device's TTS. No raw audio is stored."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Microphone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`flex items-center gap-2 text-sm ${pl.className}`}
            data-testid="voice-permission-state"
          >
            <PermIcon className="h-4 w-4" />
            <span>{pl.label}</span>
            {micPerm.state === "prompt" ? (
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
              variant={recognition.listening ? "destructive" : "default"}
              onClick={() => void handleMicToggle()}
              disabled={!recognition.supported || micPerm.state === "denied"}
              aria-label={
                recognition.listening
                  ? "Stop listening"
                  : recognition.supported
                    ? "Start listening"
                    : "Voice input unavailable"
              }
              className="h-16 w-16 rounded-full p-0 shrink-0"
            >
              {recognition.supported ? (
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
                {recognition.supported
                  ? "Browser speech-to-text runs locally; only the transcript string is sent to Otzar."
                  : "Voice input unavailable in this shell. Type to Otzar."}
              </div>
            </div>
          </div>

          {recognition.error !== null ? (
            <div className="text-sm text-destructive">
              Voice input error: {recognition.error}
            </div>
          ) : null}
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
            {synthesis.speaking ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={synthesis.stop}
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : null}
          </div>
          {intent.error !== null ? (
            <div className="text-sm text-destructive">
              Otzar error: {intent.error}
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
              {recognition.supported ? "browser STT (local)" : "text only"} ·
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
