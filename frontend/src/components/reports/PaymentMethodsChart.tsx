import { Wallet } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EmptyState } from "@/components/ui/empty-state"
import { formatKobo } from "@/lib/format"

type PaymentMethod = "CASH" | "TRANSFER" | "POS" | "OTHER"

interface PaymentMethodsChartProps {
  breakdown: { method: PaymentMethod; total: number }[]
}

/** Fixed categorical palette, independent of tenant brand colors — validated for CVD separation and contrast against the app surface. Never cycle or reassign these per render. */
const METHOD_COLOR: Record<PaymentMethod, string> = {
  CASH: "#2a78d6",
  TRANSFER: "#eb6834",
  POS: "#1baf7a",
  OTHER: "#eda100",
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Cash",
  TRANSFER: "Transfer",
  POS: "POS",
  OTHER: "Other",
}

const METHOD_ORDER: PaymentMethod[] = ["CASH", "TRANSFER", "POS", "OTHER"]

function PaymentMethodsChart({ breakdown }: PaymentMethodsChartProps) {
  const total = breakdown.reduce((sum, b) => sum + b.total, 0)

  if (total === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No payments in this range"
        description="Payment methods will be broken down here once sales come in."
      />
    )
  }

  const byMethod = new Map(breakdown.map((b) => [b.method, b.total]))
  const segments = METHOD_ORDER.map((method) => ({ method, total: byMethod.get(method) ?? 0 })).filter(
    (s) => s.total > 0
  )

  return (
    <div>
      <div className="flex h-6 gap-0.5 overflow-hidden rounded-md">
        {segments.map((s) => (
          <Tooltip key={s.method}>
            <TooltipTrigger asChild>
              <div
                className="h-full"
                style={{ width: `${(s.total / total) * 100}%`, backgroundColor: METHOD_COLOR[s.method] }}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{METHOD_LABEL[s.method]}</p>
              <p>
                {formatKobo(s.total)} · {((s.total / total) * 100).toFixed(0)}%
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((s) => (
          <div key={s.method} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: METHOD_COLOR[s.method] }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{METHOD_LABEL[s.method]}</p>
              <p className="text-xs text-muted-foreground">
                {formatKobo(s.total)} · {((s.total / total) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { PaymentMethodsChart }
