// FILE: CommandCenterPanel.tsx
// PURPOSE: Slice 5 — Admin Home three-second contract: organization
//          status, what is working, ≤3 priorities, outcome KPIs.
//          No demo mode badge, no “6 of 11 setup steps” theater.
// CONNECTS TO: org-admin-home, Home, productionReadiness (tools only).

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import {
  buildOrgAdminHome,
  type OrgAdminHomeInputs,
  type WorkingAreaState,
} from "@/lib/admin/org-admin-home";

function stateBadge(state: WorkingAreaState): JSX.Element {
  if (state === "working") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] text-emerald-700 border-emerald-300/50"
      >
        Working
      </Badge>
    );
  }
  if (state === "limited") {
    return (
      <Badge variant="outline" className="text-[10px] text-amber-800 border-amber-300/50">
        Limited
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] text-amber-900 border-amber-400/60">
      Needs attention
    </Badge>
  );
}

export function CommandCenterPanel({
  pendingApprovals,
  homeInputs,
}: {
  pendingApprovals: number | null;
  /** When provided, drives the three-second readiness view. */
  homeInputs?: Partial<OrgAdminHomeInputs> | null;
}): JSX.Element {
  const entity = useAuthStore((s) => s.entity);
  const [credentialBlocked, setCredentialBlocked] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.otzar
      .productionReadiness()
      .then((r) => {
        if (cancelled || !r.ok) return;
        const n = r.data.readiness.capabilities.filter(
          (c) =>
            c.classification === "BLOCKED_BY_CREDENTIALS" ||
            c.classification === "BLOCKED_BY_APP_REVIEW",
        ).length;
        setCredentialBlocked(n);
      })
      .catch(() => {
        /* keep zero */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useMemo(() => {
    const base: OrgAdminHomeInputs = {
      orgName: homeInputs?.orgName ?? null,
      peopleCount: homeInputs?.peopleCount ?? 0,
      activePeopleCount: homeInputs?.activePeopleCount ?? 0,
      managerLineCount: homeInputs?.managerLineCount ?? 0,
      peopleWithoutManager: homeInputs?.peopleWithoutManager ?? 0,
      twinsReadyCount: homeInputs?.twinsReadyCount ?? 0,
      twinsTotalCount: homeInputs?.twinsTotalCount ?? 0,
      toolsConnectedCount: homeInputs?.toolsConnectedCount ?? 0,
      toolsReadyCount: homeInputs?.toolsReadyCount ?? 0,
      openReviewCount: homeInputs?.openReviewCount ?? 0,
      pendingApprovals,
      governanceHumanApproval: homeInputs?.governanceHumanApproval ?? true,
      credentialBlockedCount:
        homeInputs?.credentialBlockedCount ?? credentialBlocked,
    };
    return buildOrgAdminHome(base);
  }, [homeInputs, pendingApprovals, credentialBlocked]);

  return (
    <div className="space-y-4" data-testid="command-center-panel" data-slice5-admin-home="true">
      {/* Organization status */}
      <Card data-testid="admin-org-status">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4" aria-hidden /> Organization status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p
            className="font-medium text-foreground"
            data-testid="admin-status-line"
          >
            {view.status_line}
          </p>
          <p className="text-xs text-muted-foreground">
            Signed in as{" "}
            <span className="font-medium text-foreground">
              {entity?.email ?? "—"}
            </span>
            . Everything here is scoped to your organization only.
          </p>
          {/* Explicitly never show demo mode / N of M setup fraction. */}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* What is working */}
        <Card data-testid="admin-what-working">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
              What is working
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2">
              {view.working.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/60 px-2.5 py-2 text-xs"
                  data-testid="admin-working-area"
                  data-area={w.id}
                  data-state={w.state}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{w.label}</p>
                    <p className="text-muted-foreground">{w.detail}</p>
                  </div>
                  {stateBadge(w.state)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* What needs attention — max 3 */}
        <Card data-testid="admin-needs-attention">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
              What needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {view.priorities.length === 0 ? (
              <p className="text-muted-foreground" data-testid="admin-no-priorities">
                No material setup gaps right now. Use Action Center when
                judgment is required.
              </p>
            ) : (
              view.priorities.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-amber-300/50 bg-amber-50/40 p-2.5"
                  data-testid="admin-priority"
                >
                  <p className="font-medium text-foreground">{p.what}</p>
                  <p className="mt-0.5 text-muted-foreground">{p.why}</p>
                  <Link
                    to={p.to}
                    className="mt-2 inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
                    data-testid="admin-priority-action"
                  >
                    {p.actionLabel}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outcome KPIs with lineage */}
      <Card data-testid="admin-outcome-kpis">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4" aria-hidden /> Organization signal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {view.kpis.map((k) => (
              <div
                key={k.id}
                className="rounded-md border border-border/60 px-2 py-2"
                data-testid="admin-kpi"
                data-kpi={k.id}
                title={k.source}
              >
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {k.value}
                </p>
                <p className="text-[11px] text-muted-foreground">{k.label}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                  Source: {k.source}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
