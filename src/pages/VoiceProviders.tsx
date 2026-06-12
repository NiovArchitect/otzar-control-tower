// FILE: VoiceProviders.tsx
// PURPOSE: Phase 1256B — the premium voice activation path. One
//          admin surface composing the LIVE provider truth:
//
//            Voice input        DEEPGRAM + WHISPER_API (STT rows)
//            Realtime voice     OPENAI_REALTIME (connector registry)
//            Voice output       ELEVENLABS_TTS (connector registry)
//            Speaker detection  ASSEMBLYAI_STT (connector registry)
//            Desktop microphone Phase 1256A native bridge
//
//          plus the PRONUNCIATION TEST (spelled Otzar, spoken
//          "OatZar") and an honest production-voice summary that is
//          ready ONLY when real providers are connected. Setup key
//          names live behind "Developer details" — never primary
//          copy. No raw secrets exist anywhere on this surface.
// CONNECTS TO: api.voiceCaptures.providers, api.otzar.connectorAdapters,
//          src/lib/voice/native-mic.ts, useSpeechSynthesis
//          (pronunciation transform), docs/product/otzar-voice-persona.md,
//          tests/unit/voice-providers.test.tsx.

import { useEffect, useState } from "react";
import { AudioLines, Ear, Mic2, Sparkles, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { humanizeStatus } from "@/lib/labels/humanize";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { speakWithOtzarVoice } from "@/lib/voice/premium-tts";
import {
  detectNativeMicCapability,
  nativeMicCopy,
  type NativeMicStatus,
} from "@/lib/voice/native-mic";
import type {
  ConnectorAdapterRow,
  STTProviderStatusRow,
} from "@/lib/types/foundation";

const PRONUNCIATION_PHRASE = "Good morning. I'm Otzar.";

interface VoiceRow {
  key: string;
  purpose: string;
  display: string;
  unlocks: string;
  status: string;
  /** Setup-key NAMES for the developer disclosure (never values). */
  devDetails: string[];
}

function rowsFromAdapters(adapters: ConnectorAdapterRow[]): VoiceRow[] {
  const pick = (
    name: string,
    purpose: string,
    unlocks: string,
  ): VoiceRow | null => {
    const a = adapters.find((x) => x.provider_name === name);
    if (a === undefined) return null;
    return {
      key: name,
      purpose,
      display: a.display_name,
      unlocks,
      status: a.status,
      devDetails: a.required_envs,
    };
  };
  return [
    pick(
      "OPENAI_REALTIME",
      "Realtime conversation",
      "Natural back-and-forth voice with low latency — the premium conversational seat.",
    ),
    pick(
      "ELEVENLABS_TTS",
      "Voice output",
      "Otzar's warm, premium speaking voice (replaces the built-in browser voice).",
    ),
    pick(
      "ASSEMBLYAI_STT",
      "Speaker detection",
      "Who said what in meetings and calls — diarized transcripts.",
    ),
  ].filter((r): r is VoiceRow => r !== null);
}

export default function VoiceProviders(): JSX.Element {
  const synthesis = useSpeechSynthesis();
  // Phase 1259 — what the listener ACTUALLY heard, labeled honestly.
  const [lastVoice, setLastVoice] = useState<
    "PREMIUM" | "FALLBACK" | null
  >(null);
  async function handleHearIt(): Promise<void> {
    const outcome = await speakWithOtzarVoice(PRONUNCIATION_PHRASE, (t) =>
      synthesis.speak(t, { source: "test", force: true }),
    );
    setLastVoice(outcome.kind === "PREMIUM" ? "PREMIUM" : "FALLBACK");
  }
  const [stt, setStt] = useState<STTProviderStatusRow[]>([]);
  const [adapters, setAdapters] = useState<ConnectorAdapterRow[]>([]);
  const [nativeMic, setNativeMic] = useState<NativeMicStatus | null>(null);
  const [loadNote, setLoadNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.voiceCaptures
      .providers()
      .then((r) => {
        if (!cancelled && r.ok) setStt(r.data.providers);
        else if (!cancelled)
          setLoadNote("Couldn't load provider status — refresh to try again.");
      })
      .catch(() => {
        if (!cancelled)
          setLoadNote("Couldn't load provider status — refresh to try again.");
      });
    api.otzar
      .connectorAdapters()
      .then((r) => {
        if (!cancelled && r.ok) setAdapters(r.data.adapters);
      })
      .catch(() => {
        /* registry rows stay empty-honest */
      });
    void detectNativeMicCapability().then((cap) => {
      if (!cancelled) setNativeMic(cap.status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const inputRows: VoiceRow[] = stt
    .filter((p) => p.provider_name === "DEEPGRAM" || p.provider_name === "WHISPER_API")
    .map((p) => ({
      key: p.provider_name,
      purpose:
        p.provider_name === "DEEPGRAM"
          ? "Voice input (streaming)"
          : "Fallback transcription",
      display:
        p.provider_name === "DEEPGRAM" ? "Deepgram" : "Whisper (OpenAI)",
      unlocks:
        p.provider_name === "DEEPGRAM"
          ? "Production streaming speech-to-text — the first paid voice-input seat."
          : "Whisper transcription as the voice-input fallback.",
      status: p.status,
      devDetails:
        p.provider_name === "DEEPGRAM"
          ? ["DEEPGRAM_API_KEY"]
          : ["OPENAI_API_KEY"],
    }));
  const registryRows = rowsFromAdapters(adapters);
  const allRows = [...inputRows, ...registryRows];

  const inputReady = inputRows.some((r) => r.status === "CONFIGURED");
  const outputReady = registryRows.some(
    (r) => r.key === "ELEVENLABS_TTS" && r.status === "CONFIGURED",
  );
  const productionVoiceReady = inputReady && outputReady;

  return (
    <div className="space-y-5" data-testid="voice-providers-page">
      <PageHeader
        title="Voice Providers"
        description="Activate Otzar's premium voice. Each provider is connected with your organization's own credential — held server-side, never shown here, revocable any time."
      />

      <Card data-testid="voice-readiness-summary">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AudioLines className="h-4 w-4" aria-hidden /> Production voice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          <p data-testid="voice-readiness-verdict">
            {productionVoiceReady ? (
              <Badge variant="outline" className="text-[9px]">
                Ready
              </Badge>
            ) : (
              <>
                <Badge variant="outline" className="text-[9px]">
                  Setup needed
                </Badge>{" "}
                <span className="text-muted-foreground">
                  Production voice turns on when a voice-input provider and
                  the premium voice output are both connected. Until then,
                  typing and browser voice work fully — routed exactly the
                  same way.
                </span>
              </>
            )}
          </p>
          <p className="text-muted-foreground" data-testid="voice-mic-line">
            Desktop microphone:{" "}
            {nativeMic === null ? "Checking…" : nativeMicCopy(nativeMic)}
          </p>
        </CardContent>
      </Card>

      <Card data-testid="voice-provider-rows">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Ear className="h-4 w-4" aria-hidden /> Providers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {loadNote !== null ? (
            <p className="text-muted-foreground">{loadNote}</p>
          ) : null}
          {allRows.map((row) => (
            <div
              key={row.key}
              className="rounded-xl border border-border/70 p-3"
              data-testid="voice-provider-row"
              data-provider={row.key}
              data-status={row.status}
            >
              <div className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-medium text-foreground">
                    {row.display}
                  </span>{" "}
                  <Badge variant="outline" className="ml-1 text-[9px]">
                    {row.purpose}
                  </Badge>
                </span>
                <Badge variant="outline" className="text-[9px]">
                  {humanizeStatus(row.status)}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{row.unlocks}</p>
              <details className="mt-1.5">
                <summary className="cursor-pointer text-[10px] text-muted-foreground">
                  Developer details
                </summary>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Secure setup key name{row.devDetails.length > 1 ? "s" : ""}:{" "}
                  <span className="font-mono">{row.devDetails.join(", ")}</span>{" "}
                  — a reference on your deployment; the credential value never
                  appears here. Connect it org-scoped in Integrations &amp;
                  MCP.
                </p>
              </details>
            </div>
          ))}
          <p className="text-muted-foreground">
            Credentials are org-scoped provider connections — added by your
            admin, verified safely, revocable, and audited. No other
            organization can use them.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="voice-pronunciation-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Volume2 className="h-4 w-4" aria-hidden /> Pronunciation test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p>
            The product is spelled{" "}
            <span className="font-medium text-foreground">Otzar</span> and
            pronounced{" "}
            <span className="font-medium text-foreground">"OatZar"</span>.
            Every voice Otzar speaks with says it that way.
          </p>
          <p className="text-muted-foreground">
            Test phrase: "{PRONUNCIATION_PHRASE}"
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="voice-pronunciation-test-button"
            onClick={() => void handleHearIt()}
          >
            <Mic2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Hear it
          </Button>
          {lastVoice === "PREMIUM" ? (
            <p
              className="text-[10px] text-emerald-600"
              data-testid="voice-last-played-premium"
            >
              Premium voice preview — that was Otzar's real voice.
            </p>
          ) : null}
          {lastVoice === "FALLBACK" ? (
            <p
              className="text-[10px] text-muted-foreground"
              data-testid="voice-last-played-fallback"
            >
              Using the temporary device voice. The premium voice needs
              provider verification (check ElevenLabs credits/permissions in
              Integrations).
            </p>
          ) : null}
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Sparkles className="h-3 w-3" aria-hidden />
            The Otzar voice direction is original — warm, calm, premium, never
            a clone of any person or protected voice. Full persona:
            docs/product/otzar-voice-persona.md.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
