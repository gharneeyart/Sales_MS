import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Check, Loader2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { formatDate, formatKobo } from "@/lib/format"
import {
  ApiError,
  getBilling,
  startCheckout,
  downgradePlan,
  type BillingOverview,
  type BillingPlan,
  type SubscriptionStatus,
} from "@/lib/api"

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIALING: "Trialing",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELLED: "Cancelled",
}

const STATUS_VARIANT: Record<SubscriptionStatus, "warning" | "success" | "destructive" | "secondary"> = {
  TRIALING: "warning",
  ACTIVE: "success",
  PAST_DUE: "destructive",
  CANCELLED: "secondary",
}

function planPrice(plan: BillingPlan): string {
  return plan.priceKobo === 0 ? "Free" : `${formatKobo(plan.priceKobo)}/mo`
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0
  const nearLimit = limit !== null && used >= limit
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">{limit === null ? `${used} · Unlimited` : `${used} / ${limit}`}</span>
      </div>
      {limit !== null && (
        <div className="mt-1.5 h-2 rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", nearLimit ? "bg-danger" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function BillingTab() {
  const { state } = useAuth()
  const isOwner = state.status === "authenticated" && state.role === "OWNER"

  const [data, setData] = useState<BillingOverview | null>(null)
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null)
  const [downgradeTarget, setDowngradeTarget] = useState<BillingPlan | null>(null)

  function load() {
    getBilling().then(setData)
  }

  useEffect(load, [])

  if (!data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { subscription, usage, plans } = data
  const currentPlan = subscription.plan

  async function handleUpgrade(plan: BillingPlan) {
    setPendingPlanId(plan.id)
    try {
      const { authorizationUrl } = await startCheckout(plan.id)
      window.location.href = authorizationUrl
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't start checkout")
      setPendingPlanId(null)
    }
  }

  async function handleDowngradeConfirm() {
    if (!downgradeTarget) return
    setPendingPlanId(downgradeTarget.id)
    try {
      await downgradePlan(downgradeTarget.id)
      toast.success(`Moved to ${downgradeTarget.name}`)
      setDowngradeTarget(null)
      load()
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't change plan")
    } finally {
      setPendingPlanId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-xl">{currentPlan?.name ?? "No plan"}</CardTitle>
            <Badge variant={STATUS_VARIANT[subscription.status]}>{STATUS_LABEL[subscription.status]}</Badge>
          </div>
          <CardDescription>
            {currentPlan ? planPrice(currentPlan) : ""}
            {subscription.currentPeriodEnd && (
              <>
                {" · "}
                {subscription.status === "TRIALING" ? "Trial ends" : "Renews"}{" "}
                {formatDate(subscription.currentPeriodEnd)}
              </>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <UsageBar label="Products" used={usage.products.used} limit={usage.products.limit} />
          <UsageBar label="Staff" used={usage.staff.used} limit={usage.staff.limit} />
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-base font-medium text-foreground">Plans</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan?.id
            const isUpgrade = !currentPlan || plan.priceKobo > currentPlan.priceKobo
            const isPending = pendingPlanId === plan.id

            return (
              <Card key={plan.id} className={cn(isCurrent && "border-primary")}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription className="text-base font-medium text-foreground">
                    {planPrice(plan)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-success" />
                      {plan.limits.maxProducts ? `${plan.limits.maxProducts} products` : "Unlimited products"}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-success" />
                      {plan.limits.maxStaff ? `${plan.limits.maxStaff} staff` : "Unlimited staff"}
                    </li>
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full">
                      Current plan
                    </Button>
                  ) : !isOwner ? (
                    <Button variant="outline" disabled className="w-full">
                      Owner only
                    </Button>
                  ) : isUpgrade ? (
                    <Button className="w-full" disabled={isPending} onClick={() => handleUpgrade(plan)}>
                      {isPending ? "Redirecting…" : "Upgrade"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={isPending}
                      onClick={() => setDowngradeTarget(plan)}
                    >
                      Downgrade
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <ConfirmDialog
        open={!!downgradeTarget}
        onOpenChange={(open) => !open && setDowngradeTarget(null)}
        title={`Move to ${downgradeTarget?.name}?`}
        description="This takes effect immediately. Your plan limits will change right away — no payment involved."
        confirmLabel="Downgrade"
        loading={pendingPlanId === downgradeTarget?.id}
        onConfirm={handleDowngradeConfirm}
      />
    </div>
  )
}

export { BillingTab }
