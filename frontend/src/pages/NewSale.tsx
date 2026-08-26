import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ShoppingCart } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProductPicker } from "@/components/sales/ProductPicker"
import { LineItemRow, type CartLine } from "@/components/sales/LineItemRow"
import { CustomerSelector } from "@/components/sales/CustomerSelector"
import { formatNaira, nairaToKobo } from "@/lib/format"
import {
  ApiError,
  createSale,
  type Customer,
  type CustomerListItem,
  type PaymentMethod,
  type Product,
} from "@/lib/api"

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "POS", label: "POS" },
  { value: "OTHER", label: "Other" },
]

interface NewSaleLocationState {
  customerId?: string
  customerName?: string
  customerPhone?: string | null
}

function NewSale() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state as NewSaleLocationState | null

  const [lines, setLines] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<Customer | CustomerListItem | null>(
    prefill?.customerId
      ? { id: prefill.customerId, name: prefill.customerName ?? "", phone: prefill.customerPhone ?? null, notes: null }
      : null
  )
  const [paidInFull, setPaidInFull] = useState(true)
  const [partialAmount, setPartialAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH")
  const [submitting, setSubmitting] = useState(false)

  const total = lines.reduce((sum, line) => {
    const unitPrice = line.priceType === "WHOLESALE" ? line.product.wholesalePrice : line.product.retailPrice
    return sum + unitPrice * line.quantity
  }, 0)

  const paymentAmount = paidInFull ? total : partialAmount ? nairaToKobo(Number(partialAmount)) : 0

  function addProduct(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id)
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: Math.min(l.quantity + 1, product.stockQty) } : l
        )
      }
      return [...prev, { product, quantity: 1, priceType: "RETAIL" as const }]
    })
  }

  async function handleRecordSale() {
    setSubmitting(true)
    try {
      const sale = await createSale({
        customerId: customer?.id ?? null,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity, priceType: l.priceType })),
        initialPayment: paymentAmount > 0 ? { amount: paymentAmount, method: paymentMethod } : null,
      })
      toast.success(`Sale recorded — ${sale.receiptNumber}`)
      navigate(`/sales/${sale.id}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't record sale")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader title="New Sale" description="Search for products, then take payment." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductPicker onAdd={addProduct} />

          <Card className="mt-4">
            <CardContent>
              {lines.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="No items yet"
                  description="Search for a product above to add it to this sale."
                />
              ) : (
                <div className="flex flex-col">
                  {lines.map((line) => (
                    <LineItemRow
                      key={line.product.id}
                      line={line}
                      onQuantityChange={(quantity) =>
                        setLines((prev) =>
                          prev.map((l) => (l.product.id === line.product.id ? { ...l, quantity } : l))
                        )
                      }
                      onPriceTypeChange={(priceType) =>
                        setLines((prev) =>
                          prev.map((l) => (l.product.id === line.product.id ? { ...l, priceType } : l))
                        )
                      }
                      onRemove={() =>
                        setLines((prev) => prev.filter((l) => l.product.id !== line.product.id))
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">Customer</label>
                <CustomerSelector customer={customer} onSelect={setCustomer} />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-2xl font-semibold text-foreground">{formatNaira(total / 100)}</span>
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Switch checked={paidInFull} onCheckedChange={setPaidInFull} />
                  Received in full
                </label>

                {!paidInFull && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="partialAmount" className="text-sm font-medium text-foreground">
                      Amount received (₦)
                    </label>
                    <Input
                      id="partialAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0 for unpaid / credit"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Payment method</label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                disabled={lines.length === 0 || submitting}
                onClick={handleRecordSale}
              >
                {submitting ? "Recording…" : "Record Sale"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

export { NewSale }
