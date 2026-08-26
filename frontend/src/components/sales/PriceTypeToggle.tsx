import { cn } from "@/lib/utils"
import type { PriceType } from "@/lib/api"

interface PriceTypeToggleProps {
  value: PriceType
  onChange: (value: PriceType) => void
}

function PriceTypeToggle({ value, onChange }: PriceTypeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-input p-0.5">
      {(["RETAIL", "WHOLESALE"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            value === option
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option === "RETAIL" ? "Retail" : "Wholesale"}
        </button>
      ))}
    </div>
  )
}

export { PriceTypeToggle }
