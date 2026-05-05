// FILE: AccessControl.tsx
// PURPOSE: Customer-facing "Access Control" admin screen -- the
//          bridge-aware permissions matrix governing who in your
//          enterprise can read which Knowledge Items, with grant
//          (POST /cosmp/share) + revoke (DELETE /cosmp/share/:bridgeId)
//          flows wired through the audit-aware 4-stage UI. Closes
//          Section 12B.
// CONNECTS TO: PermissionsMatrix (the heatmap), BridgeDetailDrawer
//              (per-cell drilldown + per-bridge revoke),
//              GrantPermissionDialog (the Foundation-honest 6-field
//              grant flow), BulkActionsBar (Promise.allSettled
//              fan-out for bulk revoke), api.cosmp.{share,revoke},
//              api.org.{permissions,capsules,entities,aiTeammates,
//              analytics}.
//
// SHARING RULES DEFERRED TO 12E (decision #24):
// This screen does NOT include a sharing-rules editor. Per
// docs/SECTION_12_DISCIPLINE.md decision #24, sharing-rules surface
// belongs on the Policies screen (12E). 12B.4 is bridge-aware grant +
// revoke only.
//
// CROSS-WALLET BOUNDARY:
// The matrix shows ONLY active permissions referencing org-wallet
// capsules (the slice returned by GET /org/capsules per Foundation
// org.routes.ts:838). Cross-wallet permissions (PERSONAL member
// capsules, AI_AGENT capsules) surface only via Security & Audit
// (12D). This is org-admin scope per the patent's three-wallet
// portability boundary. No power-user wallet toggle here -- 12C.0
// Foundation extension + 12E Policies cover the consent surface.

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataSovereigntyInline } from "@/components/sovereignty/DataSovereigntyInline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PermissionsMatrix } from "@/components/access-control/PermissionsMatrix";
import { BridgeDetailDrawer } from "@/components/access-control/BridgeDetailDrawer";
import { GrantPermissionDialog } from "@/components/access-control/GrantPermissionDialog";
import {
  BulkActionsBar,
  type BulkAction,
} from "@/components/users/BulkActionsBar";
import { api } from "@/lib/api";
import type { MatrixCellState } from "@/lib/access-control/aggregate-matrix";
import type {
  CapsuleType,
  Entity,
  OrgCapsuleListItem,
} from "@/lib/types/foundation";

const ORG_DISPLAY_NAME_FALLBACK = "your organization";

export function AccessControlPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";

  const [grantOpen, setGrantOpen] = useState(false);
  const [drawerGrantee, setDrawerGrantee] = useState<Entity | null>(null);
  const [drawerCapsuleType, setDrawerCapsuleType] =
    useState<CapsuleType | null>(null);
  const [selectedBridgeIds, setSelectedBridgeIds] = useState<Set<string>>(
    new Set(),
  );
  const [matrixCapsules, setMatrixCapsules] = useState<
    readonly OrgCapsuleListItem[]
  >([]);
  const [matrixGrantees, setMatrixGrantees] = useState<readonly Entity[]>([]);

  // The org's display_name powers the BridgeDetailDrawer header
  // ("Permission Bridge: {grantee} ← {org}"). Fetching is two-step:
  // analytics → org_entity_id → entities.get → display_name. Falls
  // back to a generic phrase if either fetch is mid-flight.
  const analyticsQuery = useQuery({
    queryKey: ["org", "analytics"],
    queryFn: async () => {
      const r = await api.org.analytics();
      if (!r.ok) throw new Error(r.message);
      return r.data;
    },
  });

  const orgEntityQuery = useQuery({
    queryKey: ["org", "entity", analyticsQuery.data?.org_entity_id],
    enabled: Boolean(analyticsQuery.data?.org_entity_id),
    queryFn: async () => {
      const id = analyticsQuery.data?.org_entity_id;
      if (!id) throw new Error("No org_entity_id");
      const r = await api.org.entities.get(id);
      if (!r.ok) throw new Error(r.message);
      return r.data;
    },
  });

  const orgDisplayName =
    orgEntityQuery.data?.display_name ?? ORG_DISPLAY_NAME_FALLBACK;

  function setSearch(next: string): void {
    const params = new URLSearchParams(searchParams);
    if (next.length === 0) params.delete("search");
    else params.set("search", next);
    setSearchParams(params, { replace: true });
  }

  function handleCellClick(granteeId: string, capsuleType: CapsuleType): void {
    const grantee =
      matrixGrantees.find((g) => g.entity_id === granteeId) ?? null;
    setDrawerGrantee(grantee);
    setDrawerCapsuleType(capsuleType);
  }

  function handleToggleCellSelection(cell: MatrixCellState): void {
    if (cell.bridgeIds.length === 0) return;
    setSelectedBridgeIds((prev) => {
      const next = new Set(prev);
      const allSelected = cell.bridgeIds.every((id) => next.has(id));
      if (allSelected) {
        for (const id of cell.bridgeIds) next.delete(id);
      } else {
        for (const id of cell.bridgeIds) next.add(id);
      }
      return next;
    });
  }

  function clearSelection(): void {
    setSelectedBridgeIds(new Set());
  }

  // Stable callback identity for PermissionsMatrix's onDataReady.
  const onDataReady = useMemo(
    () =>
      ({
        capsules,
        grantees,
      }: {
        capsules: readonly OrgCapsuleListItem[];
        grantees: readonly Entity[];
      }) => {
        setMatrixCapsules(capsules);
        setMatrixGrantees(grantees);
      },
    [],
  );

  const bulkActions: BulkAction<string>[] = [
    {
      key: "revoke",
      label: "Revoke selected bridges",
      audit_event_type: "PERMISSION_REVOKED",
      requireConfirmation: true,
      variant: "destructive",
      confirmationDescription:
        "All permissions under each selected bridge are revoked atomically and the grantees' active sessions are invalidated.",
      perItem: async (bridgeId) => {
        const r = await api.cosmp.revoke(bridgeId);
        if (!r.ok) {
          return { ok: false, error: r.message };
        }
        return { ok: true, audit_event_id: r.data.audit_event_id };
      },
    },
  ];

  function handleBridgeRevokedFromBulk(): void {
    void queryClient.invalidateQueries({ queryKey: ["org", "permissions"] });
  }

  // Refinement 1: disabled-with-tooltip when no bridges are selected.
  // Renders disabled, NOT hidden, so the operator sees the affordance.
  const revokeDisabled = selectedBridgeIds.size === 0;
  const revokeButton = (
    <Button
      type="button"
      variant="destructive"
      disabled={revokeDisabled}
      onClick={() => {
        const el = document.getElementById("bulk-actions-bar");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      Revoke Selected Bridges
      {selectedBridgeIds.size > 0 ? ` (${selectedBridgeIds.size})` : ""}
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Control"
        description="Bridge-aware view of every active permission grant in your enterprise wallet. One bridge, many shapes — revocable atomically."
        actions={
          <Button onClick={() => setGrantOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Grant Permission
          </Button>
        }
      />

      <DataSovereigntyInline />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search grantees by name..."
          className="max-w-sm"
          aria-label="Search grantees"
        />
        {revokeDisabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">{revokeButton}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              Select one or more matrix cells to revoke their bridges.
            </TooltipContent>
          </Tooltip>
        ) : (
          revokeButton
        )}
      </div>

      <div id="bulk-actions-bar">
        <BulkActionsBar
          selectedIds={Array.from(selectedBridgeIds)}
          onClearSelection={clearSelection}
          actions={bulkActions.map((a) => ({
            ...a,
            perItem: async (id: string) => {
              const result = await a.perItem(id);
              if (result.ok) handleBridgeRevokedFromBulk();
              return result;
            },
          }))}
          renderItemLabel={(id) => `Bridge ${id.slice(0, 8)}…`}
        />
      </div>

      <PermissionsMatrix
        search={search}
        selectedBridgeIds={selectedBridgeIds}
        onCellClick={handleCellClick}
        onToggleCellSelection={handleToggleCellSelection}
        onDataReady={onDataReady}
      />

      <BridgeDetailDrawer
        grantee={drawerGrantee}
        capsuleType={drawerCapsuleType}
        orgDisplayName={orgDisplayName}
        capsules={matrixCapsules}
        open={drawerGrantee !== null && drawerCapsuleType !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDrawerGrantee(null);
            setDrawerCapsuleType(null);
          }
        }}
      />

      <GrantPermissionDialog open={grantOpen} onOpenChange={setGrantOpen} />
    </div>
  );
}
