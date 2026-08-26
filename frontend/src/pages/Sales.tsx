import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Receipt } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { formatKobo, formatDate } from "@/lib/format"
import { useDebounced } from "@/lib/useDebounced"
import { SALE_STATUS_LABEL, SALE_STATUS_VARIANT } from "@/lib/saleStatus"
import { listSales, type SaleListItem, type SaleStatus } from "@/lib/api"

const PAGE_SIZE = 25

const STATUS_OPTIONS: { value: SaleStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIALLY_PAID", label: "Part-paid" },
  { value: "PENDING", label: "Unpaid" },
]

function Sales() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounced(search, 300)
  const [status, setStatus] = useState<SaleStatus | "all">("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)

  const [sales, setSales] = useState<SaleListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, dateFrom, dateTo])

  useEffect(() => {
    setLoading(true)
    listSales({
      search: debouncedSearch || undefined,
      status: status === "all" ? undefined : status,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setSales(res.sales)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }, [debouncedSearch, status, dateFrom, dateTo, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = !!debouncedSearch || status !== "all" || !!dateFrom || !!dateTo

  const columns: DataTableColumn<SaleListItem>[] = [
    { key: "receiptNumber", header: "Receipt no.", accessor: (s) => s.receiptNumber, className: "font-medium text-foreground" },
    { key: "customer", header: "Customer", accessor: (s) => s.customerName },
    { key: "date", header: "Date", render: (s) => formatDate(s.createdAt), className: "text-muted-foreground" },
    { key: "total", header: "Total", render: (s) => formatKobo(s.totalAmount) },
    { key: "paid", header: "Paid", render: (s) => formatKobo(s.amountPaid) },
    {
      key: "balance",
      header: "Balance",
      render: (s) => (
        <span className={s.balance > 0 ? "font-medium text-danger" : ""}>{formatKobo(s.balance)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <Badge variant={SALE_STATUS_VARIANT[s.status]}>{SALE_STATUS_LABEL[s.status]}</Badge>,
    },
    { key: "recordedBy", header: "Recorded by", accessor: (s) => s.recordedByName, className: "text-muted-foreground" },
  ]

  return (
    <>
      <PageHeader
        title="Sales"
        action={
          <Button onClick={() => navigate("/sales/new")}>
            <Plus className="size-4" />
            New Sale
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer or receipt no."
          containerClassName="max-w-xs"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as SaleStatus | "all")}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {!loading && sales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={hasFilters ? "No sales match your filters" : "No sales yet"}
          description={
            hasFilters
              ? "Try a different search or clear your filters."
              : "Record your first sale to see it here."
          }
          action={
            !hasFilters && (
              <Button onClick={() => navigate("/sales/new")}>
                <Plus className="size-4" />
                New Sale
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={sales}
            keyField={(s) => s.id}
            onRowClick={(s) => navigate(`/sales/${s.id}`)}
          />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {total} sales
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
    </>
  )
}

export { Sales }
