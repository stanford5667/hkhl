import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = 'asc' | 'desc' | null;
export type SortState = { column: string; direction: SortDirection };

interface SortableTableHeadProps {
  column: string;
  label: string;
  sort: SortState;
  onSort: (column: string) => void;
  className?: string;
}

export function SortableTableHead({ column, label, sort, onSort, className }: SortableTableHeadProps) {
  const isActive = sort.column === column;

  return (
    <TableHead
      className={cn("cursor-pointer select-none hover:text-foreground transition-colors", className)}
      onClick={() => onSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          sort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TableHead>
  );
}

export function useSort(defaultColumn: string, defaultDir: SortDirection = 'desc') {
  const [sort, setSort] = useState<SortState>({ column: defaultColumn, direction: defaultDir });

  const onSort = (column: string) => {
    setSort(prev => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'desc' ? 'asc' : 'desc' };
      }
      return { column, direction: 'desc' };
    });
  };

  return { sort, onSort };
}

import { useState } from "react";

export function sortData<T>(data: T[], sort: SortState): T[] {
  if (!sort.column || !sort.direction) return data;
  return [...data].sort((a, b) => {
    const aVal = (a as any)[sort.column];
    const bVal = (b as any)[sort.column];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    const aStr = String(aVal);
    const bStr = String(bVal);
    return sort.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });
}
