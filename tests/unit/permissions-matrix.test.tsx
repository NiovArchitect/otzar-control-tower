// FILE: tests/unit/permissions-matrix.test.tsx
// PURPOSE: 12B.4 anchor test (Test 11) for the Access Control matrix.
//          Asserts the three invariants the aggregation contract MUST
//          hold under future refactors:
//          (a) The matrix's columns are computed from the JOIN of
//              /org/permissions ∩ /org/capsules (top-N capsule_types
//              by frequency).
//          (b) Permissions referencing capsule_ids OUTSIDE the
//              /org/capsules slice are dropped from matrix display
//              (cross-wallet boundary, Drift 4 + Drift 6).
//          (c) MatrixCell receives the correct PermissionLevel
//              (max scope), canShareForward (OR of row flags), and
//              bridgeCount (distinct bridge_id count).
// CONNECTS TO: src/components/access-control/PermissionsMatrix.tsx,
//              src/lib/access-control/aggregate-matrix.ts (the pure
//              join logic the component delegates to),
//              tests/msw/handlers.ts (mixed permissions fixture +
//              CROSS_WALLET_CAPSULE_ID).

import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PermissionsMatrix } from "@/components/access-control/PermissionsMatrix";
import {
  aggregateMatrix,
  MATRIX_TOP_CAPSULE_TYPES,
} from "@/lib/access-control/aggregate-matrix";
import type {
  Entity,
  OrgCapsuleListItem,
  Permission,
} from "@/lib/types/foundation";

function renderMatrix() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={["/access-control"]}>
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <PermissionsMatrix
            search=""
            selectedBridgeIds={new Set()}
            onCellClick={() => {}}
            onToggleCellSelection={() => {}}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("PermissionsMatrix", () => {
  it("renders rows × top-N capsule_type columns from the join, drops cross-wallet permissions, and aggregates cell state correctly", async () => {
    renderMatrix();

    // ─── Wait for the 4 fetches to settle and the matrix table to
    //     render. The grantee row labels come from the people /
    //     teammates fixtures.
    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    // ─── Trust-chain disclosure: the 1 dropped cross-wallet permission
    //     is surfaced honestly (not silently omitted), so the matrix
    //     never implies complete governance coverage.
    expect(
      screen.getByTestId("dropped-permissions-notice"),
    ).toHaveTextContent(/Hidden from this matrix: 1 permission/i);

    // ─── [GAP-S S-1] each capsule column carries its ownership boundary
    //     sub-label (renders the write-time wallet routing truth).
    const boundaryCells = document.querySelectorAll('[data-testid^="capsule-boundary-"]');
    expect(boundaryCells.length).toBeGreaterThan(0);
    for (const cell of boundaryCells) {
      expect(["Personal", "Company-owned", "Device-bound", "Mixed"]).toContain(
        cell.textContent?.trim(),
      );
    }

    // ─── Assertion (a): the table header includes the capsule_types
    //     present in the JOIN — DECISION (2 rows), HANDOFF (1 row),
    //     RISK (1 row). Top-N cap is MATRIX_TOP_CAPSULE_TYPES (8) so
    //     all three should be visible.
    expect(MATRIX_TOP_CAPSULE_TYPES).toBeGreaterThanOrEqual(3);
    const headerRow = screen.getAllByRole("row")[0];
    expect(headerRow).toBeDefined();
    expect(headerRow).toHaveTextContent(/Decisions/);
    expect(headerRow).toHaveTextContent(/Handoffs/);
    expect(headerRow).toHaveTextContent(/Risks/);

    // ─── Assertion (b): cross-wallet drop. The MSW fixture seeds one
    //     Permission whose capsule_id is NOT in /org/capsules. It
    //     would have produced a PERMANENT-duration FULL/no-share
    //     row for SARAH on a non-existent capsule_type. The matrix
    //     must not surface a column for that capsule_type. Since the
    //     dropped row's capsule_type doesn't exist in the org slice
    //     (no FOUNDATIONAL/PREFERENCE column), checking via the
    //     aggregation directly is the cleanest assertion: aggregate
    //     against the SAME inputs the handler returns and confirm
    //     droppedCount === 1.
    //
    //     We re-derive aggregation from literals matching the
    //     handler fixture so the pure-function contract is anchored.
    const fakeNow = new Date().toISOString();
    const permsForAggregateCheck: Permission[] = [
      // 4 retained rows (matching handler) -- only capsule_id matters
      // for the drop assertion; access_scope/etc. are irrelevant here.
      {
        permission_id: "perm-a-1",
        bridge_id: "br-a",
        capsule_id: "c1c1c1c1-1111-1111-1111-111111111111",
        grantor_entity_id: "org",
        grantee_entity_id: "g1",
        access_scope: "SUMMARY",
        duration_type: "TEMPORARY",
        can_share_forward: false,
        monetization_active: false,
        status: "ACTIVE",
        valid_from: fakeNow,
        expires_at: null,
        conditions: {},
        created_at: fakeNow,
      },
      // 1 row whose capsule_id is NOT in capsules -- must be dropped.
      {
        permission_id: "perm-x-1",
        bridge_id: "br-x",
        capsule_id: "feedfeed-feed-feed-feed-feedfeedfeed",
        grantor_entity_id: "org",
        grantee_entity_id: "g1",
        access_scope: "FULL",
        duration_type: "TEMPORARY",
        can_share_forward: false,
        monetization_active: false,
        status: "ACTIVE",
        valid_from: fakeNow,
        expires_at: null,
        conditions: {},
        created_at: fakeNow,
      },
    ];
    const capsulesForAggregateCheck: OrgCapsuleListItem[] = [
      {
        capsule_id: "c1c1c1c1-1111-1111-1111-111111111111",
        capsule_type: "DECISION",
        topic_tags: [],
        relevance_score: 0,
        payload_summary: "",
        payload_size_tokens: 0,
        clearance_required: 0,
        access_count: 0,
        created_at: fakeNow,
        last_accessed_at: null,
      },
    ];
    const granteesForAggregateCheck: Entity[] = [];
    const aggregated = aggregateMatrix(
      permsForAggregateCheck,
      capsulesForAggregateCheck,
      granteesForAggregateCheck,
    );
    expect(aggregated.droppedCount).toBe(1);
    expect(aggregated.retained).toHaveLength(1);
    expect(aggregated.retained[0]?.capsule_id).toBe(
      "c1c1c1c1-1111-1111-1111-111111111111",
    );

    // ─── Assertion (c): MatrixCell aggregation. Sarah's DECISION cell
    //     stacks two retained permissions in BRIDGE_A (one SUMMARY
    //     no-share, one FULL share-forward). The cell should render:
    //       - PermissionLevel = FULL (max-scope)
    //       - canShareForward = true (OR of flags)
    //       - bridgeCount = 1 (distinct bridge_ids)
    //     The cell's rendered "F" abbreviation + chevron overlay
    //     surfaces via aria-label per MatrixCell's tooltipText.
    const cellsForSarah = await screen.findAllByLabelText(
      /Permission level: FULL/,
    );
    // At least one FULL-level cell should be Sarah's DECISION.
    expect(cellsForSarah.length).toBeGreaterThan(0);
    // The "Grantee can re-share" suffix should be present on Sarah's
    // FULL cell since the SUMMARY row had can_share_forward=false but
    // the FULL row had can_share_forward=true (OR-aggregation honest).
    const sarahFullCell = cellsForSarah.find((el) =>
      /can re-share/i.test(el.getAttribute("aria-label") ?? ""),
    );
    expect(sarahFullCell).toBeDefined();

    // Direct invariant check via the pure aggregator with the actual
    // handler fixture inputs (mirroring the data shape):
    const handlerPermissions: Permission[] = [
      {
        permission_id: "perm-a-1",
        bridge_id: "BRIDGE_A",
        capsule_id: "c1c1c1c1-1111-1111-1111-111111111111",
        grantor_entity_id: "org",
        grantee_entity_id: "sarah",
        access_scope: "SUMMARY",
        duration_type: "TEMPORARY",
        can_share_forward: false,
        monetization_active: false,
        status: "ACTIVE",
        valid_from: fakeNow,
        expires_at: null,
        conditions: {},
        created_at: fakeNow,
      },
      {
        permission_id: "perm-a-2",
        bridge_id: "BRIDGE_A",
        capsule_id: "c1c1c1c1-2222-2222-2222-222222222222",
        grantor_entity_id: "org",
        grantee_entity_id: "sarah",
        access_scope: "FULL",
        duration_type: "TEMPORARY",
        can_share_forward: true,
        monetization_active: false,
        status: "ACTIVE",
        valid_from: fakeNow,
        expires_at: null,
        conditions: {},
        created_at: fakeNow,
      },
    ];
    const handlerCapsules: OrgCapsuleListItem[] = [
      {
        capsule_id: "c1c1c1c1-1111-1111-1111-111111111111",
        capsule_type: "DECISION",
        topic_tags: [],
        relevance_score: 0,
        payload_summary: "",
        payload_size_tokens: 0,
        clearance_required: 0,
        access_count: 0,
        created_at: fakeNow,
        last_accessed_at: null,
      },
      {
        capsule_id: "c1c1c1c1-2222-2222-2222-222222222222",
        capsule_type: "DECISION",
        topic_tags: [],
        relevance_score: 0,
        payload_summary: "",
        payload_size_tokens: 0,
        clearance_required: 0,
        access_count: 0,
        created_at: fakeNow,
        last_accessed_at: null,
      },
    ];
    const handlerAgg = aggregateMatrix(
      handlerPermissions,
      handlerCapsules,
      [],
    );
    const sarahDecisionCell = handlerAgg.cell("sarah", "DECISION");
    expect(sarahDecisionCell.level).toBe("FULL");
    expect(sarahDecisionCell.canShareForward).toBe(true);
    expect(sarahDecisionCell.bridgeCount).toBe(1);
    expect(sarahDecisionCell.bridgeIds).toEqual(["BRIDGE_A"]);
  });
});
