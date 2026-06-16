// FILE: BlindSpots.tsx
// PURPOSE: Phase 1279 cockpit + Phase 1285-N risk feed — "What may quietly hurt
//          the org if nobody acts." The typed risk feed (GET /work-os/blind-
//          spots/feed: overdue / stale waiting-on / unresolved blocker / no-next
//          -action, with severity + recommended action) is the primary view;
//          the legacy ledger-status + runtime/verification sections remain below
//          (proof failures), deduped against the feed. Durable records only — no
//          AI guessing, no fake risk. Each item explains itself via View/Why.
// CONNECTS TO: api.workOs.blindSpotsFeed + blindSpots, WorkLedgerItem,
//          ViewWhyPanel, work-state events, route /app/blind-spots.

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { WorkLedgerEntryView, BlindSpotFeedItem, BlindSpotType } from "@/lib/types/foundation";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { ViewWhyPanel } from "@/components/work-os/ViewWhyPanel";
import { viewWhyFromBlindSpot } from "@/lib/work-os/view-why";
import { entityLabel } from "@/lib/identity/canonical-entity";
import { useWorkStateChanged } from "@/lib/events/work-state";

function isRuntimeIssue(e: WorkLedgerEntryView): boolean {
  return e.blind_spot_reason !== undefined;
}

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: "border-rose-500/60 text-rose-600",
  HIGH: "border-amber-500/60 text-amber-600",
  MEDIUM: "border-amber-400/50 text-amber-600",
  LOW: "border-border text-muted-foreground",
};

const GROUPS: ReadonlyArray<{ type: BlindSpotType; label: string }> = [
  { type: "OVERDUE_WORK", label: "Overdue" },
  { type: "STALE_WAITING_ON", label: "Stale waiting-on" },
  { type: "UNRESOLVED_BLOCKER", label: "Blockers" },
  { type: "NO_NEXT_ACTION", label: "No next action" },
];

function BlindSpotCard({ item }: { item: BlindSpotFeedItem }): JSX.Element {
  const [whyOpen, setWhyOpen] = useState(false);
  const owner = item.owner_entity_id !== null ? entityLabel(item.owner_display_name) : null;
  const requester = item.requester_entity_id !== null ? entityLabel(item.requester_display_name) : null;
  return (
    <div
      className="rounded-md border border-border bg-background/70 p-2 text-xs"
      data-testid="blind-spot-card"
      data-blind-spot-type={item.type}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-foreground">{item.title}</div>
          <div className="text-[11px] text-muted-foreground">{item.summary}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant="outline"
            className={`text-[9px] ${SEVERITY_CLASS[item.severity] ?? ""}`}
            data-testid="blind-spot-severity"
          >
            {item.severity.toLowerCase()}
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
        {` · ${item.age_days}d old`}
        {item.due_at !== null ? ` · due ${item.due_at.slice(0, 10)}` : ""}
      </div>
      <div className="mt-0.5 text-[11px]" data-testid="blind-spot-recommended">
        <span className="text-muted-foreground">Recommended:</span> {item.recommended_action}
      </div>
      {whyOpen ? (
        <div className="mt-1 rounded bg-muted/40 p-1.5 text-[11px] text-muted-foreground" data-testid="blind-spot-view-why">
          <ViewWhyPanel model={viewWhyFromBlindSpot(item)} />
        </div>
      ) : null}
    </div>
  );
}

export function BlindSpots(): JSX.Element {
  const [feed, setFeed] = useState<BlindSpotFeedItem[] | null>(null);
  const [legacy, setLegacy] = useState<WorkLedgerEntryView[] | null>(null);
  const [failed, setFailed] = useState(false);

  async function reload(): Promise<void> {
    const [f, l] = await Promise.all([api.workOs.blindSpotsFeed(), api.workOs.blindSpots()]);
    setFeed(f.ok ? f.data.items ?? [] : []);
    if (l.ok) setLegacy(l.data.items ?? l.data.entries ?? []);
    else if (!f.ok) setFailed(true);
    else setLegacy([]);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [f, l] = await Promise.all([api.workOs.blindSpotsFeed(), api.workOs.blindSpots()]);
      if (cancelled) return;
      setFeed(f.ok ? f.data.items ?? [] : []);
      if (l.ok) setLegacy(l.data.items ?? l.data.entries ?? []);
      else if (!f.ok) setFailed(true);
      else setLegacy([]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Additive cross-surface refresh — risk changes when work changes.
  useWorkStateChanged(
    ["LEDGER_UPDATED", "TASK_COMPLETED", "WAITING_ON_CHANGED", "SIGNAL_TRACKED"],
    () => void reload(),
  );

  const feedItems = feed ?? [];
  const legacyItems = legacy ?? [];
  const feedLedgerIds = new Set(feedItems.map((f) => f.ledger_entry_id));
  const runtimeIssues = legacyItems.filter(isRuntimeIssue);
  // Legacy ledger-status items the typed feed didn't already surface.
  const otherAttention = legacyItems.filter(
    (e) => !isRuntimeIssue(e) && !feedLedgerIds.has(e.ledger_entry_id),
  );
  const loading = feed === null && legacy === null;
  const empty =
    !loading && feedItems.length === 0 && runtimeIssues.length === 0 && otherAttention.length === 0;

  return (
    <div className="space-y-4" data-testid="blind-spots-page">
      <div>
        <h1 className="text-lg font-semibold">Blind Spots</h1>
        <p className="text-xs text-muted-foreground">
          Otzar surfaces stale, overdue, blocked, or unresolved work before it
          becomes invisible — from your durable Work Ledger, not guessed.
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
          {/* Typed risk feed (Phase 1285-N) */}
          {feedItems.length > 0 ? (
            <div className="space-y-3" data-testid="blind-spots-feed">
              {GROUPS.map(({ type, label }) => {
                const group = feedItems.filter((i) => i.type === type);
                if (group.length === 0) return null;
                return (
                  <section key={type} className="space-y-1.5" data-testid="blind-spots-group" data-group-type={type}>
                    <h2 className="text-xs font-semibold text-muted-foreground">
                      {label} ({group.length})
                    </h2>
                    {group.map((i) => (
                      <BlindSpotCard key={i.blind_spot_id} item={i} />
                    ))}
                  </section>
                );
              })}
            </div>
          ) : null}

          {/* Runtime / verification issues (proof failures) — legacy section. */}
          {runtimeIssues.length > 0 ? (
            <div className="space-y-1.5" data-testid="blind-spots-runtime-issues">
              <h2 className="text-xs font-semibold text-amber-600">Runtime / verification issues</h2>
              {runtimeIssues.map((e) => (
                <WorkLedgerItem key={e.ledger_entry_id} entry={e} onChanged={() => void reload()} />
              ))}
            </div>
          ) : null}

          {/* Other ledger-status items not already in the typed feed. */}
          {otherAttention.length > 0 ? (
            <div className="space-y-1.5" data-testid="blind-spots-status">
              <h2 className="text-xs font-semibold text-muted-foreground">Other work needing attention</h2>
              {otherAttention.map((e) => (
                <WorkLedgerItem key={e.ledger_entry_id} entry={e} onChanged={() => void reload()} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
