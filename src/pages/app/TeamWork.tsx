// FILE: TeamWork.tsx
// PURPOSE: Phase 1279 cockpit + Phase 1285-G waiting-on panel — the manager/
//          founder view of durable team work. Reads GET /api/v1/work-os/
//          team-work. The "Waiting on team" panel surfaces directional
//          relationship state (who is waiting on whom) from REAL Work Ledger
//          records — owner/requester names, source-message proof, status, age
//          — never faked from memory or collaboration counts. Honest blocker
//          when the caller lacks team authority (TEAM_SCOPE_NOT_CONFIGURED).
// CONNECTS TO: api.workOs.teamWork, WorkLedgerItem, route /app/team-work.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WorkLedgerEntryView } from "@/lib/types/foundation";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { bucketFor, BUCKET_ORDER } from "@/lib/work-os/work-buckets";
import { isWaitingOnItem, groupWaitingByOwner, ageOf } from "@/lib/work-os/team-waiting-on";
import { entityLabel } from "@/lib/identity/canonical-entity";
import { useWorkStateChanged } from "@/lib/events/work-state";

export function TeamWork(): JSX.Element {
  const [items, setItems] = useState<WorkLedgerEntryView[] | null>(null);
  // PROD-UX-SCALE — server pagination (mirrors My Work).
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reload — used on mount AND after any status change so completion by an
  // owner clears the item from the team waiting-on panel without a restart.
  async function reload(): Promise<void> {
    const r = await api.workOs.teamWork();
    if (r.ok) {
      setItems(r.data.entries ?? r.data.items ?? []);
      setHasMore(r.data.has_more === true);
    }
    else if (r.code === "TEAM_SCOPE_NOT_CONFIGURED") setBlocked(true);
    else setFailed(true);
  }

  async function loadMore(): Promise<void> {
    if (items === null) return;
    setLoadingMore(true);
    const r = await api.workOs.teamWork({ skip: items.length, take: 300 });
    setLoadingMore(false);
    if (r.ok) {
      const next = r.data.entries ?? r.data.items ?? [];
      const seen = new Set(items.map((i) => i.ledger_entry_id));
      setItems([...items, ...next.filter((i) => !seen.has(i.ledger_entry_id))]);
      setHasMore(r.data.has_more === true);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api.workOs
      .teamWork()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) {
          setItems(r.data.entries ?? r.data.items ?? []);
          setHasMore(r.data.has_more === true);
        }
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

  // Additive cross-surface sync (Phase 1285-H): when a task is completed /
  // tracked anywhere, the team waiting-on panel refreshes without a manual
  // reload — alongside the existing onChanged callback path.
  useWorkStateChanged(
    ["TASK_COMPLETED", "LEDGER_UPDATED", "SIGNAL_TRACKED", "WAITING_ON_CHANGED"],
    () => void reload(),
  );

  // Directional waiting-on items grouped by owner (the person being waited on).
  const waitingOn = items === null ? [] : items.filter(isWaitingOnItem);
  const ownerGroups = groupWaitingByOwner(waitingOn);

  return (
    <div className="space-y-4" data-testid="team-work-page">
      <div>
        <h1 className="text-lg font-semibold">Team Work</h1>
        <p className="text-xs text-muted-foreground">
          Durable work across your team — who is waiting on whom, what's
          pending, what's stale, and what needs attention.
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
      ) : (
        <>
          {/* Phase 1285-G — Waiting on team: directional relationship state
              from durable Work Ledger records. */}
          <section className="space-y-1.5" data-testid="team-work-waiting-on">
            <h2 className="text-xs font-medium text-muted-foreground">
              Waiting on team ({waitingOn.length})
            </h2>
            {waitingOn.length === 0 ? (
              <div
                className="rounded-md border border-border p-3 text-xs text-muted-foreground"
                data-testid="team-work-waiting-on-empty"
              >
                Nothing tracked as waiting on the team right now.
              </div>
            ) : (
              ownerGroups.map((group) => (
                <div key={group.owner_entity_id} className="space-y-1" data-testid="team-work-waiting-on-owner">
                  <div className="text-[11px] font-medium text-amber-600">
                    Waiting on {group.name} ({group.items.length})
                  </div>
                  {group.items.map((e) => (
                    <div key={e.ledger_entry_id} className="ml-2">
                      <div className="text-[11px] text-muted-foreground">
                        requested by {entityLabel(e.requester_display_name)}
                        {" · "}
                        {e.status.replace(/_/g, " ").toLowerCase()}
                        {" · "}
                        {ageOf(e.created_at)}
                        {e.due_at !== null ? ` · due ${e.due_at.slice(0, 10)}` : ""}
                      </div>
                      <WorkLedgerItem entry={e} onChanged={() => void reload()} />
                    </div>
                  ))}
                </div>
              ))
            )}
          </section>

          {/* Full team work, grouped by status bucket (unchanged). */}
          {items.length === 0 ? (
            <div
              className="rounded-md border border-border p-3 text-xs text-muted-foreground"
              data-testid="team-work-empty"
            >
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
                    <WorkLedgerItem key={e.ledger_entry_id} entry={e} onChanged={() => void reload()} />
                  ))}
                </section>
              );
            })
          )}
          {hasMore ? (
            <button
              type="button"
              className="w-full rounded-md border border-border py-1.5 text-xs text-muted-foreground hover:text-foreground"
              data-testid="team-work-load-more"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Loading…" : "Show more team work"}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
