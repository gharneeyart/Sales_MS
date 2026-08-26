import { Op } from "sequelize"

import { NotificationLog } from "../db/models"
import { withOrgTransaction } from "../db/withOrgTransaction"
import { startOfTodayWAT } from "../lib/watTime"

/** One bundled notification per org per day per automation, not one per item. */
export async function hasNotifiedToday(organizationId: string, automationRuleId: string): Promise<boolean> {
  const log = await withOrgTransaction(organizationId, (t) =>
    NotificationLog.findOne({
      where: { organizationId, automationRuleId, createdAt: { [Op.gte]: startOfTodayWAT() } },
      transaction: t,
    })
  )
  return !!log
}
