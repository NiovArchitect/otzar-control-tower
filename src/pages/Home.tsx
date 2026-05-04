// FILE: Home.tsx
// PURPOSE: First screen after login. Live KPI snapshot of the org --
//          pending approvals, active AI teammates, compound score,
//          knowledge items. The only "real" screen besides Login in
//          12A; everything else is a placeholder routed to the right
//          sub-box.
// CONNECTS TO: src/lib/api.ts (GET /org/analytics) via TanStack Query.

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { OrgAnalytics } from "@/lib/types/foundation";

export function HomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["org", "analytics"],
    queryFn: () => api.org.analytics(),
    refetchInterval: 60_000,
  });

  const value: OrgAnalytics | null =
    !isError && data && data.ok ? data.data : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home"
        description="Live snapshot of your organization -- approvals waiting on you, active AI teammates, compound intelligence score, and knowledge items in your capsules."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pending approvals" loading={isLoading}>
          {renderNumber(value?.pending_approvals_count)}
        </KpiCard>
        <KpiCard label="Active AI teammates" loading={isLoading}>
          {renderNumber(value?.active_twins)}
        </KpiCard>
        <KpiCard label="Compound score" loading={isLoading}>
          {renderNumber(value?.compound_score)}
        </KpiCard>
        <KpiCard label="Knowledge items" loading={isLoading}>
          {renderNumber(value?.capsule_count)}
        </KpiCard>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  loading,
  children,
}: {
  label: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-20" /> : children}
      </CardContent>
    </Card>
  );
}

function renderNumber(n: number | undefined) {
  if (typeof n !== "number") {
    return <span className="text-sm text-muted-foreground">--</span>;
  }
  return <span className="text-3xl font-semibold">{n}</span>;
}
