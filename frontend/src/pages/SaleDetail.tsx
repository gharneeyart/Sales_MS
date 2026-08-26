import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Download, Loader2, Plus, Printer, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RecordPaymentDialog } from "@/components/sales/RecordPaymentDialog"
import { formatDate, formatKobo } from "@/lib/format"
import { SALE_STATUS_LABEL, SALE_STATUS_VARIANT } from "@/lib/saleStatus"
import { getSale, type SaleDetail as SaleDetailData } from "@/lib/api"

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  TRANSFER: "Transfer",
  POS: "POS",
  OTHER: "Other",
}

function SaleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [sale, setSale] = useState<SaleDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentOpen, setPaymentOpen] = useState(false)

  function load() {
    if (!id) return
    setLoading(true)
    getSale(id)
      .then(setSale)
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  if (loading || !sale) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const amountPaid = sale.Payments.reduce((sum, p) => sum + p.amount, 0)
  const balance = sale.totalAmount - amountPaid

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{sale.receiptNumber}</h1>
            <Badge variant={SALE_STATUS_VARIANT[sale.status]} className="h-6 px-3 text-sm">
              {SALE_STATUS_LABEL[sale.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {sale.Customer?.name ?? "Walk-in Customer"} · {formatDate(sale.createdAt)}
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.SaleItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">{item.Product.name}</TableCell>
                  <TableCell className="text-right">
                    {item.quantity} {item.Product.unitLabel}
                    {item.quantity === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell className="text-right">{formatKobo(item.unitPriceAtSale)}</TableCell>
                  <TableCell className="text-right font-medium text-foreground">
                    {formatKobo(item.unitPriceAtSale * item.quantity)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="ml-auto mt-4 flex w-full max-w-xs flex-col gap-2 sm:w-64">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium text-foreground">{formatKobo(sale.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium text-foreground">{formatKobo(amountPaid)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm">
              <span className="font-semibold text-foreground">Balance Due</span>
              <span className={`font-semibold ${balance > 0 ? "text-danger" : "text-foreground"}`}>
                {formatKobo(balance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Payments</CardTitle>
          {balance > 0 && (
            <Button size="sm" onClick={() => setPaymentOpen(true)}>
              <Plus className="size-4" />
              Record Payment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sale.Payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="flex flex-col">
              {sale.Payments.map((payment, i) => (
                <div
                  key={payment.id}
                  className={`flex items-center justify-between py-2.5 ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatKobo(payment.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {PAYMENT_METHOD_LABEL[payment.method]} · {formatDate(payment.createdAt)} ·{" "}
                      {payment.ReceivedBy.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => navigate(`/sales/${sale.id}/receipt`)}>
          <Printer className="size-4" />
          View / Print Receipt
        </Button>
        <Button
          variant="outline"
          disabled={!sale.latestReceiptUrl}
          onClick={() => window.open(sale.latestReceiptUrl!, "_blank")}
        >
          <Download className="size-4" />
          {sale.latestReceiptUrl ? "Download PDF" : "PDF generating…"}
        </Button>
        <Button variant="outline" onClick={() => toast("Sending receipts lands in Phase 6")}>
          <Send className="size-4" />
          Send to customer
        </Button>
      </div>

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        saleId={sale.id}
        balance={balance}
        onRecorded={() => load()}
      />
    </>
  )
}

export { SaleDetail }
