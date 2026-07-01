// FILE: MyWork.tsx
// PURPOSE: Phase 1279 cockpit — the employee's durable Work OS view of
//          what they owe, what's waiting, what's blocked, and what was
//          extracted from conversations. Reads GET /api/v1/work-os/my-work
//          (tenant-scoped, caller's own work). Honest empty + error
//          states; never fakes work.
// CONNECTS TO: api.workOs.myWork, WorkLedgerItem, App.tsx route /app/my-work.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WorkLedgerEntryView } from "@/lib/types/foundation";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { bucketFor, BUCKET_ORDER } from "@/lib/work-os/work-buckets";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { useWorkStateChanged } from "@/lib/events/work-state";

// Phase 1287-C — ambient readability: urgent / active buckets lead expanded;
// lower-priority + history buckets collapse by default so a busy My Work stays
// scannable (and a future lens / voice summary leads with what matters). Urgent
// work is NEVER collapsed by default.
const COLLAPSED_BY_DEFAULT: ReadonlySet<string> = new Set([
  "Meetings / confirmations",
  "Recently created",
]);

export function MyWork(): JSX.Element {
  const [items, setItems] = useState<WorkLedgerEntryView[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Reload My Work — used on mount AND after a status change (Mark complete)
  // so a completed task drops out / updates without an app restart.
  async function reload(): Promise<void> {
    const r = await api.workOs.myWork();
    if (r.ok) setItems(r.data.items ?? r.data.entries ?? []);
    else setFailed(true);
  }

  useEffect(() => {
    let cancelled = false;
    api.workOs
      .myWork()
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

  // Additive cross-surface sync (Phase 1285-H): refresh when work state changes
  // anywhere (e.g. a task tracked/completed elsewhere), alongside the existing
  // onChanged callback path.
  useWorkStateChanged(["TASK_COMPLETED", "LEDGER_UPDATED", "SIGNAL_TRACKED"], () => void reload());

  return (
    <div className="space-y-4" data-testid="my-work-page">
      <div>
        <h1 className="text-lg font-semibold">My Work</h1>
        <p className="text-xs text-muted-foreground">
          Durable work Otzar extracted and is tracking for you — what you
          owe, what's waiting, and what's blocked. Saved to the Work Ledger.
        </p>
      </div>

      {failed ? (
        <div
          className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400"
          data-testid="my-work-error"
        >
          Couldn't load your work right now. Refresh to try again — nothing
          is shown that we couldn't load.
        </div>
      ) : items === null ? (
        <p className="text-xs text-muted-foreground">Loading your work…</p>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-border p-3 text-xs text-muted-foreground" data-testid="my-work-empty">
          No durable work yet. When you say things like “I told a teammate I'd
          follow up” or “Ask a teammate to review this,” Otzar saves them here.
        </div>
      ) : (
        BUCKET_ORDER.map((bucket) => {
          const group = items.filter((e) => bucketFor(e) === bucket);
          if (group.length === 0) return null;
          return (
            <div key={bucket} data-testid="my-work-group" data-bucket={bucket}>
              <CollapsibleSection
                title={bucket}
                count={group.length}
                defaultOpen={!COLLAPSED_BY_DEFAULT.has(bucket)}
                testId="my-work-section"
              >
                {group.map((e) => (
                  <WorkLedgerItem key={e.ledger_entry_id} entry={e} onChanged={() => void reload()} />
                ))}
              </CollapsibleSection>
            </div>
          );
        })
      )}
    </div>
  );
}
