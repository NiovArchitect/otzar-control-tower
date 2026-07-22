// FILE: OrgDiscoveryReviewQueue.tsx
// PURPOSE: Inline actionable review on Organization setup — not report-only.
//          Confirm / hold / reject live seeds; count drops; queue refreshes.
//          Plain language only; full queue remains at /organization-seeding.
// CONNECTS TO: org-discovery actionableItems, api.otzar.dandelionSeeds.

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { OrgActionableItem } from "@/lib/setup/org-discovery";

interface Props {
  items: OrgActionableItem[];
  openCount: number;
  onChanged: () => void;
}

export function OrgDiscoveryReviewQueue({
  items,
  openCount,
  onChanged,
}: Props): JSX.Element | null {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneNote, setDoneNote] = useState<string | null>(null);

  if (openCount === 0 && items.length === 0) return null;

  async function act(
    seedId: string,
    verb: "approve" | "reject" | "hold",
  ): Promise<void> {
    setBusyId(seedId);
    setError(null);
    setDoneNote(null);
    const r =
      verb === "approve"
        ? await api.otzar.dandelionSeeds.approve(seedId)
        : verb === "reject"
          ? await api.otzar.dandelionSeeds.reject(seedId)
          : await api.otzar.dandelionSeeds.hold(seedId);
    setBusyId(null);
    if (!r.ok) {
      setError(r.message ?? r.code ?? "Could not update that item.");
      return;
    }
    setDoneNote(
      verb === "approve"
        ? "Confirmed — organization will update."
        : verb === "reject"
          ? "Rejected — will not apply."
          : "Held for later.",
    );
    onChanged();
  }

  return (
    <section
      className="otzar-glass-card otzar-atari-frame space-y-3 p-4"
      data-testid="org-discovery-review-queue"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-100">
            Decide now
          </h2>
          <p className="text-xs text-slate-400">
            {openCount} {openCount === 1 ? "item needs" : "items need"} review.
            Confirm, correct later, or reject. Nothing applies automatically.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 rounded-full border-white/15 bg-white/5 text-xs text-slate-200"
          data-testid="org-discovery-open-full-queue"
        >
          <Link to="/organization-seeding">
            Full review queue
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      {error !== null ? (
        <p className="text-xs text-rose-300" data-testid="org-discovery-act-error">
          {error}
        </p>
      ) : null}
      {doneNote !== null ? (
        <p
          className="flex items-center gap-1.5 text-xs text-emerald-300"
          data-testid="org-discovery-act-done"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          {doneNote}
        </p>
      ) : null}

      <ul className="space-y-2" data-testid="org-discovery-actionable-list">
        {items.map((item) => (
          <li
            key={item.seedId}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3"
            data-testid="org-discovery-actionable-item"
            data-seed-id={item.seedId}
            data-seed-type={item.seedType}
            data-category={item.categoryId}
          >
            <p className="text-sm font-medium text-slate-100">{item.title}</p>
            <p className="mt-0.5 text-xs text-slate-400">{item.reason}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
              <span data-testid="org-item-confidence">{item.confidenceLabel}</span>
              {item.source !== null ? (
                <span data-testid="org-item-source" className="italic">
                  · Based on: {item.source.length > 90
                    ? `${item.source.slice(0, 90)}…`
                    : item.source}
                </span>
              ) : (
                <span className="text-amber-400/90">
                  · Source not attached — review carefully
                </span>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                className="otzar-cta-fill h-8 rounded-full text-xs"
                disabled={busyId === item.seedId}
                data-testid="org-item-confirm"
                onClick={() => void act(item.seedId, "approve")}
              >
                {busyId === item.seedId ? "Working…" : item.confirmLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-full border-white/15 bg-transparent text-xs text-slate-300"
                disabled={busyId === item.seedId}
                data-testid="org-item-hold"
                onClick={() => void act(item.seedId, "hold")}
              >
                <Pause className="mr-1 h-3 w-3" aria-hidden />
                Later
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-full text-xs text-slate-400 hover:text-rose-300"
                disabled={busyId === item.seedId}
                data-testid="org-item-reject"
                onClick={() => void act(item.seedId, "reject")}
              >
                <X className="mr-1 h-3 w-3" aria-hidden />
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {openCount > items.length ? (
        <p className="text-[11px] text-slate-500">
          Showing {items.length} of {openCount}. Open the full queue for every
          record.
        </p>
      ) : null}
    </section>
  );
}
