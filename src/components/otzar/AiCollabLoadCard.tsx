// FILE: AiCollabLoadCard.tsx
// PURPOSE: L-02 — AI↔AI load / storm / loop protection product surface.
// CONNECTS TO: Collaboration.tsx, ai-collab-load.ts.

import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  L02_DEFAULTS,
  L02_DOCTRINE,
  buildSyntheticLoadScenario,
  runCollabLoadPressure,
} from "@/lib/work-os/ai-collab-load";

export function AiCollabLoadCard(): JSX.Element {
  const report = useMemo(() => {
    const events = buildSyntheticLoadScenario(42);
    return runCollabLoadPressure(events);
  }, []);

  return (
    <Card
      data-testid="ai-collab-load-card"
      data-l02="true"
      data-storm-trips={String(report.storm_trips)}
      data-loop-blocks={String(report.loop_blocks)}
      data-admitted={String(report.admitted)}
      data-refused={String(report.refused)}
      data-attribution={String(report.principal_attribution_rate)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldAlert className="h-4 w-4" aria-hidden />
          AI collaboration under load
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <p data-testid="l02-doctrine">{L02_DOCTRINE}</p>
        <ul className="grid gap-1 sm:grid-cols-2" data-testid="l02-budget-list">
          <li data-testid="l02-budget-row" data-budget="concurrency">
            Concurrency cap · {L02_DEFAULTS.max_concurrent_per_principal}/principal
          </li>
          <li data-testid="l02-budget-row" data-budget="storm">
            Storm window · {L02_DEFAULTS.storm_window_count} /{" "}
            {L02_DEFAULTS.storm_window_ms / 1000}s
          </li>
          <li data-testid="l02-budget-row" data-budget="chain">
            Max chain depth · {L02_DEFAULTS.max_chain_depth}
          </li>
          <li data-testid="l02-budget-row" data-budget="dup">
            Dup fingerprint limit · {L02_DEFAULTS.duplicate_fingerprint_limit}
          </li>
        </ul>
        <p data-testid="l02-pressure-summary" className="font-medium text-foreground">
          Synthetic pressure: {report.admitted} admitted · {report.refused} refused ·{" "}
          {report.loop_blocks} loop blocks · {report.storm_trips} storm trips
        </p>
        <p data-testid="l02-advancement">
          Work advancement rate{" "}
          {Math.round(report.work_advancement_rate * 100)}% · principal attribution{" "}
          {Math.round(report.principal_attribution_rate * 100)}%
        </p>
        <p data-testid="l02-residual" className="text-[11px]">
          L-01 envelope remains the unit request. L-02 adds load honesty — not a claim
          of unlimited multi-tenant AI storm capacity.
        </p>
      </CardContent>
    </Card>
  );
}
