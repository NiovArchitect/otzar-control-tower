// FILE: Reports.tsx
// PURPOSE: Phase 1255 — the admin Reports surface. Honest first
//          slice: explains what reports are (governed, org-scoped,
//          approval-gated internal sends), shows what is available
//          TODAY (regulator/compliance packages, readiness truth,
//          audit export posture) and what arrives with scheduling
//          substrate. No fake buttons; every card routes somewhere
//          real or states its setup requirement plainly.
// CONNECTS TO: compliance share packages (live), Production
//          Readiness, Security & Audit, AdminCommandLayer ("reports").

import { Link } from "react-router-dom";
import { ArrowRight, FileText, ShieldCheck, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Reports(): JSX.Element {
  return (
    <div className="space-y-5" data-testid="reports-page">
      <PageHeader
        title="Reports"
        description="Governed reporting for your organization. Reports stay org-scoped, respect data permissions and retention, and anything sent goes through approval — never silently."
      />

      <Card data-testid="reports-available-now">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Available now
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <Link
            to="/security-audit"
            className="flex items-center justify-between rounded-xl border border-border/70 p-3 hover:border-primary/40"
          >
            <span>
              <span className="font-medium text-foreground">
                Regulator &amp; compliance packages
              </span>{" "}
              — purpose-bound, redacted, revocable views for a regulator.
              Create, share, and revoke with full audit.
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
          <Link
            to="/setup"
            className="flex items-center justify-between rounded-xl border border-border/70 p-3 hover:border-primary/40"
          >
            <span>
              <span className="font-medium text-foreground">
                Readiness report
              </span>{" "}
              — the live truth of what is ready, blocked, or waiting on
              credentials, straight from Organization setup.
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
          <Link
            to="/security-audit"
            className="flex items-center justify-between rounded-xl border border-border/70 p-3 hover:border-primary/40"
          >
            <span>
              <span className="font-medium text-foreground">
                Activity record
              </span>{" "}
              — every governed action with who, what, and outcome.
              Technical proof available on demand.
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </CardContent>
      </Card>

      <Card data-testid="reports-coming">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4" aria-hidden /> Scheduled reports
            <Badge variant="outline" className="text-[9px]">
              Setup needed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>
            Recurring executive summaries, AI activity reports, and
            workflow digests — created, previewed, approved, and sent
            internally through governed actions. This needs the reports
            schema (a Founder-approved additive update); nothing here
            sends anything today.
          </p>
          <p className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Every future report respects your organization's scope, data
            permissions, retention policy, and approval rules.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
