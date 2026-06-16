// FILE: Comms.tsx
// PURPOSE: Phase 1213 -- the Comms page. Otzar captures conversations
//          (currently via a demo-capture timer; future live STT) and
//          turns them into a structured summary + decisions +
//          commitments + suggested governed-Action follow-ups. Each
//          follow-up renders as the existing ProposedActionCard so
//          the operator can Send via the same Phase 1208 path that
//          hits POST /api/v1/actions -- nothing new bypasses
//          governance.
//
//          Per [FOUNDER — AMBIENT OTZAR COMMS]: the HERO flow is
//          "Start capture" -> Otzar listens -> Otzar organizes ->
//          follow-ups ready. Manual import is intentionally a
//          secondary fallback button, not the primary CTA.
//
// CONNECTS TO:
//   - src/lib/api.ts (api.otzar.commsExtract)
//   - src/components/otzar/ProposedActionCard.tsx (renders each
//     suggested follow-up; reuses the Phase 1208 Send path)
//
// PRIVACY INVARIANT:
//   - The captured text is the operator's own session; Foundation
//     never persists it in this PR (no new Prisma models). The
//     audit trail starts at the governed Action create when the
//     operator clicks Send.
//   - Renders only the closed-vocab CommsExtractionResult; no TAR
//     / wallet / clearance / payload internals.

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Flag,
  HelpCircle,
  Handshake,
  Lightbulb,
  ListTodo,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Square,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProposedActionCard } from "@/components/otzar/ProposedActionCard";
import { ViewWhyPanel } from "@/components/work-os/ViewWhyPanel";
import { viewWhyFromCommsFollowUp } from "@/lib/work-os/view-why";
import { api } from "@/lib/api";
import type {
  CommsExtractionResult,
  CommsSuggestedAction,
} from "@/lib/types/foundation";

// ─────────────────────────────────────────────────────────────
// Demo-capture timer: scripted lines that appear over time so
// the user FEELS Otzar listening to a meeting. Lines match the
// Foundation canonical demo fixture so the LIVE backend produces
// the structured Founder-provided expected output verbatim.
//
// When live STT lands, this stream is replaced; the rest of the
// page stays unchanged.
// ─────────────────────────────────────────────────────────────
interface DemoLine {
  speaker: string;
  text: string;
  delayMs: number;
}

const DEMO_SCRIPT: ReadonlyArray<DemoLine> = [
  { speaker: "Sadeil", text: "Welcome to the Launch Follow-Up Meeting.", delayMs: 800 },
  {
    speaker: "Sadeil",
    text:
      "David, can you review the UI flow by Friday?",
    delayMs: 2200,
  },
  {
    speaker: "David",
    text: "Yes, I'll take a pass and flag anything that looks off.",
    delayMs: 1800,
  },
  {
    speaker: "Samiksha",
    text:
      "I can review the AI/NLP trial notes and summarize any concerns.",
    delayMs: 1800,
  },
  {
    speaker: "Annie",
    text:
      "I can complete the compliance review this week if the summary is ready.",
    delayMs: 2200,
  },
  {
    speaker: "Sadeil",
    text:
      "Decision: keep internal note workflows inside Otzar notifications only for now.",
    delayMs: 2200,
  },
  {
    speaker: "Sadeil",
    text:
      "Decision: do not enable Slack or email sending until explicit connector approval is finished.",
    delayMs: 2400,
  },
  {
    speaker: "Sadeil",
    text:
      "Otzar should create follow-up notes for David, Samiksha, and Annie.",
    delayMs: 2200,
  },
];

const DEMO_TITLE = "Launch Follow-Up Meeting";

function buildCapturedText(
  lines: ReadonlyArray<{ speaker: string; text: string }>,
): string {
  // Foundation's DEMO_SCRIPTED auto-detection looks for the title
  // phrase + the three demo participant names. Reassembling the
  // captured text with the explicit Title: header guarantees the
  // canonical fixture matches.
  return (
    `Title: ${DEMO_TITLE}\n\n` +
    lines.map((l) => `${l.speaker}: ${l.text}`).join("\n")
  );
}

type Phase =
  | "READY"
  | "CAPTURING"
  | "PROCESSING"
  | "READY_FOR_REVIEW"
  | "FAILED";

export function Comms(): JSX.Element {
  const [phase, setPhase] = useState<Phase>("READY");
  const [captured, setCaptured] = useState<
    Array<{ speaker: string; text: string }>
  >([]);
  const [extraction, setExtraction] = useState<CommsExtractionResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const cancelledRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function emitNextLine(index: number): void {
    if (cancelledRef.current) return;
    if (index >= DEMO_SCRIPT.length) {
      void endCapture();
      return;
    }
    const line = DEMO_SCRIPT[index];
    if (line === undefined) return;
    setCaptured((prev) => [
      ...prev,
      { speaker: line.speaker, text: line.text },
    ]);
    timerRef.current = window.setTimeout(() => {
      emitNextLine(index + 1);
    }, line.delayMs);
  }

  function startCapture(): void {
    setPhase("CAPTURING");
    setCaptured([]);
    setExtraction(null);
    setError(null);
    cancelledRef.current = false;
    emitNextLine(0);
  }

  async function endCapture(): Promise<void> {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPhase("PROCESSING");
    // Demo-capture mode: the lines the user saw scrolling by ARE the
    // demo script; we always submit the full canonical script so the
    // Foundation auto-detection produces the structured Founder-
    // provided extraction even if the operator clicked End early.
    // When live STT lands, this becomes the captured-line stream.
    const text = buildCapturedText(DEMO_SCRIPT);
    const result = await api.otzar.commsExtract({ captured_text: text });
    if (!result.ok) {
      setError(result.code);
      setPhase("FAILED");
      return;
    }
    setExtraction(result.data.extraction);
    setPhase("READY_FOR_REVIEW");
  }

  async function importNotes(): Promise<void> {
    if (importText.trim().length === 0) return;
    setPhase("PROCESSING");
    setError(null);
    setExtraction(null);
    const result = await api.otzar.commsExtract({ captured_text: importText });
    if (!result.ok) {
      setError(result.code);
      setPhase("FAILED");
      return;
    }
    setExtraction(result.data.extraction);
    setPhase("READY_FOR_REVIEW");
  }

  function reset(): void {
    setPhase("READY");
    setCaptured([]);
    setExtraction(null);
    setError(null);
    setShowImport(false);
    setImportText("");
  }

  return (
    <div className="space-y-6" data-testid="comms-page">
      <PageHeader
        title="Comms"
        description="Otzar captures meetings and conversations, then turns them into follow-ups you can approve."
      />

      {/* HERO state: ready to capture */}
      {phase === "READY" ? (
        <Card
          className="border-primary/30 bg-primary/5"
          data-testid="comms-hero"
        >
          <CardContent className="flex flex-col items-start gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Otzar is ready to capture.</p>
              <p className="text-xs text-muted-foreground">
                Click Start capture and Otzar will listen, organize the
                conversation, and draft follow-ups you can approve. Nothing
                leaves your org without your approval.
              </p>
            </div>
            <Button
              type="button"
              onClick={startCapture}
              data-testid="comms-start"
            >
              <Mic className="mr-1 h-4 w-4" aria-hidden /> Start capture
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Phase 1285-L2 — conversation intelligence cockpit (default state). Makes
          Comms's operating role clear BEFORE any capture/import exists. */}
      {phase === "READY" ? <CommsCockpit /> : null}

      {/* CAPTURING state: Otzar is listening */}
      {phase === "CAPTURING" ? (
        <Card data-testid="comms-capturing">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles
                className="h-4 w-4 animate-pulse text-primary"
                aria-hidden
              />
              Otzar is listening
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <ul className="space-y-1" data-testid="comms-captured-list">
              {captured.map((c, i) => (
                <li
                  key={i}
                  className="rounded border bg-card p-2"
                  data-testid="comms-captured-line"
                >
                  <span className="font-medium">{c.speaker}:</span> {c.text}
                </li>
              ))}
            </ul>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void endCapture()}
                data-testid="comms-end"
              >
                <Square className="mr-1 h-3 w-3" aria-hidden /> End capture
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* PROCESSING state */}
      {phase === "PROCESSING" ? (
        <Card data-testid="comms-processing">
          <CardContent className="flex items-center gap-2 py-4 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Otzar is organizing this conversation…
          </CardContent>
        </Card>
      ) : null}

      {/* FAILED state */}
      {phase === "FAILED" && error !== null ? (
        <Card
          className="border-rose-400/40 bg-rose-500/5"
          data-testid="comms-error"
        >
          <CardContent className="py-4 text-sm">
            <AlertCircle className="mr-1 inline h-4 w-4" aria-hidden />
            Otzar couldn't organize this capture. ({error}){" "}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              className="ml-2"
            >
              Reset
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* READY_FOR_REVIEW: render extraction + follow-up cards */}
      {phase === "READY_FOR_REVIEW" && extraction !== null ? (
        <ExtractionView
          extraction={extraction}
          onReset={reset}
        />
      ) : null}

      {/* Manual import is intentionally secondary. */}
      {phase === "READY" || phase === "FAILED" ? (
        <div className="rounded-md border p-3 text-xs">
          {showImport ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Use this only when Otzar was not present for the meeting.
                Otzar will organize what you paste, but the AI Work OS
                experience is "Start capture".
              </p>
              <textarea
                className="h-32 w-full rounded border bg-background p-2 text-xs"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste meeting notes or transcript here…"
                data-testid="comms-import-textarea"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImport(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void importNotes()}
                  disabled={importText.trim().length === 0}
                  data-testid="comms-import-submit"
                >
                  Organize notes
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowImport(true)}
              data-testid="comms-import-toggle"
            >
              <Upload className="h-3 w-3" aria-hidden />
              Import notes (fallback)
            </button>
          )}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        <CheckCircle2 className="mr-1 inline h-3 w-3" aria-hidden />
        Otzar will only act on follow-ups you approve. Every send goes through
        your organization's governance and audit trail.
      </p>
    </div>
  );
}

function ExtractionView({
  extraction,
  onReset,
}: {
  extraction: CommsExtractionResult;
  onReset: () => void;
}): JSX.Element {
  const ready = extraction.suggested_actions.filter(
    (s) => s.resolution_status === "RESOLVED",
  ).length;
  return (
    <div className="space-y-4" data-testid="comms-review">
      <Card data-testid="comms-review-header">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" aria-hidden />
              {ready > 0
                ? `Otzar found ${ready} follow-up${ready === 1 ? "" : "s"}.`
                : "Otzar organized the conversation."}
            </span>
            <Badge
              variant="outline"
              data-testid="comms-extraction-mode"
              data-mode={extraction.extraction_mode}
            >
              {extraction.extraction_mode === "DEMO_SCRIPTED"
                ? "Demo capture mode"
                : extraction.extraction_mode === "LLM"
                  ? "Live AI capture"
                  : "Local fallback"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm" data-testid="comms-summary">
          {extraction.summary}
        </CardContent>
      </Card>

      {extraction.decisions.length > 0 ? (
        <Card data-testid="comms-decisions">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {extraction.decisions.map((d, i) => (
                <li key={i} data-testid="comms-decision">
                  {d}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {extraction.commitments.length > 0 ? (
        <Card data-testid="comms-commitments">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Commitments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {extraction.commitments.map((c, i) => (
                <li key={i} data-testid="comms-commitment">
                  {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Phase 1285-L2 — blockers/risks now surfaced (was extracted but not
          rendered). One of the four conversation-intelligence categories. */}
      {extraction.risks_or_blockers.length > 0 ? (
        <Card data-testid="comms-blockers">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Blockers &amp; risks</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {extraction.risks_or_blockers.map((b, i) => (
                <li key={i} data-testid="comms-blocker">
                  {b}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {extraction.suggested_actions.length > 0 ? (
        <div className="space-y-2" data-testid="comms-follow-ups">
          <h3 className="text-sm font-medium">Follow-ups Otzar drafted</h3>
          <p className="text-xs text-muted-foreground">
            Otzar will submit each one as a governed internal action when you
            click Send. No external message goes out.
          </p>
          {extraction.suggested_actions.map((s) => (
            <FollowUpCard key={s.local_id} suggested={s} extractionMode={extraction.extraction_mode} />
          ))}
        </div>
      ) : (
        <Card data-testid="comms-no-follow-ups">
          <CardContent className="py-4 text-sm text-muted-foreground">
            Otzar didn't draft any follow-ups from this capture. Try Start
            capture again or import notes manually.
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          Start a new capture
        </Button>
      </div>
    </div>
  );
}

// Phase 1285-L2 — the default Comms cockpit: what Otzar turns conversations
// into, how the flow works, and an honest "recent intelligence" state. No fake
// artifacts — there is no recent-artifacts endpoint yet (documented gap).
function CommsCockpit(): JSX.Element {
  const listensFor: ReadonlyArray<{
    label: string;
    desc: string;
    icon: typeof Flag;
    wired: boolean;
  }> = [
    { label: "Follow-ups", desc: "Drafted internal notes you approve", icon: Send, wired: true },
    { label: "Decisions", desc: "What the group decided", icon: Lightbulb, wired: true },
    { label: "Blockers", desc: "What's stuck or at risk", icon: Flag, wired: true },
    { label: "Commitments", desc: "Who committed to what", icon: Handshake, wired: true },
    { label: "Questions", desc: "Open questions raised", icon: HelpCircle, wired: false },
    { label: "Tasks / Work Ledger", desc: "Turn talk into tracked work", icon: ListTodo, wired: false },
  ];
  const flow = [
    "Capture / Import",
    "Extract signals",
    "Review drafts",
    "Approve / correct",
    "Add to Work Ledger or send internally",
    "Proof preserved",
  ];
  return (
    <div className="space-y-4" data-testid="comms-cockpit">
      {/* What Otzar turns conversations into */}
      <section className="space-y-2" data-testid="comms-listens-for">
        <h3 className="text-sm font-medium">What Otzar turns conversations into</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {listensFor.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className="flex items-start gap-2 rounded-md border border-border bg-card p-2 text-xs"
                data-testid="comms-listens-item"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{c.label}</span>
                    {!c.wired ? (
                      <Badge variant="outline" className="text-[9px]">
                        coming next
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground">{c.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How conversation becomes governed work */}
      <section className="space-y-1" data-testid="comms-flow">
        <h3 className="text-sm font-medium">How it flows</h3>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
          {flow.map((step, i) => (
            <span key={step} className="flex items-center gap-1.5">
              <span className="rounded bg-muted px-1.5 py-0.5">{step}</span>
              {i < flow.length - 1 ? <span aria-hidden>→</span> : null}
            </span>
          ))}
        </div>
      </section>

      {/* Recent conversation intelligence — honest empty state (no recent-
          artifacts endpoint yet; see backlog/semantic-reconciliation). */}
      <section className="space-y-1" data-testid="comms-recent">
        <h3 className="text-sm font-medium">Recent conversation intelligence</h3>
        <div
          className="rounded-md border border-border p-3 text-xs text-muted-foreground"
          data-testid="comms-recent-empty"
        >
          No captured conversation artifacts yet. Start capture or import notes to
          generate follow-ups, decisions, blockers, and commitments.
        </div>
      </section>
    </div>
  );
}

function FollowUpCard({
  suggested,
  extractionMode,
}: {
  suggested: CommsSuggestedAction;
  extractionMode: string;
}): JSX.Element {
  const [whyOpen, setWhyOpen] = useState(false);
  return (
    <div data-testid="comms-follow-up-row">
      <ProposedActionCard
        proposedAction={{
          action_type: suggested.action_type,
          target: suggested.target,
          draft_text: suggested.draft_text,
          reason: suggested.reason,
        }}
      />
      {/* Phase 1285-L — consistent structured View/Why: source excerpt,
          confidence, resolution, extraction mode, via the shared panel. */}
      <button
        type="button"
        className="mt-1 px-3 text-[10px] text-muted-foreground hover:text-foreground"
        data-testid="comms-follow-up-why"
        onClick={() => setWhyOpen((v) => !v)}
      >
        {whyOpen ? "Hide" : "Why"}
      </button>
      {whyOpen ? (
        <div
          className="mt-1 mx-3 rounded border border-border bg-muted/30 p-1.5 text-[11px] text-muted-foreground"
          data-testid="comms-follow-up-view-why"
        >
          <ViewWhyPanel model={viewWhyFromCommsFollowUp(suggested, extractionMode)} />
        </div>
      ) : null}
    </div>
  );
}
