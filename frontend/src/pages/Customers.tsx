import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Users } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { Switch } from "@/components/ui/switch"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { CustomerSlideOver } from "@/components/customers/CustomerSlideOver"
import { formatKobo, formatDate } from "@/lib/format"
import { useDebounced } from "@/lib/useDebounced"
import { listCustomers, type CustomerListItem } from "@/lib/api"

const PAGE_SIZE = 25

function Customers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounced(search, 300)
  const [owesMoneyOnly, setOwesMoneyOnly] = useState(false)
  const [page, setPage] = useState(1)

  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, owesMoneyOnly])

  function reload() {
    setLoading(true)
    listCustomers({ search: debouncedSearch || undefined, owesMoneyOnly, page, pageSize: PAGE_SIZE })
      .then((res) => {
        setCustomers(res.customers)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }

  useEffect(reload, [debouncedSearch, owesMoneyOnly, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = !!debouncedSearch || owesMoneyOnly

  const columns: DataTableColumn<CustomerListItem>[] = [
    { key: "name", header: "Name", accessor: (c) => c.name, className: "font-medium text-foreground" },
    { key: "phone", header: "Phone", render: (c) => c.phone ?? "—" },
    { key: "totalSpent", header: "Total spent", render: (c) => formatKobo(c.totalSpent) },
    {
      key: "balanceOwed",
      header: "Balance owed",
      render: (c) => (
        <span className={c.balanceOwed > 0 ? "font-medium text-danger" : ""}>{formatKobo(c.balanceOwed)}</span>
      ),
    },
    {
      key: "lastPurchase",
      header: "Last purchase",
      render: (c) => (c.lastPurchaseDate ? formatDate(c.lastPurchaseDate) : "—"),
      className: "text-muted-foreground",
    },
  ]

  return (
    <>
      <PageHeader
        title="Customers"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Add Customer
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers"
          containerClassName="max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch checked={owesMoneyOnly} onCheckedChange={setOwesMoneyOnly} />
          Owes money
        </label>
      </div>

      {!loading && customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? "No customers match your filters" : "No customers yet"}
          description={
            hasFilters
              ? "Try a different search or clear your filters."
              : "Add your first customer to start tracking their purchases."
          }
          action={
            !hasFilters && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" />
                Add Customer
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={customers}
            keyField={(c) => c.id}
            onRowClick={(c) => navigate(`/customers/${c.id}`)}
          />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {total} customers
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

      <CustomerSlideOver
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => {
          setCreateOpen(false)
          reload()
        }}
      />
    </>
  )
}

export { Customers }
