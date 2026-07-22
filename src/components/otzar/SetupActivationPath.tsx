// FILE: SetupActivationPath.tsx
// PURPOSE: Interactive 9-step Organization activation path — live state,
//          one next action per step, no decorative checklist.
// CONNECTS TO: activation-path.ts, OrgSetup.

import { Link } from "react-router-dom";
import { ArrowRight, Check, CircleDashed, Compass } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ActivationPathView, ActivationStep } from "@/lib/setup/activation-path";

function stateClasses(state: ActivationStep["state"]): string {
  switch (state) {
    case "ready":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
    case "current":
      return "border-[#B124E8]/30 bg-[#B124E8]/08 text-[#1e1b4b] ring-1 ring-[#B124E8]/20";
    case "needs_attention":
      return "border-[#F77737]/30 bg-[#F77737]/08 text-[#1e1b4b]";
    case "unknown":
    default:
      return "border-[#1e1b4b]/08 bg-white text-[#1e1b4b]";
  }
}

export function SetupActivationPath({
  path,
}: {
  path: ActivationPathView;
}): JSX.Element {
  const focus = path.steps.find((s) => s.id === path.focusStepId) ?? path.steps[0]!;

  return (
    <Card data-testid="setup-activation-path" className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-[#1e1b4b]">
          <Compass className="h-4 w-4 text-[#B124E8]" aria-hidden />
          Setup path
        </CardTitle>
        <CardDescription className="text-xs text-[#5c5a78]">
          Organization → People → Structure → Projects → AI Teammates →
          Connections → Governance → First workflow → Ready. One next step
          at a time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="setup-activation-steps"
        >
          {path.steps.map((step) => (
            <li key={step.id}>
              <Link
                to={step.action.to}
                data-testid={`setup-step-${step.id}`}
                data-state={step.state}
                className={`flex h-full flex-col gap-1 rounded-xl border px-3 py-2.5 transition hover:brightness-110 ${stateClasses(step.state)}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] opacity-90">
                    {step.state === "ready" ? (
                      <Check className="h-3 w-3" aria-hidden />
                    ) : (
                      <CircleDashed className="h-3 w-3" aria-hidden />
                    )}
                    {step.n}. {step.label}
                  </span>
                  <span
                    className="shrink-0 rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-medium"
                    data-testid={`setup-step-state-${step.id}`}
                  >
                    {step.stateLabel}
                  </span>
                </span>
                <span className="line-clamp-2 text-[11px] opacity-90">
                  {step.detail}
                </span>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[11px] font-medium">
                  {step.action.label}
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <div
          className="flex flex-col gap-2 rounded-xl border border-[#B124E8]/20 bg-[#B124E8]/06 p-4 sm:flex-row sm:items-center sm:justify-between"
          data-testid="setup-activation-focus"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#B124E8]">
              Focus now
            </p>
            <p className="text-sm font-semibold text-[#1e1b4b]">
              {focus.n}. {focus.label} — {focus.stateLabel}
            </p>
            <p className="text-xs text-[#5c5a78]">{focus.detail}</p>
          </div>
          <Button asChild size="sm" className="otzar-cta-fill shrink-0 rounded-full">
            <Link to={focus.action.to} data-testid="setup-activation-focus-cta">
              {focus.action.label}
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
