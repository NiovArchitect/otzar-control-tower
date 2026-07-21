// FILE: AITeammates.tsx
// PURPOSE: Customer-facing "AI Teammates" admin screen -- the
//          AI agents (AI_AGENT entities, "twins") working alongside
//          your team. Wraps Foundation's twin surface in customer-
//          admin vocabulary: Behavior Policy, EXECUTIVE_OVERRIDE,
//          AI Teammate wallet.
// CONNECTS TO: api.org.aiTeammates.list, api.org.aiTeammates.update
//              (bulk autonomy fan-out), api.org.entities.list +
//              api.org.hierarchy.get (Owner column), DataTable,
//              DataSovereigntyInline, BulkActionsBar (with
//              bulkAutonomyActions wrapper), CreateTwinDialog,
//              TwinDetailDrawer, ExecutiveOverrideBadge.
//
// DECISIONS APPLIED (per docs/SECTION_12_DISCIPLINE.md):
// - #11 DataSovereigntyInline at top.
// - #13 DataTable defaults: 25 rows, URL state, 4-states baked in.
// - #20 unrelated to this screen (Members invite path).
// - #22 BulkActionsBar with Promise.allSettled + per-item progress.
// - 12B.3: Behavior Policy column via getAutonomyLevelLabel.
// - 12B.3: EXECUTIVE_OVERRIDE indicator from is_admin_twin (NOT a
//          separate field).
// - 12B.3: Owner column resolved client-side via /org/hierarchy
//          (slim list endpoint doesn't surface owner_entity_id).

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data/DataTable";
import { DataSovereigntyInline } from "@/components/sovereignty/DataSovereigntyInline";
import { ExecutiveOverrideBadge } from "@/components/ai-teammates/ExecutiveOverrideBadge";
import { CreateTwinDialog } from "@/components/ai-teammates/CreateTwinDialog";
import { TwinDetailDrawer } from "@/components/ai-teammates/TwinDetailDrawer";
import { bulkAutonomyActions } from "@/components/ai-teammates/BulkAutonomyAction";
import { BulkActionsBar } from "@/components/users/BulkActionsBar";
import { api } from "@/lib/api";
import {
  AUTONOMY_LEVEL_LABELS,
  getAutonomyLevelLabel,
} from "@/lib/labels/autonomy-levels";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { roleTemplateLabel } from "@/lib/labels/role-template";
import {
  authorityStatusLabel,
  recommendedAutonomyLabel,
} from "@/lib/labels/twin-authority";
import { twinDisplayLabel, twinOwnerLabel } from "@/lib/labels/twin-identity";
import { lastActiveLabel, toolReadinessLabel } from "@/lib/labels/twin-operations";
import { TwinAuthorityBindingCard } from "@/components/otzar/TwinAuthorityBindingCard";
import { GraduatedAutonomyLadderCard } from "@/components/otzar/GraduatedAutonomyLadderCard";
import type {
  AITeammateListItem,
  EntityStatus,
  TwinAutonomyLevel,
} from "@/lib/types/foundation";

const PAGE_SIZE = 25;

function statusBadge(status: EntityStatus) {
  if (status === "ACTIVE") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        Active
      </Badge>
    );
  }
  if (status === "SUSPENDED") {
    return (
      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
        Suspended
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-200 text-gray-800 hover:bg-gray-200">
      Deleted
    </Badge>
  );
}

const AUTONOMY_FILTER_ALL = "ALL";

export function AITeammatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const skip = (page - 1) * PAGE_SIZE;
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const autonomyFilter = (searchParams.get("policy") ??
    AUTONOMY_FILTER_ALL) as TwinAutonomyLevel | typeof AUTONOMY_FILTER_ALL;
  const adminOnly = searchParams.get("admin") === "1";

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerTwin, setDrawerTwin] = useState<AITeammateListItem | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);

  const list = useQuery({
    queryKey: ["org", "ai-teammates", { skip, take: PAGE_SIZE }],
    queryFn: async () => {
      const r = await api.org.aiTeammates.list({ skip, take: PAGE_SIZE });
      if (!r.ok) {
        throw new Error(`Failed to load AI Teammates (${r.code})`);
      }
      return r.data;
    },
  });

  // [GAP-H] Owner identity now arrives ON the list items (authoritative
  // backend projection) — the old client-side hierarchy/member guessing that
  // produced false "Unassigned" is gone.

  const filteredRows = useMemo(() => {
    let rows = list.data?.items ?? [];
    if (search) {
      rows = rows.filter(
        (r) =>
          r.display_name.toLowerCase().includes(search) ||
          twinDisplayLabel(r).toLowerCase().includes(search) ||
          twinOwnerLabel(r).toLowerCase().includes(search),
      );
    }
    if (autonomyFilter !== AUTONOMY_FILTER_ALL) {
      rows = rows.filter(
        (r) => r.config?.autonomy_level === autonomyFilter,
      );
    }
    if (adminOnly) {
      rows = rows.filter((r) => r.config?.is_admin_twin === true);
    }
    return rows;
  }, [list.data, search, autonomyFilter, adminOnly]);

  function toggleSelected(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection(): void {
    setSelectedIds(new Set());
  }

  function setUrlParam(key: string, value: string | null): void {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }

  const columns = useMemo<ColumnDef<AITeammateListItem>[]>(
    () => [
      {
        id: "select",
        header: () => null,
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${twinDisplayLabel(row.original)}`}
            checked={selectedIds.has(row.original.entity_id)}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleSelected(row.original.entity_id)}
          />
        ),
        enableSorting: false,
      },
      {
        id: "display_name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {/* [GAP-H] Human identity from the backend-projected owner —
                never the raw stored "Twin of <uuid>" string. */}
            <span className="font-medium">{twinDisplayLabel(row.original)}</span>
            {row.original.config?.is_admin_twin && <ExecutiveOverrideBadge />}
          </div>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        // [GAP-H] The AUTHORITATIVE owner projected by Foundation from the
        // same org-scoped edge that defines the twin set — never a client
        // hierarchy guess. "No owner assigned yet" only when truly missing.
        accessorFn: (row) => twinOwnerLabel(row),
      },
      // [GAP-H] The STORED role template Foundation applied and actually
      // reads for this twin's conduct — never a client-side guess from the
      // owner's job title (that showed a different value than the truth).
      {
        id: "role_template",
        header: "Role template",
        accessorFn: (row) => roleTemplateLabel(row.config?.role_template),
      },
      // [GAP-G SLICE-1] The authority truth pair: what the template
      // RECOMMENDED vs where the current level came from. Server-stored
      // provenance only — never a guess, never a capability claim beyond
      // the enforced autonomy_level shown in Behavior Policy.
      {
        id: "template_recommendation",
        header: "Template recommendation",
        accessorFn: (row) => recommendedAutonomyLabel(row.config ?? null),
      },
      {
        id: "authority_status",
        header: "Authority status",
        accessorFn: (row) => authorityStatusLabel(row.config ?? null),
      },
      // [GAP-H OPS] Operational truth: readiness from role template
      // required_tools vs OAuth/bindings; never fakes Ready. Activity never
      // presents owner work as twin work.
      {
        id: "tools",
        header: "Tools",
        accessorFn: (row) => toolReadinessLabel(row.tool_readiness),
      },
      {
        id: "last_active",
        header: "Last active",
        accessorFn: (row) => lastActiveLabel(row.recent_activity),
      },
      {
        id: "next_step",
        header: "Next step",
        cell: ({ row }) =>
          row.original.tool_readiness !== undefined &&
          row.original.tool_readiness.status !== "ready" ? (
            // A REAL destination (admin Tools & Connections page) — never a
            // fake setup button.
            <a
              href="/tools-connections"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              data-testid="twin-next-step-link"
            >
              Open Tools &amp; Connections
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "behavior_policy",
        header: "Behavior Policy",
        accessorFn: (row) =>
          row.config
            ? getAutonomyLevelLabel(row.config.autonomy_level)
            : "—",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: "created",
        header: "Created",
        accessorFn: (row) => formatRelativeTime(row.created_at),
      },
    ],
    [selectedIds],
  );

  const idsArray = Array.from(selectedIds);
  const idToName = new Map(
    (list.data?.items ?? []).map((r) => [r.entity_id, twinDisplayLabel(r)]),
  );

  const filterControls = (
    <>
      <Select
        value={autonomyFilter}
        onValueChange={(v) =>
          setUrlParam("policy", v === AUTONOMY_FILTER_ALL ? null : v)
        }
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="All Behavior Policies" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AUTONOMY_FILTER_ALL}>
            All Behavior Policies
          </SelectItem>
          {(
            Object.keys(AUTONOMY_LEVEL_LABELS) as TwinAutonomyLevel[]
          ).map((level) => (
            <SelectItem key={level} value={level}>
              {getAutonomyLevelLabel(level)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={adminOnly}
          onCheckedChange={(v) => setUrlParam("admin", v === true ? "1" : null)}
        />
        Admin teammates only
      </label>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Teammates"
        description="AI agents working alongside your team -- who owns each one, how autonomously it may act, and its recent activity. Each Member can have one AI Teammate."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            Create AI Teammate
          </Button>
        }
      />

      <DataSovereigntyInline />

      {/* G-02 — authority is Foundation-enforced; templates recommend only. */}
      <TwinAuthorityBindingCard
        org_name="This organization"
        autonomy_label={
          list.data?.twin_autonomy_ceiling &&
          list.data.twin_autonomy_ceiling in AUTONOMY_LEVEL_LABELS
            ? getAutonomyLevelLabel(
                list.data.twin_autonomy_ceiling as TwinAutonomyLevel,
              )
            : "Org autonomy ceiling (Foundation-enforced)"
        }
        variant="admin"
      />

      {/* M-01 — org ceiling maps to the graduated ladder for admins. */}
      <GraduatedAutonomyLadderCard
        variant="admin"
        autonomyMode={list.data?.twin_autonomy_ceiling ?? "APPROVAL_REQUIRED"}
      />

      <BulkActionsBar
        selectedIds={idsArray}
        onClearSelection={clearSelection}
        actions={bulkAutonomyActions()}
        renderItemLabel={(id) => idToName.get(id) ?? id}
      />

      <DataTable<AITeammateListItem>
        columns={columns}
        data={filteredRows}
        isLoading={list.isLoading}
        error={list.error as Error | null}
        emptyState={{
          title: "No AI Teammates yet",
          description:
            "Create your first AI Teammate to give a Member an AI partner with audited capabilities.",
          cta: (
            <Button onClick={() => setCreateOpen(true)}>
              Create AI Teammate
            </Button>
          ),
        }}
        pageSize={PAGE_SIZE}
        totalCount={list.data?.total ?? undefined}
        searchPlaceholder="Search by name..."
        filterControls={filterControls}
        onRowClick={(row) => setDrawerTwin(row)}
        onRetry={() => void list.refetch()}
      />

      <TwinDetailDrawer
        twin={drawerTwin}
        open={drawerTwin !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerTwin(null);
        }}
      />

      <CreateTwinDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
