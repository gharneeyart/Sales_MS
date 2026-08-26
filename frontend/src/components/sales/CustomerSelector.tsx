import { useEffect, useRef, useState } from "react"
import { Plus, UserRound } from "lucide-react"

import { SearchInput } from "@/components/ui/search-input"
import { Button } from "@/components/ui/button"
import { useDebounced } from "@/lib/useDebounced"
import { listCustomers, type Customer, type CustomerListItem } from "@/lib/api"
import { QuickAddCustomerDialog } from "./QuickAddCustomerDialog"

interface CustomerSelectorProps {
  customer: Customer | CustomerListItem | null
  onSelect: (customer: Customer | CustomerListItem | null) => void
}

function CustomerSelector({ customer, onSelect }: CustomerSelectorProps) {
  const [query, setQuery] = useState("")
  const debounced = useDebounced(query, 250)
  const [results, setResults] = useState<CustomerListItem[]>([])
  const [open, setOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    listCustomers({ search: debounced || undefined, page: 1, pageSize: 8 }).then((res) =>
      setResults(res.customers)
    )
  }, [debounced, open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (customer) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-input px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <UserRound className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{customer.name}</p>
            {"phone" in customer && customer.phone && (
              <p className="text-xs text-muted-foreground">{customer.phone}</p>
            )}
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
        placeholder="Search customer — defaults to walk-in"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
          <div className="max-h-56 overflow-y-auto">
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c)
                  setOpen(false)
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="font-medium text-foreground">{c.name}</span>
                {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
              </button>
            ))}
            {debounced.trim() && results.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No customers found</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setQuickAddOpen(true)
            }}
            className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
          >
            <Plus className="size-4" />
            Add new customer
          </button>
        </div>
      )}

      <QuickAddCustomerDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={(c) => {
          onSelect(c)
          setQuery("")
        }}
      />
    </div>
  )
}

export { CustomerSelector }
