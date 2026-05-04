// FILE: tests/unit/data-table.test.tsx
// PURPOSE: Patent-defensive contract test for DataTable.
// CONNECTS TO: src/components/data/DataTable.tsx.
//
// ANCHOR FOR 12B-12F:
// Every list view in 12B.2-12F renders through DataTable. Its 4
// states (loading skeleton / empty / error / data) define the
// architectural contract every screen relies on.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/DataTable";

interface Row {
  id: string;
  name: string;
}

const COLUMNS: ColumnDef<Row>[] = [
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
  },
];

const EMPTY_STATE = {
  title: "No rows",
  description: "Try adjusting your filters or invite the first user.",
};

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>>) {
  // Always inside a Router so useSearchParams works.
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <TooltipProvider>
        <DataTable<Row>
          columns={COLUMNS}
          data={undefined}
          isLoading={false}
          error={null}
          emptyState={EMPTY_STATE}
          {...props}
        />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("DataTable", () => {
  it("renders all 4 states correctly (loading skeleton / empty / error / data)", async () => {
    const user = userEvent.setup();

    // ─── State 1: loading -- skeleton rows (count = pageSize).
    const loading = renderTable({ isLoading: true, pageSize: 3 });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
    loading.unmount();

    // ─── State 2: empty -- title + description + CTA.
    const empty = renderTable({
      data: [],
      isLoading: false,
      error: null,
      emptyState: {
        title: "No users yet",
        description: "Invite your first team member.",
        cta: <button type="button">Invite</button>,
      },
    });
    expect(screen.getByText("No users yet")).toBeInTheDocument();
    expect(
      screen.getByText("Invite your first team member."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Invite/i })).toBeInTheDocument();
    empty.unmount();

    // ─── State 3: error -- message + Retry calls onRetry when given.
    const onRetry = vi.fn();
    const errored = renderTable({
      data: undefined,
      isLoading: false,
      error: new Error("Foundation unreachable"),
      onRetry,
    });
    expect(screen.getByText(/Foundation unreachable/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    errored.unmount();

    // ─── State 4: data -- rows from the data prop render.
    renderTable({
      data: [
        { id: "1", name: "Sarah Lee" },
        { id: "2", name: "Marcus Chen" },
      ],
      isLoading: false,
      error: null,
    });
    expect(screen.getByText("Sarah Lee")).toBeInTheDocument();
    expect(screen.getByText("Marcus Chen")).toBeInTheDocument();
  });
});
