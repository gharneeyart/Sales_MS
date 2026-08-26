import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatKobo } from "@/lib/format"
import type { PriceType, Product } from "@/lib/api"
import { QuantityStepper } from "./QuantityStepper"
import { PriceTypeToggle } from "./PriceTypeToggle"

export interface CartLine {
  product: Product
  quantity: number
  priceType: PriceType
}

interface LineItemRowProps {
  line: CartLine
  onQuantityChange: (quantity: number) => void
  onPriceTypeChange: (priceType: PriceType) => void
  onRemove: () => void
}

function LineItemRow({ line, onQuantityChange, onPriceTypeChange, onRemove }: LineItemRowProps) {
  const unitPrice = line.priceType === "WHOLESALE" ? line.product.wholesalePrice : line.product.retailPrice
  const lineTotal = unitPrice * line.quantity

  return (
    <div className="flex flex-col gap-3 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{line.product.name}</p>
        <p className="text-sm text-muted-foreground">{formatKobo(unitPrice)} / {line.product.unitLabel}</p>
      </div>
      <div className="flex items-center gap-3">
        <PriceTypeToggle value={line.priceType} onChange={onPriceTypeChange} />
        <QuantityStepper value={line.quantity} onChange={onQuantityChange} max={line.product.stockQty} />
        <span className="w-24 text-right text-sm font-semibold text-foreground">{formatKobo(lineTotal)}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`Remove ${line.product.name}`}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export { LineItemRow }
