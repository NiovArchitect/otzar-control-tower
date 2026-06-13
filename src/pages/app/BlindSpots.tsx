// FILE: BlindSpots.tsx
// PURPOSE: Phase 1279 cockpit — "What am I missing?" Reads
//          GET /api/v1/work-os/blind-spots (ledger-derived: unresolved
//          targets, missing owners, blocked, approval/confirmation-needed,
//          overdue, runtime-missing, no-next-action). No AI guessing —
//          only durable ledger data. Honest empty + error states.
// CONNECTS TO: api.workOs.blindSpots, WorkLedgerItem, route /app/blind-spots.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WorkLedgerEntryView } from "@/lib/types/foundation";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";

export function BlindSpots(): JSX.Element {
  const [items, setItems] = useState<WorkLedgerEntryView[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.workOs
      .blindSpots()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setItems(r.data.items ?? r.data.entries ?? []);
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
    <div className="space-y-4" data-testid="blind-spots-page">
      <div>
        <h1 className="text-lg font-semibold">Blind Spots</h1>
        <p className="text-xs text-muted-foreground">
          What's missing, blocked, waiting, or slipping — derived only from
          your durable Work Ledger, not guessed.
        </p>
      </div>

      {failed ? (
        <div
          className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400"
          data-testid="blind-spots-error"
        >
          Couldn't load blind spots right now. Refresh to try again.
        </div>
      ) : items === null ? (
        <p className="text-xs text-muted-foreground">Scanning your work…</p>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-border p-3 text-xs text-muted-foreground" data-testid="blind-spots-empty">
          Nothing is blocked, unresolved, or overdue right now.
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((e) => (
            <WorkLedgerItem key={e.ledger_entry_id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
