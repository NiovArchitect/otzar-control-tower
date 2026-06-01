// FILE: Policies.tsx
// PURPOSE: Section 9 (Admin / Governance Control Tower) consumer
//          surface — replaces the Placeholder with the customer-
//          facing Policies screen. Read-only at this slice;
//          consumes Foundation ComplianceService reads (LIVE):
//            GET /api/v1/compliance/frameworks  (canonical list)
//            GET /api/v1/compliance/state       (caller-org live
//                                                posture; ORG-level
//                                                per DRIFT 15)
//          Renders the canonical compliance frameworks catalog +
//          per-framework live compliance posture for the caller's
//          org. Posture surfaces compliant flag + last-passed
//          timestamp + last-check timestamp + 24h failure count
//          per FrameworkComplianceState.
//
//          Read-only — NO policy editing, NO compliance.check()
//          mutation surface, NO full-report download (those are
//          forward-substrate behind separate bounded slices when
//          authorized).
//
//          NO raw rules JSON, NO raw audit_events, NO secret
//          refs, NO connector payloads, NO chain-of-thought, NO
//          employee scoring, NO manager surveillance, NO legal
//          certainty language. NEVER claims "guaranteed
//          compliant" — surfaces only Foundation's compliant
//          boolean with safe "compliant in last 24h" framing.
// CONNECTS TO: src/lib/api.ts (api.compliance.*), src/lib/
//              types/foundation.ts (ComplianceFramework +
//              FrameworkComplianceState + ComplianceStateReport),
//              src/components/PageHeader.tsx + ui/* primitives.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type {
  ComplianceFramework,
  FrameworkComplianceState,
} from "@/lib/types/foundation";
import { formatRelativeTime } from "@/lib/utils/relative-time";

function complianceBadge(state: FrameworkComplianceState): {
  variant: "default" | "secondary" | "outline" | "destructive";
  label: string;
} {
  if (state.compliant) {
    return { variant: "secondary", label: "Compliant (24h window)" };
  }
  return { variant: "destructive", label: "Failures in 24h window" };
}

function fullTimestamp(iso: string): string {
  try {
    return new Date(iso).toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
  } catch {
    return iso;
  }
}

function FrameworkRow({
  framework,
  state,
}: {
  framework: ComplianceFramework;
  state: FrameworkComplianceState | undefined;
}) {
  const verdict = state !== undefined ? complianceBadge(state) : null;
  return (
    <li
      className="rounded-md border border-border p-3"
      data-testid="policy-row"
      data-framework-name={framework.framework_name}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {framework.framework_name}
            </span>
            {!framework.is_active && (
              <Badge variant="outline" className="text-[10px]">
                Inactive
              </Badge>
            )}
            {verdict !== null && (
              <Badge variant={verdict.variant} className="text-[10px]">
                {verdict.label}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {framework.jurisdiction.map((j) => (
              <Badge
                key={`${framework.framework_name}-jur-${j}`}
                variant="outline"
                className="text-[10px]"
              >
                Jurisdiction: {j}
              </Badge>
            ))}
            {framework.applicable_entity_sectors.map((s) => (
              <Badge
                key={`${framework.framework_name}-sec-${s}`}
                variant="outline"
                className="text-[10px]"
              >
                Sector: {s}
              </Badge>
            ))}
          </div>
          {state !== undefined && (
            <div className="grid grid-cols-[160px_1fr] items-baseline gap-x-3 pt-1 text-[11px]">
              <span className="text-muted-foreground">Last passed</span>
              <span className="font-mono">
                {state.since !== null
                  ? formatRelativeTime(state.since)
                  : "—"}
              </span>
              <span className="text-muted-foreground">Last check</span>
              <span className="font-mono">
                {state.last_check !== null
                  ? formatRelativeTime(state.last_check)
                  : "—"}
              </span>
              <span className="text-muted-foreground">24h failures</span>
              <span
                className="font-mono"
                data-testid={`policy-failures-${framework.framework_name}`}
              >
                {state.sample_failure_count_24h}
              </span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function PoliciesPage() {
  const frameworksQuery = useQuery({
    queryKey: ["compliance", "frameworks"],
    queryFn: () =>
      api.compliance.listFrameworks().then((r) => {
        if (r.ok) return r.data;
        throw new Error(r.code);
      }),
  });
  const stateQuery = useQuery({
    queryKey: ["compliance", "state"],
    queryFn: () =>
      api.compliance.getState().then((r) => {
        if (r.ok) return r.data;
        throw new Error(r.code);
      }),
  });

  const frameworks = useMemo<readonly ComplianceFramework[]>(
    () => frameworksQuery.data?.frameworks ?? [],
    [frameworksQuery.data],
  );

  const stateByName = useMemo<Map<string, FrameworkComplianceState>>(() => {
    const m = new Map<string, FrameworkComplianceState>();
    for (const s of stateQuery.data?.state.frameworks ?? []) {
      m.set(s.framework_name, s);
    }
    return m;
  }, [stateQuery.data]);

  const evaluatedAt = stateQuery.data?.state.evaluated_at ?? null;

  return (
    <div className="space-y-6" data-testid="policies-page">
      <PageHeader
        title="Policies"
        description="Active compliance frameworks and your org's live posture across each. Read-only at this version — policy edits remain in Foundation."
      />
      <Card data-testid="policies-card">
        <CardHeader>
          <CardTitle className="text-base">
            Compliance frameworks
          </CardTitle>
          <CardDescription>
            Frameworks below come from the Foundation catalog. The
            posture column reflects your org's most recent
            COMPLIANCE_CHECK results in a 24-hour rolling window
            (DRIFT 15: org-level, not aggregated per member).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {frameworksQuery.isLoading && (
            <ul className="space-y-2" data-testid="policies-list-loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-20 w-full" />
                </li>
              ))}
            </ul>
          )}
          {frameworksQuery.isError && (
            <div
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
              data-testid="policies-list-error"
            >
              Failed to load compliance frameworks. Code:{" "}
              <span className="font-mono">
                {frameworksQuery.error instanceof Error
                  ? frameworksQuery.error.message
                  : "UNKNOWN_ERROR"}
              </span>
              .
              <Button
                size="sm"
                variant="outline"
                className="ml-2"
                onClick={() => frameworksQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          )}
          {!frameworksQuery.isLoading &&
            !frameworksQuery.isError &&
            frameworks.length === 0 && (
              <p
                className="text-sm text-muted-foreground"
                data-testid="policies-list-empty"
              >
                No compliance frameworks configured in the
                Foundation catalog yet.
              </p>
            )}
          {frameworks.length > 0 && (
            <ul className="space-y-2" data-testid="policies-list">
              {frameworks.map((framework) => (
                <FrameworkRow
                  key={framework.framework_id}
                  framework={framework}
                  state={stateByName.get(framework.framework_name)}
                />
              ))}
            </ul>
          )}

          {stateQuery.isError && (
            <div
              className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs"
              data-testid="policies-state-error"
            >
              Live posture data could not be loaded. Code:{" "}
              <span className="font-mono">
                {stateQuery.error instanceof Error
                  ? stateQuery.error.message
                  : "UNKNOWN_ERROR"}
              </span>
              . The framework catalog above remains visible.
            </div>
          )}

          {evaluatedAt !== null && (
            <>
              <Separator />
              <p
                className="text-[11px] text-muted-foreground"
                data-testid="policies-evaluated-at"
              >
                Posture evaluated at {fullTimestamp(evaluatedAt)}.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
