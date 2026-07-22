// FILE: OrgDiscoveryFoundCard.tsx
// PURPOSE: "Otzar found" — metrics + full review category breakdown.
//          Never a single unexplained number. Categories deep-link to records.
// CONNECTS TO: org-discovery.ts, OrgSetup, /organization-seeding?class=.

import { Link } from "react-router-dom";
import { ArrowRight, Check, CircleDashed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { OrgDiscoveryView } from "@/lib/setup/org-discovery";

interface Props {
  discovery: OrgDiscoveryView;
  onRefreshSignals?: () => void;
  refreshBusy?: boolean;
}

export function OrgDiscoveryFoundCard({
  discovery,
  onRefreshSignals,
  refreshBusy = false,
}: Props): JSX.Element {
  const reviewCount = discovery.reviewCta?.openCount ?? discovery.openSeedCount;
  const metricTiles = [
    {
      id: "people",
      value: discovery.activePeopleCount,
      label: "People",
      hint:
        discovery.peopleCount > discovery.activePeopleCount
          ? `${discovery.peopleCount - discovery.activePeopleCount} pending`
          : null,
    },
    {
      id: "structure",
      value: discovery.managerLineCount,
      label: "Reporting lines",
      hint:
        discovery.peopleWithoutManager > 0
          ? `${discovery.peopleWithoutManager} need a manager`
          : null,
    },
    {
      id: "teams",
      value: discovery.teamCount,
      label: "Teams",
      hint: null,
    },
    {
      id: "review",
      value: discovery.openSeedCount,
      label: "Need review",
      hint: discovery.openSeedCount > 0 ? "Confirm before apply" : null,
    },
  ];

  return (
    <Card
      data-testid="org-discovery-found"
      className="otzar-atari-frame border-white/10"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold tracking-tight text-slate-100">
            Otzar found
          </CardTitle>
          <p className="text-xs text-slate-400">
            Confirm exceptions. Nothing applies automatically.
          </p>
        </div>
        {reviewCount > 0 ? (
          <Button
            asChild
            size="sm"
            className="otzar-cta-fill shrink-0 rounded-full"
            data-testid="org-discovery-review-cta"
          >
            <Link to={discovery.reviewCta?.to ?? "/organization-seeding"}>
              {discovery.reviewCta?.label ?? `Review ${reviewCount} items`}
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {!discovery.available ? (
          <p
            className="text-sm text-slate-400"
            data-testid="org-discovery-unavailable"
          >
            {discovery.emptyNote ?? "Loading…"}
          </p>
        ) : (
          <>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              data-testid="org-discovery-metrics"
            >
              {metricTiles.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
                  data-testid={`org-discovery-metric-${m.id}`}
                >
                  <p className="text-xl font-semibold tracking-tight text-slate-100 tabular-nums">
                    {m.value}
                  </p>
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                    {m.label}
                  </p>
                  {m.hint !== null ? (
                    <p className="mt-0.5 text-[11px] text-slate-500">{m.hint}</p>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Full category breakdown — every count opens exact records */}
            {discovery.reviewCategories.length > 0 ? (
              <div data-testid="org-discovery-categories">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-300/80">
                  {reviewCount > 0
                    ? `${reviewCount} items need review`
                    : "Review by type"}
                </p>
                <ul className="space-y-1.5">
                  {discovery.reviewCategories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        to={cat.to}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-indigo-400/30 hover:bg-white/[0.06]"
                        data-testid={`org-discovery-category-${cat.id}`}
                        data-count={cat.count}
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                            <CircleDashed
                              className="h-3.5 w-3.5 shrink-0 text-indigo-400"
                              aria-hidden
                            />
                            {cat.label}
                          </span>
                          <span className="mt-0.5 block pl-5 text-[11px] text-slate-500">
                            {cat.plain}
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-indigo-300 group-hover:text-indigo-200">
                          {cat.count}
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : discovery.findings.length > 0 ? (
              <p
                className="flex items-center gap-2 text-sm text-slate-300"
                data-testid="org-discovery-findings"
              >
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                Structure looks calm — no open proposals.
              </p>
            ) : (
              <p
                className="text-sm text-slate-400"
                data-testid="org-discovery-empty"
              >
                {discovery.emptyNote}
              </p>
            )}
          </>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          {onRefreshSignals !== undefined ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-full text-xs text-slate-400 hover:text-slate-200"
              disabled={refreshBusy}
              data-testid="org-discovery-refresh"
              onClick={onRefreshSignals}
            >
              {refreshBusy ? "Scanning…" : "Refresh signals"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
