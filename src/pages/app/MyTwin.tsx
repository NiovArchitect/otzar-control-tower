// FILE: MyTwin.tsx
// PURPOSE: Employee "My Twin" surface -- the caller's own aligned AI
//          teammate identity from GET /otzar/my-twin (self-scoped,
//          read-only). Product-safe projection only: it never renders
//          the raw twin_id, role_template body, capability flags, bridge
//          ids, or any memory/capsule/vector data.
// CONNECTS TO: api.otzar.myTwin, conversation label helpers.
//
// The query fn returns the ApiResult as-is (never throws) so the page
// can branch on status/code: 404 TWIN_NOT_FOUND -> empty state, 403 ->
// not permitted, otherwise -> retryable error. 401 is handled globally
// (api.ts onUnauthorized -> logout).

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { ApiResult } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import {
  labelAutonomyMode,
  labelConversationStatus,
} from "@/lib/labels/conversation";
import type { MyTwinResponse } from "@/lib/types/foundation";

export function MyTwin() {
  const query = useQuery({
    queryKey: ["otzar", "my-twin"],
    queryFn: () => api.otzar.myTwin(),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Twin"
        description="Your aligned AI teammate — its identity, behavior mode, and the skills it can use on your behalf."
      />

      {(query.isLoading || query.data === undefined) && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {query.data && !query.data.ok && (
        <MyTwinError
          result={query.data}
          onRetry={() => void query.refetch()}
        />
      )}

      {query.data && query.data.ok && <MyTwinPanel data={query.data.data} />}
    </div>
  );
}

function MyTwinError({
  result,
  onRetry,
}: {
  result: ApiResult<MyTwinResponse>;
  onRetry: () => void;
}) {
  if (result.ok) return null;
  if (result.status === 404 || result.code === "TWIN_NOT_FOUND") {
    return (
      <Card>
        <CardContent
          className="py-6 text-sm text-muted-foreground"
          data-testid="my-twin-empty"
        >
          No AI teammate assigned yet.
        </CardContent>
      </Card>
    );
  }
  if (result.status === 403 || result.code === "OPERATION_NOT_PERMITTED") {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          You don't have access to an AI teammate view.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="space-y-3 py-6 text-sm">
        <p className="text-destructive">{result.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function MyTwinPanel({ data }: { data: MyTwinResponse }) {
  const t = data.twin;
  return (
    <div className="space-y-4">
      {data.has_multiple_twins && (
        <div
          className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
          role="note"
        >
          You have multiple assigned AI teammates. This page currently shows
          your primary teammate.
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{t.display_name}</CardTitle>
            <Badge>{labelConversationStatus(t.status)}</Badge>
          </div>
          {t.role_title && (
            <p className="text-sm text-muted-foreground">{t.role_title}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Behavior mode" value={labelAutonomyMode(t.autonomy_mode)} />
            <Field
              label="Team coordination setting"
              value={t.swarm_enabled ? "Enabled" : "Not enabled"}
            />
            {t.approver && (
              <Field label="Approver" value={t.approver.display_name} />
            )}
            <Field label="Added" value={formatRelativeTime(t.created_at)} />
            <Field
              label="Last updated"
              value={formatRelativeTime(t.updated_at)}
            />
          </dl>

          <p className="text-xs text-muted-foreground">
            Team collaboration is not active yet.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Skills</p>
            {t.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No skills assigned yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2" data-testid="my-twin-skills">
                {t.skills.map((s) => (
                  <span
                    key={`${s.name}-${s.category}`}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs"
                  >
                    {s.name} · {s.category}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
