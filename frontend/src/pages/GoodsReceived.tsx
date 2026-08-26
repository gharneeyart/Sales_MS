import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { PackagePlus } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ProductPicker } from "@/components/sales/ProductPicker"
import { SupplierSelector } from "@/components/suppliers/SupplierSelector"
import { ReceivedLineRow, type ReceivedLine } from "@/components/suppliers/ReceivedLineRow"
import { nairaToKobo } from "@/lib/format"
import { ApiError, recordGoodsReceived, type Product, type Supplier } from "@/lib/api"

interface GoodsReceivedLocationState {
  supplierId?: string
  supplierName?: string
}

function GoodsReceived() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state as GoodsReceivedLocationState | null

  const [supplier, setSupplier] = useState<Supplier | null>(
    prefill?.supplierId ? { id: prefill.supplierId, name: prefill.supplierName ?? "", phone: null, notes: null } : null
  )
  const [lines, setLines] = useState<ReceivedLine[]>([])
  const [submitting, setSubmitting] = useState(false)

  const totalUnits = lines.reduce((sum, l) => sum + l.quantity, 0)

  function addProduct(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id)
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { product, quantity: 1, costPriceNaira: "" }]
    })
  }

  async function handleSubmit() {
    if (!supplier) {
      toast.error("Select a supplier first")
      return
    }
    setSubmitting(true)
    try {
      await recordGoodsReceived({
        supplierId: supplier.id,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          costPrice: l.costPriceNaira ? nairaToKobo(Number(l.costPriceNaira)) : null,
        })),
      })
      toast.success("Goods received recorded")
      navigate("/suppliers")
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't record goods received")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader title="Goods Received" description="Record stock arriving from a supplier." />

      <div className="mb-4 max-w-sm">
        <label className="mb-1.5 block text-sm font-medium text-foreground">Supplier</label>
        <SupplierSelector supplier={supplier} onSelect={setSupplier} />
      </div>

      <div className="mb-4 max-w-md">
        <ProductPicker onAdd={addProduct} />
      </div>

      <Card>
        <CardContent>
          {lines.length === 0 ? (
            <EmptyState
              icon={PackagePlus}
              title="No items yet"
              description="Search for a product above to add it to this delivery."
            />
          ) : (
            <div className="flex flex-col">
              {lines.map((line) => (
                <ReceivedLineRow
                  key={line.product.id}
                  line={line}
                  onQuantityChange={(quantity) =>
                    setLines((prev) => prev.map((l) => (l.product.id === line.product.id ? { ...l, quantity } : l)))
                  }
                  onCostPriceChange={(costPriceNaira) =>
                    setLines((prev) =>
                      prev.map((l) => (l.product.id === line.product.id ? { ...l, costPriceNaira } : l))
                    )
                  }
                  onRemove={() => setLines((prev) => prev.filter((l) => l.product.id !== line.product.id))}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
        <span className="text-sm text-muted-foreground">
          {lines.length} product{lines.length === 1 ? "" : "s"} · {totalUnits} total unit
          {totalUnits === 1 ? "" : "s"} received
        </span>
        <Button size="lg" disabled={lines.length === 0 || !supplier || submitting} onClick={handleSubmit}>
          {submitting ? "Recording…" : "Record Goods Received"}
        </Button>
      </div>
    </>
  )
}

export { GoodsReceived }
