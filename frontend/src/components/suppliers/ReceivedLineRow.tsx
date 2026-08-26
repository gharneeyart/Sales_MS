import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QuantityStepper } from "@/components/sales/QuantityStepper"
import { formatKobo, koboToNaira } from "@/lib/format"
import type { Product } from "@/lib/api"

export interface ReceivedLine {
  product: Product
  quantity: number
  costPriceNaira: string
}

interface ReceivedLineRowProps {
  line: ReceivedLine
  onQuantityChange: (quantity: number) => void
  onCostPriceChange: (value: string) => void
  onRemove: () => void
}

function ReceivedLineRow({ line, onQuantityChange, onCostPriceChange, onRemove }: ReceivedLineRowProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{line.product.name}</p>
        <p className="text-sm text-muted-foreground">Current cost: {formatKobo(line.product.costPrice)}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-32">
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder={String(koboToNaira(line.product.costPrice))}
            value={line.costPriceNaira}
            onChange={(e) => onCostPriceChange(e.target.value)}
            aria-label="Updated cost price"
          />
        </div>
        <QuantityStepper value={line.quantity} onChange={onQuantityChange} />
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

export { ReceivedLineRow }
