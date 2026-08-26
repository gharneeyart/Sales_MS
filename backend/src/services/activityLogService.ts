import { Op } from "sequelize"

import { ActivityLog, User } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"

export interface ListActivityLogsParams {
  actorUserId?: string
  action?: string
  from?: Date
  to?: Date
  page: number
  pageSize: number
}

export async function listActivityLogs(organizationId: string, params: ListActivityLogsParams) {
  const where: Record<string, unknown> = {}
  if (params.actorUserId) where.actorUserId = params.actorUserId
  if (params.action) where.action = params.action
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from && { [Op.gte]: params.from }),
      ...(params.to && { [Op.lt]: params.to }),
    }
  }

  const { rows, count } = await withOrgTransaction(organizationId, (t) =>
    ActivityLog.findAndCountAll({
      where: { organizationId, ...where },
      include: [{ model: User, as: "Actor", attributes: ["id", "name"] }],
      order: [["createdAt", "DESC"]],
      limit: params.pageSize,
      offset: (params.page - 1) * params.pageSize,
      transaction: t,
    })
  )

  return {
    logs: rows.map((log) => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      actorName: log.Actor?.name ?? "Unknown",
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
    })),
    total: count,
  }
}

export async function listDistinctActions(organizationId: string): Promise<string[]> {
  const rows = await withOrgTransaction(organizationId, (t) =>
    ActivityLog.findAll({
      where: { organizationId },
      attributes: ["action"],
      group: ["action"],
      transaction: t,
    })
  )
  return rows.map((r) => r.action).sort()
}
