// FILE: PermissionsMatrix.tsx
// PURPOSE: The bridge-aware Access Control matrix heatmap. Rows are
//          grantees, columns are top-8 capsule_types, cells render via
//          MatrixCell using the schema-honest 3-tuple
//          (access_scope, can_share_forward, duration_type) per
//          decision #18 and 12B.1 Q1.
// CONNECTS TO: AccessControl.tsx (mounts this), aggregate-matrix.ts
//              (pure join logic), MatrixCell (cell render),
//              BridgeDetailDrawer (cell click), api.org.permissions.list
//              + api.org.capsules.list + api.org.entities.list +
//              api.org.aiTeammates.list (data sources).
//
// SELECTION MODEL:
// Multi-select tracks bridge_ids (NOT cells, NOT capsule_ids). Cells
// are visual; bridges are the unit of revocation. When a cell is
// "selected," every bridge_id contributing to that cell is added to
// the selection. The toolbar's "Revoke Selected Bridges" button (in
// AccessControl.tsx) feeds those ids into BulkActionsBar's per-bridge
// fan-out.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MatrixCell } from "@/components/data/MatrixCell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  aggregateMatrix,
  type AggregatedMatrix,
  type MatrixCellState,
} from "@/lib/access-control/aggregate-matrix";
import { getCapsuleTypeLabel } from "@/lib/labels/capsule-types";
import type {
  AITeammateListItem,
  CapsuleType,
  Entity,
  OrgCapsuleListItem,
  Permission,
} from "@/lib/types/foundation";

interface PermissionsMatrixProps {
  /** Free-text search applied client-side to grantee display_name. */
  search: string;
  /** Bridge ids currently selected for bulk revoke. Source of truth
   *  lives in AccessControl.tsx so the toolbar's CTA can read the
   *  count. */
  selectedBridgeIds: ReadonlySet<string>;
  /** Called with the (grantee_entity_id, capsule_type) pair when a
   *  cell is clicked. Caller resolves the grantee Entity and opens
   *  BridgeDetailDrawer. */
  onCellClick: (granteeId: string, capsuleType: CapsuleType) => void;
  /** Toggle selection for every bridge_id in a given cell. */
  onToggleCellSelection: (cell: MatrixCellState) => void;
  /** Hook so the AccessControl page can pass through the materialized
   *  data (capsules, grantees) into BridgeDetailDrawer / toolbar
   *  copy without re-fetching. */
  onDataReady?: (data: {
    capsules: readonly OrgCapsuleListItem[];
    grantees: readonly Entity[];
    aggregated: AggregatedMatrix;
  }) => void;
}

export function PermissionsMatrix({
  search,
  selectedBridgeIds,
  onCellClick,
  onToggleCellSelection,
  onDataReady,
}: PermissionsMatrixProps) {
  const permissionsQuery = useQuery({
    queryKey: ["org", "permissions", { take: 250 }],
    queryFn: async () => {
      const r = await api.org.permissions.list({ take: 250 });
      if (!r.ok) {
        throw new Error(`Failed to load permissions (${r.code})`);
      }
      return r.data.items;
    },
  });

  const capsulesQuery = useQuery({
    queryKey: ["org", "capsules", { take: 250 }],
    queryFn: async () => {
      const r = await api.org.capsules.list({ take: 250 });
      if (!r.ok) {
        throw new Error(`Failed to load capsules (${r.code})`);
      }
      return r.data.items;
    },
  });

  const personsQuery = useQuery({
    queryKey: ["org", "entities", { type: "PERSON", take: 250 }],
    queryFn: async () => {
      const r = await api.org.entities.list({ type: "PERSON", take: 250 });
      if (!r.ok) {
        throw new Error(`Failed to load Members (${r.code})`);
      }
      return r.data.items;
    },
  });

  const aiTeammatesQuery = useQuery({
    queryKey: ["org", "ai-teammates", { take: 250 }],
    queryFn: async () => {
      const r = await api.org.aiTeammates.list({ take: 250 });
      if (!r.ok) {
        throw new Error(`Failed to load AI Teammates (${r.code})`);
      }
      return r.data.items;
    },
  });

  const isLoading =
    permissionsQuery.isLoading ||
    capsulesQuery.isLoading ||
    personsQuery.isLoading ||
    aiTeammatesQuery.isLoading;

  const error =
    (permissionsQuery.error as Error | null) ??
    (capsulesQuery.error as Error | null) ??
    (personsQuery.error as Error | null) ??
    (aiTeammatesQuery.error as Error | null);

  const grantees: Entity[] = useMemo(() => {
    const persons: Entity[] = (personsQuery.data ?? []) as Entity[];
    // AITeammateListItem is slim; synthesize Entity-shaped rows so
    // aggregateMatrix's display_name lookup works uniformly. The
    // aggregation only reads entity_id + display_name + entity_type.
    const teammates: Entity[] = (aiTeammatesQuery.data ?? []).map(
      (t: AITeammateListItem): Entity => ({
        entity_id: t.entity_id,
        entity_type: "AI_AGENT",
        display_name: t.display_name,
        email: null,
        status: t.status,
        clearance_level: 0,
        public_key: "",
        failed_auth_attempts: 0,
        suspended_at: null,
        created_at: t.created_at,
        updated_at: t.created_at,
        deleted_at: null,
      }),
    );
    return [...persons, ...teammates];
  }, [personsQuery.data, aiTeammatesQuery.data]);

  const aggregated = useMemo(
    () =>
      aggregateMatrix(
        (permissionsQuery.data ?? []) as Permission[],
        (capsulesQuery.data ?? []) as OrgCapsuleListItem[],
        grantees,
      ),
    [permissionsQuery.data, capsulesQuery.data, grantees],
  );

  // Notify the parent so AccessControl.tsx can pass capsules through
  // to BridgeDetailDrawer without re-fetching, and so the toolbar
  // copy can read the dropped-permissions count if surfaced.
  useMemo(() => {
    if (
      !isLoading &&
      !error &&
      capsulesQuery.data &&
      onDataReady
    ) {
      onDataReady({
        capsules: capsulesQuery.data,
        grantees,
        aggregated,
      });
    }
    // Intentionally narrow the deps so we don't fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, error, capsulesQuery.data, aggregated]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length === 0) return aggregated.rows;
    return aggregated.rows.filter((r) =>
      r.display_name.toLowerCase().includes(term),
    );
  }, [aggregated.rows, search]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="text-destructive">Error: {error.message}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => {
            void permissionsQuery.refetch();
            void capsulesQuery.refetch();
            void personsQuery.refetch();
            void aiTeammatesQuery.refetch();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (aggregated.rows.length === 0) {
    return (
      <div className="rounded-md border border-border p-8 text-center">
        <h3 className="text-base font-semibold">No active permissions yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Use "Grant Permission" above to issue your first bridge.
        </p>
      </div>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <div className="rounded-md border border-border p-8 text-center text-sm text-muted-foreground">
        No grantees match "{search}".
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table role="table" className="w-full text-sm">
        <thead className="border-b bg-muted/30">
          <tr role="row">
            <th
              role="columnheader"
              className="px-4 py-2 text-left font-medium text-muted-foreground"
            >
              Grantee
            </th>
            {aggregated.columns.map((c) => (
              <th
                key={c}
                role="columnheader"
                className="px-2 py-2 text-left font-medium text-muted-foreground"
              >
                {getCapsuleTypeLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => (
            <tr key={row.grantee_entity_id} role="row" className="border-b last:border-b-0">
              <td role="cell" className="px-4 py-2 font-medium">
                {row.display_name}
              </td>
              {aggregated.columns.map((col) => {
                const cellState = aggregated.cell(
                  row.grantee_entity_id,
                  col,
                );
                const cellSelected =
                  cellState.bridgeIds.length > 0 &&
                  cellState.bridgeIds.every((id) =>
                    selectedBridgeIds.has(id),
                  );
                return (
                  <td
                    key={col}
                    role="cell"
                    className="px-1 py-1"
                    aria-label={`${row.display_name} × ${getCapsuleTypeLabel(col)}`}
                  >
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        aria-label={`Select bridges for ${row.display_name} × ${getCapsuleTypeLabel(col)}`}
                        checked={cellSelected}
                        disabled={cellState.bridgeCount === 0}
                        onChange={() => onToggleCellSelection(cellState)}
                        className="h-3 w-3"
                      />
                      {cellState.bridgeCount > 0 ? (
                        <MatrixCell
                          accessScope={cellState.level}
                          canShareForward={cellState.canShareForward}
                          bridgeCount={cellState.bridgeCount}
                          onClick={() =>
                            onCellClick(row.grantee_entity_id, col)
                          }
                        />
                      ) : (
                        <MatrixCell
                          accessScope={cellState.level}
                          canShareForward={cellState.canShareForward}
                          bridgeCount={cellState.bridgeCount}
                        />
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
