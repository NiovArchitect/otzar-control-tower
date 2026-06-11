// FILE: Observe.tsx
// PURPOSE: The employee observe surface, two governed flows:
//
//          1. Phase 1227 — "Let Otzar read this" (primary): sample or
//             pasted document text → Foundation's governed Observe
//             pipeline → summary + decisions + commitments + possible
//             follow-ups (approval-gated via ProposedActionCard) +
//             attach-to-workspace. Suggested follow-ups never execute
//             without the user's confirmation.
//          2. Pre-1227 — "Save a quick note to memory": submits text +
//             event_type to POST /otzar/observe for COE extraction
//             into governed memory. Preserved unchanged (RULE 1).
//
// CONNECTS TO: api.otzar.observeProviders / observeExtract /
//          observeAttachWorkspace, api.collaborationWorkspaces.list,
//          api.otzar.observe, ProposedActionCard.
//
// HONESTY GUARDRAILS:
//   - Submits ONLY text the employee provided (or the built-in sample).
//   - Blocked providers show friendly setup copy — no fake OCR.
//   - No developer vocabulary in user-facing copy.

import { useEffect, useState } from "react";
import { BookOpenCheck, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProposedActionCard } from "@/components/otzar/ProposedActionCard";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { canWriteOtzar } from "@/lib/auth/capabilities";
import type {
  CollaborationWorkspaceSafeView,
  ObserveCaptureView,
  ObserveExtractedSummary,
  ObserveProviderStatusRow,
  ObserveRequest,
} from "@/lib/types/foundation";

const EVENT_TYPES = [
  "NOTE",
  "MESSAGE",
  "MEETING",
  "EMAIL",
  "DECISION",
  "TASK_CONTEXT",
] as const;
type EventType = (typeof EVENT_TYPES)[number];

type ObserveResult =
  | { kind: "summary"; capsule_ids: string[]; summary: ObserveExtractedSummary }
  | { kind: "skipped" };

// Friendly status labels — never developer vocabulary.
const PROVIDER_STATUS_LABEL: Record<
  ObserveProviderStatusRow["status"],
  string
> = {
  READY: "Ready",
  DEMO_ONLY: "Sample",
  BLOCKED_BY_KEY: "Needs setup",
  NEEDS_PROVIDER_INSTALL: "Not installed yet",
};

export function Observe() {
  const { capabilities } = useAuthStore();
  const writable = canWriteOtzar(capabilities);

  // ── pre-1227 quick-note state (unchanged behavior) ──
  const [eventType, setEventType] = useState<EventType>("NOTE");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ObserveResult | null>(null);

  // ── Phase 1227 read-flow state ──
  const [providers, setProviders] = useState<ObserveProviderStatusRow[]>([]);
  const [workspaces, setWorkspaces] = useState<CollaborationWorkspaceSafeView[]>(
    [],
  );
  const [readText, setReadText] = useState("");
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [capture, setCapture] = useState<ObserveCaptureView | null>(null);
  const [attachWorkspaceId, setAttachWorkspaceId] = useState<string>("");
  const [attaching, setAttaching] = useState(false);
  const [attachNote, setAttachNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.otzar.observeProviders().then((r) => {
      if (!cancelled && r.ok) setProviders(r.data.providers);
    });
    void api.collaborationWorkspaces.list().then((r) => {
      if (!cancelled && r.ok) setWorkspaces(r.data.workspaces);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!writable) {
    return (
      <div className="space-y-6">
        <PageHeader title="Observe" description="Submit context for Otzar to learn from." />
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            You don't have the <code>write</code> capability required to submit
            observations. Ask your organization administrator to enable it.
          </CardContent>
        </Card>
      </div>
    );
  }

  async function runRead(opts: { sample: boolean }): Promise<void> {
    if (reading) return;
    setReadError(null);
    setAttachNote(null);
    setCapture(null);
    setReading(true);
    const r = await api.otzar.observeExtract(
      opts.sample
        ? {
            provider: "DEMO_FIXTURE",
            source_type: "DEMO",
            title: "Sample document",
          }
        : {
            provider: "PLAIN_TEXT",
            source_type: "PLAIN_TEXT_SOURCE",
            title: "Pasted text",
            plain_text: readText,
          },
    );
    setReading(false);
    if (!r.ok) {
      setReadError(
        r.message || "Otzar couldn't read that right now. Please try again.",
      );
      return;
    }
    setCapture(r.data.capture);
    if (!opts.sample) setReadText("");
  }

  async function attach(): Promise<void> {
    if (capture === null || attachWorkspaceId === "" || attaching) return;
    setAttaching(true);
    setAttachNote(null);
    const r = await api.otzar.observeAttachWorkspace(
      capture.observe_capture_id,
      attachWorkspaceId,
    );
    setAttaching(false);
    if (!r.ok) {
      setReadError(r.message || "Couldn't attach to that workspace.");
      return;
    }
    setCapture(r.data.capture);
    setAttachNote(
      `Added ${r.data.imported_decisions} decision${r.data.imported_decisions === 1 ? "" : "s"} and ${r.data.imported_commitments} commitment${r.data.imported_commitments === 1 ? "" : "s"} to the workspace.`,
    );
  }

  async function submit(): Promise<void> {
    const text = content.trim();
    if (text.length === 0 || submitting) return;
    setError(null);
    setResult(null);
    setSubmitting(true);
    const body: ObserveRequest = { content: text, event_type: eventType };
    const r = await api.otzar.observe(body);
    setSubmitting(false);
    if (!r.ok) {
      setError(r.message || "Could not submit. Please try again.");
      return;
    }
    if (r.data.skipped === true) {
      setResult({ kind: "skipped" });
      return;
    }
    setResult({
      kind: "summary",
      capsule_ids: r.data.capsule_ids,
      summary: r.data.extracted_summary,
    });
    setContent("");
  }

  const extraction = capture?.extraction ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Observe"
        description="Otzar can understand the work you already see on screen — any document, any tool, any system — without a separate integration for each one. You choose what it reads; everything stays governed."
      />

      {/* Phase 1251 — the shared-screen story, progressive
          disclosure: the vision in plain language, collapsed by
          default so the working surface stays calm. */}
      <details
        className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs"
        data-testid="observe-vision"
      >
        <summary className="cursor-pointer font-medium text-foreground">
          What Otzar's eyes can do for you
        </summary>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>
            <span className="text-foreground">Process whisperer</span> — paste
            what you're working in and Otzar explains the next step in plain
            language.
          </li>
          <li>
            <span className="text-foreground">Cross-tool bridge</span> — Otzar
            connects what you see in one tool to your team's decisions,
            commitments, and workspaces.
          </li>
          <li>
            <span className="text-foreground">Shadow coach</span> — learning a
            complex system? Otzar reads the same screen and walks you through
            it.
          </li>
          <li>
            <span className="text-foreground">Compliance guardian</span> —
            anything Otzar reads is permission-checked, policy-gated, and
            recorded in your audit trail.
          </li>
          <li>
            <span className="text-foreground">Performance helper</span> — Otzar
            turns what it reads into follow-ups so nothing falls through.
          </li>
        </ul>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Today this works with pasted text and samples; live screen sharing
          arrives with the same governance. Otzar never reads anything you
          didn't choose to share, and never acts without your approval.
        </p>
      </details>

      {/* ── Phase 1227: Let Otzar read this ── */}
      <Card data-testid="observe-read">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpenCheck className="h-4 w-4" aria-hidden /> Let Otzar read
            this
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {providers.length > 0 ? (
            <div
              className="flex flex-wrap gap-2 text-xs"
              data-testid="observe-providers"
            >
              {providers.map((p) => (
                <Badge
                  key={p.provider}
                  variant="outline"
                  data-testid="observe-provider-chip"
                  data-provider={p.provider}
                  title={p.description}
                >
                  {p.display_name} · {PROVIDER_STATUS_LABEL[p.status]}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="read-text">Paste text from any document</Label>
            <Textarea
              id="read-text"
              value={readText}
              onChange={(e) => setReadText(e.target.value)}
              placeholder="Paste meeting notes, a photo transcription, an email thread…"
              rows={5}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void runRead({ sample: false })}
              disabled={reading || readText.trim().length === 0}
              data-testid="observe-read-submit"
            >
              {reading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Reading…
                </>
              ) : (
                "Let Otzar read this"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => void runRead({ sample: true })}
              disabled={reading}
              data-testid="observe-read-sample"
            >
              Try a sample
            </Button>
          </div>

          {readError !== null ? (
            <p role="alert" className="text-sm text-destructive">
              {readError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {capture !== null && extraction !== null ? (
        <Card data-testid="observe-read-result">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" aria-hidden /> Otzar found text
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p
              className="text-muted-foreground"
              data-testid="observe-read-summary"
            >
              {extraction.summary}
            </p>

            {extraction.decisions.length > 0 ? (
              <div data-testid="observe-read-decisions">
                <p className="font-medium">Decisions Otzar found</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {extraction.decisions.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {extraction.commitments.length > 0 ? (
              <div data-testid="observe-read-commitments">
                <p className="font-medium">Commitments Otzar found</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {extraction.commitments.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {extraction.suggested_actions.length > 0 ? (
              <div className="space-y-2" data-testid="observe-read-followups">
                <p className="font-medium">
                  Otzar found possible follow-ups — each needs your review
                  before anything happens.
                </p>
                {extraction.suggested_actions.map((s) => (
                  <div key={s.local_id}>
                    <ProposedActionCard
                      proposedAction={{
                        action_type: s.action_type,
                        target: s.target,
                        draft_text: s.draft_text,
                        reason: s.reason,
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <Label htmlFor="attach-workspace" className="text-xs">
                Attach to a workspace
              </Label>
              <Select
                value={attachWorkspaceId}
                onValueChange={setAttachWorkspaceId}
              >
                <SelectTrigger id="attach-workspace" className="w-64">
                  <SelectValue placeholder="Choose a workspace…" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((w) => (
                    <SelectItem key={w.workspace_id} value={w.workspace_id}>
                      {w.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void attach()}
                disabled={
                  attaching ||
                  attachWorkspaceId === "" ||
                  capture.status === "ATTACHED"
                }
                data-testid="observe-read-attach"
              >
                {attaching ? "Attaching…" : "Attach"}
              </Button>
            </div>
            {attachNote !== null ? (
              <p
                className="text-xs text-muted-foreground"
                data-testid="observe-read-attach-note"
              >
                {attachNote}
              </p>
            ) : null}
            <p className="text-[10px] text-muted-foreground">
              Private to your organization. Recorded in the audit trail.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* ── pre-1227: quick note to governed memory (unchanged) ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Save a quick note to memory</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="event-type">Type</Label>
              <Select
                value={eventType}
                onValueChange={(v) => setEventType(v as EventType)}
              >
                <SelectTrigger id="event-type" className="w-60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste the text you want Otzar to learn from…"
                rows={6}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || content.trim().length === 0}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Submitting…
                </>
              ) : (
                "Submit to Otzar"
              )}
            </Button>
          </form>

          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {result?.kind === "skipped" && (
        <Card>
          <CardContent className="py-4 text-sm" data-testid="observe-skipped">
            <p className="font-medium">Skipped — duplicate content.</p>
            <p className="text-muted-foreground">
              Otzar already has this context, so nothing new was written.
            </p>
          </CardContent>
        </Card>
      )}

      {result?.kind === "summary" && (
        <Card>
          <CardContent className="space-y-2 py-4 text-sm" data-testid="observe-summary">
            <p className="font-medium">
              Captured into {result.capsule_ids.length} knowledge item
              {result.capsule_ids.length === 1 ? "" : "s"}.
            </p>
            <ul className="grid grid-cols-2 gap-1 text-muted-foreground sm:grid-cols-3">
              <li>Decisions: {result.summary.decisions}</li>
              <li>Commitments: {result.summary.commitments}</li>
              <li>Work patterns: {result.summary.work_patterns}</li>
              <li>External entities: {result.summary.external_entities}</li>
              <li>Vocabulary growth: {result.summary.vocab_growth}</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
