import type { ComponentType, ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ComponentType<{ className?: string }>
  trend?: {
    value: string
    direction: "up" | "down"
    /** Whether an "up" trend is the good outcome for this metric. Default true. */
    positiveIsGood?: boolean
  }
  className?: string
}

function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  const isGood = trend
    ? (trend.direction === "up") === (trend.positiveIsGood ?? true)
    : null

  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                isGood ? "text-success" : "text-danger"
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="size-4" />
              ) : (
                <ArrowDownRight className="size-4" />
              )}
              {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-5 text-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { StatCard }
