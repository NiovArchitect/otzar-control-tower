// FILE: TeamWork.tsx
// PURPOSE: Phase 1279 cockpit — the manager/founder view of durable team
//          work: blockers, waiting confirmations, ownerless/unresolved
//          work, stuck approvals, stale commitments — grouped by status.
//          Reads GET /api/v1/work-os/team-work. Honest blocker when the
//          caller lacks team authority (TEAM_SCOPE_NOT_CONFIGURED). Never
//          fakes an org view; tenant-scoped server-side.
// CONNECTS TO: api.workOs.teamWork, WorkLedgerItem, route /app/team-work.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WorkLedgerEntryView } from "@/lib/types/foundation";
import { WorkLedgerItem, bucketFor, BUCKET_ORDER } from "@/components/work-os/WorkLedgerItem";

export function TeamWork(): JSX.Element {
  const [items, setItems] = useState<WorkLedgerEntryView[] | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.workOs
      .teamWork()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setItems(r.data.entries ?? r.data.items ?? []);
        else if (r.code === "TEAM_SCOPE_NOT_CONFIGURED") setBlocked(true);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4" data-testid="team-work-page">
      <div>
        <h1 className="text-lg font-semibold">Team Work</h1>
        <p className="text-xs text-muted-foreground">
          Durable work across your team — blockers, waiting confirmations,
          ownerless/unresolved work, and who's waiting on whom.
        </p>
      </div>

      {blocked ? (
        <div
          className="rounded-md border border-border p-3 text-xs text-muted-foreground"
          data-testid="team-work-blocked"
        >
          Team scope is not configured or your role cannot view team work.
        </div>
      ) : failed ? (
        <div
          className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400"
          data-testid="team-work-error"
        >
          Couldn't load team work right now. Refresh to try again.
        </div>
      ) : items === null ? (
        <p className="text-xs text-muted-foreground">Loading team work…</p>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-border p-3 text-xs text-muted-foreground" data-testid="team-work-empty">
          No open team work right now.
        </div>
      ) : (
        BUCKET_ORDER.map((bucket) => {
          const group = items.filter((e) => bucketFor(e) === bucket);
          if (group.length === 0) return null;
          return (
            <section key={bucket} className="space-y-1.5" data-testid="team-work-group">
              <h2 className="text-xs font-medium text-muted-foreground">
                {bucket} ({group.length})
              </h2>
              {group.map((e) => (
                <WorkLedgerItem key={e.ledger_entry_id} entry={e} />
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}
