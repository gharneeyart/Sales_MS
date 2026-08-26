import { useEffect, useRef, useState } from "react"

import { SearchInput } from "@/components/ui/search-input"
import { formatKobo } from "@/lib/format"
import { useDebounced } from "@/lib/useDebounced"
import { listProducts, type Product } from "@/lib/api"

function ProductPicker({ onAdd }: { onAdd: (product: Product) => void }) {
  const [query, setQuery] = useState("")
  const debounced = useDebounced(query, 250)
  const [results, setResults] = useState<Product[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([])
      return
    }
    listProducts({ search: debounced, page: 1, pageSize: 8 }).then((res) => setResults(res.products))
  }, [debounced])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleSelect(product: Product) {
    onAdd(product)
    setQuery("")
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <SearchInput
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) {
            e.preventDefault()
            handleSelect(results[0])
          }
        }}
        placeholder="Search products to add…"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
          {results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => handleSelect(product)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{product.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {product.category ?? "Uncategorized"} · {product.stockQty} {product.unitLabel} in stock
                </p>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">{formatKobo(product.retailPrice)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { ProductPicker }
