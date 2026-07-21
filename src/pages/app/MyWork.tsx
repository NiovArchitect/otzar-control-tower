// FILE: MyWork.tsx
// PURPOSE: Human work states — To do / In progress / Waiting / Needs review / Done.
//          Honest empty + error; never fakes work. Loading has a stable test id.
// CONNECTS TO: api.workOs.myWork, WorkLedgerItem, work-buckets.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { WorkLedgerEntryView } from "@/lib/types/foundation";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import {
  bucketFor,
  BUCKET_ORDER,
  COLLAPSED_BY_DEFAULT,
} from "@/lib/work-os/work-buckets";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { useWorkStateChanged } from "@/lib/events/work-state";
import { PageHeader } from "@/components/PageHeader";
import { GlassPanel } from "@/components/ambient/GlassPanel";
import { GLASS_SURFACE } from "@/lib/ambient/glass";

export function MyWork(): JSX.Element {
  const [items, setItems] = useState<WorkLedgerEntryView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function reload(): Promise<void> {
    try {
      const r = await api.workOs.myWork();
      if (r.ok) {
        setFailed(false);
        setItems(r.data.items ?? r.data.entries ?? []);
        setHasMore(r.data.has_more === true);
      } else {
        setFailed(true);
        setItems([]);
      }
    } catch {
      setFailed(true);
      setItems([]);
    }
  }

  async function loadMore(): Promise<void> {
    if (items === null) return;
    setLoadingMore(true);
    try {
      const r = await api.workOs.myWork({ skip: items.length, take: 200 });
      if (r.ok) {
        const next = r.data.items ?? r.data.entries ?? [];
        const seen = new Set(items.map((i) => i.ledger_entry_id));
        setItems([
          ...items,
          ...next.filter((i) => !seen.has(i.ledger_entry_id)),
        ]);
        setHasMore(r.data.has_more === true);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled && items === null) {
        // Bound hang: surface error rather than infinite "Loading…"
        setFailed(true);
        setItems([]);
      }
    }, 12_000);
    void (async () => {
      try {
        const r = await api.workOs.myWork();
        if (cancelled) return;
        if (r.ok) {
          setItems(r.data.items ?? r.data.entries ?? []);
          setHasMore(r.data.has_more === true);
          setFailed(false);
        } else {
          setFailed(true);
          setItems([]);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useWorkStateChanged(
    ["TASK_COMPLETED", "LEDGER_UPDATED", "SIGNAL_TRACKED"],
    () => void reload(),
  );

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-5 pb-24"
      data-testid="my-work-page"
    >
      <PageHeader
        eyebrow="Your work"
        title="My Work"
        description="What you own, what Otzar is handling, what is waiting, and what is done."
      />

      {failed && items !== null && items.length === 0 ? (
        <GlassPanel intensity="attention" testId="my-work-error">
          <p className="text-sm text-amber-900">
            Couldn&apos;t load your work right now. Refresh to try again.
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-indigo-700 underline"
            data-testid="my-work-retry"
            onClick={() => {
              setFailed(false);
              setItems(null);
              void reload();
            }}
          >
            Try again
          </button>
        </GlassPanel>
      ) : items === null ? (
        <p className="text-sm text-slate-500" data-testid="my-work-loading">
          Loading your work…
        </p>
      ) : items.length === 0 ? (
        <div
          className={`${GLASS_SURFACE} space-y-4 p-6`}
          data-testid="my-work-empty"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
              <Briefcase className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">
                You are caught up
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                When Otzar extracts commitments from Talk or Comms, they show up
                here so you know what is yours.
              </p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" aria-hidden />
              <span>
                Open{" "}
                <Link
                  to="/app/work-projects"
                  className="font-medium text-indigo-700 underline-offset-2 hover:underline"
                >
                  Projects
                </Link>{" "}
                for missions you are on.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" aria-hidden />
              <span>
                Use Talk — Otzar turns conversation into tracked work.
              </span>
            </li>
          </ul>
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
                <div className="space-y-2">
                  {group.map((e) => (
                    <WorkLedgerItem
                      key={e.ledger_entry_id}
                      entry={e}
                      onChanged={() => void reload()}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            </div>
          );
        })
      )}
      {hasMore ? (
        <button
          type="button"
          className={`${GLASS_SURFACE} w-full py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900`}
          data-testid="my-work-load-more"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? "Loading…" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
