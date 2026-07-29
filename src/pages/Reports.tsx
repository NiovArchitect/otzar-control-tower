// FILE: Reports.tsx
// PURPOSE: Slice 5 — executive, project, team, application-review, and
//          AI-Teammate report types with honest availability. Scheduled
//          delivery is explicit: available paths work; others say so.
// CONNECTS TO: security-audit, setup, action-center, team-work.

import { Link } from "react-router-dom";
import { ArrowRight, FileText, ShieldCheck, CalendarClock, Users, Bot } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const REPORT_TYPES: Array<{
  id: string;
  title: string;
  body: string;
  to: string;
  status: "available" | "live_surface" | "scheduled_later";
  source: string;
}> = [
  {
    id: "executive",
    title: "Executive readiness",
    body: "What is ready, blocked, or waiting — for organization judgment, not vanity activity.",
    to: "/setup",
    status: "available",
    source: "Organization setup + production readiness",
  },
  {
    id: "compliance",
    title: "Regulator & compliance packages",
    body: "Purpose-bound, redacted, revocable views for a regulator. Create, share, revoke with audit.",
    to: "/security-audit",
    status: "available",
    source: "Security & audit share packages",
  },
  {
    id: "activity",
    title: "Governed activity record",
    body: "Who did what, with outcome — technical proof on demand.",
    to: "/security-audit",
    status: "available",
    source: "Append-only audit chain",
  },
  {
    id: "team",
    title: "Team movement",
    body: "What the team owns, blocks, and waits on — for managers with real reporting lines.",
    to: "/app/team-work",
    status: "live_surface",
    source: "Work Ledger team-work (manager-gated)",
  },
  {
    id: "judgment",
    title: "Needs human judgment",
    body: "Sensitive actions and approvals waiting on a person.",
    to: "/action-center",
    status: "live_surface",
    source: "Action Center / approvals queue",
  },
  {
    id: "ai_teammates",
    title: "AI Teammate contribution",
    body: "Who has a teammate, readiness, and where policy limits automation.",
    to: "/ai-teammates",
    status: "live_surface",
    source: "AI Teammates admin list",
  },
];

export default function Reports(): JSX.Element {
  return (
    <div className="space-y-5" data-testid="reports-page" data-slice5-reports="true">
      <PageHeader
        title="Reports"
        description="Outcome reports for your organization. Every report is org-scoped, permission-aware, and never sent silently."
      />

      <Card data-testid="reports-available-now">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Report types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {REPORT_TYPES.map((r) => (
            <Link
              key={r.id}
              to={r.to}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/70 p-3 hover:border-primary/40"
              data-testid="report-type-row"
              data-report={r.id}
            >
              <span>
                <span className="font-medium text-foreground">{r.title}</span>
                {" — "}
                {r.body}
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  Source: {r.source}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <Badge variant="outline" className="text-[9px]">
                  {r.status === "available"
                    ? "Available"
                    : r.status === "live_surface"
                      ? "Live view"
                      : "Later"}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card data-testid="reports-coming">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4" aria-hidden /> Scheduled delivery
            <Badge variant="outline" className="text-[9px]">
              Manual now
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p data-testid="scheduled-reports-honesty">
            You can open live views above on demand. Recurring email or
            inbox delivery of executive digests is not automatic yet — nothing
            pretends a schedule is running. When scheduling lands, every
            delivery will stay org-scoped, permissioned, and approval-gated.
          </p>
          <p className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Duplicate automatic deliveries: 0 (no schedule runner active).
          </p>
          <p className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            Team reports require real manager reporting lines.
          </p>
          <p className="flex items-center gap-1">
            <Bot className="h-3.5 w-3.5" aria-hidden />
            AI Teammate reports never expose prompts, models, or tokens.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
