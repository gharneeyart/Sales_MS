import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

function QuantityStepper({ value, onChange, min = 1, max }: QuantityStepperProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </Button>
      <span className="w-8 text-center text-sm font-medium tabular-nums">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(max ? Math.min(max, value + 1) : value + 1)}
        disabled={max !== undefined && value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  )
}

export { QuantityStepper }
