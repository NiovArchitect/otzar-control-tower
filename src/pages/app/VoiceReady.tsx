// FILE: VoiceReady.tsx
// PURPOSE: Phase 4G — employee-facing voice-ready panel consuming
//          the Phase 3 voice-intent route (Foundation #287). At
//          today's Foundation tier this is a typed transcript →
//          ConductSession envelope flow; live mic / STT / TTS
//          remain forward-substrate Founder-gated.
//
// HONESTY POSTURE:
//   - Never claims live audio when provider_mode = TEXT_ONLY /
//     NOT_CONFIGURED / SELF_HOSTED_CSM1B_READY (only ACTIVE counts).
//   - Surfaces speech-ready text so a future device-side TTS can
//     consume it; the UI offers a Copy button.
//   - Renders the structured EDX-3 envelope honestly: next_step,
//     approval_required + approval_reason, collaboration_suggested
//     + target_type, clarification_needed.
//
// CONNECTS TO: api.otzar.voiceIntents.create.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type {
  ApprovalReason,
  ConductNextStep,
  TwinCollaborationTargetType,
  VoiceIntentRequest,
  VoiceIntentResponse,
  VoiceProviderMode,
} from "@/lib/types/foundation";

function labelProviderMode(p: VoiceProviderMode): string {
  switch (p) {
    case "TEXT_ONLY":
      return "Text only (today)";
    case "LOCAL_MOCK":
      return "Local mock";
    case "SELF_HOSTED_CSM1B_READY":
      return "Self-hosted CSM-1B (ready, not active)";
    case "SELF_HOSTED_CSM1B_ACTIVE":
      return "Self-hosted CSM-1B (active)";
    case "NOT_CONFIGURED":
      return "Not configured";
  }
}

function labelNextStep(n: ConductNextStep): string {
  switch (n) {
    case "ANSWERED":
      return "Answered";
    case "NEEDS_CLARIFICATION":
      return "Needs clarification";
    case "NEEDS_APPROVAL":
      return "Needs approval";
    case "ACTION_PROPOSED":
      return "Action proposed";
    case "ACTION_CREATED":
      return "Action created";
    case "BLOCKED_BY_POLICY":
      return "Blocked by policy";
    case "BLOCKED_BY_SCOPE":
      return "Blocked by memory scope";
    case "COLLABORATION_REQUEST_SUGGESTED":
      return "Collaboration suggested";
    case "MEMORY_CORRECTION_AVAILABLE":
      return "Correction available";
  }
}

function labelApprovalReason(r: ApprovalReason): string {
  switch (r) {
    case "EXTERNAL_WRITE":
      return "External write";
    case "SENSITIVE_CONTEXT":
      return "Sensitive context";
    case "CONNECTOR_ACCESS":
      return "Connector access";
    case "CROSS_TEAM_REQUEST":
      return "Cross-team request";
    case "CROSS_PROJECT_REQUEST":
      return "Cross-project request";
    case "POLICY_REQUIRES_APPROVAL":
      return "Policy requires approval";
    case "DUAL_CONTROL_REQUIRED":
      return "Dual-control required";
    case "LONG_TERM_AUTHORITY":
      return "Long-term authority";
    case "INDEFINITE_AUTHORITY":
      return "Indefinite authority";
  }
}

function labelCollabTarget(t: TwinCollaborationTargetType): string {
  switch (t) {
    case "EMPLOYEE":
      return "A coworker";
    case "EMPLOYEE_TWIN":
      return "A coworker's Twin";
    case "TEAM":
      return "A team";
    case "PROJECT":
      return "A project";
    case "HIVE":
      return "A hive";
    case "WORKFLOW":
      return "A workflow";
  }
}

export function VoiceReady() {
  const [transcript, setTranscript] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<VoiceIntentResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: (body: VoiceIntentRequest) =>
      api.otzar.voiceIntents.create(body),
    onSuccess: (result) => {
      if (result.ok) {
        setLastResult(result.data);
        setConversationId(result.data.conversation_id);
        setTranscript("");
        setError(null);
      } else {
        setError(result.message);
      }
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (transcript.trim().length === 0) {
      setError("Type or speak something first.");
      return;
    }
    const body: VoiceIntentRequest = { transcript_text: transcript.trim() };
    if (conversationId !== null) body.conversation_id = conversationId;
    send.mutate(body);
  }

  async function copySpeechReady() {
    if (lastResult === null) return;
    try {
      await navigator.clipboard.writeText(lastResult.speech_ready_text);
    } catch {
      // Clipboard may not be available in the test environment; that's fine.
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voice-ready"
        description="Talk to Otzar with a typed or pasted transcript. We give you back a speech-ready answer your device or browser can read aloud. Live microphone capture isn't enabled at this tier."
      />

      <Card data-testid="voice-input-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Send a voice intent</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <textarea
              id="voice-transcript"
              data-testid="voice-transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="What would you like to ask or do?"
            />
            {error && (
              <p className="text-sm text-destructive" data-testid="voice-error">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={send.isPending}
              data-testid="voice-submit"
            >
              {send.isPending ? "Sending…" : "Send"}
            </Button>
            <p className="text-xs text-muted-foreground">
              No raw audio is stored. Voice is governed by the same policy /
              memory scope / approval / audit gates as chat.
            </p>
          </form>
        </CardContent>
      </Card>

      {lastResult && (
        <Card data-testid="voice-result-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Otzar's reply</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge data-testid="voice-next-step">
                {labelNextStep(lastResult.next_step)}
              </Badge>
              <Badge variant="outline" data-testid="voice-provider-mode">
                {labelProviderMode(lastResult.provider_mode)}
              </Badge>
              {lastResult.voice_output_supported ? (
                <Badge variant="outline">Live audio supported</Badge>
              ) : (
                <Badge variant="outline">Use device / browser TTS</Badge>
              )}
              {lastResult.approval_required && lastResult.approval_reason && (
                <Badge variant="destructive">
                  Needs approval —{" "}
                  {labelApprovalReason(lastResult.approval_reason)}
                </Badge>
              )}
              {lastResult.collaboration_suggested &&
                lastResult.collaboration_target_type && (
                  <Badge variant="outline">
                    Collaboration —{" "}
                    {labelCollabTarget(lastResult.collaboration_target_type)}
                  </Badge>
                )}
              {lastResult.clarification_needed && (
                <Badge variant="outline">Needs clarification</Badge>
              )}
              {lastResult.policy_blocked && (
                <Badge variant="destructive">Blocked by policy</Badge>
              )}
              {lastResult.dmw_scope_blocked && (
                <Badge variant="destructive">Blocked by memory scope</Badge>
              )}
            </div>

            <div data-testid="voice-response-text">
              <p className="text-xs font-medium text-muted-foreground">Reply</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {lastResult.response}
              </p>
            </div>

            <div data-testid="voice-speech-ready">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Speech-ready response
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copySpeechReady}
                  data-testid="voice-copy"
                >
                  Copy
                </Button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {lastResult.speech_ready_text}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                You can use this with device / browser TTS.
              </p>
            </div>

            <div
              className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
              data-testid="voice-memory-summary"
            >
              <p>
                Memory used: {lastResult.memory_used_summary.total_capsules}{" "}
                items —{" "}
                {lastResult.memory_used_summary.layer_1_corrections} corrections,{" "}
                {lastResult.memory_used_summary.layer_3_work_profile} work-profile,{" "}
                {lastResult.memory_used_summary.layer_4_foundational} foundational,{" "}
                {lastResult.memory_used_summary.layer_5_relevant_context} relevant.
              </p>
            </div>

            {lastResult.approval_required &&
              lastResult.approval_duration_options &&
              lastResult.approval_duration_options.length > 0 && (
                <div
                  className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                  data-testid="voice-duration-options"
                >
                  <p className="font-medium text-foreground">
                    If you want to grant authority, choose how long:
                  </p>
                  <p className="mt-1">
                    {lastResult.approval_duration_options
                      .map((d) => d.replace(/_/g, " ").toLowerCase())
                      .join(" · ")}
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
