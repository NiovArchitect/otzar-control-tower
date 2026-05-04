// FILE: DataTable.tsx
// PURPOSE: Generic, URL-state-aware table with all 4 states baked
//          in (loading skeleton / empty / error / data). Single
//          most-reused component in 12B-12F. Built on TanStack Table
//          v8 primitives plus react-router-dom's useSearchParams.
// CONNECTS TO: Users (12B.2), AI Teammates (12B.3), Conversations
//              (12D), Workflows (12D), Analytics rows (12D), Pending
//              Approvals (12E).
//
// URL STATE SHAPE:
//   ?search=jane            (free-text search; debounced 300ms)
//   ?sort=last_active        (sort column id)
//   ?order=desc              ("asc" | "desc")
//   ?page=2                  (1-indexed page number)
//   ?filter[role]=admin      (per-column filter; structured key)
//
// 4 STATES:
//   isLoading=true                 → skeleton rows (count = pageSize)
//   error !== null                  → error UI w/ Retry (calls onRetry
//                                     if provided, else page reload)
//   data?.length === 0              → emptyState slot (title + desc + cta)
//   data populated                  → TanStack Table render

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[] | undefined;
  isLoading: boolean;
  error: Error | null;
  emptyState: {
    title: string;
    description: string;
    cta?: React.ReactNode;
  };
  pageSize?: number;
  totalCount?: number;
  searchPlaceholder?: string;
  filterControls?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Per correction 3 (12B.1): clean retry path. Pass refetch()
   *  from TanStack Query for clean retry behavior. Defaults to
   *  full page reload if not provided. */
  onRetry?: () => void;
}

const DEFAULT_PAGE_SIZE = 25;
const DEBOUNCE_MS = 300;

export function DataTable<T>({
  columns,
  data,
  isLoading,
  error,
  emptyState,
  pageSize = DEFAULT_PAGE_SIZE,
  totalCount,
  searchPlaceholder = "Search...",
  filterControls,
  onRowClick,
  onRetry,
}: DataTableProps<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSort = searchParams.get("sort");
  const initialOrder = searchParams.get("order") === "desc";
  const initialSearch = searchParams.get("search") ?? "";
  const currentPage = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [searchInput, setSearchInput] = useState(initialSearch);

  // Debounce search input → URL update.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (searchInput.length === 0) {
        next.delete("search");
      } else {
        next.set("search", searchInput);
      }
      next.set("page", "1");
      setSearchParams(next, { replace: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // We intentionally exclude searchParams + setSearchParams from
    // deps to avoid loops; debounced effect only runs on user input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const sorting: SortingState = useMemo(
    () =>
      initialSort
        ? [{ id: initialSort, desc: initialOrder }]
        : [],
    [initialSort, initialOrder],
  );

  function setSorting(
    updater: SortingState | ((prev: SortingState) => SortingState),
  ): void {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    const params = new URLSearchParams(searchParams);
    const first = next[0];
    if (first) {
      params.set("sort", first.id);
      params.set("order", first.desc ? "desc" : "asc");
    } else {
      params.delete("sort");
      params.delete("order");
    }
    setSearchParams(params, { replace: true });
  }

  function gotoPage(page: number): void {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(Math.max(1, page)));
    setSearchParams(params, { replace: true });
  }

  function handleRetry(): void {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  }

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={searchPlaceholder}
          disabled={isLoading || error !== null}
          className="max-w-sm"
          aria-label="Search"
        />
        {filterControls && (
          <div className="flex flex-wrap items-center gap-2">
            {filterControls}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table role="table" className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} role="row">
                {hg.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const sortState = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      role="columnheader"
                      aria-sort={
                        sortState === "asc"
                          ? "ascending"
                          : sortState === "desc"
                            ? "descending"
                            : "none"
                      }
                      onClick={
                        isSortable
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                      className={cn(
                        "px-4 py-2 text-left font-medium text-muted-foreground",
                        isSortable && "cursor-pointer hover:text-foreground",
                      )}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {isSortable && sortState && (
                        <span className="ml-1 text-xs">
                          {sortState === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {renderBody({
              isLoading,
              error,
              data,
              columnCount: columns.length,
              pageSize,
              emptyState,
              onRetry: handleRetry,
              table,
              onRowClick,
            })}
          </tbody>
        </table>
      </div>

      {data && data.length > 0 && totalCount !== undefined && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Page {currentPage} of {totalPages} · Total: {totalCount} records
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => gotoPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => gotoPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderBody<T>(args: {
  isLoading: boolean;
  error: Error | null;
  data: T[] | undefined;
  columnCount: number;
  pageSize: number;
  emptyState: { title: string; description: string; cta?: React.ReactNode };
  onRetry: () => void;
  table: ReturnType<typeof useReactTable<T>>;
  onRowClick?: ((row: T) => void) | undefined;
}): React.ReactNode {
  const {
    isLoading,
    error,
    data,
    columnCount,
    pageSize,
    emptyState,
    onRetry,
    table,
    onRowClick,
  } = args;

  if (isLoading) {
    return Array.from({ length: pageSize }).map((_, i) => (
      <tr key={`skeleton-${i}`} role="row">
        {Array.from({ length: columnCount }).map((__, j) => (
          <td key={`skeleton-${i}-${j}`} className="px-4 py-2">
            <Skeleton className="h-5 w-full" />
          </td>
        ))}
      </tr>
    ));
  }

  if (error !== null) {
    return (
      <tr>
        <td
          colSpan={columnCount}
          className="px-4 py-12 text-center text-sm text-destructive"
        >
          <div className="space-y-3">
            <p>Error: {error.message}</p>
            <Button type="button" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  if (!data || data.length === 0) {
    return (
      <tr>
        <td colSpan={columnCount} className="px-4 py-12 text-center">
          <div className="space-y-3">
            <h3 className="text-base font-semibold">{emptyState.title}</h3>
            <p className="text-sm text-muted-foreground">
              {emptyState.description}
            </p>
            {emptyState.cta && <div>{emptyState.cta}</div>}
          </div>
        </td>
      </tr>
    );
  }

  return table.getRowModel().rows.map((row: Row<T>) => (
    <tr
      key={row.id}
      role="row"
      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
      className={cn(
        "border-b last:border-b-0",
        onRowClick &&
          "cursor-pointer hover:bg-accent/40 focus-within:bg-accent/40",
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} role="cell" className="px-4 py-2">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  ));
}
