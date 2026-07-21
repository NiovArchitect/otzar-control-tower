// FILE: LearningAppliesCard.tsx
// PURPOSE: H-03 — product surface: approved Teach Otzar learning shapes
//          later work; rejected never applies. Links later-work surfaces.
// CONNECTS TO: MyMemory, learning-applies.ts, Preferences, PortableCore.

import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LEARNING_APPLIES_DOCTRINE,
  LATER_WORK_SURFACES,
  REJECTED_NEVER_APPLIES,
  sessionOutcomeSummary,
} from "@/lib/work-os/learning-applies";

export function LearningAppliesCard({
  approvedCount = 0,
  rejectedSessionCount = 0,
  pendingCount = 0,
}: {
  approvedCount?: number;
  rejectedSessionCount?: number;
  pendingCount?: number;
}): JSX.Element {
  const summary = sessionOutcomeSummary({
    approved_count: approvedCount,
    rejected_count: rejectedSessionCount,
    pending_count: pendingCount,
  });

  return (
    <Card
      data-testid="learning-applies-card"
      data-h03="true"
      data-approved-count={String(approvedCount)}
      data-rejected-session-count={String(rejectedSessionCount)}
      data-pending-count={String(pendingCount)}
      data-rejected-never-applies="true"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4" aria-hidden />
          How learning changes later work
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="h03-doctrine">{LEARNING_APPLIES_DOCTRINE}</p>

        <div className="grid gap-2 sm:grid-cols-2">
          <div
            className="rounded-md border border-emerald-300/50 bg-emerald-500/5 p-2"
            data-testid="h03-approved-applies"
          >
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              Approve → applies later
            </p>
            <p className="mt-1">
              Approved preferences join your personal core and inform later
              drafts, tone, and methods — still without new permissions.
            </p>
          </div>
          <div
            className="rounded-md border border-rose-300/40 bg-rose-500/5 p-2"
            data-testid="h03-rejected-never"
          >
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <XCircle className="h-3.5 w-3.5 text-rose-600" aria-hidden />
              Reject → never applies
            </p>
            <p className="mt-1">{REJECTED_NEVER_APPLIES}</p>
          </div>
        </div>

        <p
          className="font-medium text-foreground"
          data-testid="h03-session-summary"
        >
          {summary}
        </p>

        <div data-testid="h03-later-surfaces">
          <p className="font-medium text-foreground">Later-work surfaces</p>
          <ul className="mt-1 space-y-1">
            {LATER_WORK_SURFACES.map((s) => (
              <li key={s.id}>
                <Link
                  to={s.path}
                  className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-2"
                  data-testid={`h03-surface-${s.id}`}
                >
                  {s.label}
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
                <span className="ml-1 text-muted-foreground">— {s.plain}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
