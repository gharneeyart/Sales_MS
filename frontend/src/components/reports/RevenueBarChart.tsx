import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EmptyState } from "@/components/ui/empty-state"
import { formatKobo, formatKoboCompact } from "@/lib/format"
import { BarChart3 } from "lucide-react"

interface RevenueBarChartProps {
  points: { bucket: string; revenue: number }[]
  granularity: "day" | "week"
}

const watDayFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  timeZone: "Africa/Lagos",
})

const watLongFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Lagos",
})

function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

const Y_TICKS = [0, 0.25, 0.5, 0.75, 1]

function RevenueBarChart({ points, granularity }: RevenueBarChartProps) {
  if (points.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No sales in this range"
        description="Try a wider date range to see revenue over time."
      />
    )
  }

  const max = niceMax(Math.max(...points.map((p) => p.revenue)))
  const labelEvery = points.length <= 10 ? 1 : Math.ceil(points.length / 10)

  return (
    <div>
      <div className="flex gap-2" style={{ height: 200 }}>
        <div className="relative w-12 shrink-0 text-right">
          {Y_TICKS.map((f) => (
            <span
              key={f}
              className="absolute right-0 -translate-y-1/2 text-xs text-muted-foreground"
              style={{ bottom: `${f * 100}%` }}
            >
              {formatKoboCompact(max * f)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {Y_TICKS.map((f) => (
            <div
              key={f}
              className="absolute inset-x-0 border-t border-border"
              style={{ bottom: `${f * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5">
            {points.map((p) => {
              const heightPct = max > 0 ? (p.revenue / max) * 100 : 0
              return (
                <Tooltip key={p.bucket}>
                  <TooltipTrigger asChild>
                    <div className="flex h-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-6 rounded-t-sm bg-primary transition-opacity hover:opacity-80"
                        style={{ height: `${heightPct}%`, minHeight: p.revenue > 0 ? 2 : 0 }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{formatKobo(p.revenue)}</p>
                    <p>{watLongFormatter.format(new Date(p.bucket))}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <div className="w-12 shrink-0" />
        <div className="flex min-w-0 flex-1 gap-0.5">
          {points.map((p, i) => (
            <div
              key={p.bucket}
              className="flex-1 truncate text-center text-[10px] text-muted-foreground"
            >
              {i % labelEvery === 0
                ? watDayFormatter.format(new Date(p.bucket))
                : ""}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Grouped by {granularity === "week" ? "week" : "day"}, West Africa Time
      </p>
    </div>
  )
}

export { RevenueBarChart }
