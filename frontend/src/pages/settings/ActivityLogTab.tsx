import { useEffect, useState } from "react"
import { History, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { EmptyState } from "@/components/ui/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker, PRESETS } from "@/components/reports/DateRangePicker"
import { formatDate } from "@/lib/format"
import { actionLabel, describeAffected } from "@/lib/activityLog"
import {
  getActivityLogs,
  getActivityLogActions,
  getTeam,
  type ActivityLogEntry,
  type TeamMember,
} from "@/lib/api"

const last30Days = PRESETS.find((p) => p.label === "Last 30 days")!.range()

function ActivityLogTab() {
  const [from, setFrom] = useState(last30Days.from)
  const [to, setTo] = useState(last30Days.to)
  const [presetLabel, setPresetLabel] = useState<string | null>("Last 30 days")
  const [actorUserId, setActorUserId] = useState("all")
  const [action, setAction] = useState("all")
  const [page, setPage] = useState(1)

  const [team, setTeam] = useState<TeamMember[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [logs, setLogs] = useState<ActivityLogEntry[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const PAGE_SIZE = 25

  useEffect(() => {
    getTeam().then(setTeam)
    getActivityLogActions().then(setActions)
  }, [])

  useEffect(() => {
    setPage(1)
  }, [actorUserId, action, from, to])

  useEffect(() => {
    setLoading(true)
    getActivityLogs({
      actorUserId: actorUserId === "all" ? undefined : actorUserId,
      action: action === "all" ? undefined : action,
      from: from.toISOString(),
      to: to.toISOString(),
      page,
    })
      .then((res) => {
        setLogs(res.logs)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }, [actorUserId, action, from, to, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const columns: DataTableColumn<ActivityLogEntry>[] = [
    {
      key: "createdAt",
      header: "When",
      render: (log) => <span className="text-muted-foreground">{formatDate(log.createdAt)}</span>,
    },
    {
      key: "actorName",
      header: "Person",
      render: (log) => <span className="font-medium text-foreground">{log.actorName}</span>,
    },
    {
      key: "action",
      header: "Action",
      render: (log) => <Badge variant="secondary">{actionLabel(log.action)}</Badge>,
    },
    {
      key: "affected",
      header: "Affected",
      render: (log) => <span className="text-muted-foreground">{describeAffected(log)}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={actorUserId} onValueChange={setActorUserId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Person" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            {team
              .filter((m) => m.kind === "MEMBER")
              .map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {actionLabel(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker
          from={from}
          to={to}
          presetLabel={presetLabel}
          onChange={(newFrom, newTo, label) => {
            setFrom(newFrom)
            setTo(newTo)
            setPresetLabel(label)
          }}
        />
      </div>

      {!logs ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={loading ? "pointer-events-none opacity-50 transition-opacity" : ""}>
          <DataTable
            columns={columns}
            data={logs}
            keyField={(log) => log.id}
            emptyState={
              <EmptyState
                icon={History}
                title="No activity in this range"
                description="Try widening the date range or clearing filters."
              />
            }
          />

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} · {total} entries
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { ActivityLogTab }
