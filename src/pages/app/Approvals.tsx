// FILE: Approvals.tsx
// PURPOSE: Employee Approvals surface. Lists the signed-in caller's OWN
//          pending approval requests (GET /escalations/pending) and
//          opens a detail drawer to approve/reject. This is NOT an
//          org-wide queue -- the backend only returns the caller's own.
// CONNECTS TO: api.escalations.pending, ApprovalDetailDrawer,
//              escalation-types label map.
//
// CAPABILITY: viewing is gated by EmployeeGuard (can_read_capsules);
// approve/reject inside the drawer are gated by can_write_capsules.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalDetailDrawer } from "@/components/employee/ApprovalDetailDrawer";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import {
  getEscalationStatusLabel,
  getEscalationTypeLabel,
} from "@/lib/labels/escalation-types";
import type { Escalation } from "@/lib/types/foundation";

export function Approvals() {
  const [selected, setSelected] = useState<Escalation | null>(null);

  const query = useQuery({
    queryKey: ["escalations", "pending"],
    queryFn: async () => {
      const r = await api.escalations.pending({ limit: 50 });
      if (!r.ok) {
        throw new Error(`Failed to load approvals (${r.code})`);
      }
      return r.data.escalations;
    },
  });

  const items = query.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Approval requests waiting on your decision. These are requests directed to you — not an organization-wide queue."
      />

      {query.isLoading && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {query.error && !query.isLoading && (
        <Card>
          <CardContent className="space-y-3 py-6 text-sm">
            <p className="text-destructive">
              {(query.error as Error).message}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!query.isLoading && !query.error && items.length === 0 && (
        <Card>
          <CardContent
            className="py-6 text-sm text-muted-foreground"
            data-testid="approvals-empty"
          >
            No approvals waiting on you.
          </CardContent>
        </Card>
      )}

      {!query.isLoading && !query.error && items.length > 0 && (
        <ul className="space-y-2" data-testid="approvals-list">
          {items.map((esc) => (
            <li key={esc.escalation_id}>
              <button
                type="button"
                onClick={() => setSelected(esc)}
                className="flex w-full items-start justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/40"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {getEscalationTypeLabel(esc.escalation_type)}
                    </span>
                    <Badge variant="secondary">{esc.severity}</Badge>
                    <Badge>{getEscalationStatusLabel(esc.status)}</Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {esc.description}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(esc.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ApprovalDetailDrawer
        escalation={selected}
        open={selected !== null}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
        onResolved={() => void query.refetch()}
      />
    </div>
  );
}
