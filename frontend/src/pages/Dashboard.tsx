import { toast } from "sonner"
import { AlertCircle, Package, Plus, Receipt, TrendingUp, Users, Wallet } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { formatNaira, formatDate } from "@/lib/format"

type SaleStatus = "PAID" | "PARTIALLY_PAID" | "PENDING"

interface RecentSale {
  id: string
  customer: string
  amount: number
  status: SaleStatus
  time: string
}

const RECENT_SALES: RecentSale[] = [
  { id: "1", customer: "Blessing Okafor", amount: 84500, status: "PAID", time: new Date().toISOString() },
  { id: "2", customer: "Musa Ibrahim", amount: 152000, status: "PARTIALLY_PAID", time: new Date().toISOString() },
  { id: "3", customer: "Chidinma Eze", amount: 31200, status: "PAID", time: new Date(Date.now() - 86400000).toISOString() },
  { id: "4", customer: "Tunde Bakare", amount: 9800, status: "PENDING", time: new Date(Date.now() - 86400000).toISOString() },
  { id: "5", customer: "Amaka Nwosu", amount: 267500, status: "PAID", time: new Date(Date.now() - 2 * 86400000).toISOString() },
]

const STATUS_LABEL: Record<SaleStatus, string> = {
  PAID: "Paid",
  PARTIALLY_PAID: "Part-paid",
  PENDING: "Unpaid",
}

const STATUS_VARIANT: Record<SaleStatus, "success" | "warning" | "destructive"> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  PENDING: "destructive",
}

interface LowStockItem {
  id: string
  name: string
  stockQty: number
}

const LOW_STOCK: LowStockItem[] = [
  { id: "p1", name: "Rice — 50kg bag", stockQty: 2 },
  { id: "p2", name: "Vegetable oil — 25L", stockQty: 3 },
  { id: "p3", name: "Sugar — 50kg bag", stockQty: 1 },
]

interface OverdueCustomer {
  id: string
  name: string
  amountOwed: number
  daysOverdue: number
}

const OVERDUE_CUSTOMERS: OverdueCustomer[] = [
  { id: "c1", name: "Musa Ibrahim", amountOwed: 152000, daysOverdue: 18 },
  { id: "c2", name: "Tunde Bakare", amountOwed: 9800, daysOverdue: 6 },
]

function notBuiltYet(feature: string) {
  toast(`${feature} lands in a later phase`)
}

function Dashboard() {
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here's how the business is doing today."
        action={
          <Button onClick={() => navigate("/sales")}>
            <Plus className="size-4" />
            New Sale
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={formatNaira(542300)}
          icon={Wallet}
          trend={{ value: "+12% vs yesterday", direction: "up" }}
        />
        <StatCard
          label="Amount Owed to You"
          value={formatNaira(318900)}
          icon={Receipt}
          trend={{ value: "+4% vs last week", direction: "up", positiveIsGood: false }}
        />
        <StatCard
          label="Low-Stock Items"
          value={LOW_STOCK.length}
          icon={Package}
          trend={{ value: "-2 vs last week", direction: "down" }}
        />
        <StatCard
          label="Sales This Month"
          value={formatNaira(4218600)}
          icon={TrendingUp}
          trend={{ value: "+8% vs last month", direction: "up" }}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent Sales</CardTitle>
            <Link to="/sales" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col">
            {RECENT_SALES.map((sale, i) => (
              <div
                key={sale.id}
                className={
                  "flex items-center justify-between gap-4 py-3" +
                  (i > 0 ? " border-t border-border" : "")
                }
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{sale.customer}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(sale.time)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {formatNaira(sale.amount)}
                  </span>
                  <Badge variant={STATUS_VARIANT[sale.status]}>{STATUS_LABEL[sale.status]}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            {LOW_STOCK.length === 0 && OVERDUE_CUSTOMERS.length === 0 ? (
              <EmptyState
                icon={AlertCircle}
                title="All caught up"
                description="Nothing needs your attention right now."
              />
            ) : (
              <>
                {LOW_STOCK.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Package className="size-4 shrink-0 text-warning" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.stockQty} left</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => notBuiltYet("Restocking")}
                    >
                      Restock
                    </Button>
                  </div>
                ))}
                {OVERDUE_CUSTOMERS.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Users className="size-4 shrink-0 text-danger" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {customer.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Owes {formatNaira(customer.amountOwed)} · {customer.daysOverdue}d overdue
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => notBuiltYet("Debt reminders")}
                    >
                      Remind
                    </Button>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export { Dashboard }
