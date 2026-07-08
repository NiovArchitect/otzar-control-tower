// FILE: VoiceTwin.tsx
// PURPOSE: VF.4b CT voice surface scaffolding per ADR-0085 §8.
//          Text-only talk surface that consumes POST /api/v1/voice/
//          intents (Foundation VF.4a LIVE per Foundation PR #213).
//          Operators type a transcript + pick a surface + pick a
//          risk tier; the Foundation route constructs a governed
//          voice-intent envelope + emits a VOICE_INTENT_RECEIVED
//          audit event; this page renders the SAFE envelope
//          projection back to the operator.
//
//          CANONICAL FOUNDER DOCTRINE (per ADR-0085 §1):
//            "Otzar is voice-first because work should move through
//             natural communication, not endless clicking."
//            "Users should be able to talk to their AI Twin the way
//             they would talk to a trusted teammate."
//            "Voice reduces friction, increases adoption, and makes
//             governed intelligence feel alive."
//            "Voice is an interface layer over Foundation
//             governance, not a bypass around it."
//
//          VF.4b is text-only by design — NO microphone access, NO
//          audio capture, NO browser MediaRecorder API. The
//          envelope flow + governance posture are proved end-to-
//          end via typed input; Sesame runtime + audio capture
//          forward-substrate per ADR-0085 §8 VF.5+ (Founder-gated).
//
// CONNECTS TO: src/lib/voice/{types,labels}.ts (substrate +
//              customer-admin vocabulary), src/lib/api.ts
//              (api.voice namespace), src/components/PageHeader.tsx.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import {
  VOICE_APPROVAL_CHAIN_STATE_LABELS,
  VOICE_CONFIRMATION_STATE_LABELS,
  VOICE_FAILURE_CODE_LABELS,
  VOICE_INTENT_CLASS_LABELS,
  VOICE_SOURCE_SURFACE_LABELS,
} from "@/lib/voice/labels";
import type {
  CtVoiceIntentClass,
  CtVoiceIntentSubmitSuccess,
  CtVoiceSourceSurface,
} from "@/lib/voice/types";

const DOCTRINE_LINES = [
  "Otzar is voice-first because work should move through natural communication, not endless clicking.",
  "Users should be able to talk to their AI Teammate the way they would talk to a trusted teammate.",
  "Voice reduces friction, increases adoption, and makes governed intelligence feel alive.",
  "Voice is an interface layer over Foundation governance, not a bypass around it.",
];

const NO_AUDIO_NOTICE =
  "This surface is text-only by design. Microphone access, audio capture, and browser recording are NOT used. Live voice runtime (Sesame) is gated by the Foundation readiness assessment.";

const PRIVACY_NOTICE =
  "Your transcript stays in this browser as you type it. Foundation receives the transcript to govern the intent + write a privacy-safe audit row; the response carries counts + states only, never the raw transcript prose.";

const SOURCE_SURFACE_OPTIONS: ReadonlyArray<CtVoiceSourceSurface> = [
  "AI_TWIN",
  "AI_TEAMMATE",
  "ADMIN_TWIN",
  "WORKFLOW_RECOMMENDATION",
  "PROPOSED_ACTION",
  "APPROVAL_REQUEST",
  "CONNECTOR_QUESTION",
  "MEETING_FOLLOWUP",
  "HIVE",
  "AGENT_PLAYGROUND",
  "AUDIT_EXPLANATION",
  "EXECUTIVE_BRIEFING",
  "ONBOARDING",
];

const INTENT_CLASS_OPTIONS: ReadonlyArray<CtVoiceIntentClass> = [
  "LOW",
  "MEDIUM",
  "HIGH",
];

function DoctrineCard() {
  return (
    <Card data-testid="voice-doctrine-card">
      <CardHeader>
        <CardTitle>Voice-first doctrine</CardTitle>
        <CardDescription>{NO_AUDIO_NOTICE}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {DOCTRINE_LINES.map((line) => (
          <p key={line} className="text-muted-foreground">
            {line}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

function EnvelopeResult({
  envelope,
}: {
  envelope: CtVoiceIntentSubmitSuccess;
}) {
  const surfaceLabel = VOICE_SOURCE_SURFACE_LABELS[envelope.source_surface];
  const intentLabel = VOICE_INTENT_CLASS_LABELS[envelope.intent_class];
  return (
    <Card data-testid="voice-envelope-result">
      <CardHeader>
        <CardTitle>Envelope received</CardTitle>
        <CardDescription>
          Foundation recorded a governed voice intent. The transcript stays in
          your browser; Foundation never returns it over the wire.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{surfaceLabel.display}</Badge>
          <Badge variant="outline">{intentLabel.display}</Badge>
          <Badge variant="outline">
            {VOICE_CONFIRMATION_STATE_LABELS[envelope.confirmation_state]}
          </Badge>
          <Badge variant="outline">
            {VOICE_APPROVAL_CHAIN_STATE_LABELS[envelope.approval_chain_state]}
          </Badge>
        </div>
        <Separator />
        <div>
          <div className="font-medium">Intent identifier</div>
          <div className="font-mono text-xs text-muted-foreground">
            {envelope.intent_id}
          </div>
        </div>
        <div>
          <div className="font-medium">Audit event identifier</div>
          <div className="font-mono text-xs text-muted-foreground">
            {envelope.audit_event_id}
          </div>
        </div>
        <div>
          <div className="font-medium">Retention class</div>
          <div className="text-muted-foreground">
            {envelope.retention_class}
          </div>
        </div>
        <div>
          <div className="font-medium">Created</div>
          <div className="text-muted-foreground">{envelope.created_at}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function VoiceTwinPage() {
  const [sourceSurface, setSourceSurface] =
    useState<CtVoiceSourceSurface>("AI_TWIN");
  const [intentClass, setIntentClass] = useState<CtVoiceIntentClass>("LOW");
  const [transcript, setTranscript] = useState("");
  const [envelope, setEnvelope] = useState<CtVoiceIntentSubmitSuccess | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingMedium, setPendingMedium] = useState<
    "MEDIUM" | "HIGH" | null
  >(null);

  const surfaceLabel = VOICE_SOURCE_SURFACE_LABELS[sourceSurface];
  const intentLabel = VOICE_INTENT_CLASS_LABELS[intentClass];

  const submit = useMutation({
    mutationFn: async () => {
      return api.voice.submitIntent({
        source_surface: sourceSurface,
        transcript_text: transcript.trim(),
        intent_class: intentClass,
      });
    },
    onSuccess: (apiResult) => {
      if (!apiResult.ok) {
        // Transport-level or Foundation-level 4xx/5xx. Map the
        // canonical failure code to the customer-admin label.
        const lookup =
          VOICE_FAILURE_CODE_LABELS[
            apiResult.code as keyof typeof VOICE_FAILURE_CODE_LABELS
          ];
        setErrorMessage(lookup ?? VOICE_FAILURE_CODE_LABELS["INTERNAL_ERROR"]);
        setEnvelope(null);
        return;
      }
      const data = apiResult.data;
      if (data.ok) {
        setEnvelope(data);
        setErrorMessage(null);
        return;
      }
      const friendly =
        VOICE_FAILURE_CODE_LABELS[data.code] ??
        VOICE_FAILURE_CODE_LABELS["INTERNAL_ERROR"];
      setErrorMessage(friendly);
      setEnvelope(null);
    },
    onError: () => {
      setErrorMessage(VOICE_FAILURE_CODE_LABELS["INTERNAL_ERROR"]);
      setEnvelope(null);
    },
  });

  function handleSubmit() {
    if (transcript.trim().length === 0) {
      setErrorMessage(VOICE_FAILURE_CODE_LABELS["INVALID_FIELD"]);
      return;
    }
    setErrorMessage(null);
    if (intentClass === "MEDIUM" || intentClass === "HIGH") {
      setPendingMedium(intentClass);
      return;
    }
    submit.mutate();
  }

  function confirmHighOrMedium() {
    setPendingMedium(null);
    submit.mutate();
  }

  function cancelHighOrMedium() {
    setPendingMedium(null);
  }

  const submitDisabled = submit.isPending || transcript.trim().length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voice — talk to your AI Teammate"
        description="Text-only voice surface per ADR-0085. Voice flows through Foundation governance, not around it."
      />

      <DoctrineCard />

      <Card>
        <CardHeader>
          <CardTitle>Compose a voice intent</CardTitle>
          <CardDescription>{PRIVACY_NOTICE}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-1">
            <Label htmlFor="voice-surface">Where are you talking from?</Label>
            <Select
              value={sourceSurface}
              onValueChange={(value) =>
                setSourceSurface(value as CtVoiceSourceSurface)
              }
            >
              <SelectTrigger id="voice-surface" data-testid="voice-surface-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_SURFACE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {VOICE_SOURCE_SURFACE_LABELS[opt].display}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {surfaceLabel.description}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="voice-intent-class">Risk tier</Label>
            <Select
              value={intentClass}
              onValueChange={(value) =>
                setIntentClass(value as CtVoiceIntentClass)
              }
            >
              <SelectTrigger id="voice-intent-class" data-testid="voice-intent-class-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTENT_CLASS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {VOICE_INTENT_CLASS_LABELS[opt].display}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {intentLabel.tagline}
            </p>
            <p className="text-xs text-muted-foreground">
              {intentLabel.governance_note}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="voice-transcript">What did you say?</Label>
            <Input
              id="voice-transcript"
              data-testid="voice-transcript-input"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Type the prose your voice would have said."
            />
            <p className="text-xs text-muted-foreground">
              Text-only. Microphone access is intentionally disabled.
            </p>
          </div>

          {errorMessage ? (
            <p
              className="text-xs text-destructive"
              data-testid="voice-error-message"
            >
              {errorMessage}
            </p>
          ) : null}

          <Button
            onClick={handleSubmit}
            disabled={submitDisabled}
            data-testid="voice-submit"
          >
            {submit.isPending
              ? "Submitting…"
              : "Submit voice intent"}
          </Button>
        </CardContent>
      </Card>

      {envelope ? <EnvelopeResult envelope={envelope} /> : null}

      <Dialog
        open={pendingMedium !== null}
        onOpenChange={(open) => {
          if (!open) cancelHighOrMedium();
        }}
      >
        <DialogContent data-testid="voice-confirmation-modal">
          <DialogHeader>
            <DialogTitle>
              {pendingMedium === "HIGH"
                ? "Confirm high-risk voice intent"
                : "Confirm medium-risk voice intent"}
            </DialogTitle>
            <DialogDescription>
              {pendingMedium
                ? VOICE_INTENT_CLASS_LABELS[pendingMedium].governance_note
                : null}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Foundation will record this voice intent + emit a governed audit
            event. The transcript prose stays in your browser; Foundation does
            not return the transcript over the wire.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelHighOrMedium}
              data-testid="voice-confirmation-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmHighOrMedium}
              data-testid="voice-confirmation-submit"
            >
              Confirm + submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default VoiceTwinPage;
