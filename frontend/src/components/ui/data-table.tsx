import { useMemo, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface DataTableColumn<T> {
  key: string
  header: string
  /** Value used for sorting and, if `render` is omitted, for display. */
  accessor?: (row: T) => string | number
  render?: (row: T) => ReactNode
  sortable?: boolean
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  keyField: (row: T) => string
  onRowClick?: (row: T) => void
  emptyState?: ReactNode
  className?: string
}

function DataTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyState,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(
    null
  )

  const sorted = useMemo(() => {
    if (!sort) return data
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.accessor) return data
    const accessor = column.accessor
    return [...data].sort((a, b) => {
      const av = accessor(a)
      const bv = accessor(b)
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sort.direction === "asc" ? cmp : -cmp
    })
  }, [data, sort, columns])

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortable) return
    setSort((current) => {
      if (current?.key !== column.key) return { key: column.key, direction: "asc" }
      if (current.direction === "asc") return { key: column.key, direction: "desc" }
      return null
    })
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.sortable && "cursor-pointer select-none",
                  column.className
                )}
                onClick={() => toggleSort(column)}
              >
                <span className="inline-flex items-center gap-1">
                  {column.header}
                  {column.sortable &&
                    (sort?.key === column.key ? (
                      sort.direction === "asc" ? (
                        <ArrowUp className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ArrowDown className="size-3.5 text-muted-foreground" />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3.5 text-muted-foreground/50" />
                    ))}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow
              key={keyField(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(onRowClick && "cursor-pointer")}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.render ? column.render(row) : String(column.accessor?.(row) ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export { DataTable }
