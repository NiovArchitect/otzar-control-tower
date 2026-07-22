// FILE: Home.tsx
// PURPOSE: First screen after login. Live KPI snapshot of the org +
//          Intelligence Summary cards + Recent Activity feed +
//          Pending Approvals card. The launch pad for every admin
//          task in the Control Tower.
// CONNECTS TO: api.org.analytics, api.org.audit, /approvals route.
//
// 12B.2 EXTENSIONS:
// - Intelligence Summary section (3 cards: compound score,
//   active patterns, vocabulary growth) reading the extended
//   /org/analytics fields (decision #18 label maps still apply
//   for any literals surfaced).
// - Recent Activity feed (8 most recent ADMIN_ACTION events) using
//   client-side filter over /org/audit (decision #23: Foundation's
//   /org/audit ignores event_type query param today; 12D extends).
// - Pending Approvals card linking to /approvals. Badge count is
//   stub-0 throughout 12B-12D (decision #24).

import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, BarChart3, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommandCenterPanel } from "@/components/CommandCenterPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { OrgDiscoveryFoundCard } from "@/components/otzar/OrgDiscoveryFoundCard";
import { api } from "@/lib/api";
import { usePendingApprovals } from "@/hooks/use-pending-approvals";
import { getAuditEventLabel } from "@/lib/audit/event-types";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { deriveOrgDiscovery } from "@/lib/setup/org-discovery";
import type {
  AuditEvent,
  OrgAnalytics,
} from "@/lib/types/foundation";

const RECENT_ACTIVITY_LIMIT = 8;
const RECENT_ACTIVITY_FETCH_TAKE = 50;

export function HomePage() {
  const queryClient = useQueryClient();
  const [syncBusy, setSyncBusy] = useState(false);

  const analytics = useQuery({
    queryKey: ["org", "analytics"],
    queryFn: () => api.org.analytics(),
    refetchInterval: 60_000,
  });

  const audit = useQuery({
    queryKey: ["org", "audit", "recent"],
    queryFn: () =>
      api.org.audit.list({ take: RECENT_ACTIVITY_FETCH_TAKE }),
    refetchInterval: 60_000,
  });

  // Same discovery projections as Organization /setup — founder-visible on Command Center.
  const people = useQuery({
    queryKey: ["org", "entities", "home-discovery"],
    queryFn: async () => {
      const r = await api.org.entities.list({ type: "PERSON", take: 250 });
      return r.ok ? r.data.items : null;
    },
  });
  const hierarchy = useQuery({
    queryKey: ["org", "hierarchy"],
    queryFn: async () => {
      const r = await api.org.hierarchy.get();
      return r.ok ? r.data : null;
    },
  });
  const seeds = useQuery({
    queryKey: ["org", "dandelion", "seeds", "home-discovery"],
    queryFn: async () => {
      const r = await api.otzar.dandelionSeeds.list();
      return r.ok ? r.data.seeds : null;
    },
  });

  const discovery = deriveOrgDiscovery({
    people: people.data ?? null,
    memberships: hierarchy.data?.memberships ?? null,
    seeds: seeds.data ?? null,
    orgEntityId: hierarchy.data?.org_entity_id ?? null,
  });

  const value: OrgAnalytics | null =
    analytics.data && analytics.data.ok ? analytics.data.data : null;

  const { data: queueCount, isLoading: queueCountLoading } = usePendingApprovals();

  const adminEvents: AuditEvent[] = (() => {
    if (!audit.data || !audit.data.ok) return [];
    return audit.data.data.items
      .filter((e) => e.event_type === "ADMIN_ACTION")
      .slice(0, RECENT_ACTIVITY_LIMIT);
  })();

  async function refreshStructureSignals(): Promise<void> {
    setSyncBusy(true);
    const r = await api.otzar.dandelionSeeds.syncFromGrowth();
    setSyncBusy(false);
    if (r.ok) {
      await queryClient.invalidateQueries({ queryKey: ["org", "dandelion", "seeds"] });
      await queryClient.invalidateQueries({ queryKey: ["org", "hierarchy"] });
      await queryClient.invalidateQueries({ queryKey: ["org", "entities"] });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        description="Run and govern your organization from one place — what needs attention, what blocks go-live, and what to do next. Ask Otzar (⌘K) to go anywhere."
      />

      {/* Founder-visible discovery — same "Otzar found" as Organization /setup. */}
      <OrgDiscoveryFoundCard
        discovery={discovery}
        onRefreshSignals={() => void refreshStructureSignals()}
        refreshBusy={syncBusy}
      />

      {/* [GAP-U SLICE-1] one calm pointer to the guided setup journey —
          reduces page-hunting for admins still standing the org up. */}
      <p className="text-xs text-muted-foreground" data-testid="home-setup-pointer">
        Full activation path:{" "}
        <Link to="/setup" className="font-medium text-foreground underline underline-offset-2">
          Organization
        </Link>{" "}
        — what Otzar found, what needs confirmation, what is missing.
      </p>

      {/* ── Phase 1255 slice 2 — Command Center panel ──────────── */}
      {/* [GAP-F] Approvals numbers come from the SAME query the Pending
          Approvals queue renders — one truth, every surface agrees. */}
      <CommandCenterPanel
        pendingApprovals={typeof queueCount === "number" ? queueCount : null}
      />

      {/* ── KPI cards (12A) ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pending approvals" loading={queueCountLoading}>
          {renderNumber(typeof queueCount === "number" ? queueCount : undefined)}
        </KpiCard>
        <KpiCard label="Active AI teammates" loading={analytics.isLoading}>
          {renderNumber(value?.active_twins)}
        </KpiCard>
        <KpiCard label="Compound score" loading={analytics.isLoading}>
          {renderNumber(value?.compound_score)}
        </KpiCard>
        <KpiCard label="Knowledge items" loading={analytics.isLoading}>
          {renderNumber(value?.capsule_count)}
        </KpiCard>
      </div>

      {/* ── Intelligence Summary (12B.2) ───────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-base font-semibold">Intelligence summary</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Compound score" loading={analytics.isLoading}>
            {renderNumber(value?.compound_score)}
          </KpiCard>
          <KpiCard label="Active patterns" loading={analytics.isLoading}>
            {renderNumber(value?.pattern_count)}
          </KpiCard>
          <KpiCard label="Vocabulary growth" loading={analytics.isLoading}>
            {renderNumber(value?.vocab_count)}
          </KpiCard>
        </div>
      </section>

      {/* ── Recent Activity + Pending Approvals (12B.2) ────────── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" aria-hidden />
              Recent admin activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivityList
              loading={audit.isLoading}
              events={adminEvents}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Items awaiting your sign-off appear here. The full escalation
              queue ships in Section 14; until then this counter stays at 0.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/approvals">
                Review queue
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function RecentActivityList({
  loading,
  events,
}: {
  loading: boolean;
  events: AuditEvent[];
}) {
  if (loading) {
    return (
      <ul className="space-y-2" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="h-6 w-full" />
          </li>
        ))}
      </ul>
    );
  }
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recent admin activity. Actions like inviting members or granting
        access will appear here as they happen.
      </p>
    );
  }
  return (
    <ul className="space-y-2 text-sm" data-testid="recent-activity-list">
      {events.map((event) => (
        <li
          key={event.audit_id}
          className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2"
          data-event-type={event.event_type}
        >
          <div className="flex flex-col">
            <span className="font-medium">
              {getAuditEventLabel(event.event_type)}
              {(() => {
                const action = (event.details as { action?: unknown })?.action;
                // PROD-MODEL-P5 — action codes are UPPER_SNAKE machine labels
                // (e.g. DANDELION_SEED_REJECTED); render them as words. The
                // raw code stays in the audit surface, not the Home feed.
                return typeof action === "string"
                  ? ` — ${action.replace(/_/g, " ").toLowerCase()}`
                  : "";
              })()}
            </span>
            <span className="text-xs text-muted-foreground">
              Outcome: {event.outcome}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(event.timestamp)}
          </span>
        </li>
      ))}
    </ul>
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
