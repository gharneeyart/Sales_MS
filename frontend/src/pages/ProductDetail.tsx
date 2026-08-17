import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { History, Loader2, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { ProductSlideOver } from "@/components/products/ProductSlideOver"
import { getProduct, getStockHistory, type Product, type StockHistoryEntry } from "@/lib/api"
import { formatDate, formatKobo } from "@/lib/format"

const REASON_LABEL: Record<StockHistoryEntry["reason"], string> = {
  SALE: "Sale",
  RESTOCK: "Restock",
  ADJUSTMENT: "Adjustment",
  RETURN: "Return",
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [history, setHistory] = useState<StockHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  function load() {
    if (!id) return
    setLoading(true)
    Promise.all([getProduct(id), getStockHistory(id)])
      .then(([p, h]) => {
        setProduct(p)
        setHistory(h)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  if (loading || !product) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const lowStock = product.stockQty <= product.reorderLevel
  const unitPlural = product.stockQty === 1 ? product.unitLabel : `${product.unitLabel}s`

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{product.name}</h1>
            {lowStock && <Badge variant="warning">Low stock</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.category ?? "Uncategorized"} · {product.stockQty} {unitPlural} in stock
          </p>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <FactCard label="Unit" value={product.unitLabel} />
        <FactCard label="Cost" value={formatKobo(product.costPrice)} />
        <FactCard label="Wholesale" value={formatKobo(product.wholesalePrice)} />
        <FactCard label="Retail" value={formatKobo(product.retailPrice)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState icon={History} title="No stock movements yet" description="Sales and restocks will show up here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">{formatDate(entry.createdAt)}</TableCell>
                    <TableCell className={entry.change > 0 ? "font-medium text-success" : "font-medium text-danger"}>
                      {entry.change > 0 ? `+${entry.change}` : entry.change}
                    </TableCell>
                    <TableCell>{REASON_LABEL[entry.reason]}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.performedBy}</TableCell>
                    <TableCell className="text-right font-medium text-foreground">{entry.balanceAfter}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProductSlideOver
        open={editOpen}
        onOpenChange={setEditOpen}
        product={product}
        onSaved={() => {
          setEditOpen(false)
          load()
        }}
      />
    </>
  )
}

export { ProductDetail }
