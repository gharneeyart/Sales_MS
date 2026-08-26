import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PackagePlus, Plus, Truck } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { SupplierSlideOver } from "@/components/suppliers/SupplierSlideOver"
import { useDebounced } from "@/lib/useDebounced"
import { listSuppliers, type Supplier } from "@/lib/api"

const PAGE_SIZE = 25

function Suppliers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounced(search, 300)
  const [page, setPage] = useState(1)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [slideOverOpen, setSlideOverOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | undefined>(undefined)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  function reload() {
    setLoading(true)
    listSuppliers({ search: debouncedSearch || undefined, page, pageSize: PAGE_SIZE })
      .then((res) => {
        setSuppliers(res.suppliers)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(reload, [debouncedSearch, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const columns: DataTableColumn<Supplier>[] = [
    { key: "name", header: "Name", accessor: (s) => s.name, className: "font-medium text-foreground" },
    { key: "phone", header: "Phone", render: (s) => s.phone ?? "—" },
    { key: "notes", header: "Notes", render: (s) => s.notes ?? "—", className: "text-muted-foreground" },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            navigate("/suppliers/goods-received", { state: { supplierId: s.id, supplierName: s.name } })
          }}
        >
          <PackagePlus className="size-4" />
          Record goods received
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Suppliers"
        action={
          <Button
            onClick={() => {
              setEditing(undefined)
              setSlideOverOpen(true)
            }}
          >
            <Plus className="size-4" />
            Add Supplier
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers"
          containerClassName="max-w-xs"
        />
      </div>

      {!loading && suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={debouncedSearch ? "No suppliers match your search" : "No suppliers yet"}
          description={
            debouncedSearch
              ? "Try a different search."
              : "Add your first supplier to start recording goods received."
          }
          action={
            !debouncedSearch && (
              <Button
                onClick={() => {
                  setEditing(undefined)
                  setSlideOverOpen(true)
                }}
              >
                <Plus className="size-4" />
                Add Supplier
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={suppliers}
            keyField={(s) => s.id}
            onRowClick={(s) => {
              setEditing(s)
              setSlideOverOpen(true)
            }}
          />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {total} suppliers
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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

      <SupplierSlideOver
        open={slideOverOpen}
        onOpenChange={setSlideOverOpen}
        supplier={editing}
        onSaved={() => {
          setSlideOverOpen(false)
          reload()
        }}
      />
    </>
  )
}

export { Suppliers }
