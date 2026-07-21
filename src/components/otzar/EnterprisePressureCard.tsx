// FILE: EnterprisePressureCard.tsx
// PURPOSE: R-01 — progressive enterprise pressure harness surface:
//          25→250→2500 bands, repair loop, live people band, scale residual.
// CONNECTS TO: Users, CompanyProfile, enterprise-pressure.ts, hierarchy API.

import { useMemo } from "react";
import { Activity, Wrench, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PRESSURE_LEVELS,
  R01_DOCTRINE,
  R01_SCALE_RESIDUAL,
  REPAIR_LOOP_STEPS,
  classifyPeoplePressure,
  progressiveHarnessStatus,
} from "@/lib/org/enterprise-pressure";

export function EnterprisePressureCard({
  peopleCount,
  variant = "admin",
}: {
  /** Live org people headcount when known. */
  peopleCount: number;
  variant?: "admin" | "compact";
}): JSX.Element {
  const cls = useMemo(
    () => classifyPeoplePressure(peopleCount),
    [peopleCount],
  );
  const harness = useMemo(
    () => progressiveHarnessStatus(peopleCount),
    [peopleCount],
  );

  return (
    <Card
      data-testid="enterprise-pressure-card"
      data-r01="true"
      data-variant={variant}
      data-people-count={String(cls.people)}
      data-pressure-level={cls.level}
      data-band-floor={String(cls.band_floor)}
      data-proven-levels={harness.proven_levels.join(",")}
      data-residual-levels={harness.residual_levels.join(",")}
      data-scale-residual={cls.residual_scale ? "true" : "false"}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" aria-hidden />
          Enterprise pressure harness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="r01-doctrine">{R01_DOCTRINE}</p>

        <div
          className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
          data-testid="r01-live-band"
          data-level={cls.level}
        >
          <p className="font-medium text-foreground">
            Live org band: {cls.level} · {cls.people} people
          </p>
          <p data-testid="r01-harness-label">{harness.label}</p>
        </div>

        <ul className="grid gap-2 sm:grid-cols-3" data-testid="r01-level-list">
          {PRESSURE_LEVELS.map((l) => {
            const proven = harness.proven_levels.includes(l.id);
            return (
              <li
                key={l.id}
                className="rounded-md border border-border/60 bg-card px-2 py-2"
                data-testid="r01-level-row"
                data-level-id={l.id}
                data-proven={proven ? "true" : "false"}
                data-target={String(l.people_target)}
              >
                <p className="font-medium text-foreground">
                  {l.label}
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    {proven ? "reachable" : "residual"}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px]">{l.plain}</p>
              </li>
            );
          })}
        </ul>

        <div data-testid="r01-repair-loop">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <Wrench className="h-3.5 w-3.5" aria-hidden />
            Repair loop
          </p>
          <ol className="grid gap-1 sm:grid-cols-2">
            {REPAIR_LOOP_STEPS.map((s, i) => (
              <li
                key={s.id}
                className="rounded-md border border-border/50 px-2 py-1"
                data-testid="r01-repair-step"
                data-step-id={s.id}
                data-step-order={String(i + 1)}
              >
                <span className="font-medium text-foreground">
                  {i + 1}. {s.label}
                </span>
                <span className="text-muted-foreground"> — {s.plain}</span>
              </li>
            ))}
          </ol>
        </div>

        <p
          className="flex items-start gap-1.5 text-[11px]"
          data-testid="r01-scale-residual"
          data-scale-residual="true"
        >
          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{R01_SCALE_RESIDUAL}</span>
        </p>
      </CardContent>
    </Card>
  );
}
