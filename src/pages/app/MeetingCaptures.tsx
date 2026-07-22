// FILE: MeetingCaptures.tsx
// PURPOSE: Phase 1222 — Meeting Capture surface. Provider-agnostic.
//          Lets a user upload a meeting transcript (Google Meet /
//          Zoom / Teams / manual) and attach the result to a
//          workspace, enforcing per-participant consent.
//
//          Real-provider OAuth flows for Google Meet + Zoom land
//          in Phase 1224 (Google Workspace) and forward. This page
//          accepts manual transcripts today, which exercises the
//          full backend pipeline end-to-end and proves the
//          governance posture.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mic,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type {
  MeetingCaptureProvider,
  MeetingCaptureSafeView,
  MeetingParticipantConsentState,
  CollaborationWorkspaceListItem,
} from "@/lib/types/foundation";

const PROVIDERS: ReadonlyArray<{
  value: MeetingCaptureProvider;
  label: string;
  hint: string;
}> = [
  {
    value: "MANUAL_UPLOAD",
    label: "Manual transcript",
    hint: "Paste a transcript directly. No connector needed.",
  },
  {
    value: "GOOGLE_MEET",
    label: "Google Meet",
    hint: "Automatic Meet pull works when Google Workspace is connected in Connections.",
  },
  {
    value: "ZOOM",
    label: "Zoom",
    hint: "Automatic Zoom pull works when the Zoom connector is set up in Connections.",
  },
  {
    value: "MICROSOFT_TEAMS",
    label: "Microsoft Teams",
    hint: "Automatic Teams pull works when Microsoft 365 is connected in Connections.",
  },
];

const CONSENT_OPTIONS: ReadonlyArray<{
  value: MeetingParticipantConsentState;
  label: string;
}> = [
  { value: "CONSENTED", label: "Consented" },
  { value: "PENDING", label: "Pending" },
  { value: "EXTERNAL_TRACKED", label: "External (tracked only)" },
  { value: "NOT_CONSENTED", label: "Did NOT consent" },
];

interface ParticipantDraft {
  display_name: string;
  email: string;
  consent_state: MeetingParticipantConsentState;
}

export function MeetingCaptures(): JSX.Element {
  const [captures, setCaptures] = useState<MeetingCaptureSafeView[] | null>(null);
  const [workspaces, setWorkspaces] = useState<CollaborationWorkspaceListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<MeetingCaptureProvider>(
    "MANUAL_UPLOAD",
  );
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [transcript, setTranscript] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [participants, setParticipants] = useState<ParticipantDraft[]>([
    { display_name: "", email: "", consent_state: "CONSENTED" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // PROD-UX-P0C — which capture's original source is currently open.
  const [viewingSourceId, setViewingSourceId] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    const [c, w] = await Promise.all([
      api.meetingCaptures.list({}),
      api.collaborationWorkspaces.list(),
    ]);
    if (c.ok) setCaptures(c.data.meeting_captures);
    else setError(c.code);
    if (w.ok) setWorkspaces(w.data.workspaces);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(): Promise<void> {
    setSubmitError(null);
    if (title.trim().length === 0) {
      setSubmitError("TITLE_REQUIRED");
      return;
    }
    const cleanParticipants = participants
      .filter((p) => p.display_name.trim().length > 0)
      .map((p) => ({
        display_name: p.display_name.trim(),
        ...(p.email.trim().length > 0 ? { email: p.email.trim() } : {}),
        consent_state: p.consent_state,
      }));
    setSubmitting(true);
    const r = await api.meetingCaptures.receive({
      provider,
      title: title.trim(),
      ...(summary.trim().length > 0 ? { summary: summary.trim() } : {}),
      ...(transcript.trim().length > 0 ? { transcript: transcript.trim() } : {}),
      ...(workspaceId.length > 0 ? { workspace_id: workspaceId } : {}),
      participants: cleanParticipants,
    });
    setSubmitting(false);
    if (r.ok) {
      setTitle("");
      setSummary("");
      setTranscript("");
      setParticipants([
        { display_name: "", email: "", consent_state: "CONSENTED" },
      ]);
      await refresh();
    } else {
      setSubmitError(r.code);
    }
  }

  function updateParticipant(
    index: number,
    patch: Partial<ParticipantDraft>,
  ): void {
    setParticipants((curr) =>
      curr.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );
  }

  return (
    <div className="space-y-5" data-testid="meeting-captures-page">
      <PageHeader
        title="Meeting captures"
        description="Capture a meeting, set who consented, and attach it to a workspace. Otzar uses it to extract decisions, commitments, and follow-ups."
      />

      <Card data-testid="meeting-capture-create-form">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Mic className="h-4 w-4" aria-hidden /> Capture a meeting
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
              onChange={(e) =>
                setProvider(e.target.value as MeetingCaptureProvider)
              }
              data-testid="meeting-capture-provider"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {PROVIDERS.find((p) => p.value === provider)?.hint}
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase text-muted-foreground">
              Meeting title
            </label>
            <input
              className="mt-1 w-full rounded border bg-background p-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Launch Follow-Up Meeting"
              data-testid="meeting-capture-title"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase text-muted-foreground">
              Summary (optional)
            </label>
            <textarea
              className="mt-1 w-full rounded border bg-background p-2 text-sm"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              data-testid="meeting-capture-summary"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase text-muted-foreground">
              Transcript (optional)
            </label>
            <textarea
              className="mt-1 w-full rounded border bg-background p-2 text-sm font-mono"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
              placeholder="Paste the meeting transcript here."
              data-testid="meeting-capture-transcript"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Transcripts are stored privately. Otzar uses them to extract
              decisions and commitments — it never shares the raw text.
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase text-muted-foreground">
              Attach to workspace (optional)
            </label>
            <select
              className="mt-1 w-full rounded border bg-background p-2 text-sm"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              data-testid="meeting-capture-workspace"
            >
              <option value="">— don't attach yet —</option>
              {workspaces.map((w) => (
                <option key={w.workspace_id} value={w.workspace_id}>
                  {w.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase text-muted-foreground">
              Participants & consent
            </p>
            <p className="text-[10px] text-muted-foreground">
              Otzar requires explicit consent from every meeting participant.
              External stakeholders are tracked separately and do not receive
              Otzar access automatically.
            </p>
            <ul className="mt-1 space-y-1">
              {participants.map((p, i) => (
                <li
                  key={i}
                  className="flex flex-wrap gap-1 rounded border bg-card p-2"
                  data-testid="meeting-capture-participant-row"
                >
                  <input
                    className="min-w-[150px] flex-1 rounded border bg-background p-1 text-xs"
                    placeholder="Name"
                    value={p.display_name}
                    onChange={(e) =>
                      updateParticipant(i, { display_name: e.target.value })
                    }
                  />
                  <input
                    className="min-w-[180px] flex-1 rounded border bg-background p-1 text-xs"
                    placeholder="Email (optional)"
                    value={p.email}
                    onChange={(e) =>
                      updateParticipant(i, { email: e.target.value })
                    }
                  />
                  <select
                    className="rounded border bg-background p-1 text-xs"
                    value={p.consent_state}
                    onChange={(e) =>
                      updateParticipant(i, {
                        consent_state: e.target
                          .value as MeetingParticipantConsentState,
                      })
                    }
                  >
                    {CONSENT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="mt-1 h-6 text-[10px]"
              onClick={() =>
                setParticipants((p) => [
                  ...p,
                  { display_name: "", email: "", consent_state: "CONSENTED" },
                ])
              }
            >
              + Add participant
            </Button>
          </div>
          {submitError !== null ? (
            <p
              className="text-[10px] text-rose-500"
              data-testid="meeting-capture-error"
            >
              {submitError === "TITLE_REQUIRED"
                ? "Meeting title is required."
                : `Couldn't save the capture (${submitError}).`}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
              data-testid="meeting-capture-submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>Save capture</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card data-testid="meeting-captures-list-section">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent captures</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-[10px] text-muted-foreground">
              Loading captures…
            </p>
          ) : error !== null ? (
            <p className="text-[10px] text-rose-500">
              <AlertCircle className="mr-1 inline h-3 w-3" aria-hidden /> Couldn't
              load captures ({error}).
            </p>
          ) : (captures ?? []).length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No captures yet. Use the form above to record one.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {captures!.map((c) => (
                <li
                  key={c.meeting_capture_id}
                  className="rounded border bg-card p-2"
                  data-testid="meeting-capture-row"
                  data-status={c.status}
                  data-provider={c.provider}
                >
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{c.title}</p>
                    <Badge
                      variant="outline"
                      className="text-[9px]"
                    >
                      {c.status === "PROCESSED" ||
                      c.status === "ATTACHED_TO_WORKSPACE" ? (
                        <CheckCircle2
                          className="mr-0.5 inline h-2.5 w-2.5 text-emerald-500"
                          aria-hidden
                        />
                      ) : c.status === "BLOCKED_PARTICIPANT_CONSENT" ? (
                        <AlertCircle
                          className="mr-0.5 inline h-2.5 w-2.5 text-rose-500"
                          aria-hidden
                        />
                      ) : null}
                      {c.status.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {c.provider.replace(/_/g, " ").toLowerCase()} ·{" "}
                    {c.participant_count} participant
                    {c.participant_count === 1 ? "" : "s"}{" "}
                    {c.workspace_id !== null ? (
                      <Link
                        to={`/app/collaboration-workspaces/${c.workspace_id}`}
                        className="underline"
                      >
                        · open workspace
                      </Link>
                    ) : null}
                  </p>
                  {c.summary !== null ? (
                    <p className="mt-1 text-[10px] italic text-muted-foreground">
                      {c.summary}
                    </p>
                  ) : null}
                  {c.has_transcript ? (
                    <div className="mt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        data-testid="meeting-capture-view-source"
                        onClick={() =>
                          setViewingSourceId((cur) =>
                            cur === c.meeting_capture_id ? null : c.meeting_capture_id,
                          )
                        }
                      >
                        {viewingSourceId === c.meeting_capture_id
                          ? "Hide original source"
                          : "View original source"}
                      </Button>
                      {viewingSourceId === c.meeting_capture_id ? (
                        <SourceTranscript captureId={c.meeting_capture_id} />
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p
        className="flex items-center gap-1 text-[10px] text-muted-foreground"
        data-testid="meeting-captures-footer"
      >
        <ShieldCheck className="h-3 w-3" aria-hidden /> Every capture is audited.
        Participants who didn't consent block the capture from being shared into
        a workspace. Otzar never sends messages outside your org without an
        approved connector.
      </p>
    </div>
  );
}

// PROD-UX-P0C — reopen the ORIGINAL transcript/source of a saved conversation.
// Caller-scoped on the server; shows honest states (loading / text / none stored /
// no access) and never fabricates content.
function SourceTranscript({ captureId }: { captureId: string }): JSX.Element {
  const [state, setState] = useState<
    { status: "loading" | "empty" | "denied" | "error"; text: null }
    | { status: "ready"; text: string }
  >({ status: "loading", text: null });

  useEffect(() => {
    let alive = true;
    void api.meetingCaptures.transcript(captureId).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setState(
          r.data.has_transcript && r.data.transcript !== null
            ? { status: "ready", text: r.data.transcript }
            : { status: "empty", text: null },
        );
      } else {
        setState({ status: r.code === "NOT_ALLOWED" ? "denied" : "error", text: null });
      }
    });
    return () => {
      alive = false;
    };
  }, [captureId]);

  return (
    <div
      className="mt-1 rounded border bg-muted/40 p-2"
      data-testid="meeting-capture-source-panel"
      data-status={state.status}
    >
      {state.status === "loading" ? (
        <p className="text-[10px] text-muted-foreground">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden /> Opening source…
        </p>
      ) : state.status === "ready" ? (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground">
          {state.text}
        </pre>
      ) : state.status === "empty" ? (
        <p className="text-[10px] text-muted-foreground">
          No original transcript was stored for this conversation.
        </p>
      ) : state.status === "denied" ? (
        <p className="text-[10px] text-muted-foreground">
          You don&apos;t have access to this conversation&apos;s source.
        </p>
      ) : (
        <p className="text-[10px] text-rose-500">Couldn&apos;t open the source. Try again.</p>
      )}
    </div>
  );
}
