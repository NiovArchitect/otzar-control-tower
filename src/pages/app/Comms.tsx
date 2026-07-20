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

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { MeetingIntelligencePanel } from "@/components/work-os/MeetingIntelligencePanel";
import { viewWhyFromCommsFollowUp } from "@/lib/work-os/view-why";
import { api } from "@/lib/api";
import { entityLabel } from "@/lib/identity/canonical-entity";
import { formatOwnedByLine } from "@/lib/identity/owner-display";
import { useWorkStateChanged } from "@/lib/events/work-state";
import type {
  CommsExtractionResult,
  CommsIngestResult,
  CommsSuggestedAction,
  RecipientGovernance,
  AutonomyDecision,
  RecentCommsArtifact,
  CommsArtifactType,
  PendingFollowUp,
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
  const [ingest, setIngest] = useState<CommsIngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  // Ambient-first: connected tools pull automatically; paste is fallback.
  const [sourcesHeadline, setSourcesHeadline] = useState<string | null>(null);
  const [sources, setSources] = useState<
    Array<{
      source_id: string;
      label: string;
      description: string;
      status_label: string;
      automatic: boolean;
      is_fallback: boolean;
    }>
  >([]);
  const [ambientBusy, setAmbientBusy] = useState(false);
  const [ambientMessage, setAmbientMessage] = useState<string | null>(null);
  /** When sync fails for reauth/scope, surface Tools reconnect (Meet gate). */
  const [needsReconnect, setNeedsReconnect] = useState(false);
  // [PROD-UX-BUGB] Durable pending follow-ups projected from FOLLOW_UP ledger
  // rows. This is the SINGLE source for the resumable send-cards — it survives
  // navigation/refresh, unlike the volatile ingest response.
  const [pendingFollowUps, setPendingFollowUps] = useState<PendingFollowUp[]>([]);
  const cancelledRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const loadPendingFollowUps = useCallback(async (): Promise<void> => {
    const res = await api.workOs.commsPendingFollowUps();
    if (res.ok && res.data.ok) setPendingFollowUps(res.data.follow_ups ?? []);
  }, []);

  const loadSources = useCallback(async (): Promise<void> => {
    const res = await api.otzar.commsSources();
    if (res.ok && res.data.ok) {
      setSourcesHeadline(res.data.headline);
      setSources(res.data.sources ?? []);
    }
  }, []);

  const runAmbientSync = useCallback(async (): Promise<void> => {
    setAmbientBusy(true);
    setAmbientMessage(null);
    setNeedsReconnect(false);
    const res = await api.otzar.commsAmbientSync({ max_records: 8 });
    setAmbientBusy(false);
    if (res.ok && res.data.ok) {
      setAmbientMessage(res.data.message);
      void loadPendingFollowUps();
    } else {
      const code = res.ok === false ? res.code ?? "" : "";
      const msg =
        res.ok === false
          ? res.message ?? res.code ?? "Could not sync connected sources"
          : "Could not sync connected sources";
      // Honest Meet/Google gate — never fake a successful sync.
      const reauth =
        /SCOPE_REAUTH|REAUTH|RECONNECT|NEEDS_RECONNECT|OAUTH|UNAUTHORIZED|FORBIDDEN/i.test(
          `${code} ${msg}`,
        );
      setNeedsReconnect(reauth);
      setAmbientMessage(
        reauth
          ? "Google Meet (or calendar) needs a reconnect before Otzar can pull meetings. Open Tools to fix it — paste remains available offline."
          : msg,
      );
    }
  }, [loadPendingFollowUps]);

  // Drop a card locally once its backing row has been dismissed (CANCELLED).
  // Sent (EXECUTED) cards are left in place so ProposedActionCard can show its
  // post-send audit confirmation; they disappear on the next load (excluded).
  const handleFollowUpResolved = useCallback((ledgerEntryId: string): void => {
    setPendingFollowUps((prev) => prev.filter((f) => f.ledger_entry_id !== ledgerEntryId));
  }, []);

  // Load durable pending follow-ups on mount — the fix for "the cards vanish
  // when I leave Comms and come back".
  useEffect(() => {
    void loadPendingFollowUps();
    void loadSources();
    // Ambient primary path: try a quiet pull when Comms opens (connected tools).
    void runAmbientSync();
  }, [loadPendingFollowUps, loadSources, runAmbientSync]);

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
    setIngest(null);
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
    // Governed ingest: persists the conversation + creates per-owner work under
    // proof (the noisy tail is quarantined; unproven owners are held for review).
    const result = await api.otzar.commsIngest({ captured_text: text, title: DEMO_TITLE });
    if (!result.ok) {
      setError(result.code);
      setPhase("FAILED");
      return;
    }
    setIngest(result.data.result);
    setExtraction(result.data.result.extraction);
    setPhase("READY_FOR_REVIEW");
    // Ingest just persisted the drafted follow-ups as durable FOLLOW_UP rows;
    // reload so the resumable cards (with their ledger ids) appear.
    void loadPendingFollowUps();
  }

  async function importNotes(): Promise<void> {
    if (importText.trim().length === 0) return;
    setPhase("PROCESSING");
    setError(null);
    setExtraction(null);
    const result = await api.otzar.commsIngest({ captured_text: importText });
    if (!result.ok) {
      setError(result.code);
      setPhase("FAILED");
      return;
    }
    setIngest(result.data.result);
    setExtraction(result.data.result.extraction);
    setPhase("READY_FOR_REVIEW");
    void loadPendingFollowUps();
  }

  function reset(): void {
    setPhase("READY");
    setCaptured([]);
    setExtraction(null);
    setIngest(null);
    setError(null);
    setShowImport(false);
    setImportText("");
  }

  return (
    <div className="space-y-6" data-testid="comms-page">
      <PageHeader
        eyebrow="Communication OS"
        title="Comms"
        description="Otzar pulls meetings and messages from your connected tools, then turns them into owned work. Manual paste is a fallback."
      />

      {/* [PROD-UX-BUGB] Durable pending follow-ups — shown in every phase so a
          customer who leaves Comms and returns still sees the cards Otzar
          drafted (they are backed by FOLLOW_UP ledger rows, not volatile
          state). Hidden when there are none. */}
      <PendingFollowUpsSection
        followUps={pendingFollowUps}
        onResolved={handleFollowUpResolved}
        onReviewResolved={() => void loadPendingFollowUps()}
      />

      {/* PRIMARY: ambient auto-ingest from connected tools */}
      {phase === "READY" ? (
        <Card
          className="border-primary/30 bg-primary/5"
          data-testid="comms-ambient-hero"
        >
          <CardContent className="space-y-4 py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium" data-testid="comms-ambient-headline">
                  {sourcesHeadline ??
                    "Otzar pulls communications from your connected tools."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Primary path: Google Meet and other connected sources. Work
                  fans out to the right people automatically. Paste is only for
                  offline moments.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => void runAmbientSync()}
                disabled={ambientBusy}
                data-testid="comms-ambient-sync"
              >
                {ambientBusy ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="mr-1 h-4 w-4" aria-hidden />
                )}
                {ambientBusy ? "Syncing…" : "Sync connected sources"}
              </Button>
            </div>
            {sources.length > 0 ? (
              <ul className="grid gap-2 sm:grid-cols-2" data-testid="comms-sources-list">
                {sources.map((s) => (
                  <li
                    key={s.source_id}
                    className="rounded-md border border-border bg-background/60 px-3 py-2 text-xs"
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="ml-2 text-muted-foreground">
                      {s.status_label}
                    </span>
                    <p className="mt-0.5 text-muted-foreground">{s.description}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            {ambientMessage !== null ? (
              <div className="space-y-2" data-testid="comms-ambient-message">
                <p
                  className={`text-xs ${needsReconnect ? "text-amber-900" : "text-muted-foreground"}`}
                >
                  {ambientMessage}
                </p>
                {needsReconnect ? (
                  <Button asChild size="sm" variant="outline" data-testid="comms-reconnect-tools">
                    <Link to="/app/connector-health">Reconnect tools</Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* FALLBACK: demo live-capture / paste — secondary only */}
      {phase === "READY" ? (
        <Card data-testid="comms-fallback-hero">
          <CardContent className="flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Fallback capture</p>
              <p className="text-xs text-muted-foreground">
                Use only when a source is offline or the conversation happened
                outside connected tools.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={startCapture}
                data-testid="comms-start"
              >
                <Mic className="mr-1 h-4 w-4" aria-hidden /> Live capture
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowImport(true)}
                data-testid="comms-show-import"
              >
                Paste transcript
              </Button>
            </div>
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
          ingest={ingest}
          onReset={reset}
        />
      ) : null}

      {/* Manual import is intentionally secondary. */}
      {phase === "READY" || phase === "FAILED" ? (
        <div className="rounded-md border p-3 text-xs">
          {showImport ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Fallback only — when connected tools did not capture the
                conversation. Prefer Sync connected sources (Google Meet)
                above.
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
  ingest,
  onReset,
}: {
  extraction: CommsExtractionResult;
  ingest: CommsIngestResult | null;
  onReset: () => void;
}): JSX.Element {
  const navigate = useNavigate();
  const ready = extraction.suggested_actions.filter(
    (s) => s.resolution_status === "RESOLVED",
  ).length;
  return (
    <div className="space-y-4" data-testid="comms-review">
      {ingest !== null ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5" data-testid="comms-ingest-saved">
          <CardContent className="flex flex-col gap-2 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <p className="font-medium text-foreground">
                  Otzar saved this conversation and moved the work.
                </p>
                <p className="text-muted-foreground">
                  {ingest.counts.owned} owned item{ingest.counts.owned === 1 ? "" : "s"} created
                  {ingest.counts.needs_review > 0
                    ? ` · ${ingest.counts.needs_review} need a confirmed owner`
                    : ""}
                  {ingest.quality.quarantined > 0
                    ? ` · ${ingest.quality.quarantined} noisy line${ingest.quality.quarantined === 1 ? "" : "s"} set aside`
                    : ""}
                  .
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/app/my-work")}
              data-testid="comms-ingest-view-work"
            >
              View in My Work
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {ingest !== null && ingest.work_items.length > 0 ? (
        <Card data-testid="comms-ingest-work-items">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Work Otzar created</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-xs">
              {ingest.work_items.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-2 rounded border border-border bg-card p-2"
                  data-testid="comms-ingest-work-item"
                  data-owned={w.owner_entity_id !== null ? "true" : "false"}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{w.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {w.needs_review
                        ? w.review_reason ?? "Needs a confirmed owner before assignment."
                        : /* PROD-UX-P2 — client-side guard: never render a
                             pronoun/non-name as an owner, whatever the row
                             carries (mirrors the P0D backend guard). */
                          formatOwnedByLine(w.owner_name)}
                    </div>
                    {!w.needs_review ? (
                      <div className="mt-0.5 text-[10px] text-muted-foreground" data-testid="comms-ingest-exec">
                        {execModeLabel(w.execution.execution_mode)}
                        {w.execution.blocker_reason ? ` · ${w.execution.blocker_reason}` : ""}
                      </div>
                    ) : null}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      w.needs_review
                        ? "shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-400"
                        : "shrink-0 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                    }
                  >
                    {w.needs_review ? "Needs owner" : "Assigned"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

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

      {/* [PROD-UX-BUGB] The actionable follow-up cards now render from durable
          FOLLOW_UP rows in "Follow-ups waiting for you" at the top of the page
          (so they survive navigation). Here we just confirm what this capture
          produced — no volatile duplicate of the same cards. */}
      {extraction.suggested_actions.length > 0 ? (
        <Card data-testid="comms-follow-ups" className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="py-3 text-sm">
            <Flag className="mr-1 inline h-4 w-4 text-emerald-600" aria-hidden />
            Otzar drafted{" "}
            <span className="font-medium">{extraction.suggested_actions.length}</span>{" "}
            follow-up{extraction.suggested_actions.length === 1 ? "" : "s"} from
            this capture. Review and send them in{" "}
            <span className="font-medium">“Follow-ups waiting for you”</span> at
            the top of this page — they’ll stay there until you send or dismiss
            them, even if you leave and come back.
          </CardContent>
        </Card>
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
    // [COHERENCE-RECOVERY] Honest pipeline state — extract already surfaces
    // questions + commitments; ledger projection is live via obligations.
    { label: "Questions", desc: "Open questions raised in extract", icon: HelpCircle, wired: true },
    { label: "Tasks / Work Ledger", desc: "Commitments become tracked obligations", icon: ListTodo, wired: true },
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

      {/* Recent conversation intelligence — real durable artifacts (Phase
          1285-T) from GET /work-os/comms/recent-artifacts; honest empty/error
          states; refreshes on work-state changes. */}
      <CommsRecentArtifacts />
    </div>
  );
}

const ARTIFACT_TYPE_LABEL: Record<CommsArtifactType, string> = {
  DIRECT_MESSAGE: "Direct message",
  THREAD_REPLY: "Thread reply",
  WORK_CAPTURE: "Captured work",
  FOLLOW_UP: "Follow-up",
  DECISION: "Decision",
  BLOCKER: "Blocker",
  MEETING_CAPTURE: "Meeting capture",
  ACTION_PROPOSAL: "Action proposal",
  NOTIFICATION: "Internal note",
};

function commsRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const delta = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

// WHAT: the Comms cockpit recent-artifacts list (Phase 1285-T). Real durable
//        artifacts from the Work Ledger projection; honest empty/error/loading
//        states; canonical participant labels (never a raw UUID); each card
//        routes to its real destination. No fake artifacts.
function CommsRecentArtifacts(): JSX.Element {
  const navigate = useNavigate();
  const [artifacts, setArtifacts] = useState<RecentCommsArtifact[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const r = await api.workOs.commsRecentArtifacts();
    if (r.ok) {
      setArtifacts(r.data.artifacts ?? []);
      setFailed(false);
    } else {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await api.workOs.commsRecentArtifacts();
      if (cancelled) return;
      if (r.ok) setArtifacts(r.data.artifacts ?? []);
      else setFailed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useWorkStateChanged(
    [
      "MESSAGE_CREATED",
      "NOTIFICATION_CREATED",
      "LEDGER_UPDATED",
      "TASK_COMPLETED",
      "WAITING_ON_CHANGED",
      "SIGNAL_TRACKED",
    ],
    () => void load(),
  );

  const items = artifacts ?? [];
  return (
    <section className="space-y-1" data-testid="comms-recent">
      <h3 className="text-sm font-medium">Recent conversation intelligence</h3>
      {failed ? (
        <div
          className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400"
          data-testid="comms-recent-error"
        >
          Couldn't load recent artifacts right now. Refresh to try again.
        </div>
      ) : artifacts === null ? (
        <p className="px-1 text-xs text-muted-foreground" data-testid="comms-recent-loading">
          Loading recent conversation intelligence...
        </p>
      ) : items.length === 0 ? (
        <div
          className="rounded-md border border-border p-3 text-xs text-muted-foreground"
          data-testid="comms-recent-empty"
        >
          No captured conversation artifacts yet. Start capture or import notes to
          generate follow-ups, decisions, blockers, and commitments.
        </div>
      ) : (
        <ul className="space-y-1.5" data-testid="comms-recent-list">
          {items.map((a) => {
            const related =
              a.related_person !== null ? entityLabel(a.related_person.display_name) : null;
            const canOpen = a.destination.route !== null;
            return (
              <li
                key={a.artifact_id}
                className="rounded-md border border-border bg-card p-2 text-xs"
                data-testid="comms-recent-item"
                data-artifact-type={a.artifact_type}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{a.title}</div>
                    {a.summary !== null && a.summary.length > 0 ? (
                      <div className="text-[11px] text-muted-foreground">{a.summary}</div>
                    ) : null}
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {ARTIFACT_TYPE_LABEL[a.artifact_type]}
                      {related !== null ? ` · with ${related}` : ""}
                      {` · ${commsRelativeTime(a.updated_at)}`}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant="outline" className="text-[9px]">
                      {ARTIFACT_TYPE_LABEL[a.artifact_type]}
                    </Badge>
                    {canOpen ? (
                      <button
                        type="button"
                        className="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
                        data-testid="comms-recent-open"
                        onClick={() => navigate(a.destination.route as string)}
                      >
                        Open
                      </button>
                    ) : null}
                  </div>
                </div>
                {/* Phase 1286-C — read-only meeting intelligence, only when the
                    artifact genuinely carries it. Absent → nothing renders. */}
                <MeetingIntelligencePanel data={a.meeting_intelligence} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// [SECTION-12-WORKGRAPH] Map the recipient-governance verdict to the Send guard.
// A card is only "Send"-ready when recipientSafety === "confirmed"; otherwise the
// Send button is replaced by Review / Clarify / Needs approval.
function governanceGuard(
  g: RecipientGovernance,
): { blocked: boolean; actionLabel: string; reason: string } | undefined {
  switch (g.recipientSafety) {
    case "confirmed":
      return undefined;
    case "ambiguous":
      return {
        blocked: true,
        actionLabel: "Clarify recipient",
        reason:
          g.evidence.alternativeCandidates.length > 0
            ? `More than one person matches — did you mean ${g.evidence.alternativeCandidates.join(
                " or ",
              )}? Clarify before sending.`
            : "Recipient is ambiguous — clarify before sending.",
      };
    case "cross_team_needs_approval":
      return {
        blocked: true,
        actionLabel: "Needs approval",
        reason: "Cross-team or sensitive route — approval is required before sending.",
      };
    case "unauthorized":
      return {
        blocked: true,
        actionLabel: "Needs approval",
        reason: "Org policy does not permit this recipient — review or approval required.",
      };
    case "out_of_scope":
      return {
        blocked: true,
        actionLabel: "Review recipient",
        reason:
          "This recipient isn't connected to this work — not named, not a participant, and no role/project link. Review before sending.",
      };
    case "likely":
    default:
      return {
        blocked: true,
        actionLabel: "Review recipient",
        reason: "Recipient is likely but not confirmed — review before sending.",
      };
  }
}

const SAFETY_LABEL: Record<RecipientGovernance["recipientSafety"], string> = {
  confirmed: "Recipient confirmed",
  likely: "Recipient likely — review",
  ambiguous: "Recipient ambiguous — clarify",
  cross_team_needs_approval: "Cross-team — needs approval",
  out_of_scope: "Outside work context — review",
  unauthorized: "Not authorized — review",
};

const LEDGER_LABEL: Record<string, string> = {
  sent: "Sent",
  waiting: "Waiting",
  needs_review: "Needs review",
  blocked: "Blocked",
  draft: "Drafted — awaiting approval",
};

// Phase 7 — human-language execution mode for each work item (no developer jargon).
const EXEC_MODE_LABEL: Record<string, string> = {
  human_must_do: "You'll do this",
  otzar_can_draft: "Otzar can draft this",
  otzar_can_execute_with_approval: "Otzar can do this with your approval",
  otzar_can_execute_when_policy_allows: "Otzar can handle this",
  connector_required: "Needs a tool connected",
  permission_required: "Needs access",
  blocked: "Blocked",
};
function execModeLabel(mode: string): string {
  return EXEC_MODE_LABEL[mode] ?? mode.replace(/_/g, " ");
}

function RecipientTrustChip({
  g,
  autonomy,
}: {
  g: RecipientGovernance;
  autonomy: AutonomyDecision;
}): JSX.Element {
  const safe = g.recipientSafety === "confirmed";
  return (
    <details className="mt-1 mx-3" data-testid="recipient-trust">
      <summary
        className={`inline-flex cursor-pointer list-none items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
          safe
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-400"
        }`}
        data-testid="recipient-trust-summary"
        data-safety={g.recipientSafety}
      >
        <span aria-hidden>{safe ? "✓" : "⚠"}</span>
        {SAFETY_LABEL[g.recipientSafety]}
      </summary>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 rounded border border-border bg-muted/30 p-1.5 text-[10px] text-muted-foreground">
        <dt>Participant</dt>
        <dd>{g.participantStatus.replace(/_/g, " ")}</dd>
        <dt>Work connection</dt>
        <dd>{g.workConnectionType.replace(/_/g, " ")}</dd>
        <dt>Role fit</dt>
        <dd>{g.roleMatch}</dd>
        <dt>Policy</dt>
        <dd>{g.policyStatus.replace(/_/g, " ")}</dd>
        <dt>Status</dt>
        <dd>{LEDGER_LABEL[autonomy.ledgerState] ?? autonomy.ledgerState}</dd>
        <dt>Future auto-send</dt>
        <dd data-testid="recipient-trust-autonomy">
          {autonomy.futureAutoEligible
            ? "Would be eligible when trusted"
            : `Not auto-eligible${autonomy.reasons.length > 0 ? ` (${autonomy.reasons[0]})` : ""}`}
        </dd>
        <dt>Risk</dt>
        <dd>{autonomy.actionRisk}</dd>
        {g.evidence.quote ? (
          <>
            <dt>Evidence</dt>
            <dd className="italic">“{g.evidence.quote}”</dd>
          </>
        ) : null}
      </dl>
    </details>
  );
}

// [PROD-UX-BUGC] The recipient-review completion. Renders the affordance that
// matches the governance verdict on a DURABLE card: out_of_scope / likely →
// "Confirm recipient" (the caller vouches — recorded as caller_confirmed and
// audited); ambiguous → "Choose recipient" from the server-resolved candidates
// (id-based — the CT never resolves identity from a name); unauthorized /
// cross_team_needs_approval → honest copy only, NO override affordance (a
// sender can never self-approve past a policy or approval boundary). Failure
// copy comes from the server (already human) — no raw codes.
function RecipientReviewActions({
  g,
  ledgerEntryId,
  candidates,
  onReviewResolved,
}: {
  g: RecipientGovernance;
  ledgerEntryId: string;
  candidates?: Array<{ entity_id: string; display_name: string }> | undefined;
  onReviewResolved: () => void;
}): JSX.Element | null {
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "working" } | { kind: "failed"; message: string }
  >({ kind: "idle" });

  async function resolve(body: {
    decision: "confirm" | "select";
    recipient_entity_id?: string;
  }): Promise<void> {
    setState({ kind: "working" });
    const res = await api.workOs.resolveCommsFollowUpRecipient(ledgerEntryId, body);
    if (res.ok && res.data.ok) {
      setState({ kind: "idle" });
      onReviewResolved(); // reload the durable cards — the decision is on the row
      return;
    }
    setState({
      kind: "failed",
      message:
        (!res.ok ? undefined : res.data.message) ??
        "Otzar couldn't record that review — please try again.",
    });
  }

  const failed =
    state.kind === "failed" ? (
      <p
        className="mt-1 rounded border border-rose-400/40 bg-rose-500/5 p-1.5 text-[11px] text-rose-700 dark:text-rose-400"
        role="alert"
        data-testid="comms-review-error"
      >
        {state.message}
      </p>
    ) : null;

  switch (g.recipientSafety) {
    case "confirmed":
      // Provenance: a caller-confirmed recipient is labeled as YOUR decision,
      // never as an Otzar-verified proof path.
      return g.evidence.source === "caller_confirmed" ? (
        <p
          className="mt-1 mx-3 text-[10px] text-muted-foreground"
          data-testid="comms-review-you-confirmed"
        >
          You confirmed this recipient — recorded in your organization's audit
          trail.
        </p>
      ) : null;
    case "out_of_scope":
    case "likely":
      return (
        <div className="mt-1 mx-3" data-testid="comms-review-confirmable">
          <p className="text-[11px] text-muted-foreground">
            Otzar couldn't verify this person is connected to this work. If you
            know they're the right recipient, you can confirm — your
            confirmation is recorded.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1"
            disabled={state.kind === "working"}
            onClick={() => void resolve({ decision: "confirm" })}
            data-testid="comms-review-confirm"
          >
            {state.kind === "working" ? "Recording…" : "Confirm recipient"}
          </Button>
          {failed}
        </div>
      );
    case "ambiguous":
      return (
        <div className="mt-1 mx-3" data-testid="comms-review-choose">
          {candidates !== undefined && candidates.length > 0 ? (
            <>
              <p className="text-[11px] text-muted-foreground">
                More than one person matches this name. Choose who this
                follow-up is for:
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {candidates.map((c) => (
                  <Button
                    key={c.entity_id}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={state.kind === "working"}
                    onClick={() =>
                      void resolve({ decision: "select", recipient_entity_id: c.entity_id })
                    }
                    data-testid="comms-review-candidate"
                  >
                    {c.display_name}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground" data-testid="comms-review-no-candidates">
              More than one person matches this name, but Otzar couldn't offer
              a choice — no matching active members were found. Ask your admin
              to check the roster.
            </p>
          )}
          {failed}
        </div>
      );
    case "unauthorized":
      return (
        <p
          className="mt-1 mx-3 text-[11px] text-muted-foreground"
          data-testid="comms-review-policy-blocked"
        >
          Your organization's policy doesn't permit sending this to that
          person. This isn't something you can override — ask an admin if you
          believe the policy is wrong.
        </p>
      );
    case "cross_team_needs_approval":
      return (
        <p
          className="mt-1 mx-3 text-[11px] text-muted-foreground"
          data-testid="comms-review-approval-boundary"
        >
          This route needs an approver's sign-off before it can send. If your
          organization hasn't configured an approver yet, ask an admin to set
          one up.
        </p>
      );
    default:
      return null;
  }
}

function FollowUpCard({
  suggested,
  extractionMode,
  ledgerEntryId,
  onResolved,
  selectCandidates,
  onReviewResolved,
}: {
  suggested: CommsSuggestedAction;
  extractionMode: string;
  /** [PROD-UX-BUGB] The durable FOLLOW_UP row backing this card. When present,
   *  a successful send transitions the row to EXECUTED and a dismiss to
   *  CANCELLED (via patchLedger), so the card does not reappear as pending. A
   *  failed send leaves the row DRAFT — the card stays recoverable. */
  ledgerEntryId?: string;
  onResolved?: (ledgerEntryId: string) => void;
  /** [PROD-UX-BUGC] Server-resolved choices for an ambiguous recipient. */
  selectCandidates?: Array<{ entity_id: string; display_name: string }> | undefined;
  /** [PROD-UX-BUGC] Fired after a successful confirm/select so the parent
   *  reloads the durable cards (the decision lives on the WorkLedger row). */
  onReviewResolved?: () => void;
}): JSX.Element {
  const [whyOpen, setWhyOpen] = useState(false);
  const guard = governanceGuard(suggested.recipient_governance);

  // Transition the durable row so the card drops out of the pending set.
  // `removeOnSuccess` distinguishes the two verbs:
  //  - Send (EXECUTED): keep the card mounted so ProposedActionCard shows its
  //    post-send audit-link confirmation (the 4-stage audit pattern). The row
  //    is EXECUTED, so it is excluded on the next load — "sent one gone after
  //    refresh". A failed send leaves the row DRAFT: recoverable, still shown.
  //  - Dismiss (CANCELLED): remove the card immediately.
  const transitionDurable = useCallback(
    async (status: "EXECUTED" | "CANCELLED", removeOnSuccess: boolean): Promise<void> => {
      if (ledgerEntryId === undefined) return;
      const res = await api.workOs.patchLedger(ledgerEntryId, { status });
      if (res.ok && res.data.ok && removeOnSuccess) onResolved?.(ledgerEntryId);
    },
    [ledgerEntryId, onResolved],
  );

  return (
    <div data-testid="comms-follow-up-row">
      <ProposedActionCard
        proposedAction={{
          action_type: suggested.action_type,
          target: suggested.target,
          draft_text: suggested.draft_text,
          reason: suggested.reason,
        }}
        {...(guard !== undefined ? { sendGuard: guard } : {})}
        {...(ledgerEntryId !== undefined
          ? {
              onSent: () => {
                void transitionDurable("EXECUTED", false);
              },
              onCancelled: () => {
                void transitionDurable("CANCELLED", true);
              },
            }
          : {})}
      />
      <RecipientTrustChip g={suggested.recipient_governance} autonomy={suggested.autonomy} />
      {/* [PROD-UX-BUGC] Review completion — only on durable cards (the decision
          patches the backing WorkLedger row, so it survives navigation). */}
      {ledgerEntryId !== undefined && onReviewResolved !== undefined ? (
        <RecipientReviewActions
          g={suggested.recipient_governance}
          ledgerEntryId={ledgerEntryId}
          candidates={selectCandidates}
          onReviewResolved={onReviewResolved}
        />
      ) : null}
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

// [PROD-UX-BUGB] The durable, navigation-surviving follow-up surface. Renders
// the SAME ProposedActionCard from pending FOLLOW_UP ledger rows (loaded on
// mount and after each ingest), so the drafted follow-ups a customer saw are
// still here when they leave Comms and come back. Send/dismiss transition the
// backing row; a failed send stays DRAFT and recoverable. Hidden when empty
// (no fabricated cards).
function PendingFollowUpsSection({
  followUps,
  onResolved,
  onReviewResolved,
}: {
  followUps: PendingFollowUp[];
  onResolved: (ledgerEntryId: string) => void;
  /** [PROD-UX-BUGC] Reload after a successful recipient-review completion. */
  onReviewResolved: () => void;
}): JSX.Element | null {
  if (followUps.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="comms-pending-follow-ups">
      <h3 className="text-sm font-medium">Follow-ups waiting for you</h3>
      <p className="text-xs text-muted-foreground">
        Otzar drafted these from your conversations. They stay here until you
        send or dismiss them — even if you leave and come back. Otzar submits
        each as a governed internal action; nothing leaves your org without your
        approval.
      </p>
      {followUps.map((f) => (
        <FollowUpCard
          key={f.ledger_entry_id}
          suggested={f.action}
          extractionMode=""
          ledgerEntryId={f.ledger_entry_id}
          onResolved={onResolved}
          selectCandidates={f.select_candidates}
          onReviewResolved={onReviewResolved}
        />
      ))}
    </div>
  );
}
