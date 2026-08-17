import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Package, Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { ProductSlideOver } from "@/components/products/ProductSlideOver"
import { formatKobo } from "@/lib/format"
import { getProductCategories, listProducts, type Product } from "@/lib/api"

const PAGE_SIZE = 25

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

function Products() {
  const navigate = useNavigate()

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounced(search, 300)
  const [category, setCategory] = useState<string>("all")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)

  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<string[]>([])
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, category, lowStockOnly])

  useEffect(() => {
    getProductCategories().then(setCategories)
  }, [])

  function reload() {
    setLoading(true)
    listProducts({
      search: debouncedSearch || undefined,
      category: category === "all" ? undefined : category,
      lowStockOnly,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setProducts(res.products)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(reload, [debouncedSearch, category, lowStockOnly, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = !!debouncedSearch || category !== "all" || lowStockOnly

  const columns: DataTableColumn<Product>[] = [
    { key: "name", header: "Product name", accessor: (p) => p.name, className: "font-medium text-foreground" },
    { key: "category", header: "Category", render: (p) => p.category ?? "—" },
    { key: "unit", header: "Unit", accessor: (p) => p.unitLabel },
    { key: "cost", header: "Cost", render: (p) => formatKobo(p.costPrice) },
    { key: "wholesale", header: "Wholesale", render: (p) => formatKobo(p.wholesalePrice) },
    { key: "retail", header: "Retail", render: (p) => formatKobo(p.retailPrice) },
    {
      key: "stock",
      header: "In stock",
      render: (p) => (
        <div className="flex items-center gap-2">
          <span>
            {p.stockQty} {p.unitLabel}
            {p.stockQty === 1 ? "" : "s"}
          </span>
          {p.stockQty <= p.reorderLevel && <Badge variant="warning">Low stock</Badge>}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Products"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Add Product
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products or SKU"
          containerClassName="max-w-xs"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
          Low stock only
        </label>
      </div>

      {!loading && products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasFilters ? "No products match your filters" : "No products yet"}
          description={
            hasFilters
              ? "Try a different search or clear your filters."
              : "Add your first product to start building your catalogue."
          }
          action={
            !hasFilters && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Add Product
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={products}
            keyField={(p) => p.id}
            onRowClick={(p) => navigate(`/products/${p.id}`)}
          />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {total} products
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ProductSlideOver
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => {
          setCreateOpen(false)
          getProductCategories().then(setCategories)
          reload()
        }}
      />
    </>
  )
}

export { Products }
