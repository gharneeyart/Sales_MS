import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fetchHello, type HelloResponse } from "@/lib/api"
import { formatDate } from "@/lib/format"

type Status = "loading" | "ok" | "error"

/**
 * Phase 0 plumbing proof: a live authenticated round trip from this
 * component -> API -> Postgres + Redis. Delete once Phase 1 auth lands and
 * every screen exercises the real path anyway.
 */
function DevRoundTrip() {
  const [status, setStatus] = useState<Status>("loading")
  const [data, setData] = useState<HelloResponse | null>(null)

  function load() {
    setStatus("loading")
    fetchHello()
      .then((res) => {
        setData(res)
        setStatus("ok")
      })
      .catch(() => setStatus("error"))
  }

  useEffect(load, [])

  return (
    <Card className="mt-6 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Phase 0 connectivity check</span>
          <Button variant="ghost" size="icon-sm" onClick={load} aria-label="Retry">
            <RefreshCw className="size-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3 text-sm">
        {status === "loading" && <Badge variant="secondary">Checking…</Badge>}
        {status === "error" && <Badge variant="destructive">API unreachable</Badge>}
        {status === "ok" && data && (
          <>
            <Badge variant="success">API + DB + Redis connected</Badge>
            <span className="text-muted-foreground">
              DB time: {formatDate(data.dbTime)} · Redis hits: {data.redisHits}
            </span>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export { DevRoundTrip }
