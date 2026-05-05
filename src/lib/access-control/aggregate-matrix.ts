// FILE: aggregate-matrix.ts
// PURPOSE: Pure join + aggregation logic that turns raw Foundation
//          rows (Permission[] from /org/permissions, OrgCapsuleListItem[]
//          from /org/capsules) into the (grantee × capsule_type) heatmap
//          the Access Control matrix renders. No React, no TanStack
//          Query -- callable from tests with literal arrays.
// CONNECTS TO: PermissionsMatrix.tsx (sole consumer), permissions-matrix.test.tsx.
//
// CROSS-WALLET BOUNDARY (12B.4 Drift 4 + Drift 6):
//   Foundation's GET /org/capsules is ORG-WALLET-ONLY (entity_id ==
//   COMPANY -- apps/api/src/routes/org.routes.ts:838). Permissions
//   referencing capsule_ids OUTSIDE this slice are silently dropped
//   from the matrix display. This honors the patent's three-wallet
//   portability boundary: cross-wallet permissions (PERSONAL member
//   capsules, AI_AGENT capsules) surface via Security & Audit (12D),
//   not the Access Control matrix. 12C.0 Foundation extension
//   candidate: cross-wallet capsule resolution endpoint.
//
// SCHEMA-HONEST CELL STATE (12B.1 Q1):
//   Cell renders as a 3-tuple: (PermissionLevel, canShareForward,
//   bridgeCount). PermissionLevel uses the client-side superset
//   { 'NONE' | AccessScope } -- 'NONE' means "no Permission row exists
//   for this (grantee, capsule_type) intersection." When multiple
//   rows exist, PermissionLevel = max(rows.access_scope) under the
//   ordering METADATA_ONLY < SUMMARY < FULL; canShareForward = OR of
//   row flags; bridgeCount = distinct(bridge_id).

import type {
  AccessScope,
  CapsuleType,
  Entity,
  OrgCapsuleListItem,
  Permission,
  PermissionLevel,
} from "@/lib/types/foundation";

// WHAT: Number of capsule_type columns the matrix shows.
// WHY: Q3 (12B.1): "top 8 capsule_types by frequency in the join."
//      Foundation has 20 capsule_types; rendering all of them produces
//      an unreadable wide matrix. 8 is the design ceiling -- if a cell
//      sits in a less-common capsule_type, that permission still
//      surfaces via the per-grantee filter or the BridgeDetailDrawer.
export const MATRIX_TOP_CAPSULE_TYPES = 8 as const;

// WHAT: Ordering for AccessScope severity.
// WHY: When N permission rows stack on the same (grantee, capsule_type)
//      cell, the cell renders the MAX scope. Foundation's enum is
//      schema-prisma-defined (METADATA_ONLY < SUMMARY < FULL) but
//      doesn't have an inherent ordering surface. Defined here once
//      for the matrix's aggregation contract.
const ACCESS_SCOPE_ORDER: Record<AccessScope, number> = {
  METADATA_ONLY: 1,
  SUMMARY: 2,
  FULL: 3,
};

function maxScope(a: AccessScope, b: AccessScope): AccessScope {
  return ACCESS_SCOPE_ORDER[a] >= ACCESS_SCOPE_ORDER[b] ? a : b;
}

export interface MatrixCellState {
  level: PermissionLevel;
  canShareForward: boolean;
  bridgeCount: number;
  /** All bridge_ids in this cell -- needed by BridgeDetailDrawer to
   *  filter the per-bridge rows it renders for the click. */
  bridgeIds: string[];
}

export interface MatrixRow {
  grantee_entity_id: string;
  display_name: string;
}

export interface AggregatedMatrix {
  /** Grantee rows -- one per distinct grantee_entity_id present in
   *  the joined permissions, hydrated with display_name. Sorted by
   *  display_name for stable render. */
  rows: MatrixRow[];
  /** Top-8 capsule_types by permission-row frequency. Stable order:
   *  most frequent first; ties broken alphabetically by literal. */
  columns: CapsuleType[];
  /** Lookup: cell state for a (grantee_entity_id, capsule_type) pair.
   *  Returns NONE-cell when no Permission row exists. */
  cell: (grantee_entity_id: string, capsule_type: CapsuleType) => MatrixCellState;
  /** Permissions actually used after the cross-wallet drop. Useful
   *  for tests that need to assert "these were dropped, those were
   *  kept" without re-running the join. */
  retained: Permission[];
  /** Permissions dropped because their capsule_id is not in the
   *  /org/capsules slice. Surfaces the cross-wallet boundary count
   *  for diagnostics / future telemetry. */
  droppedCount: number;
}

const NONE_CELL: MatrixCellState = {
  level: "NONE",
  canShareForward: false,
  bridgeCount: 0,
  bridgeIds: [],
};

// WHAT: Build the aggregated matrix from raw rows.
// INPUT: Permission[], OrgCapsuleListItem[], Entity[] (grantees).
// OUTPUT: AggregatedMatrix (rows, columns, cell-lookup, retained, droppedCount).
// WHY: All four invariants enforced in pure code so the test pinpoints
//      regressions: (1) cross-wallet drop, (2) max-scope aggregation,
//      (3) OR-of-can_share_forward, (4) distinct(bridge_id) bridge count.
export function aggregateMatrix(
  permissions: readonly Permission[],
  capsules: readonly OrgCapsuleListItem[],
  grantees: readonly Entity[],
): AggregatedMatrix {
  // Index capsule_id → capsule_type for the join. Permissions with
  // capsule_ids not present here are dropped (cross-wallet boundary).
  const capsuleTypeById = new Map<string, CapsuleType>();
  for (const c of capsules) {
    capsuleTypeById.set(c.capsule_id, c.capsule_type);
  }

  const retained: Permission[] = [];
  let droppedCount = 0;
  for (const p of permissions) {
    if (capsuleTypeById.has(p.capsule_id)) {
      retained.push(p);
    } else {
      droppedCount += 1;
    }
  }

  // Count permission rows per capsule_type to pick the top-8 columns.
  const countByType = new Map<CapsuleType, number>();
  for (const p of retained) {
    const t = capsuleTypeById.get(p.capsule_id);
    if (t === undefined) continue;
    countByType.set(t, (countByType.get(t) ?? 0) + 1);
  }
  const columns: CapsuleType[] = Array.from(countByType.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, MATRIX_TOP_CAPSULE_TYPES)
    .map(([t]) => t);

  // Build cell map keyed by `${grantee_entity_id}|${capsule_type}`.
  // Each entry aggregates max-scope, OR-of-can_share_forward, and
  // distinct bridge_ids.
  interface Acc {
    level: AccessScope;
    canShareForward: boolean;
    bridgeIdSet: Set<string>;
  }
  const accByKey = new Map<string, Acc>();
  for (const p of retained) {
    const t = capsuleTypeById.get(p.capsule_id);
    if (t === undefined) continue;
    const key = `${p.grantee_entity_id}|${t}`;
    const existing = accByKey.get(key);
    if (existing) {
      existing.level = maxScope(existing.level, p.access_scope);
      existing.canShareForward = existing.canShareForward || p.can_share_forward;
      existing.bridgeIdSet.add(p.bridge_id);
    } else {
      accByKey.set(key, {
        level: p.access_scope,
        canShareForward: p.can_share_forward,
        bridgeIdSet: new Set([p.bridge_id]),
      });
    }
  }

  // Distinct grantees from retained rows; hydrate display_name from
  // the grantees list (fall back to the entity_id if not provided so
  // the matrix never silently drops a grantee for a missing entity).
  const granteeIdsInPermissions = new Set(
    retained.map((p) => p.grantee_entity_id),
  );
  const granteeById = new Map(grantees.map((e) => [e.entity_id, e]));
  const rows: MatrixRow[] = Array.from(granteeIdsInPermissions)
    .map((id) => ({
      grantee_entity_id: id,
      display_name: granteeById.get(id)?.display_name ?? id,
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  function cell(
    grantee_entity_id: string,
    capsule_type: CapsuleType,
  ): MatrixCellState {
    const key = `${grantee_entity_id}|${capsule_type}`;
    const acc = accByKey.get(key);
    if (!acc) return NONE_CELL;
    return {
      level: acc.level,
      canShareForward: acc.canShareForward,
      bridgeCount: acc.bridgeIdSet.size,
      bridgeIds: Array.from(acc.bridgeIdSet),
    };
  }

  return { rows, columns, cell, retained, droppedCount };
}
