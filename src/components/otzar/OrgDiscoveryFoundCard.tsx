// FILE: OrgDiscoveryFoundCard.tsx
// PURPOSE: Sleek enterprise "Otzar found" surface for Organization setup.
//          Dense signal, minimal copy — Dandelion intelligence without
//          product noise or architecture essays.
// CONNECTS TO: org-discovery.ts, OrgSetup, /organization-seeding.

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
  const reviewCount = discovery.reviewCta?.openCount ?? 0;
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
      className="otzar-atari-frame border-white/70 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.28)]"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold tracking-tight text-slate-900">
            Otzar found
          </CardTitle>
          <p className="text-xs text-slate-500">
            Confirm exceptions. Nothing applies automatically.
          </p>
        </div>
        {reviewCount > 0 ? (
          <Button asChild size="sm" className="otzar-cta-fill shrink-0 rounded-full" data-testid="org-discovery-review-cta">
            <Link to={discovery.reviewCta!.to}>
              {discovery.reviewCta!.label}
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {!discovery.available ? (
          <p className="text-sm text-slate-500" data-testid="org-discovery-unavailable">
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
                  className="rounded-xl border border-white/70 bg-white/50 px-3 py-2.5 shadow-sm"
                  data-testid={`org-discovery-metric-${m.id}`}
                >
                  <p className="text-xl font-semibold tracking-tight text-slate-900 tabular-nums">
                    {m.value}
                  </p>
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                    {m.label}
                  </p>
                  {m.hint !== null ? (
                    <p className="mt-0.5 text-[11px] text-slate-400">{m.hint}</p>
                  ) : null}
                </div>
              ))}
            </div>

            {discovery.findings.some((f) => f.kind === "review") ? (
              <ul className="space-y-1.5" data-testid="org-discovery-findings">
                {discovery.findings
                  .filter((f) => f.kind === "review")
                  .slice(0, 4)
                  .map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <CircleDashed
                        className="h-3.5 w-3.5 shrink-0 text-indigo-400"
                        aria-hidden
                      />
                      <span className="font-medium">{f.label}</span>
                    </li>
                  ))}
              </ul>
            ) : discovery.findings.length > 0 ? (
              <p className="flex items-center gap-2 text-sm text-slate-600" data-testid="org-discovery-findings">
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                Structure looks calm — no open proposals.
              </p>
            ) : (
              <p className="text-sm text-slate-500" data-testid="org-discovery-empty">
                {discovery.emptyNote}
              </p>
            )}
          </>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/60 pt-3">
          {reviewCount === 0 ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 rounded-full border-slate-200/80 bg-white/70 text-xs"
              data-testid="org-discovery-open-review"
            >
              <Link to="/organization-seeding">
                Discovery review
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          ) : null}
          {onRefreshSignals !== undefined ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-full text-xs text-slate-500"
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
