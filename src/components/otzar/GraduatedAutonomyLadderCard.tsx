// FILE: GraduatedAutonomyLadderCard.tsx
// PURPOSE: M-01 — product UX for observe → draft → confirm → execute.
//          Honest ceiling from Foundation behavior policy; preference ≠ authority.
// CONNECTS TO: MyTwin, AuthorityGrants, graduated-autonomy.ts, Action Center.

import { Link } from "react-router-dom";
import { Eye, FileEdit, CheckCircle2, Play, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildGraduatedAutonomyView,
  stageAvailabilityLabel,
  type AutonomyStageId,
  type StageAvailability,
} from "@/lib/work-os/graduated-autonomy";

const ICONS: Record<AutonomyStageId, JSX.Element> = {
  observe: <Eye className="h-3.5 w-3.5" aria-hidden />,
  draft: <FileEdit className="h-3.5 w-3.5" aria-hidden />,
  confirm: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
  execute: <Play className="h-3.5 w-3.5" aria-hidden />,
};

function tone(a: StageAvailability): string {
  switch (a) {
    case "active_ceiling":
      return "border-indigo-300/80 bg-indigo-500/10 text-foreground";
    case "allowed":
      return "border-border/60 bg-card text-foreground";
    case "gated":
      return "border-amber-300/60 bg-amber-500/5 text-foreground";
    case "blocked":
      return "border-border/40 bg-muted/30 text-muted-foreground";
  }
}

export function GraduatedAutonomyLadderCard({
  autonomyMode,
  variant = "employee",
}: {
  autonomyMode?: string | null;
  variant?: "employee" | "admin";
}): JSX.Element {
  const view = buildGraduatedAutonomyView(autonomyMode ?? null);

  return (
    <Card
      data-testid="graduated-autonomy-ladder"
      data-m01="true"
      data-policy-label={view.policy_label}
      data-current-stage={view.current_stage_id}
      data-ceiling-stage={view.ceiling_stage_id}
      data-preference-raises-autonomy="false"
      data-variant={variant}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          Graduated autonomy
          <span className="ml-auto text-[10px] font-normal text-muted-foreground">
            Behavior policy: {view.policy_label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="m01-doctrine" data-m01-doctrine="true">
          {view.authority_note}
        </p>

        <ol
          className="grid gap-2 sm:grid-cols-4"
          data-testid="m01-ladder-stages"
        >
          {view.stages.map((s, i) => (
            <li
              key={s.id}
              className={`relative rounded-md border px-2 py-2 ${tone(s.availability)}`}
              data-testid="m01-stage"
              data-stage-id={s.id}
              data-stage-availability={s.availability}
            >
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                {ICONS[s.id]}
                <span>
                  {i + 1}. {s.label}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {s.plain}
              </p>
              <p
                className="mt-1 text-[10px] font-medium"
                data-testid="m01-stage-status"
              >
                {stageAvailabilityLabel(s.availability)}
              </p>
            </li>
          ))}
        </ol>

        <p data-testid="m01-preference-note">{view.preference_note}</p>

        {variant === "employee" ? (
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[11px]"
            data-testid="m01-actions"
          >
            <Link
              to="/app/action-center"
              className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2"
              data-testid="m01-confirm-link"
            >
              Needs me (confirm) <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
            <Link
              to="/app/authority-grants"
              className="font-medium text-foreground underline underline-offset-2"
              data-testid="m01-grants-link"
            >
              Authority grants
            </Link>
            <Link
              to="/app/my-memory"
              className="font-medium text-foreground underline underline-offset-2"
              data-testid="m01-memory-link"
            >
              Preferences (not permissions)
            </Link>
          </div>
        ) : (
          <p
            className="border-t border-border pt-2 text-[11px]"
            data-testid="m01-admin-note"
          >
            Admin Behavior Policy sets the ceiling. Employees confirm in Needs
            me; grants stay revocable. Templates never skip confirm or execute
            past org policy.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
