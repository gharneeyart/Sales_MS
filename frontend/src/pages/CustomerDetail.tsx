import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Loader2, Pencil, Plus, Receipt } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { CustomerSlideOver } from "@/components/customers/CustomerSlideOver"
import { formatDate, formatKobo } from "@/lib/format"
import { SALE_STATUS_LABEL, SALE_STATUS_VARIANT } from "@/lib/saleStatus"
import { getCustomer, type CustomerDetail as CustomerDetailData } from "@/lib/api"

function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<CustomerDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  function load() {
    if (!id) return
    setLoading(true)
    getCustomer(id)
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { customer, history, summary } = data

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{customer.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{customer.phone ?? "No phone on file"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            onClick={() =>
              navigate("/sales/new", { state: { customerId: customer.id, customerName: customer.name, customerPhone: customer.phone } })
            }
          >
            <Plus className="size-4" />
            New Sale
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Balance owed</p>
          <p className={`mt-1 text-2xl font-semibold ${summary.balanceOwed > 0 ? "text-danger" : "text-foreground"}`}>
            {formatKobo(summary.balanceOwed)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Total spent</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{formatKobo(summary.totalSpent)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Orders</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{summary.orderCount}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState icon={Receipt} title="No purchases yet" description="Sales for this customer will show up here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Receipt no.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((sale) => (
                  <TableRow key={sale.id} onClick={() => navigate(`/sales/${sale.id}`)} className="cursor-pointer">
                    <TableCell className="font-medium text-foreground">{sale.receiptNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(sale.createdAt)}</TableCell>
                    <TableCell className="text-right">{formatKobo(sale.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <span className={sale.balance > 0 ? "font-medium text-danger" : ""}>
                        {formatKobo(sale.balance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={SALE_STATUS_VARIANT[sale.status]}>{SALE_STATUS_LABEL[sale.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CustomerSlideOver
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSaved={() => {
          setEditOpen(false)
          load()
        }}
      />
    </>
  )
}

export { CustomerDetail }
