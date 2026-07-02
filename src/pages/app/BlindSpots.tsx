// FILE: BlindSpots.tsx
// PURPOSE: Phase 1285-P risk/intelligence feed — "Otzar notices what humans
//          miss." The governed watcher feed (GET /work-os/watchers/feed:
//          overdue / stale waiting-on / unresolved blocker / no-next-action,
//          with severity, canonical participants, source proof, and a
//          recommended next action) is the primary view, grouped by risk type.
//          The legacy runtime/verification (proof-failure) + ledger-status
//          sections remain below, deduped against the watcher feed. Durable
//          records only — no AI guessing, no fake risk. Each item explains
//          itself via the shared View/Why.
// CONNECTS TO: api.workOs.watchersFeed + blindSpots, WorkLedgerItem,
//          ViewWhyPanel, viewWhyFromWatcher, work-state events, route
//          /app/blind-spots.

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type {
  WorkLedgerEntryView,
  WatcherFinding,
  WatcherType,
} from "@/lib/types/foundation";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { ViewWhyPanel } from "@/components/work-os/ViewWhyPanel";
import { viewWhyFromWatcher } from "@/lib/work-os/view-why";
import { entityLabel } from "@/lib/identity/canonical-entity";
import { emitWorkStateChanged, useWorkStateChanged } from "@/lib/events/work-state";
import { triageBlindSpots, TRIAGE_INITIAL_COUNT } from "@/lib/work-os/blind-spot-triage";

function isRuntimeIssue(e: WorkLedgerEntryView): boolean {
  return e.blind_spot_reason !== undefined;
}

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: "border-rose-500/60 text-rose-600",
  HIGH: "border-amber-500/60 text-amber-600",
  MEDIUM: "border-amber-400/50 text-amber-600",
  LOW: "border-border text-muted-foreground",
};

// All six watcher groups. Groups with no findings are omitted (honest — never a
// fake count). UNANSWERED_ASK + STALE_COMMITMENT are deferred at Foundation, so
// they simply never appear until those rules go live.
const GROUPS: ReadonlyArray<{ type: WatcherType; label: string }> = [
  { type: "OVERDUE_WORK", label: "Overdue" },
  { type: "STALE_WAITING_ON", label: "Stale waiting-on" },
  { type: "UNRESOLVED_BLOCKER", label: "Blockers" },
  { type: "NO_NEXT_ACTION", label: "No next action" },
  { type: "UNANSWERED_ASK", label: "Unanswered asks" },
  { type: "STALE_COMMITMENT", label: "Commitments" },
];

function ageDays(hours: number | null): string | null {
  if (hours === null) return null;
  const d = Math.floor(hours / 24);
  return d <= 0 ? "today" : `${d}d old`;
}

function WatcherCard({ finding }: { finding: WatcherFinding }): JSX.Element {
  const [whyOpen, setWhyOpen] = useState(false);
  // Phase OTZAR-RETURN-1 — when Otzar's risk feed recommends "mark complete"
  // AND it knows the exact ledger entry, the recommendation becomes an
  // actionable button instead of dead text. Reuses the same governed
  // PATCH-ledger path as WorkLedgerItem. WatcherFinding carries no
  // can_complete hint, so we let the backend re-enforce authority and surface
  // any refusal inline — the control self-corrects rather than dead-ending.
  const [completing, setCompleting] = useState(false);
  const [completeErr, setCompleteErr] = useState<string | null>(null);
  const completableLedgerId =
    finding.recommendation.action_kind === "mark_complete" &&
    finding.source.ledger_entry_id !== null
      ? finding.source.ledger_entry_id
      : null;

  async function markComplete(ledgerEntryId: string): Promise<void> {
    setCompleting(true);
    setCompleteErr(null);
    const r = await api.workOs.patchLedger(ledgerEntryId, { status: "EXECUTED" });
    setCompleting(false);
    if (r.ok && r.data.ok) {
      // These events trigger the page's own useWorkStateChanged reload, and the
      // requester's waiting-on clears across surfaces (My Work, Team Work).
      emitWorkStateChanged({ type: "TASK_COMPLETED", ledger_entry_id: ledgerEntryId });
      emitWorkStateChanged({ type: "LEDGER_UPDATED", ledger_entry_id: ledgerEntryId });
      emitWorkStateChanged({ type: "WAITING_ON_CHANGED" });
    } else {
      setCompleteErr(
        r.ok && r.data.message ? r.data.message : "Couldn't mark complete right now.",
      );
    }
  }

  const owner = finding.owner !== null ? entityLabel(finding.owner.display_name) : null;
  const requester = finding.requester !== null ? entityLabel(finding.requester.display_name) : null;
  const related =
    finding.related_person !== null ? entityLabel(finding.related_person.display_name) : null;
  const age = ageDays(finding.detection.age_hours);
  return (
    <div
      className="rounded-md border border-border bg-background/70 p-2 text-xs"
      data-testid="blind-spot-card"
      data-watcher-type={finding.watcher_type}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-foreground">{finding.title}</div>
          <div className="text-[11px] text-muted-foreground">{finding.summary}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant="outline"
            className={`text-[9px] ${SEVERITY_CLASS[finding.severity] ?? ""}`}
            data-testid="blind-spot-severity"
          >
            {finding.severity.toLowerCase()}
          </Badge>
          <button
            type="button"
            className="rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
            data-testid="blind-spot-why"
            onClick={() => setWhyOpen((v) => !v)}
          >
            {whyOpen ? "Hide" : "Why"}
          </button>
        </div>
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">
        {owner !== null ? `Owner: ${owner}` : ""}
        {requester !== null ? `${owner !== null ? " · " : ""}Requester: ${requester}` : ""}
        {related !== null && related !== owner && related !== requester
          ? ` · With ${related}`
          : ""}
        {age !== null ? ` · ${age}` : ""}
        {finding.detection.due_at !== null ? ` · due ${finding.detection.due_at.slice(0, 10)}` : ""}
      </div>
      <div
        className="mt-0.5 flex items-center justify-between gap-2 text-[11px]"
        data-testid="blind-spot-recommended"
      >
        <span>
          <span className="text-muted-foreground">Recommended:</span>{" "}
          {finding.recommendation.next_action}
        </span>
        {completableLedgerId !== null ? (
          <button
            type="button"
            className="shrink-0 rounded border border-emerald-500/50 px-1.5 text-[10px] text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50"
            data-testid="blind-spot-mark-complete"
            disabled={completing}
            onClick={() => void markComplete(completableLedgerId)}
          >
            {completing ? "Marking…" : "Mark complete"}
          </button>
        ) : null}
      </div>
      {completeErr !== null ? (
        <p
          className="mt-0.5 text-[10px] text-amber-600"
          data-testid="blind-spot-complete-error"
        >
          {completeErr}
        </p>
      ) : null}
      {whyOpen ? (
        <div
          className="mt-1 rounded bg-muted/40 p-1.5 text-[11px] text-muted-foreground"
          data-testid="blind-spot-view-why"
        >
          <ViewWhyPanel model={viewWhyFromWatcher(finding)} />
        </div>
      ) : null}
    </div>
  );
}

export function BlindSpots(): JSX.Element {
  const [findings, setFindings] = useState<WatcherFinding[] | null>(null);
  const [legacy, setLegacy] = useState<WorkLedgerEntryView[] | null>(null);
  const [failed, setFailed] = useState(false);

  async function load(): Promise<void> {
    const [w, l] = await Promise.all([api.workOs.watchersFeed(), api.workOs.blindSpots()]);
    setFindings(w.ok ? w.data.findings ?? [] : []);
    if (l.ok) setLegacy(l.data.items ?? l.data.entries ?? []);
    else if (!w.ok) setFailed(true);
    else setLegacy([]);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [w, l] = await Promise.all([api.workOs.watchersFeed(), api.workOs.blindSpots()]);
      if (cancelled) return;
      setFindings(w.ok ? w.data.findings ?? [] : []);
      if (l.ok) setLegacy(l.data.items ?? l.data.entries ?? []);
      else if (!w.ok) setFailed(true);
      else setLegacy([]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Risk changes when work changes — refresh ambiently.
  useWorkStateChanged(
    ["LEDGER_UPDATED", "TASK_COMPLETED", "WAITING_ON_CHANGED", "SIGNAL_TRACKED", "THREAD_UPDATED"],
    () => void load(),
  );

  const feedItems = findings ?? [];
  const legacyItems = legacy ?? [];
  const feedLedgerIds = new Set(
    feedItems.map((f) => f.source.ledger_entry_id).filter((x): x is string => x !== null),
  );
  // PROD-UX triage — capped initial render; "Show all" is explicit.
  const [showAllRuntime, setShowAllRuntime] = useState(false);
  const [showAllOther, setShowAllOther] = useState(false);
  const runtimeIssues = legacyItems.filter(isRuntimeIssue);
  const otherAttention = legacyItems.filter(
    (e) => !isRuntimeIssue(e) && !feedLedgerIds.has(e.ledger_entry_id),
  );
  const loading = findings === null && legacy === null;
  const empty =
    !loading && feedItems.length === 0 && runtimeIssues.length === 0 && otherAttention.length === 0;

  return (
    <div className="space-y-4" data-testid="blind-spots-page">
      <div>
        <h1 className="text-lg font-semibold">Blind Spots</h1>
        <p className="text-xs text-muted-foreground">
          Otzar surfaces stale, overdue, blocked, or unresolved work before it
          becomes invisible — from your durable work, not guessed.
        </p>
      </div>

      {failed ? (
        <div
          className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400"
          data-testid="blind-spots-error"
        >
          Couldn't load blind spots right now. Refresh to try again.
        </div>
      ) : loading ? (
        <p className="text-xs text-muted-foreground">Scanning your work…</p>
      ) : empty ? (
        <div
          className="rounded-md border border-border p-3 text-xs text-muted-foreground"
          data-testid="blind-spots-empty"
        >
          No blind spots detected right now.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Governed watcher feed (Phase 1285-P) */}
          {feedItems.length > 0 ? (
            <div className="space-y-3" data-testid="blind-spots-feed">
              {GROUPS.map(({ type, label }) => {
                const group = feedItems.filter((i) => i.watcher_type === type);
                if (group.length === 0) return null; // omit empty groups — no fake counts
                return (
                  <section
                    key={type}
                    className="space-y-1.5"
                    data-testid="blind-spots-group"
                    data-group-type={type}
                  >
                    <h2 className="text-xs font-semibold text-muted-foreground">
                      {label} ({group.length})
                    </h2>
                    {group.map((f) => (
                      <WatcherCard key={f.finding_id} finding={f} />
                    ))}
                  </section>
                );
              })}
            </div>
          ) : null}

          {/* Runtime / verification issues (proof failures) — TRIAGED: what
              needs a human first (identity/blocked/setup/approval lanes),
              oldest first, capped behind an honest "show all". */}
          {runtimeIssues.length > 0 ? (
            <div className="space-y-1.5" data-testid="blind-spots-runtime-issues">
              <h2 className="text-xs font-semibold text-amber-600">
                Runtime / verification issues ({runtimeIssues.length})
              </h2>
              {triageBlindSpots(runtimeIssues)
                .slice(0, showAllRuntime ? undefined : TRIAGE_INITIAL_COUNT)
                .map((e) => (
                  <WorkLedgerItem key={e.ledger_entry_id} entry={e} onChanged={() => void load()} />
                ))}
              {!showAllRuntime && runtimeIssues.length > TRIAGE_INITIAL_COUNT ? (
                <button
                  type="button"
                  className="w-full rounded-md border border-border py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  data-testid="blind-spots-runtime-show-all"
                  onClick={() => setShowAllRuntime(true)}
                >
                  Show all {runtimeIssues.length} (most urgent are already on top)
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Other ledger-status items not already in the watcher feed. */}
          {otherAttention.length > 0 ? (
            <div className="space-y-1.5" data-testid="blind-spots-status">
              <h2 className="text-xs font-semibold text-muted-foreground">
                Other work needing attention ({otherAttention.length})
              </h2>
              {triageBlindSpots(otherAttention)
                .slice(0, showAllOther ? undefined : TRIAGE_INITIAL_COUNT)
                .map((e) => (
                  <WorkLedgerItem key={e.ledger_entry_id} entry={e} onChanged={() => void load()} />
                ))}
              {!showAllOther && otherAttention.length > TRIAGE_INITIAL_COUNT ? (
                <button
                  type="button"
                  className="w-full rounded-md border border-border py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  data-testid="blind-spots-other-show-all"
                  onClick={() => setShowAllOther(true)}
                >
                  Show all {otherAttention.length} (most urgent are already on top)
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
