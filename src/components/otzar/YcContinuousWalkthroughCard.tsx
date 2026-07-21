// FILE: YcContinuousWalkthroughCard.tsx
// PURPOSE: S-01 — continuous YC multi-role walkthrough readiness surface.
//          Shows survival paths, role personas, and dedicated-org residual.
// CONNECTS TO: CompanyProfile, AmbientWorkSurface markers, yc-synthetic-walkthrough.ts.

import { Rocket, Route, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  S01_DEDICATED_ORG_RESIDUAL,
  S01_DOCTRINE,
  YC_ROLE_PERSONAS,
  YC_SURVIVAL_PATHS,
} from "@/lib/work-os/yc-synthetic-walkthrough";

export function YcContinuousWalkthroughCard({
  variant = "admin",
}: {
  variant?: "admin" | "compact";
}): JSX.Element {
  return (
    <Card
      data-testid="yc-continuous-walkthrough-card"
      data-s01="true"
      data-variant={variant}
      data-role-count={String(YC_ROLE_PERSONAS.length)}
      data-path-count={String(YC_SURVIVAL_PATHS.length)}
      data-dedicated-org-harness="residual"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Rocket className="h-4 w-4" aria-hidden />
          YC continuous walkthrough
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="s01-doctrine">{S01_DOCTRINE}</p>

        <div data-testid="s01-paths">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <Route className="h-3.5 w-3.5" aria-hidden />
            First-five primary paths
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {YC_SURVIVAL_PATHS.map((p) => (
              <li
                key={p.id}
                className="rounded-md border border-border/60 bg-card px-2 py-1.5"
                data-testid="s01-path-row"
                data-path-id={p.id}
                data-path={p.path}
              >
                <span className="font-medium text-foreground">{p.label}</span>
                <span className="ml-1 font-mono text-[10px]">{p.path}</span>
              </li>
            ))}
          </ul>
        </div>

        <div data-testid="s01-roles">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden />
            Multi-role survival
          </p>
          <ul className="space-y-1">
            {YC_ROLE_PERSONAS.map((r) => (
              <li
                key={r.id}
                className="rounded-md border border-border/50 px-2 py-1"
                data-testid="s01-role-row"
                data-role-id={r.id}
              >
                <span className="font-medium text-foreground">{r.label}</span>
                <span className="text-muted-foreground"> — {r.aha}</span>
              </li>
            ))}
          </ul>
        </div>

        <p data-testid="s01-dedicated-residual" data-dedicated-org="residual">
          {S01_DEDICATED_ORG_RESIDUAL}
        </p>
      </CardContent>
    </Card>
  );
}
