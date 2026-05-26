// FILE: Observe.tsx
// PURPOSE: The employee observe/ingest surface. Submits a piece of text
//          context + an event_type to the real POST /otzar/observe,
//          which the COE extracts into governed memory. Write-gated:
//          observe uses validateSession("write"), so the form is only
//          enabled for users with can_write_capsules.
// CONNECTS TO: api.otzar.observe, src/lib/auth/capabilities.ts.
//
// HONESTY GUARDRAILS:
//   - Submits ONLY the text the employee typed. Renders extraction
//     COUNTS returned by the backend (decisions, commitments, ...).
//   - Does NOT imply any background connector (mailbox/calendar/Slack)
//     is syncing. There is no integration run-state in the backend.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { canWriteOtzar } from "@/lib/auth/capabilities";
import type {
  ObserveExtractedSummary,
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

export function Observe() {
  const { capabilities } = useAuthStore();
  const writable = canWriteOtzar(capabilities);

  const [eventType, setEventType] = useState<EventType>("NOTE");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ObserveResult | null>(null);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Observe"
        description="Paste a note, message, meeting summary, or email and Otzar will extract it into your organization's governed memory. This submits only the text you enter — no mailboxes or calendars are connected."
      />

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

        <Button type="submit" disabled={submitting || content.trim().length === 0}>
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
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

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
