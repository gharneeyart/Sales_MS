import { useState } from "react"
import { toast } from "sonner"
import {
  BadgeCheck,
  Package,
  Plus,
  Receipt,
  Users,
  Wallet,
} from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { DevRoundTrip } from "@/components/DevRoundTrip"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/ui/stat-card"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { SlideOver } from "@/components/ui/slide-over"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatNaira, formatDate } from "@/lib/format"

interface RecentSale {
  id: string
  receiptNumber: string
  customer: string
  amount: number
  status: "PAID" | "PARTIALLY_PAID" | "PENDING"
  date: string
}

const RECENT_SALES: RecentSale[] = [
  { id: "1", receiptNumber: "RCT-000241", customer: "Blessing Okafor", amount: 84500, status: "PAID", date: new Date().toISOString() },
  { id: "2", receiptNumber: "RCT-000240", customer: "Musa Ibrahim", amount: 152000, status: "PARTIALLY_PAID", date: new Date().toISOString() },
  { id: "3", receiptNumber: "RCT-000239", customer: "Chidinma Eze", amount: 31200, status: "PAID", date: new Date(Date.now() - 86400000).toISOString() },
  { id: "4", receiptNumber: "RCT-000238", customer: "Tunde Bakare", amount: 9800, status: "PENDING", date: new Date(Date.now() - 86400000).toISOString() },
  { id: "5", receiptNumber: "RCT-000237", customer: "Amaka Nwosu", amount: 267500, status: "PAID", date: new Date(Date.now() - 2 * 86400000).toISOString() },
]

const STATUS_LABEL: Record<RecentSale["status"], string> = {
  PAID: "Paid",
  PARTIALLY_PAID: "Partial",
  PENDING: "Pending",
}

const STATUS_VARIANT: Record<RecentSale["status"], "success" | "warning" | "secondary"> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  PENDING: "secondary",
}

const columns: DataTableColumn<RecentSale>[] = [
  { key: "receiptNumber", header: "Receipt", accessor: (row) => row.receiptNumber, sortable: true },
  { key: "customer", header: "Customer", accessor: (row) => row.customer, sortable: true },
  {
    key: "amount",
    header: "Amount",
    accessor: (row) => row.amount,
    sortable: true,
    render: (row) => formatNaira(row.amount),
    className: "font-medium text-foreground",
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
    ),
  },
  {
    key: "date",
    header: "Date",
    accessor: (row) => row.date,
    sortable: true,
    render: (row) => formatDate(row.date),
    className: "text-muted-foreground",
  },
]

function Dashboard() {
  const [newSaleOpen, setNewSaleOpen] = useState(false)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Here's how the business is doing today."
        action={
          <Button onClick={() => setNewSaleOpen(true)}>
            <Plus className="size-4" />
            New sale
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's sales"
          value={formatNaira(542300)}
          icon={Wallet}
          trend={{ value: "+12% vs yesterday", direction: "up" }}
        />
        <StatCard
          label="Outstanding debt"
          value={formatNaira(318900)}
          icon={Receipt}
          trend={{ value: "+4% vs last week", direction: "up", positiveIsGood: false }}
        />
        <StatCard
          label="Low stock items"
          value="3"
          icon={Package}
          trend={{ value: "-2 vs last week", direction: "down" }}
        />
        <StatCard label="Customers" value="128" icon={Users} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent sales</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={RECENT_SALES} keyField={(row) => row.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={BadgeCheck}
              title="All caught up"
              description="No products are below their reorder level right now."
            />
          </CardContent>
        </Card>
      </div>

      <DevRoundTrip />

      <SlideOver
        open={newSaleOpen}
        onOpenChange={setNewSaleOpen}
        title="New sale"
        description="Record a sale against the catalogue and take payment."
        footer={
          <>
            <Button variant="outline" onClick={() => setNewSaleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setNewSaleOpen(false)
                toast.success("Sale recorded")
              }}
            >
              Save sale
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Customer</label>
            <Input placeholder="Search or add a customer" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Price type</label>
            <Select defaultValue="retail">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Product line items land in Phase 4 once the catalogue exists — this
            panel is here to prove the pattern end to end.
          </p>
        </div>
      </SlideOver>
    </>
  )
}

export { Dashboard }
