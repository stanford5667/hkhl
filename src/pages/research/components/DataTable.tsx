import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type OnChangeFn,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  // Server-side pagination
  pageIndex: number;
  pageSize: number;
  pageCount?: number; // total pages if known
  totalRows?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  // Sorting
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
  // Layout
  dense?: boolean;
  onRowClick?: (row: TData) => void;
  rowKey?: (row: TData, idx: number) => string;
  stickyHeader?: boolean;
  maxHeight?: string;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  emptyMessage = "No data available",
  pageIndex,
  pageSize,
  pageCount,
  totalRows,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  sorting,
  onSortingChange,
  manualSorting = false,
  dense = true,
  onRowClick,
  rowKey,
  stickyHeader = true,
  maxHeight,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting,
    manualPagination: true,
    pageCount: pageCount ?? -1,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
  });

  const edgePad = "first:pl-4 sm:first:pl-6 last:pr-4 sm:last:pr-6";
  const cellPad = cn(dense ? "px-3 py-2" : "px-3 py-3", edgePad);
  const headPad = cn(dense ? "px-3 py-2.5" : "px-3 py-3", edgePad);

  const totalPages = useMemo(() => {
    if (pageCount && pageCount > 0) return pageCount;
    if (totalRows != null) return Math.max(1, Math.ceil(totalRows / pageSize));
    return undefined;
  }, [pageCount, totalRows, pageSize]);

  const canPrev = pageIndex > 0;
  const canNext = totalPages ? pageIndex + 1 < totalPages : data.length === pageSize;

  return (
    <div className="flex flex-col">
      <div
        className={cn("relative w-full overflow-auto")}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full caption-bottom text-xs sm:text-[13px]">
          <thead
            className={cn(
              "bg-muted/20 border-b border-border/40",
              stickyHeader && "sticky top-0 z-10",
            )}
          >
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  const numeric = (header.column.columnDef.meta as any)?.numeric === true;
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        headPad,
                        "align-middle font-medium text-[10px] sm:text-[11px] uppercase tracking-[0.08em] text-muted-foreground whitespace-nowrap",
                        numeric ? "text-right" : "text-left",
                        canSort && "cursor-pointer select-none hover:text-foreground",
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      style={{ width: header.column.columnDef.size }}
                    >
                      <div
                        className={cn(
                          "inline-flex items-center gap-1",
                          numeric && "justify-end w-full",
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="inline-flex">
                            {sortDir === "asc" ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : sortDir === "desc" ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="h-32 text-center">
                  <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="h-32 text-center">
                  <span className="text-muted-foreground text-xs">{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={rowKey ? rowKey(row.original, idx) : row.id}
                  className={cn(
                    "border-b border-border/30 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-muted/30",
                    !onRowClick && "hover:bg-muted/20",
                  )}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        cellPad,
                        "align-middle whitespace-nowrap",
                        (cell.column.columnDef.meta as any)?.numeric === true &&
                          "text-right tabular-nums",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t border-border/40">
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {totalRows != null ? (
            <>
              {data.length === 0
                ? "0 results"
                : `${pageIndex * pageSize + 1}–${pageIndex * pageSize + data.length} of ${totalRows.toLocaleString()}`}
            </>
          ) : (
            <>Page {pageIndex + 1}{totalPages ? ` of ${totalPages}` : ""}</>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onPageSizeChange && (
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded border border-border/40 bg-background px-2 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s} / page
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={!canPrev || isLoading}
            onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] text-muted-foreground tabular-nums min-w-[60px] text-center">
            {pageIndex + 1}{totalPages ? ` / ${totalPages}` : ""}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={!canNext || isLoading}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
