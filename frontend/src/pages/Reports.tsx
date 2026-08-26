import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker, PRESETS } from "@/components/reports/DateRangePicker"
import { RevenueBarChart } from "@/components/reports/RevenueBarChart"
import { TopProductsList } from "@/components/reports/TopProductsList"
import { PaymentMethodsChart } from "@/components/reports/PaymentMethodsChart"
import { formatKobo } from "@/lib/format"
import { getReports, type ReportsResponse } from "@/lib/api"

const monthToDate = PRESETS.find((p) => p.label === "Month to date")!.range()

function Reports() {
  const [from, setFrom] = useState(monthToDate.from)
  const [to, setTo] = useState(monthToDate.to)
  const [presetLabel, setPresetLabel] = useState<string | null>("Month to date")
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [topProductsMetric, setTopProductsMetric] = useState<"revenue" | "units">("revenue")

  useEffect(() => {
    setLoading(true)
    getReports(from.toISOString(), to.toISOString())
      .then(setData)
      .finally(() => setLoading(false))
  }, [from, to])

  function handleRangeChange(newFrom: Date, newTo: Date, label: string | null) {
    setFrom(newFrom)
    setTo(newTo)
    setPresetLabel(label)
  }

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="See how the business is performing."
        action={
          <DateRangePicker from={from} to={to} presetLabel={presetLabel} onChange={handleRangeChange} />
        }
      />

      <div
        className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${loading ? "pointer-events-none opacity-50 transition-opacity" : ""}`}
      >
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales over time</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueBarChart points={data.salesOverTime.points} granularity={data.salesOverTime.granularity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Top products</CardTitle>
            <Tabs value={topProductsMetric} onValueChange={(v) => setTopProductsMetric(v as "revenue" | "units")}>
              <TabsList>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="units">Units</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <Tabs value={topProductsMetric}>
              <TabsContent value="revenue">
                <TopProductsList items={data.topProducts.byRevenue} metric="revenue" />
              </TabsContent>
              <TabsContent value="units">
                <TopProductsList items={data.topProducts.byUnits} metric="units" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:gap-4">
              <div className="flex min-w-0 items-center justify-between gap-2 sm:block">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-lg font-semibold text-foreground sm:mt-1">{formatKobo(data.profit.revenue)}</p>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2 sm:block">
                <p className="text-sm text-muted-foreground">Cost</p>
                <p className="text-lg font-semibold text-foreground sm:mt-1">{formatKobo(data.profit.cost)}</p>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2 sm:block">
                <p className="text-sm text-muted-foreground">Profit</p>
                <p className="text-lg font-semibold text-success sm:mt-1">{formatKobo(data.profit.profit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentMethodsChart breakdown={data.paymentBreakdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding debts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total owed</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {formatKobo(data.outstandingDebts.totalOwed)}
            </p>
            {data.outstandingDebts.topDebtors.length > 0 && (
              <div className="mt-4 flex flex-col">
                {data.outstandingDebts.topDebtors.map((debtor, i) => (
                  <div
                    key={debtor.customerId}
                    className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-t-0"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="w-4 shrink-0 text-sm font-medium text-muted-foreground">{i + 1}</span>
                      <p className="truncate text-sm font-medium text-foreground">{debtor.name}</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-foreground">
                      {formatKobo(debtor.balance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Inventory health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Low-stock items</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {data.inventoryHealth.lowStockCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total stock value</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {formatKobo(data.inventoryHealth.totalStockValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export { Reports }
