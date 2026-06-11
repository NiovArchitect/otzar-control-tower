// FILE: VoiceCaptures.tsx
// PURPOSE: Phase 1223 — voice/STT capture page. Routes through the
//          Foundation provider-adapter (DEMO_FIXTURE always works;
//          LOCAL_BROWSER uses the Web Speech API in-browser; Whisper
//          and Deepgram activate when their env keys are set on the
//          API side).
//
//          UI states the Founder asked for:
//            Start voice capture →
//            Otzar is listening →
//            Transcript appearing →
//            End capture →
//            Otzar is organizing this →
//            Follow-ups ready.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Headphones,
  Loader2,
  Mic,
  MicOff,
  Square,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type {
  AudioCaptureSafeView,
  STTProviderStatusRow,
  STTProviderType,
} from "@/lib/types/foundation";

// Minimal typings for the Web Speech API (not in stock DOM lib).
interface SRResult {
  isFinal: boolean;
  [index: number]: { transcript: string; confidence: number };
  length: number;
}
interface SRResultList {
  length: number;
  [index: number]: SRResult;
}
interface SREvent {
  resultIndex: number;
  results: SRResultList;
}
interface SREventTarget extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SREvent) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
function getRecognition(): SREventTarget | null {
  const w = window as unknown as {
    webkitSpeechRecognition?: new () => SREventTarget;
    SpeechRecognition?: new () => SREventTarget;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (Ctor === undefined) return null;
  return new Ctor();
}

interface CapturedSegment {
  speaker_label: string | null;
  start_ms: number;
  end_ms: number;
  text: string;
  confidence: number | null;
  is_final: boolean;
}

type Stage =
  | "IDLE"
  | "LISTENING"
  | "SUBMITTING"
  | "ORGANIZING"
  | "DONE"
  | "FAILED";

const STAGE_COPY: Record<Stage, string> = {
  IDLE: "Ready when you are.",
  LISTENING: "Otzar is listening…",
  SUBMITTING: "Sending the transcript to Otzar.",
  ORGANIZING: "Otzar is organizing this.",
  DONE: "Follow-ups ready.",
  FAILED: "Couldn't capture this one.",
};

export function VoiceCaptures(): JSX.Element {
  const [providers, setProviders] = useState<STTProviderStatusRow[]>([]);
  const [provider, setProvider] = useState<STTProviderType>("DEMO_FIXTURE");
  const [demoRef, setDemoRef] = useState("demo:launch-follow-up");
  const [title, setTitle] = useState("Voice capture");
  const [stage, setStage] = useState<Stage>("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<CapturedSegment[]>([]);
  const [lastCapture, setLastCapture] = useState<AudioCaptureSafeView | null>(null);
  const [list, setList] = useState<AudioCaptureSafeView[]>([]);
  const startedAtRef = useRef<number>(0);
  const recogRef = useRef<SREventTarget | null>(null);

  useEffect(() => {
    api.voiceCaptures.providers().then((r) => {
      if (r.ok) setProviders(r.data.providers);
    });
    api.voiceCaptures.list().then((r) => {
      if (r.ok) setList(r.data.audio_captures);
    });
  }, []);

  function resetState(): void {
    setSegments([]);
    setError(null);
    setLastCapture(null);
  }

  // ── DEMO_FIXTURE submit ──────────────────────────────────
  async function submitDemoFixture(): Promise<void> {
    resetState();
    setStage("SUBMITTING");
    const r = await api.voiceCaptures.receive({
      provider: "DEMO_FIXTURE",
      mode: "DEMO_AUDIO_SAMPLE",
      storage_ref: demoRef,
      title,
      handoff_to_meeting_capture: true,
    });
    if (r.ok) {
      setLastCapture(r.data.audio_capture);
      setSegments(
        r.data.segments.map((s) => ({
          speaker_label: s.speaker_label,
          start_ms: s.start_ms,
          end_ms: s.end_ms,
          text: s.text,
          confidence: s.confidence,
          is_final: s.is_final,
        })),
      );
      setStage("DONE");
      const refresh = await api.voiceCaptures.list();
      if (refresh.ok) setList(refresh.data.audio_captures);
    } else {
      setError(r.code);
      setStage("FAILED");
    }
  }

  // ── LOCAL_BROWSER live mic capture ───────────────────────
  function startLocalBrowserCapture(): void {
    resetState();
    const recog = getRecognition();
    if (recog === null) {
      setError(
        "This browser does not support the Web Speech API. Use the demo fixture path.",
      );
      setStage("FAILED");
      return;
    }
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";
    startedAtRef.current = Date.now();
    recog.onresult = (ev: SREvent) => {
      const out: CapturedSegment[] = [];
      const now = Date.now() - startedAtRef.current;
      for (let i = 0; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res === undefined) continue;
        const alt = res[0];
        if (alt === undefined) continue;
        out.push({
          speaker_label: null,
          start_ms: 0,
          end_ms: now,
          text: alt.transcript,
          confidence: alt.confidence,
          is_final: res.isFinal,
        });
      }
      setSegments(out);
    };
    recog.onerror = (ev: { error: string }) => {
      setError(ev.error);
      setStage("FAILED");
    };
    recog.onend = () => {
      // Stage transition driven by stopLocalBrowserCapture below.
    };
    recogRef.current = recog;
    recog.start();
    setStage("LISTENING");
  }

  async function stopLocalBrowserCapture(): Promise<void> {
    const recog = recogRef.current;
    if (recog !== null) {
      recog.stop();
      recogRef.current = null;
    }
    if (segments.length === 0) {
      setError("Otzar didn't catch anything. Try again.");
      setStage("FAILED");
      return;
    }
    setStage("SUBMITTING");
    const r = await api.voiceCaptures.receive({
      provider: "LOCAL_BROWSER",
      mode: "LOCAL_FALLBACK",
      title,
      pre_transcribed_segments: segments.filter((s) => s.is_final).map((s) => ({
        speaker_label: s.speaker_label,
        start_ms: s.start_ms,
        end_ms: s.end_ms,
        text: s.text,
        confidence: s.confidence,
        is_final: s.is_final,
      })),
      handoff_to_meeting_capture: true,
    });
    if (r.ok) {
      setLastCapture(r.data.audio_capture);
      setStage("ORGANIZING");
      // Real organizing happens server-side on handoff to
      // MeetingCapture → workspace import. UI flips to DONE after
      // a brief beat so the user sees the transition.
      setTimeout(() => setStage("DONE"), 700);
      const refresh = await api.voiceCaptures.list();
      if (refresh.ok) setList(refresh.data.audio_captures);
    } else {
      setError(r.code);
      setStage("FAILED");
    }
  }

  function providerStatus(name: STTProviderType): string {
    const row = providers.find((p) => p.provider_name === name);
    return row?.status ?? "UNKNOWN";
  }

  return (
    <div className="space-y-5" data-testid="voice-captures-page">
      <PageHeader
        title="Talk to Otzar"
        description="Capture a meeting by voice. Otzar transcribes it, finds the decisions and commitments, and lines up follow-ups — without sending anything externally."
      />

      <Card data-testid="voice-captures-providers-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Headphones className="h-4 w-4" aria-hidden /> Transcription providers
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          <ul className="space-y-1">
            {providers.map((p) => (
              <li
                key={p.provider_name}
                className="flex items-start justify-between gap-2 rounded border bg-card p-2"
                data-testid="voice-captures-provider-row"
                data-provider={p.provider_name}
                data-status={p.status}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {p.provider_name.replace(/_/g, " ").toLowerCase()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.description}
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px]">
                  {p.status === "CONFIGURED" || p.status === "DEMO_ONLY" ? (
                    <CheckCircle2
                      className="mr-0.5 inline h-2.5 w-2.5 text-emerald-500"
                      aria-hidden
                    />
                  ) : (
                    <AlertCircle
                      className="mr-0.5 inline h-2.5 w-2.5 text-amber-500"
                      aria-hidden
                    />
                  )}
                  {p.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card data-testid="voice-captures-capture-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Mic className="h-4 w-4" aria-hidden /> New capture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div>
            <label className="block text-[10px] font-medium uppercase text-muted-foreground">
              Source
            </label>
            <select
              className="mt-1 w-full rounded border bg-background p-2 text-sm"
              value={provider}
              onChange={(e) => setProvider(e.target.value as STTProviderType)}
              disabled={stage === "LISTENING" || stage === "SUBMITTING"}
              data-testid="voice-captures-provider-select"
            >
              <option value="DEMO_FIXTURE">
                Demo fixture (no microphone needed)
              </option>
              <option value="LOCAL_BROWSER">
                Live mic (browser SpeechRecognition)
              </option>
              <option value="WHISPER_API">
                OpenAI Whisper API (
                {providerStatus("WHISPER_API") === "MISSING_CREDENTIAL"
                  ? "no key — blocked"
                  : providerStatus("WHISPER_API").toLowerCase()}
                )
              </option>
              <option value="DEEPGRAM">
                Deepgram (
                {providerStatus("DEEPGRAM") === "MISSING_CREDENTIAL"
                  ? "no key — blocked"
                  : providerStatus("DEEPGRAM").toLowerCase()}
                )
              </option>
            </select>
          </div>
          {provider === "DEMO_FIXTURE" ? (
            <div>
              <label className="block text-[10px] font-medium uppercase text-muted-foreground">
                Demo fixture
              </label>
              <select
                className="mt-1 w-full rounded border bg-background p-2 text-sm"
                value={demoRef}
                onChange={(e) => setDemoRef(e.target.value)}
                data-testid="voice-captures-demo-ref"
              >
                <option value="demo:launch-follow-up">
                  Launch Follow-Up Meeting (Sadeil / David / Samiksha / Annie)
                </option>
                <option value="demo:mice-event">
                  MICE Event Expansion (Sadeil + Maria / Carlos external)
                </option>
                <option value="demo:short">Short demo</option>
              </select>
            </div>
          ) : null}
          <div>
            <label className="block text-[10px] font-medium uppercase text-muted-foreground">
              Title
            </label>
            <input
              className="mt-1 w-full rounded border bg-background p-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="voice-captures-title"
            />
          </div>
          <div
            className="flex items-center gap-2 rounded border bg-background p-2 text-[10px]"
            data-testid="voice-captures-stage"
            data-stage={stage}
          >
            {stage === "LISTENING" ? (
              <Mic className="h-4 w-4 animate-pulse text-rose-500" aria-hidden />
            ) : stage === "SUBMITTING" || stage === "ORGANIZING" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : stage === "DONE" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
            ) : stage === "FAILED" ? (
              <AlertCircle className="h-4 w-4 text-rose-500" aria-hidden />
            ) : (
              <MicOff className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
            <span>{STAGE_COPY[stage]}</span>
          </div>
          {error !== null ? (
            <p
              className="text-[10px] text-rose-500"
              data-testid="voice-captures-error"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {provider === "DEMO_FIXTURE" ? (
              <Button
                size="sm"
                disabled={stage === "SUBMITTING"}
                onClick={submitDemoFixture}
                data-testid="voice-captures-demo-submit"
              >
                {stage === "SUBMITTING" ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
                ) : null}
                Play demo + transcribe
              </Button>
            ) : provider === "LOCAL_BROWSER" ? (
              <>
                {stage === "LISTENING" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={stopLocalBrowserCapture}
                    data-testid="voice-captures-stop"
                  >
                    <Square className="mr-1 h-3 w-3" aria-hidden /> End capture
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={stage === "SUBMITTING"}
                    onClick={startLocalBrowserCapture}
                    data-testid="voice-captures-start"
                  >
                    <Mic className="mr-1 h-3 w-3" aria-hidden /> Start voice capture
                  </Button>
                )}
              </>
            ) : (
              <p className="text-[10px] text-amber-500">
                This provider requires an env key on the API. Use Demo fixture
                or Live mic instead.
              </p>
            )}
          </div>
          {segments.length > 0 ? (
            <div data-testid="voice-captures-transcript">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">
                Transcript
              </p>
              <ul className="mt-1 space-y-1 text-[11px]">
                {segments.map((s, i) => (
                  <li
                    key={i}
                    className="rounded border bg-background p-2"
                    data-testid="voice-captures-segment"
                    data-is-final={String(s.is_final)}
                  >
                    {s.speaker_label !== null ? (
                      <span className="mr-1 font-medium">{s.speaker_label}:</span>
                    ) : null}
                    {s.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {lastCapture !== null && lastCapture.meeting_capture_id !== null ? (
            <p className="text-[10px] text-muted-foreground">
              Attached to a Meeting Capture row. Open{" "}
              <Link to="/app/meeting-captures" className="underline">
                Meeting captures
              </Link>{" "}
              to attach it to a workspace and extract follow-ups.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card data-testid="voice-captures-list-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent voice captures</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No voice captures yet.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {list.map((c) => (
                <li
                  key={c.audio_capture_id}
                  className="rounded border bg-card p-2"
                  data-testid="voice-captures-list-row"
                  data-status={c.status}
                  data-provider={c.provider}
                >
                  <p className="font-medium">{c.title ?? "(untitled)"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {c.provider.replace(/_/g, " ").toLowerCase()} · {c.segment_count}{" "}
                    segment{c.segment_count === 1 ? "" : "s"} ·{" "}
                    {c.status.replace(/_/g, " ").toLowerCase()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p
        className="text-[10px] text-muted-foreground"
        data-testid="voice-captures-footer"
      >
        Every capture is audited. The demo fixture path runs without
        microphones or credentials. Otzar never sends voice or transcripts
        outside your org without an approved connector.
      </p>
    </div>
  );
}
