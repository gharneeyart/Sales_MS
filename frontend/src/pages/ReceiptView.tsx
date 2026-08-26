import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Download, Loader2, Printer, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, formatKobo } from "@/lib/format"
import { getInitials } from "@/lib/brand"
import { useBrand } from "@/contexts/BrandContext"
import { getSale, type SaleDetail } from "@/lib/api"

function ReceiptView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { brand } = useBrand()
  const [sale, setSale] = useState<SaleDetail | null>(null)

  useEffect(() => {
    if (id) getSale(id).then(setSale)
  }, [id])

  if (!sale || !brand) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const amountPaid = sale.Payments.reduce((sum, p) => sum + p.amount, 0)
  const balance = sale.totalAmount - amountPaid
  const isPaid = balance <= 0
  const businessName = brand.displayName

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate(`/sales/${sale.id}`)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
          <Button
            variant="outline"
            disabled={!sale.latestReceiptUrl}
            onClick={() => window.open(sale.latestReceiptUrl!, "_blank")}
          >
            <Download className="size-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => toast("Sending receipts lands in Phase 6")}>
            <Send className="size-4" />
            Send
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={businessName} className="size-12 rounded-lg object-cover" />
            ) : (
              <div
                className="flex size-12 items-center justify-center rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: brand.primaryColor }}
              >
                {getInitials(businessName)}
              </div>
            )}
            <span className="text-xl font-bold" style={{ color: brand.primaryColor }}>
              {businessName}
            </span>
          </div>
          <div className="text-right">
            <p className="font-medium text-foreground">Receipt {sale.receiptNumber}</p>
            <p className="text-sm text-muted-foreground">{formatDate(sale.createdAt)}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm text-muted-foreground">Billed to</p>
          <p className="font-medium text-foreground">{sale.Customer?.name ?? "Walk-in Customer"}</p>
        </div>

        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.SaleItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">{item.Product.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatKobo(item.unitPriceAtSale)}</TableCell>
                  <TableCell className="text-right">{formatKobo(item.unitPriceAtSale * item.quantity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="ml-auto mt-4 flex w-full max-w-xs flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium text-foreground">{formatKobo(sale.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-medium text-foreground">{formatKobo(amountPaid)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-sm">
            <span className="font-semibold text-foreground">Balance</span>
            <span className={`font-semibold ${balance > 0 ? "text-danger" : "text-foreground"}`}>
              {formatKobo(balance)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <span
            className={`rounded px-4 py-1.5 text-sm font-bold text-white ${isPaid ? "bg-success" : "bg-danger"}`}
          >
            {isPaid ? "PAID" : `BALANCE DUE: ${formatKobo(balance)}`}
          </span>
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">Thank you for your business!</p>
      </div>
    </div>
  )
}

export { ReceiptView }
