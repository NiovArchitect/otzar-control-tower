// FILE: CommandCenterPanel.tsx
// PURPOSE: Phase 1255 slice 2 — the Command Center's guidance layer:
//          go-live blockers + organization context + next best
//          actions, derived LIVE from the readiness aggregate. Every
//          card routes somewhere meaningful; informational lines are
//          visually plain. Honest statuses only — schema-pending and
//          credential-blocked items say so.
// CONNECTS TO: api.otzar.productionReadiness, Home (Command Center),
//          Reports, Retention, Data & Knowledge, Integrations & MCP,
//          tests/unit/admin-command-center-panel.test.tsx.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Compass, OctagonAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { humanizeStatus } from "@/lib/labels/humanize";
import type { HandoffReadinessResponse } from "@/lib/types/foundation";

type Readiness = HandoffReadinessResponse["readiness"];

interface NextAction {
  label: string;
  to: string;
}

export function CommandCenterPanel({
  pendingApprovals,
}: {
  pendingApprovals: number | null;
}): JSX.Element {
  const entity = useAuthStore((s) => s.entity);
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.otzar
      .productionReadiness()
      .then((r) => {
        if (!cancelled && r.ok) setReadiness(r.data.readiness);
      })
      .catch(() => {
        /* the panel stays honest-empty on failure */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const blockers: Array<{ label: string; to: string }> = [];
  const actions: NextAction[] = [];
  if (readiness !== null) {
    if (readiness.schema.pending_push) {
      blockers.push({
        label:
          "Production schema update awaiting Founder approval (after credential rotation)",
        to: "/onboarding",
      });
      actions.push({
        label: "Review the schema approval step",
        to: "/onboarding",
      });
    }
    const credentialBlocked = readiness.capabilities.filter(
      (c) =>
        c.classification === "BLOCKED_BY_CREDENTIALS" ||
        c.classification === "BLOCKED_BY_APP_REVIEW",
    );
    if (credentialBlocked.length > 0) {
      blockers.push({
        label: `${credentialBlocked.length} capabilities waiting on credentials or app review`,
        to: "/connector-rails",
      });
      actions.push({
        label: "Connect provider credentials",
        to: "/connector-rails",
      });
    }
  }
  if (pendingApprovals !== null && pendingApprovals > 0) {
    actions.unshift({
      label: `Review ${pendingApprovals} pending approval${pendingApprovals === 1 ? "" : "s"}`,
      to: "/approvals",
    });
  }
  actions.push(
    { label: "Check how your data flows", to: "/data-knowledge" },
    { label: "Review retention & proof", to: "/retention" },
  );

  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      data-testid="command-center-panel"
    >
      <Card data-testid="command-center-blockers">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <OctagonAlert className="h-4 w-4 text-amber-500" aria-hidden />
            Go-live blockers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {readiness === null ? (
            <p className="text-muted-foreground">
              Readiness loads here (admin access required).
            </p>
          ) : blockers.length === 0 ? (
            <p className="text-muted-foreground">
              Nothing is blocking go-live right now.
            </p>
          ) : (
            blockers.map((b) => (
              <Link
                key={b.label}
                to={b.to}
                className="flex items-center justify-between rounded-xl border border-border/70 p-2.5 hover:border-primary/40"
                data-testid="command-center-blocker"
              >
                <span className="text-foreground">{b.label}</span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card data-testid="command-center-org">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4" aria-hidden /> Your organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-foreground">
            Signed in as{" "}
            <span className="font-medium">{entity?.email ?? "—"}</span> ·
            organization admin
          </p>
          <p className="text-muted-foreground">
            Everything here is scoped to your organization only — its data,
            credentials, policies, reports, and retention. No other
            organization can see them.
          </p>
          {readiness !== null ? (
            <p
              className="text-muted-foreground"
              data-testid="command-center-org-mode"
            >
              Mode:{" "}
              <Badge variant="outline" className="text-[9px]">
                {humanizeStatus(readiness.demo_prod_separation.mode)}
              </Badge>{" "}
              · {readiness.org.checklist_steps_ready}/
              {readiness.org.checklist_steps_total} setup steps ready
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card data-testid="command-center-actions">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Compass className="h-4 w-4" aria-hidden /> Next best actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {actions.slice(0, 4).map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="flex items-center justify-between rounded-xl border border-border/70 p-2.5 hover:border-primary/40"
              data-testid="command-center-action"
            >
              <span className="text-foreground">{a.label}</span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </Link>
          ))}
          <p className="text-muted-foreground">
            Or just ask — press <kbd className="rounded border px-1">⌘K</kbd>{" "}
            and type "what is blocking production?"
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
