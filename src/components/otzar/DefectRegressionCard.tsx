// FILE: DefectRegressionCard.tsx
// PURPOSE: R-02 — product surface for defect→regression catalog + process.
// CONNECTS TO: Users (near EnterprisePressureCard), defect-regression.ts.

import { useMemo } from "react";
import { Bug, ListChecks, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFECT_REGRESSION_CATALOG,
  R02_DOCTRINE,
  R02_PROCESS_RESIDUAL,
  REGRESSION_PROCESS_STEPS,
  catalogCoverageSummary,
} from "@/lib/org/defect-regression";

export function DefectRegressionCard({
  variant = "admin",
}: {
  variant?: "admin" | "compact";
}): JSX.Element {
  const summary = useMemo(() => catalogCoverageSummary(), []);
  const rows =
    variant === "compact"
      ? DEFECT_REGRESSION_CATALOG.filter((e) => e.severity === "P0")
      : DEFECT_REGRESSION_CATALOG;

  return (
    <Card
      data-testid="defect-regression-card"
      data-r02="true"
      data-variant={variant}
      data-total={String(summary.total)}
      data-covered={String(summary.covered)}
      data-partial={String(summary.partial)}
      data-open={String(summary.open)}
      data-p0-covered={String(summary.p0_covered)}
      data-p0-total={String(summary.p0_total)}
      data-coverage-ratio={summary.coverage_ratio.toFixed(2)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bug className="h-4 w-4" aria-hidden />
          Defect → regression catalog
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="r02-doctrine">{R02_DOCTRINE}</p>

        <div
          className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
          data-testid="r02-coverage-summary"
        >
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Coverage
          </p>
          <p data-testid="r02-coverage-counts">
            {summary.covered} covered · {summary.partial} partial · {summary.open}{" "}
            open · of {summary.total} · P0 {summary.p0_covered}/{summary.p0_total}
          </p>
        </div>

        <div data-testid="r02-process">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            Process
          </p>
          <ol className="grid gap-1 sm:grid-cols-2">
            {REGRESSION_PROCESS_STEPS.map((s, i) => (
              <li
                key={s.id}
                className="rounded-md border border-border/50 px-2 py-1"
                data-testid="r02-process-step"
                data-step-id={s.id}
                data-step-order={String(i + 1)}
              >
                <span className="font-medium text-foreground">
                  {i + 1}. {s.label}
                </span>
                <span> — {s.plain}</span>
              </li>
            ))}
          </ol>
        </div>

        <ul className="space-y-1.5" data-testid="r02-catalog-list">
          {rows.map((e) => (
            <li
              key={e.id}
              className="rounded-md border border-border/60 bg-card px-2 py-1.5"
              data-testid="r02-defect-row"
              data-defect-id={e.id}
              data-severity={e.severity}
              data-coverage={e.coverage}
              data-suite={e.regression_suite}
            >
              <p className="font-medium text-foreground">
                <span className="mr-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {e.severity} · {e.coverage}
                </span>
                {e.title}
              </p>
              <p className="mt-0.5 text-[11px]">{e.plain}</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {e.regression_suite}
              </p>
            </li>
          ))}
        </ul>

        <p data-testid="r02-process-residual" data-process-automation="residual">
          {R02_PROCESS_RESIDUAL}
        </p>
      </CardContent>
    </Card>
  );
}
