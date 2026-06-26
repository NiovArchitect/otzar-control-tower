// FILE: Users.tsx
// PURPOSE: Customer-facing "Users" admin screen -- humans (PERSON
//          entities) registered in the org. Wraps Foundation's
//          /org/entities surface in customer-admin vocabulary.
// CONNECTS TO: api.org.entities + members + onboarding,
//              MemberDetailDrawer, InviteWizard, BulkActionsBar,
//              DataTable, DataSovereigntyInline.
//
// DECISIONS APPLIED (per docs/SECTION_12_DISCIPLINE.md):
// - #11 DataSovereigntyInline at the top.
// - #13 DataTable defaults: 25 rows, URL state, 4 states baked in.
// - #20 Invite via 3-step Dandelion wizard.
// - #22 BulkActionsBar with Promise.allSettled fan-out.
// - #26 "Last Updated" column from Entity.updated_at.
// - C1 Filter to type="PERSON" only -- AI Teammates have their own
//        screen (12B.3).

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { UserPlus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/data/DataTable";
import { DataSovereigntyInline } from "@/components/sovereignty/DataSovereigntyInline";
import { MemberDetailDrawer } from "@/components/users/MemberDetailDrawer";
import { InviteWizard } from "@/components/users/InviteWizard";
import {
  BulkActionsBar,
  type BulkAction,
} from "@/components/users/BulkActionsBar";
import { api } from "@/lib/api";
import { formatPersonName } from "@/lib/identity/person-name";
import { getEntityTypeLabel } from "@/lib/labels/entity-types";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type { Entity, EntityStatus } from "@/lib/types/foundation";

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

export function UsersPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerMember, setDrawerMember] = useState<Entity | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const list = useQuery({
    queryKey: ["org", "entities", { type: "PERSON", skip, take: PAGE_SIZE }],
    queryFn: async () => {
      const r = await api.org.entities.list({
        type: "PERSON",
        skip,
        take: PAGE_SIZE,
      });
      if (!r.ok) {
        throw new Error(`Failed to load members (${r.code})`);
      }
      return r.data;
    },
  });

  const rows = list.data?.items ?? undefined;
  const total = list.data?.total ?? undefined;

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

  const columns = useMemo<ColumnDef<Entity>[]>(
    () => [
      {
        id: "select",
        header: () => null,
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.original.display_name}`}
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
        accessorFn: (row) => formatPersonName(row.display_name) || row.display_name,
      },
      {
        id: "email",
        header: "Email",
        accessorFn: (row) => row.email ?? "—",
      },
      {
        id: "type",
        header: "Type",
        accessorFn: (row) => getEntityTypeLabel(row.entity_type),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: "last_updated",
        header: () => (
          <span title="Last time this member's profile or status was modified. Session activity tracking ships in Section 14.">
            Last Updated
          </span>
        ),
        accessorFn: (row) => formatRelativeTime(row.updated_at),
      },
    ],
    [selectedIds],
  );

  // ── Bulk actions ──────────────────────────────────────────────
  const bulkActions: BulkAction<string>[] = [
    {
      key: "suspend",
      label: "Suspend selected",
      audit_event_type: "ADMIN_ACTION",
      audit_action_label: "ENTITY_SUSPENDED",
      requireConfirmation: true,
      variant: "destructive",
      confirmationDescription:
        "Suspended members can't log in until reactivated. Their AI Teammate stays minted.",
      perItem: async (id) => {
        const r = await api.org.entities.update(id, { status: "SUSPENDED" });
        if (!r.ok) {
          return { ok: false, error: r.message };
        }
        await queryClient.invalidateQueries({ queryKey: ["org", "entities"] });
        // Foundation now returns the real audit_event_id for this PATCH.
        return { ok: true, audit_event_id: r.data.audit_event_id };
      },
    },
    {
      key: "reactivate",
      label: "Reactivate selected",
      audit_event_type: "ADMIN_ACTION",
      audit_action_label: "ENTITY_REACTIVATED",
      requireConfirmation: true,
      confirmationDescription:
        "Reactivated members regain login access immediately.",
      perItem: async (id) => {
        const r = await api.org.entities.update(id, { status: "ACTIVE" });
        if (!r.ok) {
          return { ok: false, error: r.message };
        }
        await queryClient.invalidateQueries({ queryKey: ["org", "entities"] });
        // Foundation now returns the real audit_event_id for this PATCH.
        return { ok: true, audit_event_id: r.data.audit_event_id };
      },
    },
  ];

  const idsArray = Array.from(selectedIds);
  const idToName = new Map(rows?.map((r) => [r.entity_id, r.display_name]) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="People in your organization -- their roles, status, and access summary. Each member has a Digital Twin once their invite is accepted."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden />
            Invite member
          </Button>
        }
      />

      <DataSovereigntyInline />

      <BulkActionsBar
        selectedIds={idsArray}
        onClearSelection={clearSelection}
        actions={bulkActions}
        renderItemLabel={(id) => idToName.get(id) ?? id}
      />

      <DataTable<Entity>
        columns={columns}
        data={rows}
        isLoading={list.isLoading}
        error={list.error as Error | null}
        emptyState={{
          title: "No members yet",
          description:
            "Invite your first team member to start building your organization's intelligence.",
          cta: (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" aria-hidden />
              Invite member
            </Button>
          ),
        }}
        pageSize={PAGE_SIZE}
        totalCount={total}
        searchPlaceholder="Search by name or email..."
        onRowClick={(row) => setDrawerMember(row)}
        onRetry={() => void list.refetch()}
      />

      <MemberDetailDrawer
        member={drawerMember}
        open={drawerMember !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerMember(null);
        }}
      />

      <InviteWizard open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
