import type { Transaction } from "sequelize"

import { ActivityLog } from "../db/models"

export function logActivity(
  t: Transaction,
  input: {
    organizationId: string
    actorUserId: string
    action: string
    entityType: string
    entityId: string
    metadata?: Record<string, unknown>
  }
) {
  return ActivityLog.create(
    {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? {},
    },
    { transaction: t }
  )
}
