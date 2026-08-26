import { Router } from "express"

import { authenticate } from "../middleware/authenticate"
import { listActivityLogs, listDistinctActions } from "../services/activityLogService"

export const activityLogsRouter = Router()
activityLogsRouter.use(authenticate)

const PAGE_SIZE = 25

activityLogsRouter.get("/", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined
  const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined

  const result = await listActivityLogs(req.auth!.orgId, {
    actorUserId: typeof req.query.actorUserId === "string" ? req.query.actorUserId : undefined,
    action: typeof req.query.action === "string" ? req.query.action : undefined,
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  res.json(result)
})

activityLogsRouter.get("/actions", async (req, res) => {
  res.json(await listDistinctActions(req.auth!.orgId))
})
