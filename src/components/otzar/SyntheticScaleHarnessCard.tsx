// FILE: SyntheticScaleHarnessCard.tsx
// PURPOSE: R-03 — product surface for internal progressive synthetic scale
//          (25→250→2500) without YC/Google credentials.
// CONNECTS TO: Users, synthetic-scale-harness.ts, EnterprisePressureCard.

import { useMemo } from "react";
import { Factory, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  R03_DOCTRINE,
  R03_RESIDUAL,
  SYNTHETIC_CHECKLIST,
  progressiveSyntheticPlans,
  syntheticHarnessStatusLabel,
  virtualizationAdvice,
} from "@/lib/org/synthetic-scale-harness";

export function SyntheticScaleHarnessCard({
  livePeopleCount = 0,
}: {
  livePeopleCount?: number;
}): JSX.Element {
  const plans = useMemo(() => progressiveSyntheticPlans(), []);
  const status = syntheticHarnessStatusLabel(plans);
  const virt = virtualizationAdvice(Math.max(livePeopleCount, 25));

  return (
    <Card
      data-testid="synthetic-scale-harness-card"
      data-r03="true"
      data-requires-external-creds="false"
      data-live-people={String(livePeopleCount)}
      data-s25-status={plans.find((p) => p.level === "S25")?.status ?? ""}
      data-s250-status={plans.find((p) => p.level === "S250")?.status ?? ""}
      data-s2500-status={plans.find((p) => p.level === "S2500")?.status ?? ""}
      data-virt-mode={virt.mode}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Factory className="h-4 w-4" aria-hidden />
          Synthetic enterprise scale (internal)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="r03-doctrine">{R03_DOCTRINE}</p>
        <p
          className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 font-medium text-foreground"
          data-testid="r03-status-label"
        >
          {status}
        </p>

        <ul className="grid gap-2 sm:grid-cols-3" data-testid="r03-level-list">
          {plans.map((p) => (
            <li
              key={p.level}
              className="rounded-md border border-border/60 bg-card px-2 py-2"
              data-testid="r03-level-row"
              data-level-id={p.level}
              data-status={p.status}
              data-people-target={String(p.people_target)}
              data-requires-external-creds="false"
            >
              <p className="font-medium text-foreground">
                {p.level} · ~{p.people_target}
              </p>
              <p className="text-[11px]">
                {p.status} · no external creds
              </p>
            </li>
          ))}
        </ul>

        <div data-testid="r03-checklist">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            Every level
          </p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {SYNTHETIC_CHECKLIST.map((c) => (
              <li
                key={c.id}
                className="rounded border border-border/40 px-2 py-1"
                data-testid="r03-check-row"
                data-check-id={c.id}
              >
                <span className="font-medium text-foreground">{c.label}</span>
                <span> — {c.plain}</span>
              </li>
            ))}
          </ul>
        </div>

        <p data-testid="r03-virt-advice">
          Virtualization for live org (~{livePeopleCount || "n"} people):{" "}
          <span className="font-medium text-foreground">{virt.mode}</span> —{" "}
          {virt.reason}
        </p>

        <p
          className="rounded-md border border-border/50 px-2 py-1.5 text-[11px]"
          data-testid="r03-s250-harness-note"
          data-s250-harness="synthetic-s250"
        >
          S250 harness: deterministic seed → 250 people + twins, ≥20 teams, ≥30
          projects, 40 multi-day NL scenarios with hidden oracles, failure
          injection, metrics, repair loop. Run{" "}
          <code className="text-[10px]">npx vitest run tests/unit/synthetic-s250-harness.test.ts</code>
          . No YC credentials.
        </p>

        <p data-testid="r03-residual">{R03_RESIDUAL}</p>
      </CardContent>
    </Card>
  );
}
