import { useEffect, useRef, useState } from "react"
import { Truck } from "lucide-react"

import { SearchInput } from "@/components/ui/search-input"
import { Button } from "@/components/ui/button"
import { useDebounced } from "@/lib/useDebounced"
import { listSuppliers, type Supplier } from "@/lib/api"

interface SupplierSelectorProps {
  supplier: Supplier | null
  onSelect: (supplier: Supplier | null) => void
}

function SupplierSelector({ supplier, onSelect }: SupplierSelectorProps) {
  const [query, setQuery] = useState("")
  const debounced = useDebounced(query, 250)
  const [results, setResults] = useState<Supplier[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    listSuppliers({ search: debounced || undefined, page: 1, pageSize: 8 }).then((res) =>
      setResults(res.suppliers)
    )
  }, [debounced, open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (supplier) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-input px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Truck className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{supplier.name}</p>
            {supplier.phone && <p className="text-xs text-muted-foreground">{supplier.phone}</p>}
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>
          Change
        </Button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <SearchInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search suppliers"
      />
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s)
                setOpen(false)
              }}
              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="font-medium text-foreground">{s.name}</span>
              {s.phone && <span className="text-xs text-muted-foreground">{s.phone}</span>}
            </button>
          ))}
          {debounced.trim() && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No suppliers found</p>
          )}
        </div>
      )}
    </div>
  )
}

export { SupplierSelector }
