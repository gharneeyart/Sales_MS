import { Package } from "lucide-react"

import { EmptyState } from "@/components/ui/empty-state"
import { formatKobo } from "@/lib/format"

interface TopProductsListProps {
  items: { productId: string; name: string; units: number; revenue: number }[]
  metric: "revenue" | "units"
}

function TopProductsList({ items, metric }: TopProductsListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No products sold"
        description="Sales in this range will show up here, ranked by performance."
      />
    )
  }

  const max = Math.max(...items.map((i) => (metric === "revenue" ? i.revenue : i.units)))

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const value = metric === "revenue" ? item.revenue : item.units
        const pct = max > 0 ? (value / max) * 100 : 0
        return (
          <div key={item.productId} className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-sm font-medium text-muted-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="shrink-0 text-sm font-medium text-foreground">
                  {metric === "revenue" ? formatKobo(item.revenue) : `${item.units} sold`}
                </p>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export { TopProductsList }
